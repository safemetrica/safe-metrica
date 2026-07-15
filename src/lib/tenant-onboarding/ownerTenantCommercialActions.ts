import "server-only";

import {
  getDefaultTenantSiteConfigByTenantCode,
  getTenantRegistryConfigByCode,
  selectSupabaseExportRows,
  type TenantMembershipRole,
  type TenantMembershipRow,
  type TenantMembershipStatus,
  type TenantRegistryConfig,
} from "@/lib/supabaseServer";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

const ELIGIBLE_TENANT_SERVICE_MODES = new Set(["risk_share_pack", "full_safemetrica"]);
const ELIGIBLE_TENANT_STATUSES = new Set(["onboarding", "active"]);
const EXISTING_MEMBERSHIP_STATUSES = ["invited", "active", "suspended"];
const ACTIVE_MANAGER_ROLES = new Set<TenantMembershipRole>(["tenant_admin", "tenant_manager"]);
const EXISTING_MEMBERSHIP_LOOKUP_LIMIT = 200;

function readRowString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export type OwnerTenantActionFailureReason =
  | "invalid_company"
  | "tenant_not_found"
  | "tenant_not_eligible"
  | "membership_exists"
  | "membership_insert_failed"
  | "default_site_required"
  | "active_manager_required"
  | "activation_conflict"
  | "activation_failed"
  | "missing_server_config";

type EligibleTenantResult =
  | { ok: true; tenant: TenantRegistryConfig }
  | { ok: false; reason: OwnerTenantActionFailureReason };

export function normalizeStrictOwnerCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();

  return COMPANY_CODE_PATTERN.test(value) ? value : null;
}

