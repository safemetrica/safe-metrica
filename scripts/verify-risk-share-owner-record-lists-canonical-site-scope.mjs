import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const candidates = read(
  "src/app/owner/risk-share-activation/candidates/page.tsx",
);
const items = read(
  "src/app/owner/risk-share-activation/share-items/page.tsx",
);

function pageChecks(source, options) {
  const tenantLookup = source.indexOf(
    "getTenantRegistryConfigByCode(companyCode)",
  );
  const siteGuard = source.indexOf("const siteScope = tenant");
  const recordFetch = source.indexOf(options.fetchCall);

  return [
    source.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && source.includes("tenant.defaultSiteId")
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < recordFetch,
    source.includes(options.fetchSignature)
      && source.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && source.includes("site_id")
      && source.includes(options.table),
    source.includes(options.canonicalCall)
      && source.includes("if (!tenant || !siteScope.ok)")
      && source.includes("loadFailed = true;"),
  ];
}

const candidateChecks = pageChecks(candidates, {
  fetchCall: "candidates = await fetchCandidates(",
  fetchSignature: "async function fetchCandidates(",
  canonicalCall:
    "tenant.code,\n          selectedStatus,\n          siteScope.siteId,",
  table: '"risk_share_item_candidates"',
});

const itemChecks = pageChecks(items, {
  fetchCall: "storedItems = await fetchRiskShareItems(",
  fetchSignature:
    "async function fetchRiskShareItems(companyCode: string, siteId: string)",
  canonicalCall: "tenant.code,\n          siteScope.siteId,",
  table: '"risk_share_items"',
});

const checks = [
  ["Candidate list resolves canonical site before record fetch", candidateChecks[0]],
  ["Candidate list query binds tenant records to canonical site", candidateChecks[1]],
  ["Candidate list fails closed when canonical site is unavailable", candidateChecks[2]],
  ["Share Item list resolves canonical site before record fetch", itemChecks[0]],
  ["Share Item list query binds tenant records to canonical site", itemChecks[1]],
  ["Share Item list fails closed when canonical site is unavailable", itemChecks[2]],
  [
    "Owner list pages keep schema, mutation, and policy contracts unchanged",
    !candidates.includes("service_role")
      && !items.includes("service_role")
      && !candidates.includes("updateSupabase")
      && !items.includes("updateSupabase")
      && !candidates.includes("deleteSupabase")
      && !items.includes("deleteSupabase"),
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
  `PASS: ${checks.length} Owner record list canonical-site contract checks`,
);
