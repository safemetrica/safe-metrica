import assert from "node:assert/strict";
import fs from "node:fs";
import {
  digestRiskShareBackfillRequest,
  summarizeRiskShareBackfillManifest,
  validateRiskShareBackfillManifestEntry,
} from "../src/lib/risk-share/riskShareBackfillManifest.ts";
import {
  classifyRiskShareEntitlementShadow,
  createRiskShareShadowObservation,
} from "../src/lib/risk-share/riskShareEntitlementShadow.ts";

const digestInput = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  tenantCode: "synthetic-tenant",
  productCode: "risk_share",
  status: "active",
  activationSource: "contract",
  effectiveAt: "2026-07-22T00:00:00.000Z",
  expiresAt: null,
  policyVersion: 1,
  actorType: "owner_console",
  idempotencyKey: "synthetic-batch-001",
  externalReference: null,
  approvalEvidenceReference: "approval-record-001",
};
const valid = { ...digestInput, requestDigest: digestRiskShareBackfillRequest(digestInput) };
assert.equal(validateRiskShareBackfillManifestEntry(valid).ok, true);
assert.deepEqual(summarizeRiskShareBackfillManifest([valid, { ...valid, requestDigest: "0".repeat(64) }]), {
  inputCount: 2,
  eligibleCount: 1,
  invalidCount: 1,
  errorCounts: { request_digest_mismatch: 1 },
});
assert.equal(validateRiskShareBackfillManifestEntry({ ...valid, tenantCode: "other" }).ok, false);
assert.equal(validateRiskShareBackfillManifestEntry({ ...valid, approvalEvidenceReference: "" }).ok, false);
assert.notEqual(
  digestRiskShareBackfillRequest(digestInput),
  digestRiskShareBackfillRequest({
    ...digestInput,
    approvalEvidenceReference: "approval-record-002",
  }),
  "the request digest must bind the representative-approved evidence reference",
);

const cases = [
  ["allow", "active_effective", "match_allow"],
  ["deny", "expired", "match_deny"],
  ["allow", "entitlement_missing", "legacy_allow_entitlement_missing"],
  ["allow", "suspended", "legacy_allow_entitlement_inactive"],
  ["deny", "active_effective", "legacy_deny_entitlement_active"],
  ["allow", "lookup_failed", "lookup_failed"],
  ["deny", "invalid_response", "invalid_response"],
  ["error", "active_effective", "legacy_error"],
];
for (const [legacy, state, expected] of cases) {
  assert.equal(classifyRiskShareEntitlementShadow(legacy, state), expected);
}
const observation = createRiskShareShadowObservation({
  boundaryId: "public.participation.submit",
  legacyDecision: "allow",
  entitlementState: "active_effective",
  policyVersion: 1,
  correlationId: "opaque_correlation_001",
  observedAt: new Date("2026-07-22T00:00:00.000Z"),
});
assert.deepEqual(Object.keys(observation ?? {}).sort(), [
  "boundaryId", "comparisonClass", "correlationId", "entitlementState",
  "legacyDecision", "observedAt", "policyVersion",
].sort());
assert.equal(JSON.stringify(observation).includes("tenant"), false);

const sql = fs.readFileSync("docs/operations/risk-share-entitlement-backfill-review.sql", "utf8");
assert.match(sql, /begin;/i);
assert.match(sql, /rollback;/i);
assert.doesNotMatch(sql, /\bcommit\s*;/i);
assert.match(sql, /existing_event_idempotency_conflict/);
assert.match(sql, /approval_evidence_reference text not null/);
assert.match(sql, /existing_entitlement_requires_separate_review/);
assert.doesNotMatch(sql, /on conflict \(tenant_id,product_code\) do update/i);
assert.match(sql, /combined_backfill_verification_failed/);

const inventory = fs.readFileSync("docs/operations/risk-share-entitlement-backfill-inventory.sql", "utf8");
assert.match(inventory, /READ-ONLY B2 inventory/);
assert.match(inventory, /tr\.status = 'active'/);
assert.match(inventory, /tr\.service_mode in \('risk_share_pack', 'full_safemetrica'\)/);
assert.match(inventory, /hold_missing_approval_evidence/);
assert.match(inventory, /conflict_tenant_identity/);
assert.match(inventory, /already_covered/);
assert.match(inventory, /hold_inactive_entitlement/);
assert.doesNotMatch(inventory, /\b(insert|update|delete|merge|truncate|alter|drop|create|grant|revoke|call)\b/i);
console.log("PASS risk share backfill manifest and shadow observer foundation");
