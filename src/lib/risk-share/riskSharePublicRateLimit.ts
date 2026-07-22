import "server-only";

import { createHmac } from "node:crypto";

import type { PublicSubmissionKind } from "@/lib/risk-share/riskSharePublicSubmission";

const DIGEST = /^[0-9a-f]{64}$/;
const WINDOW_SECONDS = 600;
const REQUEST_LIMIT = 10;

export type PublicRateLimitResult =
  | { ok: true; allowed: true }
  | { ok: true; allowed: false; retryAfterSeconds: number }
  | { ok: false };

export async function consumeRiskSharePublicRateLimit(input: {
  headers: Headers;
  tenantCode: string;
  submissionKind: PublicSubmissionKind;
}): Promise<PublicRateLimitResult> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.PUBLIC_SUBMISSION_RATE_LIMIT_SECRET?.trim();
  const forwardedFor = input.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();

  if (!url || !key || !secret || secret.length < 32 || !forwardedFor) return { ok: false };

  const requesterDigest = createHmac("sha256", secret)
    .update(`risk-share-public-rate-limit:v1:${forwardedFor}`)
    .digest("hex");
  if (!DIGEST.test(requesterDigest)) return { ok: false };

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/rpc/consume_public_submission_rate_limit`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_tenant_code: input.tenantCode,
        p_submission_kind: input.submissionKind,
        p_requester_digest: requesterDigest,
        p_limit: REQUEST_LIMIT,
        p_window_seconds: WINDOW_SECONDS,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false };
  }

  if (!response.ok) return { ok: false };
  const rows = await response.json().catch(() => undefined);
  if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0]?.allowed !== "boolean") {
    return { ok: false };
  }
  if (rows[0].allowed) return { ok: true, allowed: true };

  const retryAfterSeconds = Number(rows[0].retry_after_seconds);
  if (!Number.isInteger(retryAfterSeconds) || retryAfterSeconds < 1 || retryAfterSeconds > WINDOW_SECONDS) {
    return { ok: false };
  }
  return { ok: true, allowed: false, retryAfterSeconds };
}
