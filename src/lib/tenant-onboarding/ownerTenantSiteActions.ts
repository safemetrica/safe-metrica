import "server-only";

import {
  getTenantRegistryConfigByCode,
  listTenantSitesByTenantCode,
  type TenantSiteConfig,
} from "@/lib/supabaseServer";

const SITE_NAME_MAX_LENGTH = 160;
const INDUSTRY_PROFILE_MAX_LENGTH = 80;
const WORKER_COUNT_BAND_MAX_LENGTH = 40;
const PROFILE_LIST_MAX_ITEMS = 20;
const PROFILE_LIST_ITEM_MAX_LENGTH = 80;

export type OwnerTenantSiteActionFailureReason =
  | "invalid_company"
  | "tenant_not_found"
  | "tenant_not_eligible"
  | "site_name_required"
  | "site_name_too_long"
  | "profile_list_invalid"
  | "site_not_found"
  | "site_insert_failed"
  | "site_update_failed"
  | "default_already_exists"
  | "site_tenant_mismatch"
  | "site_not_active"
  | "cannot_archive_default_site"
  | "missing_server_config";

const ELIGIBLE_TENANT_SERVICE_MODES = new Set(["risk_share_pack", "full_safemetrica"]);
const ELIGIBLE_TENANT_STATUSES = new Set(["onboarding", "active"]);

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();

  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : null;
}

/** Bounded text list matching the tenant_sites_major_processes_bounds_check /
 * tenant_sites_major_equipment_bounds_check DB constraints -- rejected here
 * with a friendly reason before ever reaching a raw constraint violation. */
function normalizeProfileList(rawItems: string[]): { ok: true; value: string[] | null } | { ok: false } {
  const items = rawItems
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, PROFILE_LIST_MAX_ITEMS + 1);

  if (items.length > PROFILE_LIST_MAX_ITEMS) {
    return { ok: false };
  }

  if (items.some((item) => item.length > PROFILE_LIST_ITEM_MAX_LENGTH)) {
    return { ok: false };
  }

  return { ok: true, value: items.length > 0 ? items : null };
}

type TenantRegistryConfigResult = NonNullable<Awaited<ReturnType<typeof getTenantRegistryConfigByCode>>>;

type EligibleTenantResult =
  | { ok: true; tenant: TenantRegistryConfigResult }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

async function resolveEligibleTenant(rawCompanyCode: string): Promise<EligibleTenantResult> {
  const companyCode = normalizeStrictCompanyCode(rawCompanyCode);

  if (!companyCode) {
    return { ok: false, reason: "invalid_company" };
  }

  let tenant: Awaited<ReturnType<typeof getTenantRegistryConfigByCode>>;

  try {
    tenant = await getTenantRegistryConfigByCode(companyCode);
  } catch {
    return { ok: false, reason: "missing_server_config" };
  }

  if (!tenant || !tenant.id) {
    return { ok: false, reason: "tenant_not_found" };
  }

  if (
    !ELIGIBLE_TENANT_SERVICE_MODES.has(tenant.serviceMode) ||
    !ELIGIBLE_TENANT_STATUSES.has(tenant.status)
  ) {
    return { ok: false, reason: "tenant_not_eligible" };
  }

  return { ok: true, tenant };
}

async function supabaseFetch(path: string, init: RequestInit) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

export type ListOwnerTenantSitesResult =
  | { ok: true; companyCode: string; sites: TenantSiteConfig[] }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

export async function listOwnerTenantSites(rawCompanyCode: string): Promise<ListOwnerTenantSitesResult> {
  const tenantResolution = await resolveEligibleTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  try {
    const sites = await listTenantSitesByTenantCode(tenantResolution.tenant.code);
    return { ok: true, companyCode: tenantResolution.tenant.code, sites };
  } catch {
    return { ok: false, reason: "missing_server_config" };
  }
}

export type CreateOwnerTenantSiteInput = {
  companyCode: string;
  siteName: string;
  industryProfile: string;
  majorProcesses: string[];
  majorEquipment: string[];
  workerCountBand: string;
  usesExternalWorkforce: "unset" | "true" | "false";
  hasWorkerRepresentative: "unset" | "true" | "false";
};

export type CreateOwnerTenantSiteResult =
  | { ok: true; companyCode: string }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

function normalizeTristate(value: "unset" | "true" | "false"): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/** Plain single-row insert -- always created with is_default=false. A newly
 * created site is only ever promoted to default through the dedicated
 * setOwnerTenantDefaultSite / createOwnerTenantDefaultSite RPC calls below,
 * so this insert alone never needs cross-table atomicity. */
