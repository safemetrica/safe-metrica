import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260722020000_add_product_entitlement_foundation.sql");
const publicGuard = read("src/lib/risk-share/riskSharePublicTenantGuard.ts");
const sourceUpload = read("src/lib/risk-share/riskShareSourceUpload.ts");

const checks = [
  ["tenant lifecycle and product access use separate tables",
    /create table if not exists public\.tenant_product_entitlements/.test(migration)
      && /references public\.tenant_registry \(id, company_code\)/.test(migration)],
  ["risk_share has explicit lifecycle states",
    /product_code in \('risk_share'\)/.test(migration)
      && /'pending', 'active', 'suspended', 'expired', 'terminated'/.test(migration)],
  ["activation provenance and policy version are required",
    /activation_source text not null/.test(migration)
      && /policy_version integer not null/.test(migration)
      && /policy_version >= 1/.test(migration)],
  ["one current entitlement exists per tenant and product",
    /unique \(tenant_id, product_code\)/.test(migration)],
  ["audit events are append-only and idempotent",
    /create table if not exists public\.tenant_product_entitlement_events/.test(migration)
      && /request_digest ~ '\^\[0-9a-f\]\{64\}\$'/.test(migration)
      && /tenant_product_entitlement_events_idempotency_uidx/.test(migration)
      && /grant select, insert[\s\S]*tenant_product_entitlement_events[\s\S]*to service_role/.test(migration)],
  ["tables are service-role only",
    (migration.match(/enable row level security/g) ?? []).length === 2
      && (migration.match(/from public, anon, authenticated, service_role/g) ?? []).length === 2],
  ["foundation does not mutate existing tenants or runtime access",
    /Intentionally no backfill/.test(migration)
      && !/insert into public\.tenant_product_entitlements/i.test(migration)
      && !/update public\.tenant_registry/i.test(migration)
      && !/tenant_product_entitlements/.test(publicGuard)
      && !/tenant_product_entitlements/.test(sourceUpload)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "product entitlement foundation contract failed");
console.log("PASS product entitlement foundation contract");
