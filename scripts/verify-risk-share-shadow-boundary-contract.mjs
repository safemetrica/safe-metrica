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
assert.deepEqual(Object.keys(observation).sort(), [
  "boundaryId",
  "comparisonClass",
  "correlationId",
  "entitlementState",
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
  "src/app/risk-share/manager/page.tsx",
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

console.log("PASS risk share shadow boundary privacy contract");
