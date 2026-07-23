import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/owner/risk-share/sources/mapping/page.tsx");
const route = read("src/app/api/owner/risk-share/sources/candidates/route.ts");
const helper = read("src/lib/risk-share/riskShareSourceCandidateImport.ts");

const pageGuard = page.indexOf("const siteScope = tenant");
const pageDescriptor = page.indexOf("readRiskShareSourcePrivateDescriptorForTenant(");
const pageCandidateCheck = page.indexOf("hasRiskShareCandidatesForConfirmedMapping({");
const routeGuard = route.indexOf("const siteScope = tenant");
const routeImport = route.indexOf("importRiskShareCandidatesFromConfirmedSourceMapping({");
const helperDescriptor = helper.indexOf("readRiskShareSourcePrivateDescriptorForTenant(");
const helperRpc = helper.indexOf("saveCandidatesViaRpc({");
const candidateQuery = helper.indexOf("const query = new URLSearchParams({", helper.indexOf("hasRiskShareCandidatesForConfirmedMapping"));

const checks = [
  [
    "Owner Mapping page resolves canonical site before Source and Candidate reads",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.includes("tenant.defaultSiteId")
      && pageGuard !== -1
      && pageGuard < pageDescriptor
      && pageDescriptor < pageCandidateCheck,
  ],
  [
    "Owner Mapping page passes only server-resolved site scope downstream",
    page.includes("readRiskShareSourcePrivateDescriptorForTenant(")
      && page.includes("siteId: siteScope.siteId,")
      && page.includes("companyCode: tenant.code,"),
  ],
  [
    "Candidate Import route resolves canonical site before importing",
    route.includes("getTenantRegistryConfigByCode(companyCode)")
      && route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && route.includes('actionError: "site_scope_unavailable"')
      && routeGuard !== -1
      && routeGuard < routeImport,
  ],
  [
    "Candidate Import route passes canonical tenant and site to helper",
    route.includes("companyCode: tenant.code,")
      && route.includes("siteId: siteScope.siteId,"),
  ],
  [
    "Candidate Import helper binds the Source before the existing RPC",
    helper.includes("siteId: string;")
      && helper.includes("readRiskShareSourcePrivateDescriptorForTenant(")
      && helperDescriptor !== -1
      && helperDescriptor < helperRpc,
  ],
  [
    "Candidate Import success verification applies canonical site scope",
    helper.includes("applyRiskShareDefaultSiteScope(query, params.siteId)")
      && helper.includes('select: "id,site_id"')
      && helper.includes("UUID_PATTERN.test(params.siteId)")
      && candidateQuery !== -1
      && candidateQuery < helper.indexOf("applyRiskShareDefaultSiteScope(query, params.siteId)"),
  ],
  [
    "Candidate Import keeps the existing RPC and schema contracts",
    helper.includes("/rest/v1/rpc/create_risk_share_candidates_from_source_mapping")
      && !helper.includes("p_site_id:")
      && !route.includes("service_role")
      && !page.includes("service_role"),
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

console.log(`PASS: ${checks.length} Source Candidate Import canonical-site contract checks`);
