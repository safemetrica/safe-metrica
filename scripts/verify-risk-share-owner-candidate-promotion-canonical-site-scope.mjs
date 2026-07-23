import fs from "node:fs";

const route = fs.readFileSync(
  "src/app/api/owner/risk-share-items/create-from-candidate/route.ts",
  "utf8",
);

const tenantLookup = route.indexOf("getTenantRegistryConfigByCode(companyCode)");
const siteGuard = route.indexOf("const siteScope = tenant");
const candidateLookup = route.indexOf(
  "findCandidate(candidateId, tenant.code, siteScope.siteId)",
);
const duplicateLookup = route.indexOf("findExistingShareItem(");
const candidateInsert = route.indexOf("insertRiskShareItemRecord({");

const checks = [
  [
    "Owner Candidate promotion resolves canonical tenant and site before record reads",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && route.includes('error: "site_scope_unavailable"')
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < candidateLookup,
  ],
  [
    "Exact Candidate read binds tenant, Candidate, and canonical site",
    route.includes("async function findCandidate(")
      && route.includes('select:\n      "id,source_id,company_code')
      && route.includes("raw_payload,site_id")
      && route.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && route.includes("candidate.company_code?.toLowerCase() !== companyCode.toLowerCase()")
      && route.includes("candidate.site_id?.toLowerCase() !== siteId.toLowerCase()"),
  ],
  [
    "Duplicate Share Item read and insert stay in canonical tenant/site lineage",
    route.includes("async function findExistingShareItem(")
      && route.includes('select: "id,site_id"')
      && route.match(/applyRiskShareDefaultSiteScope\(query, siteId\)/g)?.length === 2
      && duplicateLookup !== -1
      && duplicateLookup < candidateInsert
      && route.includes("company_code: tenant.code,"),
  ],
  [
    "Existing Share Item insert and database contracts remain unchanged",
    route.includes("insertRiskShareItemRecord({")
      && !route.includes("p_site_id:")
      && !route.includes("service_role")
      && !route.includes("updateSupabase")
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
  `PASS: ${checks.length} Owner Candidate promotion canonical-site contract checks`,
);
