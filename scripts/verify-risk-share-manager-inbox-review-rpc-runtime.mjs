import assert from "node:assert/strict";
import fs from "node:fs";
import pgModule from "pg";

const { Client } = pgModule;
const repo = new URL("../", import.meta.url);
const databaseUrl = process.env.PR930_DATABASE_URL;
assert.ok(databaseUrl, "PR930_DATABASE_URL is required");
const migration = (path) => fs.readFileSync(new URL(path, repo), "utf8");

const sql = {
  membership: migration("supabase/migrations/20260628133500_create_tenant_membership.sql"),
  submissions: migration("supabase/migrations/20260712010000_create_field_participation_submissions_baseline.sql"),
  monthly: migration("supabase/migrations/20260721010000_add_confirmation_manager_review.sql"),
  inbox: migration("supabase/migrations/20260721050000_add_manager_inbox_review_rpc.sql"),
};

const ids = {
  tenantA: "00000000-0000-0000-0000-000000000001",
  tenantB: "00000000-0000-0000-0000-000000000002",
  adminA: "00000000-0000-0000-0000-000000000011",
  managerA: "00000000-0000-0000-0000-000000000012",
  viewerA: "00000000-0000-0000-0000-000000000013",
  suspendedA: "00000000-0000-0000-0000-000000000014",
  representativeA: "00000000-0000-0000-0000-000000000015",
  ownerA: "00000000-0000-0000-0000-000000000016",
  revokedA: "00000000-0000-0000-0000-000000000017",
  adminB: "00000000-0000-0000-0000-000000000021",
};

let root;

const pass = (name) => console.log(`PASS ${name}`);
const row = (result) => result.rows[0];

async function connect(role = null) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  if (role) await client.query(`set role ${role}`);
  return client;
}

async function call(client, {
  company = "tenant-a",
  actor = ids.adminA,
  submission,
  expected = "unreviewed",
  next = "in_review",
  note = null,
  key,
}) {
  return row(await client.query(
    `select * from public.update_risk_share_inbox_review_status($1,$2,$3,$4,$5,$6,$7)`,
    [company, actor, submission, expected, next, note, key],
  ));
}

async function expectDenied(client, statement, name) {
  await client.query("begin");
  try {
    await client.query(statement);
    assert.fail(`${name}: statement unexpectedly succeeded`);
  } catch (error) {
    assert.match(error.message, /permission denied/);
  } finally {
    await client.query("rollback");
  }
  pass(name);
}

