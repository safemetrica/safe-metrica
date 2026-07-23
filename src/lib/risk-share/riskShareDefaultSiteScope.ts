import type { TenantSiteConfig } from "@/lib/supabaseServer";

export function applyRiskShareDefaultSiteScope(query: URLSearchParams, siteId: string | null) {
  if (siteId) {
    query.set("or", `(site_id.eq.${siteId},site_id.is.null)`);
    return;
  }

  query.set("site_id", "is.null");
}

export type RiskShareSingleSiteScope =
  | { ok: true; siteId: string | null; mode: "canonical" | "legacy_unconfigured" }
  | {
      ok: false;
      reason:
        | "multiple_active_sites"
        | "active_site_without_matching_default"
        | "archived_default_site"
        | "multiple_default_sites"
        | "registry_default_site_mismatch";
    };

export function resolveRiskShareSingleSiteScope(
  defaultSite: TenantSiteConfig | null,
  tenantSites: TenantSiteConfig[],
  registryDefaultSiteId: string | null,
): RiskShareSingleSiteScope {
  const activeSites = tenantSites.filter((site) => site.status === "active");
  const defaultSites = tenantSites.filter((site) => site.isDefault);

  if (defaultSites.length > 1) {
    return { ok: false, reason: "multiple_default_sites" };
  }

  if (activeSites.length > 1) {
    return { ok: false, reason: "multiple_active_sites" };
  }

  if (activeSites.length === 1) {
    if (!defaultSite || defaultSite.id !== activeSites[0].id || !activeSites[0].isDefault) {
      return { ok: false, reason: "active_site_without_matching_default" };
    }

    if (registryDefaultSiteId !== defaultSite.id) {
      return { ok: false, reason: "registry_default_site_mismatch" };
    }

    return { ok: true, siteId: defaultSite.id, mode: "canonical" };
  }

  if (defaultSites.some((site) => site.status === "archived")) {
    return { ok: false, reason: "archived_default_site" };
  }

  if (registryDefaultSiteId) {
    return { ok: false, reason: "registry_default_site_mismatch" };
  }

  return { ok: true, siteId: null, mode: "legacy_unconfigured" };
}