export async function createOwnerTenantSite(
  input: CreateOwnerTenantSiteInput
): Promise<CreateOwnerTenantSiteResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;
  const siteName = input.siteName.trim();

  if (!siteName) {
    return { ok: false, reason: "site_name_required" };
  }

  if (siteName.length > SITE_NAME_MAX_LENGTH) {
    return { ok: false, reason: "site_name_too_long" };
  }

  const industryProfile = input.industryProfile.trim().slice(0, INDUSTRY_PROFILE_MAX_LENGTH) || null;
  const workerCountBand = input.workerCountBand.trim().slice(0, WORKER_COUNT_BAND_MAX_LENGTH) || null;

  const majorProcesses = normalizeProfileList(input.majorProcesses);
  const majorEquipment = normalizeProfileList(input.majorEquipment);

  if (!majorProcesses.ok || !majorEquipment.ok) {
    return { ok: false, reason: "profile_list_invalid" };
  }

  const res = await supabaseFetch("/rest/v1/tenant_sites", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      tenant_id: tenant.id,
      tenant_code: tenant.code,
      site_name: siteName,
      is_default: false,
      status: "active",
      industry_profile: industryProfile,
      major_processes: majorProcesses.value,
      major_equipment: majorEquipment.value,
      worker_count_band: workerCountBand,
      uses_external_workforce: normalizeTristate(input.usesExternalWorkforce),
      has_worker_representative: normalizeTristate(input.hasWorkerRepresentative),
    }),
  });

  if (!res || !res.ok) {
    return { ok: false, reason: "site_insert_failed" };
  }

  return { ok: true, companyCode: tenant.code };
}

export type UpdateOwnerTenantSiteProfileInput = {
  companyCode: string;
  siteId: string;
  siteName: string;
  industryProfile: string;
  majorProcesses: string[];
  majorEquipment: string[];
  workerCountBand: string;
  usesExternalWorkforce: "unset" | "true" | "false";
  hasWorkerRepresentative: "unset" | "true" | "false";
};

export type UpdateOwnerTenantSiteProfileResult =
  | { ok: true; companyCode: string }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

/** Plain single-row update, scoped by both site id and tenant_id -- a single
 * UPDATE statement is already atomic; this never touches tenant_registry,
 * so it does not need the RPC path. */
export async function updateOwnerTenantSiteProfile(
  input: UpdateOwnerTenantSiteProfileInput
): Promise<UpdateOwnerTenantSiteProfileResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;
  const siteName = input.siteName.trim();

  if (!siteName) {
    return { ok: false, reason: "site_name_required" };
  }

  if (siteName.length > SITE_NAME_MAX_LENGTH) {
    return { ok: false, reason: "site_name_too_long" };
  }

  const industryProfile = input.industryProfile.trim().slice(0, INDUSTRY_PROFILE_MAX_LENGTH) || null;
  const workerCountBand = input.workerCountBand.trim().slice(0, WORKER_COUNT_BAND_MAX_LENGTH) || null;

  const majorProcesses = normalizeProfileList(input.majorProcesses);
  const majorEquipment = normalizeProfileList(input.majorEquipment);

  if (!majorProcesses.ok || !majorEquipment.ok) {
    return { ok: false, reason: "profile_list_invalid" };
  }

  const query = new URLSearchParams({
    id: `eq.${input.siteId}`,
    tenant_id: `eq.${tenant.id}`,
  });

  const res = await supabaseFetch(`/rest/v1/tenant_sites?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      site_name: siteName,
      industry_profile: industryProfile,
      major_processes: majorProcesses.value,
      major_equipment: majorEquipment.value,
      worker_count_band: workerCountBand,
      uses_external_workforce: normalizeTristate(input.usesExternalWorkforce),
      has_worker_representative: normalizeTristate(input.hasWorkerRepresentative),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res || !res.ok) {
    return { ok: false, reason: "site_update_failed" };
  }

  const data = await res.json().catch(() => []);

  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, reason: "site_not_found" };
  }

  return { ok: true, companyCode: tenant.code };
}

export type SetOwnerTenantSiteStatusInput = {
  companyCode: string;
  siteId: string;
  status: "active" | "archived";
};

export type SetOwnerTenantSiteStatusResult =
  | { ok: true; companyCode: string }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

/** Plain single-row status update. Archiving the current default site is
 * rejected up front (not left to the DB's
 * tenant_sites_default_requires_active_check to surface as a raw constraint
 * error) -- Owner must set a different default first. */
export async function setOwnerTenantSiteStatus(
  input: SetOwnerTenantSiteStatusInput
): Promise<SetOwnerTenantSiteStatusResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;

  if (input.status === "archived") {
    let sites: TenantSiteConfig[];

    try {
      sites = await listTenantSitesByTenantCode(tenant.code);
    } catch {
      return { ok: false, reason: "missing_server_config" };
    }

    const targetSite = sites.find((site) => site.id === input.siteId);

    if (!targetSite) {
      return { ok: false, reason: "site_not_found" };
    }

    if (targetSite.isDefault) {
      return { ok: false, reason: "cannot_archive_default_site" };
    }
  }

  const query = new URLSearchParams({
    id: `eq.${input.siteId}`,
    tenant_id: `eq.${tenant.id}`,
  });

  const res = await supabaseFetch(`/rest/v1/tenant_sites?${query.toString()}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: input.status,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res || !res.ok) {
    return { ok: false, reason: "site_update_failed" };
  }

  const data = await res.json().catch(() => []);

  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, reason: "site_not_found" };
  }

  return { ok: true, companyCode: tenant.code };
}

