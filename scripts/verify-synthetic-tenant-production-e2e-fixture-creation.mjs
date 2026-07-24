import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "scripts/sql/synthetic_tenant_production_e2e_fixture_creation_v1.sql",
  "utf8",
);

for (const pattern of [
  /begin;/i,
  /commit;/i,
  /set local statement_timeout/i,
  /set local lock_timeout/i,
  /test-risk-pack-01/,
  /auth\.users/,
  /email_confirmed_at is not null/,
  /create_self_service_tenant/,
  /create_tenant_default_site/,
  /update_tenant_site_profile/,
  /tenant_activation_events/,
  /activation_source[\s\S]*internal_test/i,
  /expires_at/,
  /internal-test:/,
  /tenant_product_entitlement_events/,
  /extensions\.digest/,
  /synthetic_e2e_fixture_v1/,
  /manifestChecksum/,
  /lifecycleState/,
  /fixture counted delta mismatch/i,
]) {
  assert.match(sql, pattern, `fixture creation SQL omits ${pattern}`);
}

for (const placeholder of [
  "MANIFEST_ID",
  "MANIFEST_SHA256",
  "TENANT_CODE",
  "ACCOUNT_EMAIL",
  "APPROVED_BY",
  "FIXTURE_CREATION_APPROVAL_REFERENCE",
  "GITHUB_MAIN_SHA",
  "VERCEL_PRODUCTION_REFERENCE",
  "MIGRATION_INVENTORY_REFERENCE",
  "SCHEMA_FINGERPRINT_REFERENCE",
  "STORAGE_BOUNDARY_REFERENCE",
  "ENTITLEMENT_EXPIRES_AT",
]) {
  assert.match(sql, new RegExp(`__SM_E2E_${placeholder}__`));
}

assert.doesNotMatch(sql, /create\s+(table|function|extension)\s+(?!temporary)/i);
assert.doesNotMatch(sql, /alter\s+(table|function|policy)/i);
assert.doesNotMatch(sql, /drop\s+(table|function|policy)/i);
assert.doesNotMatch(sql, /delete\s+from/i);
assert.doesNotMatch(sql, /storage\.objects[\s\S]*(insert|update|delete)/i);
assert.doesNotMatch(sql, /insert into public\.risk_share_(sources|items|version_locks)/i);
assert.match(
  sql,
  /false as authenticated_runtime_authorized[\s\S]*false as public_qr_submission_authorized[\s\S]*false as cleanup_writes_authorized[\s\S]*false as entitlement_enforcement_authorized/i,
);

console.log("PASS synthetic tenant Production E2E fixture creation SQL contract");
