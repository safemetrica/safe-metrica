import fs from "node:fs";

const route = fs.readFileSync(
  "src/app/api/owner/risk-share/sources/mapping/route.ts",
  "utf8",
);

const formRead = route.indexOf("request.formData()");
const tenantLookup = route.indexOf(
  "getTenantRegistryConfigByCode(companyCode)",
);
const siteGuard = route.indexOf("const siteScope = tenant");
const sourceRead = route.indexOf(
  "readRiskShareSourcePrivateDescriptorForTenant(",
);
const save = route.indexOf("saveRiskShareSourceColumnMappingVersion({");

const checks = [
  [
    "Owner Mapping mutation resolves canonical tenant and site before Source read",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenant.defaultSiteId")
      && formRead !== -1
      && formRead < tenantLookup
      && tenantLookup < siteGuard
      && siteGuard < sourceRead,
  ],
  [
    "Owner Mapping mutation binds the exact Source to canonical site scope",
    route.includes("readRiskShareSourcePrivateDescriptorForTenant(")
      && route.includes("tenant.code,")
      && route.includes("siteScope.siteId,")
      && !route.includes("readRiskShareSourcePrivateDescriptor("),
  ],
  [
    "Owner Mapping mutation fails closed before Source and Mapping writes",
    route.includes("if (!tenant || !siteScope.ok)")
      && route.includes('actionError: "site_scope_unavailable"')
      && siteGuard < sourceRead
      && sourceRead < save,
  ],
  [
    "Owner Mapping mutation passes only canonical tenant identity to save helper",
    route.includes("companyCode: tenant.code,")
      && !route.includes("companyCode,\n    sourceId,"),
  ],
  [
    "Owner Mapping mutation keeps the existing RPC and schema contract",
    route.includes("saveRiskShareSourceColumnMappingVersion({")
      && !route.includes("p_site_id:")
      && !route.includes("site_id:")
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
  `PASS: ${checks.length} Owner Source Mapping canonical-site contract checks`,
);
