import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260722060000_link_tenant_activation_entitlement.sql");
const ownerActions = read("src/lib/tenant-onboarding/ownerTenantCommercialActions.ts");
const activationHelper = read("src/lib/tenant-onboarding/tenantActivation.ts");

const checks = [
  ["one RPC owns tenant activation and entitlement issuance",
    /create or replace function public\.activate_tenant_after_profile/.test(migration)
      && /update public\.tenant_registry/.test(migration)
      && /insert into public\.tenant_product_entitlements/.test(migration)
      && /insert into public\.tenant_product_entitlement_events/.test(migration)],
  ["tenant and entitlement are locked in stable order",
    migration.indexOf("from public.tenant_registry tr")
      < migration.indexOf("from public.tenant_product_entitlements tpe")
      && /for update/.test(migration)],
  ["revoked lifecycle states cannot be restored by activation",
    /status not in \('pending', 'active'\)/.test(migration)
      && /'entitlement_conflict'/.test(migration)
      && /entitlement_conflict/.test(activationHelper)
      && /entitlement_conflict/.test(ownerActions)],
  ["new and pending entitlements become active with fixed product policy",
    /'risk_share', 'active',[\s\S]*'owner_console', 1, now\(\)/.test(migration)
      && /v_entitlement\.status = 'pending'/.test(migration)
      && /effective_at = coalesce\(tpe\.effective_at, now\(\)\)/.test(migration)],
  ["audit identity and request digest are written atomically",
    /tenant_product_entitlement_events \(/.test(migration)
      && /extensions\.digest\(concat_ws\('\|'/.test(migration)
      && /to_regprocedure\('extensions\.digest\(text, text\)'\)/.test(migration)
      && /v_idempotency_key, v_request_digest/.test(migration)],
  ["active replay does not duplicate transition events",
    /if v_entitlement\.id is null or v_entitlement\.status = 'pending' then/.test(migration)
      && /v_result_code := 'already_active'/.test(migration)],
  ["application does not bypass RPC for active tenants",
    !/if \(tenant\.status === "active"\)/.test(ownerActions)
      && /activateTenantAfterProfile/.test(ownerActions)],
  ["RPC remains service-role-only and migration has no direct data mutation",
    /revoke all on function public\.activate_tenant_after_profile[\s\S]*from public, anon, authenticated/.test(migration)
      && /grant execute on function public\.activate_tenant_after_profile[\s\S]*to service_role/.test(migration)
      && /Intentionally no direct tenant update/.test(migration)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "tenant activation entitlement contract failed");
console.log("PASS atomic tenant activation entitlement contract");
