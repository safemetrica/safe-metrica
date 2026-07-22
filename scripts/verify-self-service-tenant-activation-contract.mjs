import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const migration = read("supabase/migrations/20260721040000_add_atomic_tenant_activation.sql");
const helper = read("src/lib/tenant-onboarding/tenantActivation.ts");
const profileAction = read("src/app/risk-share/manager/settings/site-profile/actions.ts");
const ownerActions = read("src/lib/tenant-onboarding/ownerTenantCommercialActions.ts");

const rpcStart = migration.indexOf("create function public.activate_tenant_after_profile");
const rpcEnd = migration.indexOf("revoke all on function public.activate_tenant_after_profile", rpcStart);
assert.ok(rpcStart >= 0 && rpcEnd > rpcStart, "activation RPC body is present");
const rpc = migration.slice(rpcStart, rpcEnd);

const tenantLock = rpc.indexOf("from public.tenant_registry tr");
const membershipLock = rpc.indexOf("from public.tenant_membership tm");
const siteLock = rpc.indexOf("from public.tenant_sites ts");
const eventInsert = rpc.indexOf("insert into public.tenant_activation_events");
const statusUpdate = rpc.indexOf("update public.tenant_registry tr");

const checks = [
  ["append-only activation event ledger", /create table if not exists public\.tenant_activation_events/.test(migration)
    && /grant select, insert[\s\S]*tenant_activation_events[\s\S]*to service_role/.test(migration)
    && !/grant[^;]*(update|delete)[^;]*tenant_activation_events/i.test(migration)],
  ["event tenant and membership company foreign keys", /foreign key \(tenant_id, tenant_code\)[\s\S]*tenant_registry \(id, company_code\)/.test(migration)
    && /foreign key \(actor_membership_id, tenant_code\)[\s\S]*tenant_membership \(id, tenant_code\)/.test(migration)],
  ["one activation event and idempotency uniqueness", /tenant_activation_events_one_transition_uidx/.test(migration)
    && /tenant_activation_events_idempotency_uidx/.test(migration)],
  ["service-role-only RPC", /security definer[\s\S]*set search_path = public, pg_temp/.test(rpc)
    && /revoke all on function public\.activate_tenant_after_profile[\s\S]*from public, anon, authenticated/.test(migration)
    && /grant execute on function public\.activate_tenant_after_profile[\s\S]*to service_role/.test(migration)],
  ["tenant row locks before dependent rows", tenantLock >= 0 && membershipLock > tenantLock && siteLock > membershipLock
    && /from public\.tenant_registry tr[\s\S]*for update/.test(rpc)],
  ["active tenant_admin membership is re-derived", /v_membership\.status <> 'active'/.test(rpc)
    && /v_membership\.role <> 'tenant_admin'/.test(rpc)
    && /v_membership\.tenant_id <> v_tenant\.id/.test(rpc)
    && /v_membership\.tenant_code <> v_tenant\.company_code/.test(rpc)],
  ["default-site linkage is re-derived", /ts\.id = v_tenant\.default_site_id/.test(rpc)
    && /ts\.tenant_id = v_tenant\.id/.test(rpc)
    && /ts\.tenant_code = v_tenant\.company_code/.test(rpc)
    && /ts\.is_default = true/.test(rpc)
    && /ts\.status = 'active'/.test(rpc)],
  ["complete operational profile is required", /v_site\.industry_profile/.test(rpc)
    && /v_site\.major_processes/.test(rpc)
    && /v_site\.major_equipment/.test(rpc)
    && /v_site\.worker_count_band/.test(rpc)
    && /v_site\.uses_external_workforce is null/.test(rpc)
    && /v_site\.has_worker_representative is null/.test(rpc)],
  ["duplicate and concurrent calls return already_active", /if v_tenant\.status = 'active' then/.test(rpc)
    && /select true, 'already_active', 'active'/.test(rpc)
    && /tenant_activation_events_one_transition_uidx/.test(migration)],
  ["event and status update share one rollback boundary", eventInsert >= 0 && statusUpdate > eventInsert
    && /get diagnostics v_row_count = row_count/.test(rpc)
    && /raise exception 'tenant activation update invariant failed'/.test(rpc)
    && !/exception\s+when/i.test(rpc)],
  ["application helper calls only the atomic RPC", /\/rest\/v1\/rpc\/activate_tenant_after_profile/.test(helper)
    && /p_initiated_by: "owner_console"/.test(helper)
    && !/params\.initiatedBy/.test(helper)
    && !/tenant_registry\?/.test(helper)],
  ["profile save never activates the tenant", !/activateTenantAfterProfile/.test(profileAction)
    && !/self_service_profile/.test(profileAction)
    && /saved: "1"/.test(profileAction)],
  ["Owner direct PATCH is removed", /activateTenantAfterProfile/.test(ownerActions)
    && !/method: "PATCH"/.test(ownerActions)
    && !/tenant_registry\?/.test(ownerActions)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log("PASS self-service tenant activation contract");
