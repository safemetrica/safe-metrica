import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const route = read(
  "src/app/api/owner/risk-share-version-locks/create/route.ts",
);
const page = read(
  "src/app/owner/risk-share-activation/version-lock/page.tsx",
);

const tenantLookup = route.indexOf("getTenantRegistryConfigByCode(companyCode)");
const siteGuard = route.indexOf("const siteScope = tenant");
const itemPreflight = route.indexOf(
  "const selection = await fetchEligibleVersionLockItems(",
);
const rpcCall = route.indexOf("const rpcResult = await callCreateVersionLockRpc({");

const pageSiteGuard = page.indexOf("const siteScope = tenant");
const pageVersionRead = page.indexOf("await fetchVersionLockResult(");

const checks = [
  [
    "Owner Version Lock resolves canonical tenant and site before Item preflight",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && route.includes('error: "site_scope_unavailable"')
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < itemPreflight,
  ],
  [
    "Eligible Item preflight requires exact canonical site and lock eligibility",
    route.includes("async function fetchEligibleVersionLockItems(")
      && route.includes("site_id: `eq.${siteId}`")
      && route.includes('share_status: "eq.customer_confirmed"')
      && route.includes('customer_check_status: "eq.confirmed"')
      && route.includes('version_lock_id: "is.null"')
      && route.includes("row.site_id?.toLowerCase() === siteId.toLowerCase()"),
  ],
  [
    "Selection mismatch and oversized sets fail closed before the RPC",
    route.includes("rows.length > 200")
      && route.includes("requestedSet.size !== uniqueIds.size")
      && route.includes('error: "version_lock_selection_changed"')
      && itemPreflight !== -1
      && rpcCall !== -1
      && itemPreflight < rpcCall,
  ],
  [
    "Existing Version Lock RPC receives only canonical tenant and preflighted IDs",
    route.includes("/rest/v1/rpc/create_risk_share_version_lock")
      && route.includes("companyCode: tenant.code,")
      && route.includes("itemIds: eligibleItemIds,")
      && route.includes("p_item_ids: params.itemIds")
      && !route.includes("p_site_id:"),
  ],
  [
    "Version Lock result page resolves canonical site before exact Version read",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.includes("tenant.defaultSiteId")
      && page.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && page.includes("notes,site_id")
      && pageSiteGuard !== -1
      && pageSiteGuard < pageVersionRead,
  ],
  [
    "Version Lock preserves RPC signature, snapshot, and policy contracts",
    !route.includes("updateSupabase")
      && !route.includes("deleteSupabase")
      && !page.includes("service_role")
      && route.includes("selection_mismatch")
      && route.includes("duplicate_lock"),
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
  `PASS: ${checks.length} Owner Version Lock canonical-site contract checks`,
);
