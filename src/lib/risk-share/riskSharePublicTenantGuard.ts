import "server-only";

import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

const ACTIVE_RISK_SHARE_PUBLIC_SERVICE_MODES = new Set([
  "risk_share_pack",
  "full_safemetrica",
]);

export type ActiveRiskSharePublicTenant = {
  code: string;
  name: string;
  defaultSiteId: string | null;
};

export type RiskShareManagerTenant = ActiveRiskSharePublicTenant & {
  status: "active" | "onboarding";
};

export type ResolveActiveRiskSharePublicTenantResult =
  | { ok: true; tenant: ActiveRiskSharePublicTenant }
  | {
      ok: false;
      reason:
        | "missing_company"
        | "invalid_company"
        | "tenant_not_found"
        | "tenant_inactive"
        | "service_not_enabled"
        | "lookup_failed";
    };

function normalizeRiskSharePublicCompanyCode(rawCompanyCode: string) {
  return rawCompanyCode.trim().toLowerCase();
}

export async function resolveActiveRiskSharePublicTenant(
  rawCompanyCode: string,
): Promise<ResolveActiveRiskSharePublicTenantResult> {
  const companyCode = normalizeRiskSharePublicCompanyCode(rawCompanyCode);

  if (!companyCode) {
    return { ok: false, reason: "missing_company" };
  }

  if (!COMPANY_CODE_PATTERN.test(companyCode)) {
    return { ok: false, reason: "invalid_company" };
  }

  let tenant: Awaited<ReturnType<typeof getTenantRegistryConfigByCode>>;

  try {
    tenant = await getTenantRegistryConfigByCode(companyCode);
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }

  if (!tenant) {
    return { ok: false, reason: "tenant_not_found" };
  }

  if (tenant.status !== "active") {
    return { ok: false, reason: "tenant_inactive" };
  }

  if (!ACTIVE_RISK_SHARE_PUBLIC_SERVICE_MODES.has(tenant.serviceMode)) {
    return { ok: false, reason: "service_not_enabled" };
  }

  return {
    ok: true,
    tenant: {
      code: tenant.code,
      name: tenant.name,
      defaultSiteId: tenant.defaultSiteId,
    },
  };
}

export async function resolveRiskShareManagerTenant(
  rawCompanyCode: string,
): Promise<
  | { ok: true; tenant: RiskShareManagerTenant }
  | Exclude<ResolveActiveRiskSharePublicTenantResult, { ok: true }>
> {
  const companyCode = normalizeRiskSharePublicCompanyCode(rawCompanyCode);

  if (!companyCode) return { ok: false, reason: "missing_company" };
  if (!COMPANY_CODE_PATTERN.test(companyCode)) {
    return { ok: false, reason: "invalid_company" };
  }

  let tenant: Awaited<ReturnType<typeof getTenantRegistryConfigByCode>>;

  try {
    tenant = await getTenantRegistryConfigByCode(companyCode);
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }

  if (!tenant) return { ok: false, reason: "tenant_not_found" };
  if (tenant.status !== "active" && tenant.status !== "onboarding") {
    return { ok: false, reason: "tenant_inactive" };
  }
  if (!ACTIVE_RISK_SHARE_PUBLIC_SERVICE_MODES.has(tenant.serviceMode)) {
    return { ok: false, reason: "service_not_enabled" };
  }

  return {
    ok: true,
    tenant: {
      code: tenant.code,
      name: tenant.name,
      defaultSiteId: tenant.defaultSiteId,
      status: tenant.status,
    },
  };
}
