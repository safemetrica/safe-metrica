import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES,
  isRiskShareEntitlementShadowBoundaryId,
  createRiskShareShadowObservation,
} from "../src/lib/risk-share/riskShareEntitlementShadow.ts";

const expectedBoundaryIds = [
  "saas.manager.page",
  "saas.monthly.page",
  "saas.publish.mutation",
  "saas.preparation.mutation",
  "saas.share_review.mutation",
  "public.participation.submit",
  "public.anonymous.submit",
  "public.visitor.submit",
  "public.representative.submit",
  "legacy.manager.page",
  "legacy.field_participation.submit",
];

assert.deepEqual(
  RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES.map(({ id }) => id),
  expectedBoundaryIds,
  "the reviewed shadow boundary inventory must not drift silently",
);
assert.equal(new Set(expectedBoundaryIds).size, expectedBoundaryIds.length);
assert.equal(isRiskShareEntitlementShadowBoundaryId("public.participation.submit"), true);
assert.equal(isRiskShareEntitlementShadowBoundaryId("customer.acme.submit"), false);

const observation = createRiskShareShadowObservation({
  boundaryId: "public.participation.submit",
  legacyDecision: "allow",
  entitlementState: "active_effective",
  policyVersion: 1,
  correlationId: "opaque_request_01",
  observedAt: new Date("2026-07-22T00:00:00.000Z"),
});
assert.ok(observation);
assert.equal(observation.failureClass, null);
const failedObservation = createRiskShareShadowObservation({
  boundaryId: "saas.manager.page",
  legacyDecision: "allow",
  entitlementState: "lookup_failed",
  policyVersion: null,
  correlationId: "opaque_request_02",
  observedAt: new Date("2026-07-22T00:00:00.000Z"),
  failureClass: "timeout",
});
assert.equal(failedObservation?.failureClass, "timeout");
assert.equal(createRiskShareShadowObservation({
  boundaryId: "saas.manager.page",
  legacyDecision: "allow",
  entitlementState: "lookup_failed",
  policyVersion: null,
  correlationId: "opaque_request_03",
  observedAt: new Date("2026-07-22T00:00:00.000Z"),
}), null);
assert.deepEqual(Object.keys(observation).sort(), [
  "boundaryId",
  "comparisonClass",
  "correlationId",
  "entitlementState",
  "failureClass",
  "legacyDecision",
  "observedAt",
  "policyVersion",
].sort());

const serialized = JSON.stringify(observation);
for (const forbidden of [
  "tenantId",
  "tenantCode",
  "tenant_id",
  "tenant_code",
  "company",
  "email",
  "name",
  "phone",
  "requestBody",
  "query",
]) {
  assert.equal(serialized.includes(forbidden), false, `observation leaked ${forbidden}`);
}

const runtimePaths = [
  "src/app/risk-share/monthly/page.tsx",
  "src/app/api/risk-share/participation/submit/route.ts",
  "src/app/api/risk-share/anonymous/submit/route.ts",
  "src/app/api/risk-share/visitor/submit/route.ts",
  "src/app/api/risk-share/representative/submit/route.ts",
  "src/app/api/field/participation/submit/route.ts",
  "src/app/manager/risk-share/page.tsx",
];
for (const path of runtimePaths) {
  const source = readFileSync(path, "utf8");
  assert.equal(source.includes("riskShareEntitlementShadow"), false, `${path} connected shadow Runtime early`);
  assert.equal(source.includes("riskShareEntitlementAccess"), false, `${path} connected entitlement Runtime early`);
}

const managerRuntime = readFileSync("src/app/risk-share/manager/page.tsx", "utf8");
assert.equal(managerRuntime.includes("riskShareEntitlementRuntimeShadow"), true);
assert.equal(managerRuntime.includes('boundaryId: "saas.manager.page"'), true);
assert.equal(managerRuntime.includes('legacyDecision: "allow"'), true);

const runtimeShadow = readFileSync(
  "src/lib/risk-share/riskShareEntitlementRuntimeShadow.ts",
  "utf8",
);
assert.equal(runtimeShadow.includes('const INTERNAL_TEST_TENANT_CODE = "test-risk-pack-01"'), true);
assert.equal(runtimeShadow.includes("if (input.tenantCode !== INTERNAL_TEST_TENANT_CODE) return"), true);
assert.equal(runtimeShadow.includes("Promise.race"), true);
assert.equal(runtimeShadow.includes('state: "lookup_failed"'), true);
assert.equal(runtimeShadow.includes('failureClass: "timeout"'), true);
assert.equal(runtimeShadow.includes("evaluation.failureClass"), true);
assert.equal(runtimeShadow.includes("console.info"), true);
assert.equal(runtimeShadow.includes("catch {"), true);
assert.equal(runtimeShadow.includes("tenantId: observation"), false);
assert.equal(runtimeShadow.includes("tenantCode: observation"), false);
assert.equal(runtimeShadow.includes("throw "), false);

console.log("PASS risk share shadow boundary privacy contract");