export type SetOwnerTenantDefaultSiteInput = {
  companyCode: string;
  siteId: string;
};

export type SetOwnerTenantDefaultSiteResult =
  | { ok: true; companyCode: string }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

/** Calls the set_tenant_default_site RPC (see the tenant_sites migration)
 * so the tenant_sites default flag and the tenant_registry compatibility
 * fields update in one transaction, never as two separate requests. */
export async function setOwnerTenantDefaultSite(
  input: SetOwnerTenantDefaultSiteInput
): Promise<SetOwnerTenantDefaultSiteResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;

  const res = await supabaseFetch("/rest/v1/rpc/set_tenant_default_site", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_tenant_id: tenant.id,
      p_site_id: input.siteId,
    }),
  });

  if (!res || !res.ok) {
    return { ok: false, reason: "missing_server_config" };
  }

  const data = await res.json().catch(() => undefined);
  const row = Array.isArray(data) ? data[0] : undefined;

  if (!row || row.ok !== true) {
    const reason = typeof row?.reason === "string" ? row.reason : "site_update_failed";

    switch (reason) {
      case "site_not_found":
        return { ok: false, reason: "site_not_found" };
      case "site_tenant_mismatch":
        return { ok: false, reason: "site_tenant_mismatch" };
      case "site_not_active":
        return { ok: false, reason: "site_not_active" };
      case "tenant_not_found":
        return { ok: false, reason: "tenant_not_found" };
      default:
        return { ok: false, reason: "site_update_failed" };
    }
  }

  return { ok: true, companyCode: tenant.code };
}

export type CreateOwnerTenantDefaultSiteInput = {
  companyCode: string;
  siteName: string;
};

export type CreateOwnerTenantDefaultSiteResult =
  | { ok: true; companyCode: string; siteId: string }
  | { ok: false; reason: OwnerTenantSiteActionFailureReason };

/** Calls the create_tenant_default_site RPC -- inserts the tenant's first
 * default site and syncs tenant_registry.default_site_id /
 * default_site_name in one transaction. Used by the tenant-onboarding
 * create route when an Owner provides a default_site_name at tenant
 * creation time. */
export async function createOwnerTenantDefaultSite(
  input: CreateOwnerTenantDefaultSiteInput
): Promise<CreateOwnerTenantDefaultSiteResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;
  const siteName = input.siteName.trim().slice(0, SITE_NAME_MAX_LENGTH);

  if (!siteName) {
    return { ok: false, reason: "site_name_required" };
  }

  const res = await supabaseFetch("/rest/v1/rpc/create_tenant_default_site", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_tenant_id: tenant.id,
      p_tenant_code: tenant.code,
      p_site_name: siteName,
    }),
  });

  if (!res || !res.ok) {
    return { ok: false, reason: "missing_server_config" };
  }

  const data = await res.json().catch(() => undefined);
  const row = Array.isArray(data) ? data[0] : undefined;
  const siteId = typeof row?.id === "string" ? row.id : "";

  if (!row || row.ok !== true || !siteId) {
    const reason = typeof row?.reason === "string" ? row.reason : "site_insert_failed";

    switch (reason) {
      case "tenant_not_found":
        return { ok: false, reason: "tenant_not_found" };
      case "site_name_required":
        return { ok: false, reason: "site_name_required" };
      case "default_already_exists":
        return { ok: false, reason: "default_already_exists" };
      default:
        return { ok: false, reason: "site_insert_failed" };
    }
  }

  return { ok: true, companyCode: tenant.code, siteId };
}