async function resolveEligibleTenant(rawCompanyCode: string): Promise<EligibleTenantResult> {
  const companyCode = normalizeStrictOwnerCompanyCode(rawCompanyCode);

  if (!companyCode) {
    return { ok: false, reason: "invalid_company" };
  }

  let tenant: TenantRegistryConfig | null;

  try {
    tenant = await getTenantRegistryConfigByCode(companyCode);
  } catch {
    return { ok: false, reason: "missing_server_config" };
  }

  if (!tenant) {
    return { ok: false, reason: "tenant_not_found" };
  }

  if (!tenant.id || !tenant.id.trim()) {
    return { ok: false, reason: "tenant_not_eligible" };
  }

  if (
    !ELIGIBLE_TENANT_SERVICE_MODES.has(tenant.serviceMode) ||
    !ELIGIBLE_TENANT_STATUSES.has(tenant.status)
  ) {
    return { ok: false, reason: "tenant_not_eligible" };
  }

  return { ok: true, tenant };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function findExistingTenantMembership(
  tenantId: string,
  tenantCode: string,
  normalizedEmail: string,
): Promise<TenantMembershipRow | null> {
  const query = new URLSearchParams({
    select: "id,tenant_id,tenant_code,user_email,role,status",
    tenant_id: `eq.${tenantId}`,
    tenant_code: `eq.${tenantCode}`,
    status: `in.(${EXISTING_MEMBERSHIP_STATUSES.join(",")})`,
    limit: String(EXISTING_MEMBERSHIP_LOOKUP_LIMIT),
  });

  const rows = await selectSupabaseExportRows<TenantMembershipRow>("tenant_membership", query);

  return (
    rows.find((row) => readRowString(row.user_email).toLowerCase() === normalizedEmail) ?? null
  );
}

async function findActiveManagerMembership(
  tenantId: string,
  tenantCode: string,
): Promise<TenantMembershipRow | null> {
  const query = new URLSearchParams({
    select: "id,tenant_id,tenant_code,role,status",
    tenant_id: `eq.${tenantId}`,
    tenant_code: `eq.${tenantCode}`,
    status: "eq.active",
    role: `in.(${Array.from(ACTIVE_MANAGER_ROLES).join(",")})`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<TenantMembershipRow>("tenant_membership", query);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const rowTenantId = readRowString(row.tenant_id);
  const rowTenantCode = readRowString(row.tenant_code);
  const rowStatus = readRowString(row.status);
  const rowRole = readRowString(row.role);

  if (
    rowTenantId !== tenantId ||
    rowTenantCode !== tenantCode ||
    rowStatus !== "active" ||
    !ACTIVE_MANAGER_ROLES.has(rowRole as TenantMembershipRole)
  ) {
    return null;
  }

  return row;
}

async function insertTenantMembershipRow(record: Record<string, unknown>) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false as const };
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/tenant_membership`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  return { ok: res.ok as boolean };
}

async function patchTenantRegistryStatusToActive(tenantId: string) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false as const, activated: false as const };
  }

  const query = new URLSearchParams({
    id: `eq.${tenantId}`,
    status: "eq.onboarding",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/tenant_registry?${query.toString()}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      status: "active",
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    return { ok: false as const, activated: false as const };
  }

  const data = await res.json().catch(() => []);
  const activated = Array.isArray(data) && data.length > 0;

  return { ok: true as const, activated };
}

export type CreateOwnerTenantMembershipInput = {
  companyCode: string;
  managerEmail: string;
  displayName: string;
  role: Extract<TenantMembershipRole, "tenant_admin" | "tenant_manager">;
  membershipStatus: Extract<TenantMembershipStatus, "invited" | "active">;
};

export type CreateOwnerTenantMembershipResult =
  | { ok: true; status: "created" | "already_exists"; companyCode: string }
  | { ok: false; reason: OwnerTenantActionFailureReason };

export async function createOwnerTenantMembership(
  input: CreateOwnerTenantMembershipInput,
): Promise<CreateOwnerTenantMembershipResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;

  let existingMembership: TenantMembershipRow | null;

  try {
    existingMembership = await findExistingTenantMembership(
      tenant.id,
      tenant.code,
      input.managerEmail,
    );
  } catch {
    return { ok: false, reason: "missing_server_config" };
  }

  if (existingMembership) {
    return { ok: true, status: "already_exists", companyCode: tenant.code };
  }

  const insertResult = await insertTenantMembershipRow({
    tenant_id: tenant.id,
    tenant_code: tenant.code,
    user_id: null,
    user_email: input.managerEmail,
    display_name: input.displayName || null,
    role: input.role,
    status: input.membershipStatus,
    invited_by: "owner_console",
    accepted_at: input.membershipStatus === "active" ? new Date().toISOString() : null,
    revoked_at: null,
    raw_payload: {
      source: "owner_membership_create_v1",
      createdBy: "owner_console",
    },
  });

  if (!insertResult.ok) {
    let recheckedMembership: TenantMembershipRow | null;

    try {
      recheckedMembership = await findExistingTenantMembership(
        tenant.id,
        tenant.code,
        input.managerEmail,
      );
    } catch {
      return { ok: false, reason: "membership_insert_failed" };
    }

    if (recheckedMembership) {
      return { ok: true, status: "already_exists", companyCode: tenant.code };
    }

    return { ok: false, reason: "membership_insert_failed" };
  }

  return { ok: true, status: "created", companyCode: tenant.code };
}

export type ActivateOwnerTenantInput = {
  companyCode: string;
};

export type ActivateOwnerTenantResult =
  | { ok: true; status: "activated" | "already_active"; companyCode: string }
  | { ok: false; reason: OwnerTenantActionFailureReason };

export async function activateOwnerTenant(
  input: ActivateOwnerTenantInput,
): Promise<ActivateOwnerTenantResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;

  // Verifies the real tenant_sites default row -- not just
  // tenant_registry.default_site_name, which is only a compatibility
  // mirror. Requires all three: an active default site exists, the
  // registry's default_site_id actually points at it (catching a partial
  // failure where a site was created but the registry sync did not run),
  // and the site name itself is non-empty.
  let defaultSite: Awaited<ReturnType<typeof getDefaultTenantSiteConfigByTenantCode>>;

  try {
    defaultSite = await getDefaultTenantSiteConfigByTenantCode(tenant.code);
  } catch {
    return { ok: false, reason: "missing_server_config" };
  }

  if (
    !defaultSite ||
    !defaultSite.siteName.trim() ||
    defaultSite.id !== tenant.defaultSiteId
  ) {
    return { ok: false, reason: "default_site_required" };
  }

  let activeManagerMembership: TenantMembershipRow | null;

  try {
    activeManagerMembership = await findActiveManagerMembership(tenant.id, tenant.code);
  } catch {
    return { ok: false, reason: "missing_server_config" };
  }

  if (!activeManagerMembership) {
    return { ok: false, reason: "active_manager_required" };
  }

  if (tenant.status === "active") {
    return { ok: true, status: "already_active", companyCode: tenant.code };
  }

  const patchResult = await patchTenantRegistryStatusToActive(tenant.id);

  if (!patchResult.ok) {
    return { ok: false, reason: "activation_failed" };
  }

  if (!patchResult.activated) {
    return { ok: false, reason: "activation_conflict" };
  }

  return { ok: true, status: "activated", companyCode: tenant.code };
}
