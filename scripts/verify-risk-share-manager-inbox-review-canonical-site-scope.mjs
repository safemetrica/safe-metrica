import fs from "node:fs";

const page = fs.readFileSync("src/app/risk-share/manager/inbox/page.tsx", "utf8");
const helper = fs.readFileSync(
  "src/lib/risk-share/riskShareManagerInboxReview.ts",
  "utf8",
);

const actionStart = page.indexOf("async function updateInboxReview");
const actionEnd = page.indexOf("\nfunction seoulDateKey", actionStart);
const action = page.slice(actionStart, actionEnd);
const accessGuard = action.indexOf("requireTenantManagerAccessForCurrentSession");
const tenantGuard = action.indexOf("resolveRiskShareManagerTenant(companyCode)");
const siteGuard = action.indexOf("resolveRiskShareCanonicalSiteScopeForTenant(");
const submissionRead = action.indexOf('formData.get("submissionId")');
const mutation = action.indexOf("updateManagerInboxReview({");

const actionChecks = [
  [
    "Inbox review authenticates before reading mutable target fields",
    accessGuard !== -1 && accessGuard < submissionRead,
  ],
  [
    "Inbox review resolves the tenant before canonical site scope",
    tenantGuard !== -1 && tenantGuard < siteGuard,
  ],
  [
    "Inbox review resolves canonical site before mutable target fields",
    siteGuard !== -1
      && siteGuard < submissionRead
      && action.includes("tenantResolution.tenant.defaultSiteId"),
  ],
  [
    "Inbox review passes the canonical site into the mutation helper",
    siteGuard < mutation && action.includes("siteId: siteScope.siteId"),
  ],
];

const helperStart = helper.indexOf("export async function updateManagerInboxReview");
const helperAction = helper.slice(helperStart);
const targetStatusFilter = helperAction.indexOf(
  "manager_review_status: `eq.${input.expectedStatus}`",
);
const targetScopeQuery = helperAction.indexOf(
  "applyRiskShareDefaultSiteScope(targetQuery, input.siteId)",
);
const targetScopeFailure = helperAction.indexOf(
  'code: "target_scope_mismatch"',
);
const rpcCall = helperAction.indexOf(
  "/rest/v1/rpc/update_risk_share_inbox_review_status",
);

const targetChecks = [
  [
    "Inbox review validates target tenant, submission, status, and site",
    helperAction.includes('id: `eq.${input.submissionId}`')
      && helperAction.includes('tenant_code: `eq.${input.companyCode}`')
      && targetStatusFilter !== -1
      && targetScopeQuery > targetStatusFilter,
  ],
  [
    "Inbox review limits the preflight to RPC-supported source contracts",
    helperAction.includes("isSupportedInboxTarget(targetRows[0])")
      && helper.includes('source === "risk_share_participation_submit_v1" && mode === "prework"')
      && helper.includes('source === "risk_share_representative_confirmation_v1"'),
  ],
  [
    "Inbox review fails closed before RPC for an out-of-scope target",
    targetScopeFailure > targetScopeQuery && rpcCall > targetScopeFailure,
  ],
];

for (const [name, ok] of [...actionChecks, ...targetChecks]) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
