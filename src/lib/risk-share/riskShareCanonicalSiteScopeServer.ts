import "server-only";

import {
  getDefaultTenantSiteConfigByTenantCode,
  listTenantSitesByTenantCode,
} from "@/lib/supabaseServer";
import { resolveRiskShareSingleSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";

export async function resolveRiskShareCanonicalSiteScopeForTenant(
  tenantCode: string,
  registryDefaultSiteId: string | null,
) {
  const [defaultSite, tenantSites] = await Promise.all([
    getDefaultTenantSiteConfigByTenantCode(tenantCode),
    listTenantSitesByTenantCode(tenantCode),
  ]);
  const scope = resolveRiskShareSingleSiteScope(
    defaultSite,
    tenantSites,
    registryDefaultSiteId,
  );

  if (!scope.ok || !scope.siteId) {
    return { ok: false as const };
  }

  return { ok: true as const, siteId: scope.siteId };
}
