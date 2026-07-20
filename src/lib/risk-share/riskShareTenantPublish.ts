import "server-only";

export type PublishRiskShareVersionCode =
  | "ok"
  | "validation_failed"
  | "forbidden"
  | "selection_mismatch"
  | "active_month_exists"
  | "idempotency_conflict"
  | "request_failed"
  | "invalid_response";

export type PublishRiskShareVersionCheckedParams = {
  companyCode: string;
  actorMembershipId: string;
  lockMonth: string;
  lockTitle: string;
  notes: string | null;
  itemIds: string[];
  /** Canonical positive PostgreSQL bigint decimal strings, paired by index. */
  expectedReviewRevisions: string[];
  idempotencyKey: string;
};

export type PublishRiskShareVersionResult = {
  ok: boolean;
  code: PublishRiskShareVersionCode;
  replayed: boolean;
  itemCount: number;
  workerVisibleCount: number;
  /** Internal linkage only. The API route validates this value but never
   * forwards it to browser code; clients re-read authoritative state. */
  versionLockId: string | null;
};

type RawPublishRiskShareVersionRow = {
  ok?: unknown;
  code?: unknown;
  replayed?: unknown;
  version_lock_id?: unknown;
  item_count?: unknown;
  worker_visible_count?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_REDACTION_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

const KNOWN_RPC_CODES = new Set<PublishRiskShareVersionCode>([
  "ok",
  "validation_failed",
  "forbidden",
  "selection_mismatch",
  "active_month_exists",
  "idempotency_conflict",
]);

const RAW_RESPONSE_FIELDS = new Set([
  "ok",
  "code",
  "replayed",
  "version_lock_id",
  "item_count",
  "worker_visible_count",
]);

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function scrubRpcErrorMessage(rawMessage: string): string {
  return rawMessage
    .replace(UUID_REDACTION_PATTERN, "[uuid]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 240);
}

function failClosed(
  code: Exclude<PublishRiskShareVersionCode, "ok">,
): PublishRiskShareVersionResult {
  return {
    ok: false,
    code,
    replayed: false,
    itemCount: 0,
    workerVisibleCount: 0,
    versionLockId: null,
  };
}

function validatePublishRiskShareVersionResponse(
  data: unknown,
  requestedItemCount: number,
): PublishRiskShareVersionResult {
  if (!Array.isArray(data) || data.length !== 1) {
    return failClosed("invalid_response");
  }

  const rawRow = data[0];

  if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
    return failClosed("invalid_response");
  }

  const rawKeys = Object.keys(rawRow);

  if (
    rawKeys.length !== RAW_RESPONSE_FIELDS.size ||
    rawKeys.some((key) => !RAW_RESPONSE_FIELDS.has(key))
  ) {
    return failClosed("invalid_response");
  }

  const row = rawRow as RawPublishRiskShareVersionRow;
  const code = typeof row.code === "string" ? row.code : "";

  if (
    typeof row.ok !== "boolean" ||
    typeof row.replayed !== "boolean" ||
    !KNOWN_RPC_CODES.has(code as PublishRiskShareVersionCode)
  ) {
    return failClosed("invalid_response");
  }

  const ok = row.ok;
  const replayed = row.replayed;

  if (ok !== (code === "ok")) {
    return failClosed("invalid_response");
  }

  const itemCount = row.item_count;
  const workerVisibleCount = row.worker_visible_count;

  if (
    typeof itemCount !== "number" ||
    !Number.isInteger(itemCount) ||
    typeof workerVisibleCount !== "number" ||
    !Number.isInteger(workerVisibleCount)
  ) {
    return failClosed("invalid_response");
  }

  if (ok) {
    if (
      typeof row.version_lock_id !== "string" ||
      !UUID_PATTERN.test(row.version_lock_id) ||
      itemCount !== requestedItemCount ||
      itemCount < 1 ||
      itemCount > 200 ||
      workerVisibleCount < 0 ||
      workerVisibleCount > itemCount
    ) {
      return failClosed("invalid_response");
    }

    return {
      ok: true,
      code: "ok",
      replayed,
      itemCount,
      workerVisibleCount,
      versionLockId: row.version_lock_id,
    };
  }

  if (
    replayed ||
    row.version_lock_id !== null ||
    itemCount !== 0 ||
    workerVisibleCount !== 0
  ) {
    return failClosed("invalid_response");
  }

  return failClosed(code as Exclude<PublishRiskShareVersionCode, "ok">);
}

/** Server-only boundary for
 * public.publish_risk_share_version_for_tenant_checked.
 * The RPC re-validates membership and the transaction-time Item revisions,
 * locks the explicit Item set, enforces active-month/idempotency rules,
 * writes the Version snapshot, and locks live Items atomically. */
export async function publishRiskShareVersionForTenantChecked(
  params: PublishRiskShareVersionCheckedParams,
): Promise<PublishRiskShareVersionResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return failClosed("request_failed");
  }

  if (
    params.itemIds.length < 1 ||
    params.itemIds.length > 200 ||
    params.itemIds.length !== params.expectedReviewRevisions.length
  ) {
    return failClosed("request_failed");
  }

  const seenItemIds = new Set<string>();

  for (let index = 0; index < params.itemIds.length; index += 1) {
    const itemId = params.itemIds[index];
    const revision = params.expectedReviewRevisions[index];
    const normalizedItemId = itemId.toLowerCase();

    if (
      !UUID_PATTERN.test(itemId) ||
      seenItemIds.has(normalizedItemId) ||
      !/^[1-9][0-9]*$/.test(revision) ||
      BigInt(revision) > BigInt("9223372036854775807")
    ) {
      return failClosed("request_failed");
    }

    seenItemIds.add(normalizedItemId);
  }

  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/publish_risk_share_version_for_tenant_checked`,
      {
        method: "POST",
        headers: {
          apikey: supabaseServiceRoleKey,
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_company_code: params.companyCode,
          p_actor_membership_id: params.actorMembershipId,
          p_lock_month: params.lockMonth,
          p_lock_title: params.lockTitle,
          p_notes: params.notes,
          p_item_ids: params.itemIds,
          p_expected_review_revisions: params.expectedReviewRevisions,
          p_idempotency_key: params.idempotencyKey,
        }),
        cache: "no-store",
      },
    );
  } catch {
    return failClosed("request_failed");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => undefined);
    const rawMessage =
      errorData && typeof errorData === "object" && !Array.isArray(errorData) &&
      typeof (errorData as { message?: unknown }).message === "string"
        ? (errorData as { message: string }).message
        : "";
    const errorCode =
      errorData && typeof errorData === "object" && !Array.isArray(errorData) &&
      typeof (errorData as { code?: unknown }).code === "string"
        ? (errorData as { code: string }).code
        : null;

    console.error("[tenant-risk-share-publish-checked-rpc] request failed", {
      status: response.status,
      statusText: response.statusText,
      errorCode,
      safeMessage: scrubRpcErrorMessage(rawMessage) || null,
      requestedItemCount: params.itemIds.length,
    });

    return failClosed("request_failed");
  }

  const data = await response.json().catch(() => undefined);
  const result = validatePublishRiskShareVersionResponse(
    data,
    params.itemIds.length,
  );

  if (result.code === "invalid_response") {
    console.error("[tenant-risk-share-publish-checked-rpc] unexpected response shape", {
      responseKind: Array.isArray(data) ? "array" : typeof data,
      rowCount: Array.isArray(data) ? data.length : undefined,
      requestedItemCount: params.itemIds.length,
    });
  }

  return result;
}
