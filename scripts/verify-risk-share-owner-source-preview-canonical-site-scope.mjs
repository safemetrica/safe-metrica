import fs from "node:fs";

const preview = fs.readFileSync(
  "src/app/owner/risk-share/sources/preview/page.tsx",
  "utf8",
);
const privateRead = fs.readFileSync(
  "src/lib/risk-share/riskShareSourcePrivateRead.ts",
  "utf8",
);

const tenantLookup = preview.indexOf(
  "getTenantRegistryConfigByCode(companyCode)",
);
const siteGuard = preview.indexOf("const siteScope = tenant");
const sourceRead = preview.indexOf(
  "readRiskShareSourcePrivateDescriptorForTenant(",
);
const blobRead = preview.indexOf("readRiskShareSourceHeaderPreview(");

const checks = [
  [
    "Owner Source Preview resolves canonical tenant and site before record read",
    preview.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && preview.includes("tenant.defaultSiteId")
      && tenantLookup !== -1
      && tenantLookup < siteGuard
      && siteGuard < sourceRead,
  ],
  [
    "Owner Source Preview binds the exact Source to canonical site scope",
    preview.includes("readRiskShareSourcePrivateDescriptorForTenant(")
      && preview.includes("tenant.code,")
      && preview.includes("siteScope.siteId,")
      && !preview.includes("readRiskShareSourcePrivateDescriptor("),
  ],
  [
    "Owner Source Preview fails closed before private Blob read",
    preview.includes("if (!tenant || !siteScope.ok)")
      && preview.includes("사업장 범위를 확인할 수 없습니다.")
      && siteGuard < sourceRead
      && sourceRead < blobRead,
  ],
  [
    "Owner Source Preview keeps storage, schema, and policy contracts unchanged",
    !preview.includes("service_role")
      && !preview.includes("updateSupabase")
      && !preview.includes("deleteSupabase")
      && !preview.includes("/rpc/"),
  ],
  [
    "Private Source reads expose only the canonical site-scoped helper",
    privateRead.includes(
      "export async function readRiskShareSourcePrivateDescriptorForTenant(",
    )
      && !privateRead.includes(
        "export async function readRiskShareSourcePrivateDescriptor(",
      ),
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
  `PASS: ${checks.length} Owner Source Preview canonical-site contract checks`,
);
