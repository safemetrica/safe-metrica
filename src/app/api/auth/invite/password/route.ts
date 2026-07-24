import { NextRequest, NextResponse } from "next/server";

import {
  isValidInviteAccessToken,
  isValidNewPassword,
  updateInvitedUserPassword,
} from "@/lib/auth/invitePassword";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_REQUEST_BYTES = 16 * 1024;

type JsonBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 400 | 413 };

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestHost = request.headers.get("host")?.trim();
    const allowedHosts = new Set(
      [forwardedHost, requestHost, request.nextUrl.host].filter(
        (value): value is string => Boolean(value),
      ),
    );
    const allowedProtocols = new Set(
      [
        forwardedProtocol ? `${forwardedProtocol}:` : "",
        request.nextUrl.protocol,
      ].filter(Boolean),
    );

    return allowedHosts.has(originUrl.host) && allowedProtocols.has(originUrl.protocol);
  } catch {
    return false;
  }
}

async function readLimitedJsonBody(request: NextRequest): Promise<JsonBodyResult> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    return { ok: false, status: 400 };
  }
  if (contentLength > MAX_REQUEST_BYTES) {
    return { ok: false, status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, status: 400 };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  }

  const rawBody = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(rawBody));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, status: 400 };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400 };
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json({ ok: false, reason: "request_invalid" }, 400);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, reason: "request_invalid" }, 415);
  }

  const bodyResult = await readLimitedJsonBody(request);
  if (!bodyResult.ok) {
    return json({ ok: false, reason: "request_invalid" }, bodyResult.status);
  }

  const body = bodyResult.body;
  const accessToken = body?.accessToken;
  const password = body?.password;
  const passwordConfirm = body?.passwordConfirm;

  if (!isValidInviteAccessToken(accessToken)) {
    return json({ ok: false, reason: "invite_invalid" }, 401);
  }

  if (!isValidNewPassword(password) || password !== passwordConfirm) {
    return json({ ok: false, reason: "password_invalid" }, 400);
  }

  const result = await updateInvitedUserPassword(accessToken, password);
  if (result.ok) {
    return json({ ok: true }, 200);
  }

  const status =
    result.reason === "invite_invalid"
      ? 401
      : result.reason === "password_invalid"
        ? 400
        : result.reason === "request_limited"
          ? 429
          : 503;

  return json({ ok: false, reason: result.reason }, status);
}
