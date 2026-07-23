import fs from "node:fs";

const page = fs.readFileSync(
  "src/app/owner/risk-share/sources/page.tsx",
  "utf8",
);
const registry = fs.readFileSync(
  "src/lib/risk-share/riskShareSourceRegistry.ts",
  "utf8",
);

const tenantLookup = page.indexOf(
  "getTenantRegistryConfigByCode(companyCode)",
);
const siteGuard = page.indexOf("const siteScope = tenant");
const sourceList = page.indexOf("await listRiskShareSourcesForTenant(");

const checks = [
  [
    "Owner Source list resolves canonical tenant and site before record read",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.includes("tenant.defaultSiteId")
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < sourceList,
  ],
  [
    "Owner Source list uses only the tenant site-scoped registry helper",
    page.includes("listRiskShareSourcesForTenant(")
      && page.includes("tenant.code,")
      && page.includes("siteScope.siteId,")
      && !page.includes("listRiskShareSourcesForOwner"),
  ],
  [
    "Owner Source list fails closed when canonical site is unavailable",
    page.includes("if (!tenant || !siteScope.ok)")
      && page.includes("registryLookupFailed = true;")
      && siteGuard < sourceList,
  ],
  [
    "Owner Source list keeps upload, schema, and policy contracts unchanged",
    !page.includes("service_role")
      && !page.includes("updateSupabase")
      && !page.includes("deleteSupabase")
      && !page.includes("/rpc/"),
  ],
  [
    "Tenant-wide Owner Source registry helper is not exported",
    !registry.includes("export async function listRiskShareSourcesForOwner(")
      && registry.includes("export async function listRiskShareSourcesForTenant("),
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
  `PASS: ${checks.length} Owner Source list canonical-site contract checks`,
);
