import "server-only";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TenantActivationInitiator = "self_service_profile" | "owner_console";

export type TenantActivationResult =
  | { ok: true; status: "activated" | "already_active"; eventId: string | null }
  | {
      ok: false;
      reason:
        | "validation_failed"
        | "tenant_not_found"
        | "tenant_not_eligible"
        | "forbidden"
        | "default_site_required"
        | "profile_incomplete"
        | "request_failed"
        | "not_configured";
    };

type TenantActivationRpcRow = {
  ok?: unknown;
  result_code?: unknown;
  tenant_status?: unknown;
  event_id?: unknown;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFailureReason(value: unknown): Extract<TenantActivationResult, { ok: false }>["reason"] {
  const reason = readText(value);
  return [
    "validation_failed",
    "tenant_not_found",
    "tenant_not_eligible",
    "forbidden",
    "default_site_required",
    "profile_incomplete",
  ].includes(reason)
    ? reason as Extract<TenantActivationResult, { ok: false }>["reason"]
    : "request_failed";
}

export async function activateTenantAfterProfile(params: {
  tenantCode: string;
  actorMembershipId: string;
  idempotencyKey: string;
  initiatedBy: TenantActivationInitiator;
}): Promise<TenantActivationResult> {
  const tenantCode = params.tenantCode.trim().toLowerCase();
  const idempotencyKey = params.idempotencyKey.trim();

  if (
    !COMPANY_CODE_PATTERN.test(tenantCode)
    || !UUID_PATTERN.test(params.actorMembershipId)
    || idempotencyKey.length < 1
    || idempotencyKey.length > 200
  ) {
    return { ok: false, reason: "validation_failed" };
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, reason: "not_configured" };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/activate_tenant_after_profile`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      p_company_code: tenantCode,
      p_actor_membership_id: params.actorMembershipId,
      p_idempotency_key: idempotencyKey,
      p_initiated_by: params.initiatedBy,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return { ok: false, reason: "request_failed" };
  }

  const payload = await response.json().catch(() => null);
  const row = (Array.isArray(payload) ? payload[0] : payload) as TenantActivationRpcRow | null;

  if (row?.ok !== true) {
    return { ok: false, reason: normalizeFailureReason(row?.result_code) };
  }

  const status = readText(row.result_code);
  if (
    (status !== "activated" && status !== "already_active")
    || readText(row.tenant_status) !== "active"
  ) {
    return { ok: false, reason: "request_failed" };
  }

  const eventId = readText(row.event_id);
  if (status === "activated" && !UUID_PATTERN.test(eventId)) {
    return { ok: false, reason: "request_failed" };
  }

  return { ok: true, status, eventId: UUID_PATTERN.test(eventId) ? eventId : null };
}