async function main() {
  root = await connect();

  await root.query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema extensions authorization postgres;
    create extension pgcrypto with schema extensions;
    create table public.tenant_registry (
      id uuid primary key default gen_random_uuid(),
      tenant_code text not null unique
    );
  `);
  await root.query(sql.membership);
  await root.query(sql.submissions);
  await root.query(`
    alter table public.field_participation_submissions add column version_lock_id uuid;
    create unique index tenant_membership_id_tenant_code_uidx
      on public.tenant_membership (id, tenant_code);
  `);
  await root.query(sql.monthly);

  const monthlyBefore = row(await root.query(`
    select pg_get_functiondef('public.update_risk_share_confirmation_review_status(text,uuid,uuid,text,text,text)'::regprocedure) as definition
  `)).definition;
  await root.query(sql.inbox);
  pass("migration applies with catalog postconditions");

  const monthlyAfter = row(await root.query(`
    select pg_get_functiondef('public.update_risk_share_confirmation_review_status(text,uuid,uuid,text,text,text)'::regprocedure) as definition
  `)).definition;
  assert.equal(monthlyAfter, monthlyBefore);
  pass("existing monthly RPC definition unchanged");

  await root.query(`
    insert into public.tenant_registry (id, tenant_code) values
      ('${ids.tenantA}', 'tenant-a'), ('${ids.tenantB}', 'tenant-b');

    insert into public.tenant_membership
      (id, tenant_id, tenant_code, user_email, role, status, revoked_at)
    values
      ('${ids.adminA}', '${ids.tenantA}', 'tenant-a', 'admin-a@example.invalid', 'tenant_admin', 'active', null),
      ('${ids.managerA}', '${ids.tenantA}', 'tenant-a', 'manager-a@example.invalid', 'tenant_manager', 'active', null),
      ('${ids.viewerA}', '${ids.tenantA}', 'tenant-a', 'viewer-a@example.invalid', 'tenant_viewer', 'active', null),
      ('${ids.suspendedA}', '${ids.tenantA}', 'tenant-a', 'suspended-a@example.invalid', 'tenant_manager', 'suspended', null),
      ('${ids.representativeA}', '${ids.tenantA}', 'tenant-a', 'representative-a@example.invalid', 'tenant_representative', 'active', null),
      ('${ids.ownerA}', '${ids.tenantA}', 'tenant-a', 'owner-a@example.invalid', 'owner_internal', 'active', null),
      ('${ids.revokedA}', '${ids.tenantA}', 'tenant-a', 'revoked-a@example.invalid', 'tenant_manager', 'revoked', now()),
      ('${ids.adminB}', '${ids.tenantB}', 'tenant-b', 'admin-b@example.invalid', 'tenant_admin', 'active', null);
  `);

  const sources = [
    [101, "tenant-a", { source: "risk_share_participation_submit_v1", mode: "prework", content: "SYNTHETIC_SECRET_MARKER" }],
    [102, "tenant-a", { source: "risk_share_anonymous_feedback_v1", content: "SYNTHETIC_SECRET_MARKER" }],
    [103, "tenant-a", { source: "anonymous_worker_feedback_v1", content: "SYNTHETIC_SECRET_MARKER" }],
    [104, "tenant-a", { source: "risk_share_visitor_confirmation_v1", signature: "SYNTHETIC_SECRET_MARKER" }],
    [105, "tenant-a", { source: "risk_share_representative_confirmation_v1", worker_name: "SYNTHETIC_SECRET_MARKER" }],
    [106, "tenant-a", { source: "risk_share_participation_submit_v1", mode: "monthly" }],
    [107, "tenant-a", { source: "unknown_source_v1" }],
    [108, "tenant-b", { source: "risk_share_visitor_confirmation_v1" }],
    [109, "tenant-a", { source: "risk_share_participation_submit_v1", mode: "prework" }],
    [110, "tenant-a", { source: "risk_share_anonymous_feedback_v1" }],
    [111, "tenant-a", { source: "risk_share_visitor_confirmation_v1" }],
    [112, "tenant-a", { source: "risk_share_representative_confirmation_v1" }],
    [113, "tenant-a", { source: "risk_share_anonymous_feedback_v1" }],
    [114, "tenant-a", { source: "risk_share_visitor_confirmation_v1" }],
    [115, "tenant-a", { source: "risk_share_representative_confirmation_v1" }],
    [116, "tenant-b", { source: "risk_share_representative_confirmation_v1" }],
  ];

  for (const [suffix, tenant, payload] of sources) {
    const id = `00000000-0000-0000-0000-${String(suffix).padStart(12, "0")}`;
    await root.query(
      `insert into public.field_participation_submissions
         (id, tenant_code, submission_type, raw_payload, version_lock_id)
       values ($1,$2,'synthetic',$3::jsonb,$4)`,
      [id, tenant, JSON.stringify(payload), suffix === 106 ? "00000000-0000-0000-0000-000000009999" : null],
    );
  }

  const service = await connect("service_role");
  const sid = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

  for (const n of [101, 102, 103, 104, 105]) {
    const result = await call(service, { submission: sid(n), key: `allowed-${n}` });
    assert.deepEqual([result.ok, result.result_code, result.review_status, result.replayed], [true, "updated", "in_review", false]);
  }
  pass("all four inbox types and both anonymous source aliases update");

  const completed = await call(service, {
    submission: sid(101), expected: "in_review", next: "completed", note: "synthetic completion note", key: "prework-complete",
  });
  assert.deepEqual([completed.ok, completed.result_code, completed.review_status], [true, "updated", "completed"]);
  assert.equal(Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events where submission_id=$1`, [sid(101)])).count), 2);
  pass("ordered first and second transition append exactly one event each");

  for (const n of [106, 107]) {
    const result = await call(service, { submission: sid(n), key: `unsupported-${n}` });
    assert.deepEqual([result.ok, result.result_code], [false, "unsupported_type"]);
  }
  pass("monthly and unknown sources are rejected by new RPC");

  const monthlyResult = row(await service.query(
    `select * from public.update_risk_share_confirmation_review_status($1,$2,$3,$4,$5,$6)`,
    ["tenant-a", ids.adminA, sid(106), "unreviewed", "in_review", "synthetic monthly note"],
  ));
  assert.deepEqual([monthlyResult.ok, monthlyResult.code, monthlyResult.review_status], [true, "ok", "in_review"]);
  pass("existing monthly RPC still executes independently");

  const crossActor = await call(service, { actor: ids.adminB, submission: sid(109), key: "cross-actor" });
  const crossSubmission = await call(service, { submission: sid(108), key: "cross-submission" });
  assert.deepEqual([crossActor.result_code, crossSubmission.result_code], ["forbidden", "not_found"]);
  assert.equal(row(await service.query(`select manager_review_status from public.field_participation_submissions where id=$1`, [sid(108)])).manager_review_status, null);
  pass("cross-tenant actor and submission fail without mutation");

  for (const [actor, label] of [
    [ids.viewerA, "viewer"], [ids.suspendedA, "suspended"], [ids.representativeA, "representative"],
    [ids.ownerA, "internal owner"], [ids.revokedA, "revoked"],
  ]) {
    const result = await call(service, { actor, submission: sid(109), key: `forbidden-${label.replaceAll(" ", "-")}` });
    assert.equal(result.result_code, "forbidden");
  }
  pass("viewer, suspended, representative, internal owner, and revoked roles are forbidden");

  for (const transition of [
    { expected: "unreviewed", next: "completed", key: "skip" },
    { expected: "in_review", next: "unreviewed", key: "reverse" },
  ]) {
    const result = await call(service, { submission: sid(109), ...transition });
    assert.equal(result.result_code, "validation_failed");
  }
  pass("skipped and reversed transitions fail validation");

  const stale = await call(service, { submission: sid(101), expected: "in_review", next: "completed", key: "stale" });
  assert.deepEqual([stale.result_code, stale.review_status], ["status_conflict", "completed"]);
  pass("stale expected status fails closed");

  const firstReplayTarget = await call(service, { submission: sid(109), note: "normalized note", key: "retry-one" });
  const eventCountBeforeReplay = Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events`)).count);
  const replay = await call(service, { submission: sid(109), note: " normalized note ", key: "retry-one" });
  const eventCountAfterReplay = Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events`)).count);
  assert.deepEqual([replay.ok, replay.result_code, replay.event_id, replay.replayed], [true, "replayed", firstReplayTarget.event_id, true]);
  assert.equal(eventCountAfterReplay, eventCountBeforeReplay);
  const conflict = await call(service, { submission: sid(109), note: "different note", key: "retry-one" });
  assert.deepEqual([conflict.ok, conflict.result_code, conflict.event_id], [false, "idempotency_conflict", firstReplayTarget.event_id]);
  assert.equal(Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events`)).count), eventCountBeforeReplay);
  pass("exact retry replays original event and conflicting key reuse writes nothing");

  const markerCount = Number(row(await service.query(
    `select count(*) as count from public.risk_share_inbox_review_events rie where to_jsonb(rie)::text like '%SYNTHETIC_SECRET_MARKER%'`,
  )).count);
  assert.equal(markerCount, 0);
  pass("audit events do not copy synthetic worker, signature, or raw content markers");

  const concurrencyA = await connect("service_role");
  const concurrencyB = await connect("service_role");
  const staleRace = await Promise.all([
    call(concurrencyA, { submission: sid(110), key: "stale-race-a" }),
    call(concurrencyB, { submission: sid(110), key: "stale-race-b" }),
  ]);
  assert.deepEqual(staleRace.map((r) => r.result_code).sort(), ["status_conflict", "updated"]);
  assert.equal(Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events where submission_id=$1`, [sid(110)])).count), 1);
  pass("concurrent stale writers yield one update and one status conflict");

  const exactRace = await Promise.all([
    call(concurrencyA, { submission: sid(111), note: "same", key: "exact-race" }),
    call(concurrencyB, { submission: sid(111), note: "same", key: "exact-race" }),
  ]);
  assert.deepEqual(exactRace.map((r) => r.result_code).sort(), ["replayed", "updated"]);
  assert.equal(exactRace[0].event_id, exactRace[1].event_id);
  pass("concurrent exact retries yield one update and one replay of the same event");

  const reusedRace = await Promise.all([
    call(concurrencyA, { submission: sid(112), key: "reuse-race" }),
    call(concurrencyB, { submission: sid(113), key: "reuse-race" }),
  ]);
  assert.deepEqual(reusedRace.map((r) => r.result_code).sort(), ["idempotency_conflict", "updated"]);
  const reuseStates = (await service.query(`select id, manager_review_status from public.field_participation_submissions where id=any($1::uuid[]) order by id`, [[sid(112), sid(113)]])).rows;
  assert.equal(reuseStates.filter((r) => r.manager_review_status === "in_review").length, 1);
  assert.equal(reuseStates.filter((r) => r.manager_review_status === null).length, 1);
  pass("concurrent cross-submission key reuse yields one update and one conflict");

  const tenantScopedRace = await Promise.all([
    call(concurrencyA, { submission: sid(115), key: "tenant-scoped-key" }),
    call(concurrencyB, { company: "tenant-b", actor: ids.adminB, submission: sid(116), key: "tenant-scoped-key" }),
  ]);
  assert.deepEqual(tenantScopedRace.map((r) => r.result_code).sort(), ["updated", "updated"]);
  pass("same idempotency key remains tenant-scoped");

  await root.query(`
    create function public.synthetic_fail_event_insert() returns trigger language plpgsql as $$
    begin
      if new.submission_id = '${sid(114)}'::uuid then
        raise exception 'synthetic forced event insert failure';
      end if;
      return new;
    end $$;
    create trigger synthetic_fail_event_insert_trigger
      before insert on public.risk_share_inbox_review_events
      for each row execute function public.synthetic_fail_event_insert();
  `);
  let forcedFailure = false;
  try {
    await call(service, { submission: sid(114), key: "forced-rollback" });
  } catch (error) {
    forcedFailure = /synthetic forced event insert failure/.test(error.message);
  }
  assert.equal(forcedFailure, true);
  assert.equal(row(await service.query(`select manager_review_status from public.field_participation_submissions where id=$1`, [sid(114)])).manager_review_status, null);
  assert.equal(Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events where idempotency_key='forced-rollback'`)).count), 0);
  await root.query(`drop trigger synthetic_fail_event_insert_trigger on public.risk_share_inbox_review_events; drop function public.synthetic_fail_event_insert();`);
  pass("forced event insert failure rolls back status update and event");

  await expectDenied(service,
    `insert into public.risk_share_inbox_review_events
       (tenant_code, submission_id, inbox_type, from_status, to_status, actor_membership_id, idempotency_key, request_digest)
     values ('tenant-a','${sid(101)}','prework','unreviewed','in_review','${ids.adminA}','direct-insert',repeat('a',64))`,
    "service_role direct event insert is denied");
  await expectDenied(service,
    `update public.risk_share_inbox_review_events set action_note='changed' where tenant_code='tenant-a'`,
    "service_role event update is denied");
  await expectDenied(service,
    `delete from public.risk_share_inbox_review_events where tenant_code='tenant-a'`,
    "service_role event delete is denied");
  await expectDenied(service,
    `select nextval('public.risk_share_inbox_review_events_event_sequence_seq')`,
    "service_role identity sequence access is denied");

  const anon = await connect("anon");
  await expectDenied(anon,
    `select * from public.update_risk_share_inbox_review_status('tenant-a','${ids.adminA}','${sid(101)}','in_review','completed',null,'anon-call')`,
    "anon RPC execute is denied");
  await expectDenied(anon,
    `select * from public.risk_share_inbox_review_events`,
    "anon event select is denied");

  const sequenceRows = (await service.query(`select event_sequence from public.risk_share_inbox_review_events order by event_sequence`)).rows;
  assert.ok(sequenceRows.length > 0);
  for (let i = 1; i < sequenceRows.length; i += 1) {
    assert.ok(BigInt(sequenceRows[i].event_sequence) > BigInt(sequenceRows[i - 1].event_sequence));
  }
  pass("event_sequence provides deterministic strictly increasing audit order");

  const countBeforeRerun = Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events`)).count);
  let rerunFailedClosed = false;
  try {
    await root.query(sql.inbox);
  } catch (error) {
    rerunFailedClosed = /a new contract object already exists/.test(error.message);
  }
  assert.equal(rerunFailedClosed, true);
  assert.equal(Number(row(await service.query(`select count(*) as count from public.risk_share_inbox_review_events`)).count), countBeforeRerun);
  pass("migration rerun fails closed without changing existing audit state");

  await Promise.all([service.end(), anon.end(), concurrencyA.end(), concurrencyB.end()]);
  console.log("PASS PR #930 isolated PostgreSQL runtime matrix");
}

try {
  await main();
} finally {
  if (root) await root.end().catch(() => {});
}

