import "server-only";

import type { FieldParticipationSubmissionShadowRecord } from "@/lib/supabaseServer";

const COMPANY_CODE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;

export type PublicSubmissionKind =
  | "anonymous_feedback"
  | "visitor_confirmation"
  | "representative_confirmation";

export type PublicSubmissionRecord = FieldParticipationSubmissionShadowRecord & {
  public_submission_kind: PublicSubmissionKind;
  public_idempotency_key: string;
  public_request_digest: string;
};

export type PublicSubmissionResult =
  | { ok: true; replayed: boolean }
  | { ok: false; code: "idempotency_conflict" | "request_failed" | "invalid_response" };

export async function insertRiskSharePublicSubmission(
  record: PublicSubmissionRecord,
): Promise<PublicSubmissionResult> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tenantCode = record.tenant_code.trim().toLowerCase();
  const idempotencyKey = record.public_idempotency_key.trim().toLowerCase();
  const digest = record.public_request_digest.trim().toLowerCase();

  if (!url || !key || !COMPANY_CODE.test(tenantCode) || !UUID.test(idempotencyKey) || !DIGEST.test(digest)) {
    return { ok: false, code: "request_failed" };
  }

  const query = new URLSearchParams({
    on_conflict: "tenant_code,public_submission_kind,public_idempotency_key",
  });
  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/field_participation_submissions?${query}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        ...record,
        tenant_code: tenantCode,
        public_idempotency_key: idempotencyKey,
        public_request_digest: digest,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "request_failed" };
  }
  if (!response.ok) return { ok: false, code: "request_failed" };
  const inserted = await response.json().catch(() => undefined);
  if (!Array.isArray(inserted)) return { ok: false, code: "invalid_response" };
  if (inserted.length === 1) return { ok: true, replayed: false };
  if (inserted.length !== 0) return { ok: false, code: "invalid_response" };

  const replay = new URLSearchParams({
    select: "public_request_digest",
    tenant_code: `eq.${tenantCode}`,
    public_submission_kind: `eq.${record.public_submission_kind}`,
    public_idempotency_key: `eq.${idempotencyKey}`,
    limit: "2",
  });
  let replayResponse: Response;
  try {
    replayResponse = await fetch(`${url}/rest/v1/field_participation_submissions?${replay}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "request_failed" };
  }
  if (!replayResponse.ok) return { ok: false, code: "request_failed" };
  const rows = await replayResponse.json().catch(() => undefined);
  if (!Array.isArray(rows) || rows.length !== 1) return { ok: false, code: "invalid_response" };
  return rows[0]?.public_request_digest === digest
    ? { ok: true, replayed: true }
    : { ok: false, code: "idempotency_conflict" };
}
