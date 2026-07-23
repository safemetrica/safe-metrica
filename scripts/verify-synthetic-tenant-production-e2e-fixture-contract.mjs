import assert from "node:assert/strict";
import fs from "node:fs";

const contract = fs.readFileSync(
  "docs/ops/SAFEMETRICA_SYNTHETIC_TENANT_PRODUCTION_E2E_FIXTURE_CONTRACT_V1.md",
  "utf8",
);
const internalTestMigration = fs.readFileSync(
  "supabase/migrations/20260722050000_add_internal_test_entitlement_source.sql",
  "utf8",
);
const entitlementFoundation = fs.readFileSync(
  "supabase/migrations/20260722020000_add_product_entitlement_foundation.sql",
  "utf8",
);

const requiredContractTerms = [
  /creates no fixture/i,
  /existing customer[\s\S]*must not be repurposed/i,
  /test-risk-pack-01[\s\S]*must not be repurposed/i,
  /never guessed/i,
  /Customer or worker personal data is[\s\S]*prohibited/i,
  /activation_source = internal_test/i,
  /non-null[\s\S]*expiry/i,
  /internal-test:/i,
  /human-approved manifest/i,
  /maximum record count/i,
  /same-key retry/i,
  /before-counts/i,
  /HTTP success alone is not PASS/i,
  /read-only reconciliation before retry/i,
  /same request digest/i,
  /unexpected tenant\/site identity[\s\S]*HOLD/i,
  /transition the[\s\S]*entitlement to `terminated`/i,
  /Do not hard-delete entitlement rows/i,
  /Do not reuse the tenant code/i,
  /must not\s+contain credentials, tokens/i,
  /Separate explicit approval is required/i,
  /public QR fail-open\/fail-closed policy/i,
  /GitHub merge, Supabase state, Vercel deployment, Runtime evidence, cleanup, and[\s\S]*Manual QA are recorded as distinct states/i,
];

for (const term of requiredContractTerms) {
  assert.match(contract, term, `fixture contract omits ${term}`);
}

assert.match(internalTestMigration, /'internal_test'/);
assert.match(internalTestMigration, /expires_at is not null/);
assert.match(internalTestMigration, /external_reference like 'internal-test:%'/);
assert.doesNotMatch(internalTestMigration, /insert into/i);
assert.doesNotMatch(internalTestMigration, /\bupdate\s+public\./i);

assert.match(entitlementFoundation, /create table if not exists public\.tenant_product_entitlement_events/);
assert.match(entitlementFoundation, /tenant_product_entitlement_events_idempotency_uidx/);
assert.match(entitlementFoundation, /grant select, insert[\s\S]*tenant_product_entitlement_events[\s\S]*to service_role/);
assert.doesNotMatch(entitlementFoundation, /grant[^;]*(update|delete)[^;]*tenant_product_entitlement_events/i);

console.log("PASS synthetic tenant Production E2E fixture contract");
