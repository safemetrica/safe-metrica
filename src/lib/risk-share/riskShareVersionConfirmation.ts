import "server-only";

import type { FieldParticipationSubmissionShadowRecord } from "@/lib/supabaseServer";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

export type RiskShareVersionConfirmationRecord =
  FieldParticipationSubmissionShadowRecord & {
    version_lock_id: string;
    confirmed_share_item_ids: string[];
    confirmation_idempotency_key: string;
    confirmation_request_digest: string;
  };

export type InsertRiskShareVersionConfirmationResult =
  | { ok: true; replayed: boolean }
  | { ok: false; code: "idempotency_conflict" | "request_failed" | "invalid_response" };

type ExistingConfirmationRow = {
  version_lock_id?: unknown;
  confirmed_share_item_ids?: unknown;
  confirmation_request_digest?: unknown;
};

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function canonicalItemIds(itemIds: string[]): string[] | null {
  if (itemIds.length < 1 || itemIds.length > 100) return null;

  const normalized = itemIds.map((itemId) => itemId.toLowerCase());

  if (
    normalized.some((itemId) => !UUID_PATTERN.test(itemId)) ||
    new Set(normalized).size !== normalized.length
  ) {
    return null;
  }

  return [...normalized].sort();
}

export async function insertRiskShareVersionConfirmation(
  record: RiskShareVersionConfirmationRecord,
): Promise<InsertRiskShareVersionConfirmationResult> {
  const supabaseUrl = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  const tenantCode = record.tenant_code.trim().toLowerCase();
  const itemIds = canonicalItemIds(record.confirmed_share_item_ids);
  const idempotencyKey = record.confirmation_idempotency_key.trim().toLowerCase();
  const digest = record.confirmation_request_digest.trim().toLowerCase();
  const versionLockId = record.version_lock_id.trim().toLowerCase();

  if (
    !supabaseUrl ||
    !key ||
    !COMPANY_CODE_PATTERN.test(tenantCode) ||
    !UUID_PATTERN.test(versionLockId) ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey) ||
    !DIGEST_PATTERN.test(digest) ||
    !itemIds
  ) {
    return { ok: false, code: "request_failed" };
  }

  const query = new URLSearchParams({
    on_conflict: "tenant_code,confirmation_idempotency_key",
  });

  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/field_participation_submissions?${query.toString()}`,
      {
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
          version_lock_id: versionLockId,
          confirmed_share_item_ids: itemIds,
          confirmation_idempotency_key: idempotencyKey,
          confirmation_request_digest: digest,
        }),
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, code: "request_failed" };
  }

  if (!response.ok) {
    return { ok: false, code: "request_failed" };
  }

  const inserted = await response.json().catch(() => undefined);

  if (!Array.isArray(inserted)) {
    return { ok: false, code: "invalid_response" };
  }

  if (inserted.length === 1) {
    return { ok: true, replayed: false };
  }

  if (inserted.length !== 0) {
    return { ok: false, code: "invalid_response" };
  }

  const replayQuery = new URLSearchParams({
    select:
      "version_lock_id,confirmed_share_item_ids,confirmation_request_digest",
    tenant_code: `eq.${tenantCode}`,
    confirmation_idempotency_key: `eq.${idempotencyKey}`,
    limit: "2",
  });

  let replayResponse: Response;

  try {
    replayResponse = await fetch(
      `${supabaseUrl}/rest/v1/field_participation_submissions?${replayQuery.toString()}`,
      {
        method: "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, code: "request_failed" };
  }

  if (!replayResponse.ok) {
    return { ok: false, code: "request_failed" };
  }

  const replayRows = await replayResponse.json().catch(() => undefined);

  if (!Array.isArray(replayRows) || replayRows.length !== 1) {
    return { ok: false, code: "invalid_response" };
  }

  const existing = replayRows[0] as ExistingConfirmationRow;
  const existingItemIds = Array.isArray(existing.confirmed_share_item_ids)
    ? canonicalItemIds(
        existing.confirmed_share_item_ids.filter(
          (itemId): itemId is string => typeof itemId === "string",
        ),
      )
    : null;

  if (
    existing.version_lock_id === versionLockId &&
    existing.confirmation_request_digest === digest &&
    existingItemIds &&
    JSON.stringify(existingItemIds) === JSON.stringify(itemIds)
  ) {
    return { ok: true, replayed: true };
  }

  return { ok: false, code: "idempotency_conflict" };
}
