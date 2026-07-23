import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const preview = read("src/app/risk-share/manager/sources/preview/page.tsx");
const mappingPage = read("src/app/risk-share/manager/sources/mapping/page.tsx");
const mappingRoute = read("src/app/api/risk-share/manager/sources/mapping/route.ts");
const privateRead = read("src/lib/risk-share/riskShareSourcePrivateRead.ts");

const checks = [
  [
    "preview validates canonical site before private descriptor and Blob reads",
    preview.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && preview.includes("tenantResolution.tenant.defaultSiteId")
      && preview.indexOf("const siteScope = await") < preview.indexOf("readRiskShareSourcePrivateDescriptorForTenant(")
      && preview.includes("siteScope.siteId,")
      && preview.indexOf("const siteScope = await") < preview.indexOf("readRiskShareSourceHeaderPreview("),
  ],
  [
    "mapping page validates canonical site before private source and mapping reads",
    mappingPage.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && mappingPage.includes("tenantResolution.tenant.defaultSiteId")
      && mappingPage.indexOf("const siteScope = await") < mappingPage.indexOf("readRiskShareSourcePrivateDescriptorForTenant(")
      && mappingPage.includes("siteScope.siteId,")
      && mappingPage.indexOf("const siteScope = await") < mappingPage.indexOf("readLatestRiskShareSourceColumnMappingVersion("),
  ],
  [
    "mapping mutation validates canonical site before form and save processing",
    mappingRoute.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && mappingRoute.includes("tenantResolution.tenant.defaultSiteId")
      && mappingRoute.indexOf("const siteScope = await") < mappingRoute.indexOf("request.formData()")
      && mappingRoute.indexOf("const siteScope = await") < mappingRoute.indexOf("saveRiskShareSourceColumnMappingVersion(")
      && mappingRoute.includes("siteScope.siteId,")
      && mappingRoute.includes("actionError=site_scope_unavailable"),
  ],
  [
    "tenant private source read binds the exact record to canonical site scope",
    privateRead.includes("readRiskShareSourcePrivateDescriptorForTenant(")
      && privateRead.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && privateRead.includes("UUID_PATTERN.test(siteId)"),
  ],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
