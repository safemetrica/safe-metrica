import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const policy = readFileSync(
  "docs/ops/SAFEMETRICA_RISK_SHARE_ENTITLEMENT_ENFORCEMENT_TRANSITION_CANDIDATE_V1.md",
  "utf8",
);

for (const state of [
  "active_effective",
  "entitlement_missing",
  "pending",
  "not_yet_effective",
  "suspended",
  "expired",
  "terminated",
  "lookup_failed",
  "invalid_response",
]) {
  assert.match(policy, new RegExp(`\\b${state}\\b`), `policy omits ${state}`);
}

for (const required of [
  /entitlement.*never replaces tenant isolation/i,
  /Public QR writes do not inherit a read-page decision/,
  /fail-open or/,
  /fail-closed behavior/,
  /feature flag/,
  /never deletes business or audit data/,
  /Production, Runtime, and Manual QA are recorded separately/,
  /Separate explicit approval is required/,
]) {
  assert.match(policy, required, `policy omits: ${required}`);
}

const managerRuntime = readFileSync("src/app/risk-share/manager/page.tsx", "utf8");
assert.equal(managerRuntime.includes("observeInternalTestRiskShareEntitlementShadow"), true);
assert.equal(managerRuntime.includes("readRiskShareEntitlementAccess"), false);

const shadowRuntime = readFileSync(
  "src/lib/risk-share/riskShareEntitlementRuntimeShadow.ts",
  "utf8",
);
assert.equal(shadowRuntime.includes('const INTERNAL_TEST_TENANT_CODE = "test-risk-pack-01"'), true);
assert.equal(shadowRuntime.includes("if (input.tenantCode !== INTERNAL_TEST_TENANT_CODE) return"), true);
assert.equal(shadowRuntime.includes('legacyDecision: "deny"'), false);

const unconnectedRuntimePaths = [
  "src/app/risk-share/monthly/page.tsx",
  "src/app/api/risk-share/manager/publish/route.ts",
  "src/app/api/risk-share/manager/preparation/route.ts",
  "src/app/api/risk-share/manager/share-review/route.ts",
  "src/app/api/risk-share/participation/submit/route.ts",
  "src/app/api/risk-share/anonymous/submit/route.ts",
  "src/app/api/risk-share/visitor/submit/route.ts",
  "src/app/api/risk-share/representative/submit/route.ts",
  "src/app/api/field/participation/submit/route.ts",
];

for (const path of unconnectedRuntimePaths) {
  const source = readFileSync(path, "utf8");
  assert.equal(source.includes("riskShareEntitlementAccess"), false, `${path} enforces entitlement early`);
  assert.equal(source.includes("riskShareEntitlementRuntimeShadow"), false, `${path} expands shadow early`);
}

console.log("PASS risk share entitlement enforcement transition contract");
