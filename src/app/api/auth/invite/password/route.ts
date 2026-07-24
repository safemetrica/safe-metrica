import { NextRequest, NextResponse } from "next/server";

import {
  isValidInviteAccessToken,
  isValidNewPassword,
  updateInvitedUserPassword,
} from "@/lib/auth/invitePassword";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_REQUEST_BYTES = 16 * 1024;

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

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json({ ok: false, reason: "request_invalid" }, 400);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, reason: "request_invalid" }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, reason: "request_invalid" }, 413);
  }

  const body = await request.json().catch(() => null);
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
