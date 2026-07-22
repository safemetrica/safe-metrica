import assert from "node:assert/strict";
import fs from "node:fs";
import {
  digestRiskShareBackfillRequest,
  validateRiskShareBackfillManifestEntry,
} from "../src/lib/risk-share/riskShareBackfillManifest.ts";

const migration = fs.readFileSync(
  "supabase/migrations/20260722050000_add_internal_test_entitlement_source.sql",
  "utf8",
);
const reviewSql = fs.readFileSync(
  "docs/operations/risk-share-entitlement-backfill-review.sql",
  "utf8",
);

assert.match(migration, /activation_source in \([\s\S]*'internal_test'[\s\S]*\)/);
assert.match(migration, /tenant_product_entitlements_internal_test_check/);
assert.match(migration, /expires_at is not null/);
assert.match(migration, /external_reference like 'internal-test:%'/);
assert.doesNotMatch(migration, /insert into/i);
assert.doesNotMatch(migration, /\bupdate\s+public\./i);
assert.match(reviewSql, /i\.activation_source = 'internal_test'/);
assert.match(reviewSql, /i\.expires_at is null/);

const base = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  tenantCode: "synthetic-tenant",
  productCode: "risk_share",
  status: "active",
  activationSource: "internal_test",
  effectiveAt: "2026-07-22T00:00:00.000Z",
  expiresAt: "2026-07-29T00:00:00.000Z",
  policyVersion: 1,
  actorType: "owner_console",
  idempotencyKey: "synthetic-internal-test-001",
  externalReference: "internal-test:synthetic-001",
  approvalEvidenceReference: "representative-test-approval-001",
};
const valid = { ...base, requestDigest: digestRiskShareBackfillRequest(base) };
assert.equal(validateRiskShareBackfillManifestEntry(valid).ok, true);

for (const invalid of [
  { ...base, expiresAt: null },
  { ...base, externalReference: null },
  { ...base, externalReference: "complimentary:synthetic-001" },
]) {
  const value = { ...invalid, requestDigest: digestRiskShareBackfillRequest(invalid) };
  assert.deepEqual(validateRiskShareBackfillManifestEntry(value), {
    ok: false,
    errors: ["internal_test_boundary_invalid"],
  });
}

console.log("PASS internal test entitlement contract");
