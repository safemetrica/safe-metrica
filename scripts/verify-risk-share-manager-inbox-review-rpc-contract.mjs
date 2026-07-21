import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260721050000_add_manager_inbox_review_rpc.sql");

const rpcStart = migration.indexOf("create function public.update_risk_share_inbox_review_status");
const rpcEnd = migration.indexOf("revoke all on function public.update_risk_share_inbox_review_status", rpcStart);
assert.ok(rpcStart >= 0 && rpcEnd > rpcStart, "manager inbox review RPC body is present");
const rpc = migration.slice(rpcStart, rpcEnd);

const membershipLock = rpc.indexOf("from public.tenant_membership tm");
const submissionLock = rpc.indexOf("from public.field_participation_submissions fps");
const idempotencyLock = rpc.indexOf("pg_advisory_xact_lock");
const replayRead = rpc.indexOf("from public.risk_share_inbox_review_events rie");
const statusUpdate = rpc.indexOf("update public.field_participation_submissions fps");
const eventInsert = rpc.indexOf("insert into public.risk_share_inbox_review_events");

const allowedSources = [
  "risk_share_participation_submit_v1",
  "risk_share_anonymous_feedback_v1",
  "anonymous_worker_feedback_v1",
  "risk_share_visitor_confirmation_v1",
  "risk_share_representative_confirmation_v1",
];

const checks = [
  ["existing monthly contract is not replaced", !/update_risk_share_confirmation_review_status/.test(migration)],
  ["submission composite tenant identity", /field_participation_submissions_id_tenant_uidx[\s\S]*\(id, tenant_code\)/.test(migration)],
  ["new contract objects fail closed on drift", /a new contract object already exists/.test(migration)
    && /create table public\.risk_share_inbox_review_events/.test(migration)
    && !/create (table|index) if not exists public?\.?risk_share_inbox_review_events/i.test(migration)
    && !/drop function if exists public\.update_risk_share_inbox_review_status/.test(migration)],
  ["append-only audit ledger is SELECT-only outside RPC", /create table public\.risk_share_inbox_review_events/.test(migration)
    && /grant select[\s\S]*risk_share_inbox_review_events[\s\S]*to service_role/.test(migration)
    && !/grant[^;]*insert[^;]*risk_share_inbox_review_events/i.test(migration)
    && !/grant[^;]*(update|delete)[^;]*risk_share_inbox_review_events/i.test(migration)],
  ["identity sequence is not callable by the application role", /revoke all privileges[\s\S]*risk_share_inbox_review_events_event_sequence_seq[\s\S]*from public, anon, authenticated, service_role/.test(migration)],
  ["event submission and actor tenant foreign keys", /foreign key \(submission_id, tenant_code\)[\s\S]*field_participation_submissions \(id, tenant_code\)/.test(migration)
    && /foreign key \(actor_membership_id, tenant_code\)[\s\S]*tenant_membership \(id, tenant_code\)/.test(migration)],
  ["event table is policy-free service-only", /enable row level security/.test(migration)
    && /revoke all privileges[\s\S]*from public, anon, authenticated, service_role/.test(migration)
    && /v_policy_count <> 0/.test(migration)],
  ["audit chronology has a deterministic sequence", /event_sequence bigint generated always as identity/.test(migration)
    && /unique \(event_sequence\)/.test(migration)
    && /tenant_submission_sequence_idx/.test(migration)],
  ["four customer inbox types only", /inbox_type in \('prework', 'anonymous', 'visitor', 'representative'\)/.test(migration)
    && allowedSources.every((source) => rpc.includes(source))
    && /mode' = 'prework'/.test(rpc)
    && !/mode' = 'monthly'/.test(rpc)],
  ["ordered transitions only", /p_expected_status = 'unreviewed' and p_next_status = 'in_review'/.test(rpc)
    && /p_expected_status = 'in_review' and p_next_status = 'completed'/.test(rpc)
    && /coalesce\(p_expected_status, ''\) not in/.test(rpc)
    && /coalesce\(p_next_status, ''\) not in/.test(rpc)
    && /risk_share_inbox_review_events_transition_check/.test(migration)],
  ["authorization and tenant are database-derived", /v_membership\.tenant_code <> v_company_code/.test(rpc)
    && /v_membership\.status <> 'active'/.test(rpc)
    && /v_membership\.role not in \('tenant_admin', 'tenant_manager'\)/.test(rpc)],
  ["fixed lock and mutation order", membershipLock >= 0
    && submissionLock > membershipLock
    && idempotencyLock > submissionLock
    && replayRead > idempotencyLock
    && statusUpdate > replayRead
    && eventInsert > statusUpdate
    && /for share/.test(rpc)
    && /for update/.test(rpc)],
  ["Production-qualified database-derived retry digest", /to_regprocedure\('extensions\.digest\(bytea, text\)'\)/.test(migration)
    && /jsonb_build_array\(/.test(rpc)
    && /extensions\.digest\([\s\S]*'sha256'::text/.test(rpc)
    && (rpc.match(/digest\(/g) ?? []).length === (rpc.match(/extensions\.digest\(/g) ?? []).length
    && /request_digest = v_request_digest/.test(rpc)],
  ["exact replay and conflicting reuse are distinct", /select true, 'replayed'/.test(rpc)
    && /select false, 'idempotency_conflict'/.test(rpc)
    && /risk_share_inbox_review_events_tenant_idempotency_uidx/.test(migration)],
  ["stale write fails closed", /v_current_status <> p_expected_status/.test(rpc)
    && /select false, 'status_conflict'/.test(rpc)
    && /coalesce\(fps\.manager_review_status, 'unreviewed'\) = p_expected_status/.test(rpc)],
  ["status and audit share rollback boundary", eventInsert > statusUpdate
    && /get diagnostics v_row_count = row_count/.test(rpc)
    && /raise exception 'manager inbox review update invariant failed'/.test(rpc)
    && !/exception\s+when/i.test(rpc)],
  ["security definer and service-role-only execute", /security definer[\s\S]*set search_path = public, pg_temp/.test(rpc)
    && /revoke all on function public\.update_risk_share_inbox_review_status[\s\S]*from public, anon, authenticated, service_role/.test(migration)
    && /grant execute on function public\.update_risk_share_inbox_review_status[\s\S]*to service_role/.test(migration)],
  ["apply-time catalog postconditions", /function overload count is not exactly one/.test(migration)
    && /signature, owner, SECURITY DEFINER, or search_path mismatch/.test(migration)
    && /event table owner or RLS mismatch/.test(migration)
    && /ACL mismatch/.test(migration)
    && /unexpected function grantee/.test(migration)
    && /unexpected event table grant/.test(migration)
    && /grant option mismatch/.test(migration)],
  ["audit payload excludes worker and raw submission data", !/worker_name|phone|signature|raw_payload jsonb|content text|submitter text/.test(
    migration.slice(0, rpcStart),
  )],
  ["completed semantics are explicitly limited", /does not certify legal compliance/.test(migration)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log("PASS risk-share manager inbox review RPC contract");
