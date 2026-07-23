import assert from "node:assert/strict";
import fs from "node:fs";

const contract = fs.readFileSync(
  "docs/ops/SAFEMETRICA_RISK_SHARE_ENTITLEMENT_REVERSIBLE_SWITCH_ROLLBACK_REHEARSAL_CONTRACT_V1.md",
  "utf8",
);
const normalizedContract = contract.replace(/\s+/g, " ");

for (const required of [
  /creates no feature[\s\S]*changes no Runtime access decision/i,
  /server-only[\s\S]*defaults to OFF/i,
  /OFF[\s\S]*existing tenant, session, membership, role, site, RLS, Storage/i,
  /exact policy version and boundary id/i,
  /authenticated-read approval cannot activate authenticated mutations,[\s\S]*public[\s\S]*submissions, or legacy boundaries/i,
  /dedicated synthetic\s+tenant only/i,
  /test-risk-pack-01[\s\S]*must not be used for enforcement rehearsal/i,
  /never be accepted from a URL, request body, cookie/i,
  /Entitlement evaluation may only narrow a legacy allow result/i,
  /cannot convert a legacy deny or error into allow/i,
  /lookup uncertainty and public safety submissions remains HOLD/i,
  /OFF \+ any entitlement state[\s\S]*exact legacy decision/i,
  /unknown boundary or policy version[\s\S]*treated as OFF/i,
  /concurrent requests during ON-to-OFF change/i,
  /successful HTTP response alone is not PASS/i,
  /append-only evidence retain[\s\S]*identical counts and identities/i,
  /rollback does not update entitlement status/i,
  /zero unexplained row delta/i,
  /recorded separately from GitHub merge, Vercel[\s\S]*Manual QA/i,
  /Separate explicit approval is required/i,
  /AI or a rule cannot approve activation/i,
  /no feature flag or equivalent switch exists in Runtime/i,
  /no migration, Production SQL, customer data, entitlement, public QR behavior/i,
]) {
  assert.match(normalizedContract, required, `rollback contract omits ${required}`);
}

const managerRuntime = fs.readFileSync("src/app/risk-share/manager/page.tsx", "utf8");
const shadowRuntime = fs.readFileSync(
  "src/lib/risk-share/riskShareEntitlementRuntimeShadow.ts",
  "utf8",
);

assert.match(managerRuntime, /observeInternalTestRiskShareEntitlementShadow\s*\(/);
assert.doesNotMatch(managerRuntime, /readRiskShareEntitlementAccess\s*\(/);
assert.match(shadowRuntime, /Promise<void>/);
assert.match(shadowRuntime, /input\.tenantCode !== INTERNAL_TEST_TENANT_CODE/);
assert.doesNotMatch(shadowRuntime, /legacyDecision:\s*["']deny["']/);

for (const path of [
  "src/app/risk-share/monthly/page.tsx",
  "src/app/api/risk-share/manager/publish/route.ts",
  "src/app/api/risk-share/manager/preparation/route.ts",
  "src/app/api/risk-share/manager/share-review/route.ts",
  "src/app/api/risk-share/participation/submit/route.ts",
  "src/app/api/risk-share/anonymous/submit/route.ts",
  "src/app/api/risk-share/visitor/submit/route.ts",
  "src/app/api/risk-share/representative/submit/route.ts",
  "src/app/api/field/participation/submit/route.ts",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.doesNotMatch(source, /riskShareEntitlementAccess/);
  assert.doesNotMatch(source, /riskShareEntitlementRuntimeShadow/);
}

console.log("PASS risk share entitlement rollback rehearsal contract");
