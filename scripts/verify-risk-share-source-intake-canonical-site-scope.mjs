import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const helper = read("src/lib/risk-share/riskShareCanonicalSiteScopeServer.ts");
const page = read("src/app/risk-share/manager/sources/page.tsx");
const upload = read("src/app/api/risk-share/manager/sources/upload/route.ts");
const ownerUpload = read("src/app/api/owner/risk-share/sources/upload/route.ts");
const registry = read("src/lib/risk-share/riskShareSourceRegistry.ts");
const uploadHelper = read("src/lib/risk-share/riskShareSourceUpload.ts");

const checks = [
  [
    "server helper validates the full canonical site contract",
    helper.includes("getDefaultTenantSiteConfigByTenantCode(tenantCode)")
      && helper.includes("listTenantSitesByTenantCode(tenantCode)")
      && helper.includes("registryDefaultSiteId")
      && helper.includes("resolveRiskShareSingleSiteScope("),
  ],
  [
    "source intake requires a concrete canonical site",
    helper.includes("!scope.ok || !scope.siteId"),
  ],
  [
    "source list fails closed before tenant-wide source lookup",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.indexOf("const siteScope = await") < page.indexOf("listRiskShareSourcesForTenant(")
      && page.includes("tenantResolution.tenant.defaultSiteId")
      && page.includes("siteScope.siteId,"),
  ],
  [
    "source upload fails closed before form or file processing",
    upload.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && upload.indexOf("const siteScope = await") < upload.indexOf("request.formData()")
      && upload.includes('actionError: "site_scope_unavailable"')
      && upload.includes("tenantResolution.tenant.defaultSiteId")
      && upload.includes("siteId: siteScope.siteId,"),
  ],
  [
    "tenant source list binds records to the canonical site",
    registry.includes("applyRiskShareDefaultSiteScope(query, options.siteId)")
      && registry.includes("siteId: string,")
      && registry.includes("UUID_PATTERN.test(siteId)"),
  ],
  [
    "source upload revalidates and persists the canonical site",
    uploadHelper.includes("input.siteId !== tenant.defaultSiteId")
      && uploadHelper.includes("applyRiskShareDefaultSiteScope(query, siteId)")
      && uploadHelper.includes("site_id: input.siteId"),
  ],
  [
    "Owner Source upload passes only canonical tenant and site identity",
    ownerUpload.includes("getTenantRegistryConfigByCode(companyCodeInput)")
      && ownerUpload.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && ownerUpload.includes("if (!tenant || !siteScope.ok)")
      && ownerUpload.includes("companyCode: tenant.code,")
      && ownerUpload.includes("siteId: siteScope.siteId,")
      && !ownerUpload.includes(
        "companyCode: companyCodeInput,\n    siteId: siteScope.siteId,",
      ),
  ],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
