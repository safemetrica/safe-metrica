import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const picker = read(
  "src/app/owner/risk-share-activation/candidates/new/page.tsx",
);
const intake = read(
  "src/app/api/owner/risk-share-source-intake/submit/route.ts",
);

const pickerTenant = picker.indexOf(
  "getTenantRegistryConfigByCode(companyCode)",
);
const pickerSite = picker.indexOf("const siteScope = tenant");
const pickerList = picker.indexOf("await listRiskShareSourcesForTenant(");

const intakeTenant = intake.indexOf(
  "getTenantRegistryConfigByCode(companyCode)",
);
const intakeSite = intake.indexOf("const siteScope = tenant");
const blobUpload = intake.indexOf("blob = await put(");
const sourceInsert = intake.indexOf(
  "const insertResult = await insertRiskShareSourceRecord({",
);

const checks = [
  [
    "Manual Candidate Source picker resolves canonical tenant/site before listing",
    picker.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && picker.includes("tenant.defaultSiteId")
      && pickerTenant !== -1
      && pickerTenant < pickerSite
      && pickerSite < pickerList,
  ],
  [
    "Manual Candidate Source picker uses only the tenant site-scoped registry helper",
    picker.includes("listRiskShareSourcesForTenant(")
      && picker.includes("tenant.code,")
      && picker.includes("siteScope.siteId,")
      && !picker.includes("listRiskShareSourcesForOwner"),
  ],
  [
    "Legacy Source Intake resolves canonical tenant/site before Blob upload",
    intake.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && intake.includes("tenant.defaultSiteId")
      && intake.includes('error: "site_scope_unavailable"')
      && intakeTenant !== -1
      && intakeTenant < intakeSite
      && intakeSite < blobUpload,
  ],
  [
    "Legacy Source Intake stores canonical tenant and site on the Source",
    intake.includes("company_code: tenant.code,")
      && intake.includes("site_id: siteScope.siteId,")
      && intake.includes("risk-share-sources/${tenant.code}/")
      && sourceInsert !== -1
      && blobUpload < sourceInsert,
  ],
  [
    "Legacy Source Intake preserves upload rollback and existing DB trigger contracts",
    intake.includes("await del(blob.url)")
      && intake.includes('storage_provider: "vercel_blob"')
      && !intake.includes("/rpc/")
      && !intake.includes("updateSupabase")
      && !intake.includes("deleteSupabase"),
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
  `PASS: ${checks.length} Owner legacy Source canonical-site contract checks`,
);
