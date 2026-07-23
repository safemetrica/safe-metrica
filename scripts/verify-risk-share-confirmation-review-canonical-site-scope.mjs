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

const helper = fs.readFileSync(
  "src/lib/risk-share/riskShareManagerConfirmationReview.ts",
  "utf8",
);
const helperStart = helper.indexOf("export async function updateManagerConfirmationReview");
const helperAction = helper.slice(helperStart);
const targetScopeQuery = helperAction.indexOf("applyRiskShareDefaultSiteScope(targetQuery, input.siteId)");
const targetScopeFailure = helperAction.indexOf('code: "target_scope_mismatch"');
const rpcCall = helperAction.indexOf("/rest/v1/rpc/update_risk_share_confirmation_review_status");

const targetChecks = [
  [
    "Confirmation review passes the canonical site id into the mutation helper",
    action.includes("siteId: siteScope.siteId"),
  ],
  [
    "Confirmation review helper validates the target row against the canonical site",
    targetScopeQuery !== -1
      && helperAction.includes('id: `eq.${input.submissionId}`')
      && helperAction.includes('tenant_code: `eq.${input.companyCode}`'),
  ],
  [
    "Confirmation review fails closed before the RPC when the target is outside site scope",
    targetScopeQuery !== -1
      && targetScopeFailure > targetScopeQuery
      && rpcCall > targetScopeFailure,
  ],
];

for (const [name, ok] of targetChecks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
