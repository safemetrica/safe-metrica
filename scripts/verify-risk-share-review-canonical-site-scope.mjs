import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/risk-share/manager/share-review/page.tsx");
const route = read("src/app/api/risk-share/manager/share-review/route.ts");
const readModel = read("src/lib/risk-share/riskShareManagerReview.ts");
const server = read("src/lib/supabaseServer.ts");

const pageGuard = page.indexOf("const siteScope = await");
const pageRead = page.indexOf(
  "listRiskShareItemsForManagerReview(",
);
const routeGuard = route.indexOf("const siteScope = await");
const routeBodyRead = route.indexOf("request.text()");
const routeMutation = route.indexOf("reviewRiskShareItemForTenant({");
const targetRead = server.indexOf("const targetQuery = new URLSearchParams({");
const rpcCall = server.indexOf("/rest/v1/rpc/review_risk_share_item");

const checks = [
  [
    "Share Review page validates canonical site before the Read Model",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.includes("tenantResolution.tenant.defaultSiteId")
      && page.includes("siteScope.siteId,")
      && pageGuard !== -1
      && pageGuard < pageRead,
  ],
  [
    "Share Review Read Model binds rows to the canonical site",
    readModel.includes("siteId: string,")
      && readModel.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && readModel.indexOf("applyRiskShareDefaultSiteScope(query, siteId)")
        < readModel.indexOf('selectSupabaseExportRows<RiskShareManagerReviewRow>("risk_share_items", query)'),
  ],
  [
    "Share Review mutation validates canonical site before reading the body",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenantResolution.tenant.defaultSiteId")
      && routeGuard !== -1
      && routeGuard < routeBodyRead,
  ],
  [
    "Share Review mutation validates canonical site before the RPC",
    routeGuard !== -1
      && routeGuard < routeMutation
      && route.includes('jsonError(403, "site_scope_unavailable")')
      && route.includes("siteId: siteScope.siteId,"),
  ],
  [
    "Share Review mutation preflights the exact site-bound Item and revision",
    server.includes("siteId: string;")
      && server.includes('id: `eq.${params.itemId}`')
      && server.includes('company_code: `eq.${params.companyCode}`')
      && server.includes("review_revision_text:review_revision::text")
      && server.includes("String(params.expectedRevision)")
      && server.includes('failClosed("stale_revision")')
      && server.includes("`(site_id.eq.${params.siteId},site_id.is.null)`")
      && server.includes('failClosed("target_scope_mismatch")')
      && targetRead !== -1
      && targetRead < rpcCall,
  ],
  [
    "Out-of-scope Item identity is not exposed to the browser",
    route.includes('result.code === "target_scope_mismatch" ? "not_found" : result.code')
      && route.includes("code: responseCode"),
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
