import assert from "node:assert/strict";
import fs from "node:fs";

const sqlPath =
  "scripts/sql/synthetic_tenant_production_e2e_live_fingerprint_v1.sql";
const sql = fs.readFileSync(sqlPath, "utf8");
const preflightDoc = fs.readFileSync(
  "docs/ops/SAFEMETRICA_SYNTHETIC_TENANT_PRODUCTION_E2E_PREFLIGHT_V1.md",
  "utf8",
);

assert.match(sql, /begin transaction read only;/i);
assert.match(sql, /rollback;/i);
assert.equal(
  sql.match(/SYNTHETIC_E2E_LIVE_FINGERPRINT_V1_RLS_BOUNDARY/g)?.length,
  2,
);
assert.match(sql, /SCHEMA_RLS_AND_SERVICE_GRANT_FINGERPRINT_PASS/);
assert.match(sql, /HOLD_SCHEMA_OR_GRANT_DRIFT/);
assert.match(preflightDoc, /SCHEMA_RLS_AND_SERVICE_GRANT_FINGERPRINT_PASS/);
assert.doesNotMatch(preflightDoc, /\bSCHEMA_AND_GRANT_FINGERPRINT_PASS\b/);
assert.match(sql, /migration_inventory_verified/);
assert.match(sql, /vercel_private_blob_verified/);
assert.match(sql, /fixture_creation_authorized/);
assert.match(sql, /write_authorized/);
assert.match(sql, /extensions\.digest\(text,text\)/);
assert.match(sql, /tenant_product_entitlements_internal_test_check/);
assert.match(sql, /tenant_product_entitlement_events_identity_fk/);
assert.match(sql, /UNUSED_PUBLIC_BUCKET_REQUIRES_SEPARATE_REMEDIATION/);
assert.match(sql, /required_relations_rls_and_service_grants_pass/);
assert.match(sql, /required_relations_exist_pass/);
assert.match(sql, /required_relations_rls_enabled_pass/);
assert.match(sql, /service_role_select_grants_pass/);
assert.match(sql, /client_effective_data_grants_absent_pass/);
assert.match(sql, /client_rls_policies_absent_pass/);
assert.match(sql, /CLIENT_ACL_HARDENING_GAP_WITH_NO_RLS_POLICY/);
assert.match(sql, /HOLD_CLIENT_RLS_POLICY_REVIEW/);
assert.match(sql, /service_role_can_select/);
assert.match(sql, /authenticated_has_effective_data_privilege/);
assert.match(sql, /anon_has_effective_data_privilege/);
assert.match(sql, /public_has_explicit_data_privilege/);
assert.match(sql, /client_rls_policy_exists/);
assert.match(sql, /overload_count/);
assert.match(sql, /pg_get_userbyid\(p\.proowner\) = 'postgres'/);
assert.match(sql, /'risk_share_item_candidates'/);
assert.doesNotMatch(sql, /'risk_share_candidates'/);
assert.doesNotMatch(sql, /\brequired_relations_rls_and_grants_pass\b/);

const requiredFunctionSignatures = [
  "public.create_self_service_tenant(text,text,text,text,text)",
  "public.create_tenant_default_site(uuid,text,text)",
  "public.activate_tenant_after_profile(text,uuid,text,text)",
  "public.prepare_risk_share_items_for_tenant(text,uuid,uuid,integer,text,uuid[])",
  "public.review_risk_share_item(uuid,text,uuid,bigint,text,text,text,text,text,text,text,text,boolean)",
  "public.publish_risk_share_version_for_tenant_checked(text,uuid,text,text,text,uuid[],bigint[],text)",
  "public.update_risk_share_confirmation_review_status(text,uuid,uuid,text,text,text)",
];

for (const signature of requiredFunctionSignatures) {
  assert.match(sql, new RegExp(signature.replaceAll(/[()[\]]/g, "\\$&")));
}

const forbiddenStatements = [
  /^\s*insert\s+into\b/im,
  /^\s*update\s+\S+\s+set\b/im,
  /^\s*delete\s+from\b/im,
  /^\s*alter\s+(table|function|policy)\b/im,
  /^\s*create\s+(table|function|policy|extension)\b/im,
  /^\s*drop\s+(table|function|policy|extension)\b/im,
  /^\s*grant\b/im,
  /^\s*revoke\b/im,
];

for (const pattern of forbiddenStatements) {
  assert.doesNotMatch(sql, pattern);
}

for (const sensitiveColumn of [
  "user_email",
  "raw_payload",
  "signature_data",
  "file_url",
  "owner_token",
  "service_role_key",
]) {
  assert.doesNotMatch(sql, new RegExp(`\\b${sensitiveColumn}\\b`, "i"));
}

console.log("PASS synthetic tenant Production E2E live fingerprint");
