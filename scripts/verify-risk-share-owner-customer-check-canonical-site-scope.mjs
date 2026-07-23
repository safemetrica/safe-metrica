import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const route = read("src/app/api/owner/risk-share-items/customer-check/route.ts");
const server = read("src/lib/supabaseServer.ts");

const tenantLookup = route.indexOf("getTenantRegistryConfigByCode(companyCode)");
const siteGuard = route.indexOf("const siteScope = tenant");
const itemLookup = route.indexOf(
  "findShareItem(itemId, tenant.code, siteScope.siteId)",
);
const mutation = route.indexOf("updateRiskShareItemCustomerCheckStatus(");

const helperStart = server.indexOf(
  "export async function updateRiskShareItemCustomerCheckStatus(",
);
const helperEnd = server.indexOf(
  "export type RiskShareVersionLockStatus",
  helperStart,
);
const helper = server.slice(helperStart, helperEnd);

const checks = [
  [
    "Owner Customer Check resolves canonical tenant and site before Item read",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && route.includes('error: "site_scope_unavailable"')
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < itemLookup,
  ],
  [
    "Exact Item preflight binds tenant, Item, and canonical site",
    route.includes("async function findShareItem(")
      && route.includes("version_lock_id,site_id")
      && route.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && route.includes("item.company_code?.toLowerCase() !== companyCode.toLowerCase()")
      && route.includes("item.site_id?.toLowerCase() !== siteId.toLowerCase()"),
  ],
  [
    "Customer Check PATCH receives only server-resolved tenant and site",
    mutation !== -1
      && itemLookup < mutation
      && route.includes("itemId,\n    tenant.code,\n    siteScope.siteId,"),
  ],
  [
    "Customer Check PATCH itself filters tenant, Item, and canonical site",
    helper.includes("siteId: string,")
      && helper.includes("id: `eq.${itemId}`")
      && helper.includes("company_code: `eq.${companyCode}`")
      && helper.includes("or: `(site_id.eq.${siteId},site_id.is.null)`"),
  ],
  [
    "Customer Check keeps existing table and database contracts",
    helper.includes("/rest/v1/risk_share_items?")
      && helper.includes('method: "PATCH"')
      && !helper.includes("/rpc/")
      && !route.includes("service_role")
      && !route.includes("deleteSupabase"),
  ],
];

for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(
  `PASS: ${checks.length} Owner Customer Check canonical-site contract checks`,
);
