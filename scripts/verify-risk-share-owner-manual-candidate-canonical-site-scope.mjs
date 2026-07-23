import fs from "node:fs";

const route = fs.readFileSync(
  "src/app/api/owner/risk-share-candidates/create/route.ts",
  "utf8",
);

const tenantLookup = route.indexOf("getTenantRegistryConfigByCode(companyCode)");
const siteGuard = route.indexOf("const siteScope = tenant");
const sourceLookup = route.indexOf(
  "findRiskShareSource(tenant.code, sourceId, siteScope.siteId)",
);
const candidateInsert = route.indexOf(
  "insertRiskShareItemCandidateRecord({",
);

const checks = [
  [
    "Owner manual Candidate route resolves canonical tenant and site before Source lookup",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && route.includes('error: "site_scope_unavailable"')
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < sourceLookup,
  ],
  [
    "Source lookup binds tenant, source, and server-resolved canonical site",
    route.includes("async function findRiskShareSource(")
      && route.includes("companyCode: string,")
      && route.includes("sourceId: string,")
      && route.includes("siteId: string,")
      && route.includes(
        'select: "id,company_code,company_name,source_title,review_status,extraction_status,site_id"',
      )
      && route.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && route.includes("source.company_code?.toLowerCase() !== companyCode.toLowerCase()")
      && route.includes("source.site_id?.toLowerCase() !== siteId.toLowerCase()"),
  ],
  [
    "Canonical Source binding completes before Candidate insert",
    sourceLookup !== -1
      && candidateInsert !== -1
      && sourceLookup < candidateInsert
      && route.includes("company_code: tenant.code,"),
  ],
  [
    "Existing Candidate insert and database contracts remain unchanged",
    route.includes("insertRiskShareItemCandidateRecord({")
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
  `PASS: ${checks.length} Owner manual Candidate canonical-site contract checks`,
);
