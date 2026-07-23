import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/risk-share/manager/sources/preparation/page.tsx");
const route = read("src/app/api/risk-share/manager/preparation/route.ts");
const readModel = read("src/lib/risk-share/riskSharePreparationReadModel.ts");
const sourceRegistry = read("src/lib/risk-share/riskShareSourceRegistry.ts");

const pageGuard = page.indexOf("const siteScope = await");
const pageRead = page.indexOf(
  "listRiskSharePreparationStateForSource(",
);
const routeGuard = route.indexOf("const siteScope = await");
const routeBodyRead = route.indexOf("request.text()");
const routeSourceScope = route.indexOf(
  "verifyRiskShareSourceRecordScopeForTenant(",
);
const routeMutation = route.indexOf("prepareRiskShareItemsForTenant({");

const checks = [
  [
    "Preparation page validates canonical site before the Read Model",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.includes("tenantResolution.tenant.defaultSiteId")
      && pageGuard !== -1
      && pageGuard < pageRead,
  ],
  [
    "Preparation mutation validates canonical site before reading the body",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenantResolution.tenant.defaultSiteId")
      && routeGuard !== -1
      && routeGuard < routeBodyRead,
  ],
  [
    "Preparation mutation validates canonical site before the RPC",
    routeGuard !== -1
      && routeGuard < routeMutation
      && route.includes('jsonError(403, "site_scope_unavailable")'),
  ],
  [
    "Preparation page passes canonical site into the Source read model",
    page.includes("listRiskSharePreparationStateForSource(")
      && page.includes("siteScope.siteId,")
      && pageGuard < pageRead,
  ],
  [
    "Preparation read model scopes the exact Source to canonical site",
    readModel.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && readModel.includes("id,company_code,site_id,source_title,site_name")
      && readModel.includes("rowId !== sourceId")
      && readModel.includes("rowCompanyCode !== verifiedCompanyCode")
      && readModel.includes("rowSiteId !== null && rowSiteId !== siteId.toLowerCase()"),
  ],
  [
    "Preparation mutation preflights exact Source scope before the RPC",
    routeSourceScope !== -1
      && routeSourceScope < routeMutation
      && route.includes("selectedTenantCode,")
      && route.includes("validatedBody.sourceId,")
      && route.includes("siteScope.siteId,"),
  ],
  [
    "Source scope preflight applies canonical site and legacy NULL continuity",
    sourceRegistry.includes("export async function verifyRiskShareSourceRecordScopeForTenant(")
      && sourceRegistry.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && sourceRegistry.includes('select: "id,company_code,site_id"')
      && sourceRegistry.includes('reason: "not_found"'),
  ],
  [
    "Out-of-scope Source is browser-safe and lookup failure stays retryable",
    route.includes('return jsonError(404, "not_found")')
      && route.includes('sourceScope.reason === "lookup_failed"')
      && route.includes('return jsonError(503, "request_failed")'),
  ],
  [
    "Authentication and membership validation precede canonical site resolution",
    route.indexOf("requireTenantAccessForCurrentSession({") < routeGuard
      && route.indexOf("const actorMembershipId =") < routeGuard,
  ],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
