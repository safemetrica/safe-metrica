import fs from "node:fs";

const page = fs.readFileSync("src/app/risk-share/manager/page.tsx", "utf8");

const actionStart = page.indexOf("async function updateConfirmationReview");
const actionEnd = page.indexOf("\nfunction getCurrentKstMonthRange", actionStart);
const action = page.slice(actionStart, actionEnd);
const accessGuard = action.indexOf("requireTenantManagerAccessForCurrentSession");
const tenantGuard = action.indexOf("resolveRiskShareManagerTenant(companyCode)");
const siteGuard = action.indexOf("resolveRiskShareCanonicalSiteScopeForTenant(");
const submissionRead = action.indexOf('formData.get("submissionId")');
const mutation = action.indexOf("updateManagerConfirmationReview({");

const checks = [
  [
    "Confirmation review authenticates before reading mutable fields",
    accessGuard !== -1 && accessGuard < submissionRead,
  ],
  [
    "Confirmation review resolves the tenant before canonical site scope",
    tenantGuard !== -1 && tenantGuard < siteGuard,
  ],
  [
    "Confirmation review validates canonical site before mutable fields",
    siteGuard !== -1
      && siteGuard < submissionRead
      && action.includes("tenantResolution.tenant.defaultSiteId"),
  ],
  [
    "Confirmation review validates canonical site before the RPC helper",
    siteGuard !== -1
      && siteGuard < mutation
      && action.includes("reviewResult=site_scope_unavailable"),
  ],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
