import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const preview = read("src/app/risk-share/manager/sources/preview/page.tsx");
const mappingPage = read("src/app/risk-share/manager/sources/mapping/page.tsx");
const mappingRoute = read("src/app/api/risk-share/manager/sources/mapping/route.ts");

const checks = [
  [
    "preview validates canonical site before private descriptor and Blob reads",
    preview.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && preview.includes("tenantResolution.tenant.defaultSiteId")
      && preview.indexOf("const siteScope = await") < preview.indexOf("readRiskShareSourcePrivateDescriptor(")
      && preview.indexOf("const siteScope = await") < preview.indexOf("readRiskShareSourceHeaderPreview("),
  ],
  [
    "mapping page validates canonical site before private source and mapping reads",
    mappingPage.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && mappingPage.includes("tenantResolution.tenant.defaultSiteId")
      && mappingPage.indexOf("const siteScope = await") < mappingPage.indexOf("readRiskShareSourcePrivateDescriptor(")
      && mappingPage.indexOf("const siteScope = await") < mappingPage.indexOf("readLatestRiskShareSourceColumnMappingVersion("),
  ],
  [
    "mapping mutation validates canonical site before form and save processing",
    mappingRoute.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && mappingRoute.includes("tenantResolution.tenant.defaultSiteId")
      && mappingRoute.indexOf("const siteScope = await") < mappingRoute.indexOf("request.formData()")
      && mappingRoute.indexOf("const siteScope = await") < mappingRoute.indexOf("saveRiskShareSourceColumnMappingVersion(")
      && mappingRoute.includes("actionError=site_scope_unavailable"),
  ],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
