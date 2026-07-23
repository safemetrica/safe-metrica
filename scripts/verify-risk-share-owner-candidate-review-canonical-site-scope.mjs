import fs from "node:fs";

const route = fs.readFileSync(
  "src/app/api/owner/risk-share-candidates/status/route.ts",
  "utf8",
);

const tenantLookup = route.indexOf("getTenantRegistryConfigByCode(companyCode)");
const siteGuard = route.indexOf("const siteScope = tenant");
const candidatePreflight = route.indexOf("candidateInScope = await verifyCandidateScope(");
const rpcCall = route.indexOf("const rpcResult = await callReviewCandidateRpc({");

const checks = [
  [
    "Owner Candidate review resolves canonical tenant and site before Candidate preflight",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && route.includes('error: "site_scope_unavailable"')
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < candidatePreflight,
  ],
  [
    "Exact Candidate preflight binds tenant, Candidate, and canonical site",
    route.includes("async function verifyCandidateScope(")
      && route.includes('select: "id,company_code,site_id"')
      && route.includes('"risk_share_item_candidates"')
      && route.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && route.includes("candidate.company_code?.toLowerCase() === companyCode.toLowerCase()")
      && route.includes("candidate.site_id?.toLowerCase() === siteId.toLowerCase()"),
  ],
  [
    "Out-of-scope Candidate is reduced to not found before the RPC",
    route.includes('error: "candidate_lookup_failed"')
      && route.includes('error: "candidate_not_found"')
      && candidatePreflight !== -1
      && rpcCall !== -1
      && candidatePreflight < rpcCall,
  ],
  [
    "Existing review RPC receives only canonical tenant identity",
    route.includes("/rest/v1/rpc/review_risk_share_item_candidate")
      && route.includes("companyCode: tenant.code,")
      && !route.includes("p_site_id:"),
  ],
  [
    "Existing RPC, row-lock, and audit schema contracts remain unchanged",
    !route.includes("updateSupabase")
      && !route.includes("deleteSupabase")
      && !route.includes("service_role")
      && route.includes('p_actor_type: "owner"'),
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
  `PASS: ${checks.length} Owner Candidate review canonical-site contract checks`,
);
