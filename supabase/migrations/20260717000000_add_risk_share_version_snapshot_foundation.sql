-- SafeMetrica Risk Share Manager Publish: immutable version snapshot foundation
--
-- Schema-only PR. No RPC, no API, no UI, no Public QR read change, no
-- Monthly Evidence change. create_risk_share_version_lock and the Owner
-- Version Lock route are not touched. This migration only:
--   1. Adds version-chain / actor / idempotency metadata columns to the
--      existing risk_share_version_locks table (additive only).
--   2. Creates a new append-only risk_share_version_items snapshot ledger.
--   3. Backfills existing locked risk_share_items into that ledger.
--
-- Why version metadata columns alone are insufficient:
-- risk_share_items.version_lock_id is a single nullable FK -- once an item
-- is locked into a version, that column permanently points at that one
-- lock row (create_risk_share_version_lock only selects items where
-- version_lock_id is null). There is no representation of "what this item's
-- content looked like at the time of version N" independent of the item's
-- current live row, and an item can never appear in a second version's
-- snapshot once locked. A future tenant publish RPC that needs to support
-- republish/rollback (new version generation + copy of a past version's
-- content, never reactivating an old row) needs a separate per-version,
-- per-item, immutable row -- not another column on risk_share_items.
--
-- risk_share_version_items is that ledger: one row per (version_lock_id,
-- source_item_id), storing the share-relevant fields as they existed at
-- lock time. It is intentionally a separate formal table, not a JSON blob
-- in risk_share_version_locks.raw_payload (raw_payload is documented as
-- "internal diagnostics only" and must not carry full item content).
--
-- Tenant isolation is enforced by composite (id, company_code) /
-- (id, tenant_code) foreign keys throughout, not only by future RPC/session
-- checks: risk_share_version_locks.previous_version_id,
-- content_source_version_id, and actor_membership_id, and every
-- risk_share_version_items row, must resolve to the *same* company_code /
-- tenant_code as the row that references them, or the insert is rejected
-- by Postgres regardless of what application code does.
--
-- Out of scope for this PR (deliberately not implemented here):
--   - tenant publish RPC
--   - Manager Publish API/UI
--   - active-row supersede transaction / rollback RPC
--   - Public QR read migration (src/lib/risk-share/riskSharePublicVersion.ts
--     keeps reading risk_share_items.version_lock_id directly; a later PR
--     switches it to risk_share_version_items once this ledger is proven)
--   - Monthly Evidence (unaffected either way -- it never reads
--     risk_share_version_locks/risk_share_items)
--   - superseded_by_version_id (computable via previous_version_id reverse
--     lookup) and publish_revision (not needed by this version-chain
--     contract) are deliberately not added.

-- ============================================================================
-- A. risk_share_version_locks: additive version-chain / actor / idempotency
--    metadata columns
-- ============================================================================

alter table public.risk_share_version_locks
  add column if not exists previous_version_id uuid;

alter table public.risk_share_version_locks
  add column if not exists content_source_version_id uuid;

alter table public.risk_share_version_locks
  add column if not exists actor_membership_id uuid;

alter table public.risk_share_version_locks
  add column if not exists idempotency_key text;

alter table public.risk_share_version_locks
  add column if not exists superseded_at timestamptz;

alter table public.risk_share_version_locks
  add column if not exists publish_action text not null default 'legacy';

-- ============================================================================
-- A1. Composite tenant-identity unique indexes
--
-- Required as FK targets for the composite foreign keys below. A plain
-- primary key on `id` alone cannot be the target of a foreign key that also
-- constrains company_code/tenant_code to match -- Postgres requires the
-- exact referenced column tuple to have a unique (or primary key)
-- constraint. These look redundant next to the existing single-column `id`
-- primary keys, but they are a distinct, additional constraint that a
-- composite FK cannot do without.
-- ============================================================================

create unique index if not exists risk_share_version_locks_id_company_uidx
  on public.risk_share_version_locks (id, company_code);

create unique index if not exists risk_share_items_id_company_uidx
  on public.risk_share_items (id, company_code);

create unique index if not exists tenant_membership_id_tenant_code_uidx
  on public.tenant_membership (id, tenant_code);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_publish_action_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_publish_action_check
      check (publish_action in ('legacy', 'publish', 'republish', 'rollback'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_previous_version_self_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_previous_version_self_check
      check (previous_version_id is null or previous_version_id <> id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_content_source_self_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_content_source_self_check
      check (content_source_version_id is null or content_source_version_id <> id);
  end if;
end $$;

-- Idempotency key must already be stored in canonical (btrim'd) form, not
-- merely non-empty after trimming. A future publish RPC comparing
-- idempotency_key values with a plain equality check (rather than
-- re-trimming on every read) must never be able to store " key-1" and
-- "key-1" as if they were different keys, or as if they were the same key
-- with cosmetic whitespace -- the column itself refuses the untrimmed form.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_idempotency_key_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_idempotency_key_check
      check (
        idempotency_key is null
        or (
          idempotency_key = btrim(idempotency_key)
          and idempotency_key <> ''
          and char_length(idempotency_key) <= 200
        )
      );
  end if;
end $$;

-- Composite (id, company_code) / (id, tenant_code) foreign keys: a version
-- may only chain to, copy content from, or be published by an actor
-- belonging to its own tenant. Default MATCH SIMPLE means a null
-- previous_version_id/content_source_version_id/actor_membership_id still
-- satisfies the constraint regardless of company_code -- legacy rows and
-- the first version in a chain are unaffected. When the referencing column
-- is non-null, Postgres requires the exact (id, company_code) /
-- (id, tenant_code) pair to exist, so a cross-tenant link is rejected at
-- insert/update time independent of any RPC-level check.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_previous_version_company_fkey'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_previous_version_company_fkey
      foreign key (previous_version_id, company_code)
      references public.risk_share_version_locks (id, company_code)
      match simple
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_content_source_company_fkey'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_content_source_company_fkey
      foreign key (content_source_version_id, company_code)
      references public.risk_share_version_locks (id, company_code)
      match simple
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_actor_membership_company_fkey'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_actor_membership_company_fkey
      foreign key (actor_membership_id, company_code)
      references public.tenant_membership (id, tenant_code)
      match simple
      on delete restrict;
  end if;
end $$;

create unique index if not exists risk_share_version_locks_company_idempotency_uidx
  on public.risk_share_version_locks (company_code, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists risk_share_version_locks_previous_version_uidx
  on public.risk_share_version_locks (previous_version_id)
  where previous_version_id is not null;

create index if not exists risk_share_version_locks_actor_created_idx
  on public.risk_share_version_locks (actor_membership_id, created_at desc);

create index if not exists risk_share_version_locks_previous_version_idx
  on public.risk_share_version_locks (previous_version_id);

create index if not exists risk_share_version_locks_content_source_version_idx
  on public.risk_share_version_locks (content_source_version_id);

comment on column public.risk_share_version_locks.previous_version_id is
  'Version this row supersedes in the publish chain, always within the same company_code (enforced by risk_share_version_locks_previous_version_company_fkey). Unique: at most one version may claim a given predecessor. Null for the first version or a legacy Owner-created lock with no recorded predecessor.';

comment on column public.risk_share_version_locks.content_source_version_id is
  'Version whose item snapshot content was copied to produce this version (rollback lineage), always within the same company_code (enforced by risk_share_version_locks_content_source_company_fkey). Distinct from previous_version_id, which only records temporal chain order, not content provenance.';

comment on column public.risk_share_version_locks.actor_membership_id is
  'tenant_membership row of the actor who published this version, always matching this row''s company_code against tenant_membership.tenant_code (enforced by risk_share_version_locks_actor_membership_company_fkey). Null for legacy Owner-token-authenticated locks, which have no tenant membership actor.';

comment on column public.risk_share_version_locks.idempotency_key is
  'Caller-supplied idempotency token for a future tenant publish RPC, unique per company_code when present. Must already be stored btrim''d (risk_share_version_locks_idempotency_key_check rejects untrimmed or empty values). Null for legacy Owner-created locks.';

comment on column public.risk_share_version_locks.superseded_at is
  'When a future publish/rollback RPC transitions this version out of active, set alongside lock_status = ''superseded''. Null while active or for legacy rows never superseded through that path.';

comment on column public.risk_share_version_locks.publish_action is
  'How this version was created: legacy (pre-existing Owner flow, default for all rows created before this column existed), publish, republish, or rollback. Set by a future tenant publish RPC, not by create_risk_share_version_lock.';

-- ============================================================================
-- B. risk_share_version_items: immutable per-version item snapshot ledger
-- ============================================================================

create table if not exists public.risk_share_version_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_code text not null,
  version_lock_id uuid not null,
  source_item_id uuid not null,
  position integer not null,
  task_name text not null,
  hazard text not null,
  accident_type text,
  current_controls text,
  improvement_plan text,
  risk_level text,
  worker_share_summary text,
  worker_visible boolean not null,
  source_review_revision bigint not null,

  constraint risk_share_version_items_position_check check (position >= 1),
  constraint risk_share_version_items_source_review_revision_check check (
    source_review_revision >= 1
  ),
  constraint risk_share_version_items_company_code_check check (
    btrim(company_code) <> ''
  ),
  constraint risk_share_version_items_task_name_check check (
    btrim(task_name) <> ''
  ),
  constraint risk_share_version_items_hazard_check check (
    btrim(hazard) <> ''
  ),

  -- Composite FKs, not plain single-column FKs: version_lock_id and
  -- source_item_id are both required (not null), so MATCH SIMPLE always
  -- applies here -- every snapshot row's company_code must equal both its
  -- version's company_code and its source item's company_code. A
  -- cross-tenant snapshot (tenant-A version + tenant-B item, or a
  -- company_code that matches neither) is rejected by Postgres at insert
  -- time, not only by future RPC/session logic.
  constraint risk_share_version_items_version_lock_company_fkey
    foreign key (version_lock_id, company_code)
    references public.risk_share_version_locks (id, company_code)
    on delete restrict,
  constraint risk_share_version_items_source_item_company_fkey
    foreign key (source_item_id, company_code)
    references public.risk_share_items (id, company_code)
    on delete restrict
);

create unique index if not exists risk_share_version_items_lock_source_item_uidx
  on public.risk_share_version_items (version_lock_id, source_item_id);

create unique index if not exists risk_share_version_items_lock_position_uidx
  on public.risk_share_version_items (version_lock_id, position);

create index if not exists risk_share_version_items_company_lock_position_idx
  on public.risk_share_version_items (company_code, version_lock_id, position);

create index if not exists risk_share_version_items_source_item_idx
  on public.risk_share_version_items (source_item_id);

create index if not exists risk_share_version_items_lock_worker_visible_position_idx
  on public.risk_share_version_items (version_lock_id, worker_visible, position);

-- Server-only, append-only ledger, matching risk_share_item_review_events
-- (20260716010000) and its service_role privilege fix
-- (20260716020000): RLS enabled with zero policies, and the revoke targets
-- service_role explicitly (not just public/anon/authenticated) so
-- service_role never keeps its broader Postgres-default privileges on this
-- table. No update/delete/truncate/references/trigger grant to service_role
-- at all -- a snapshot row is written once by the (future) publish RPC and
-- never modified or removed after that; every access goes through the
-- service role key, there is no anon/authenticated policy.
alter table public.risk_share_version_items enable row level security;

revoke all privileges
  on table public.risk_share_version_items
  from public, anon, authenticated, service_role;

grant select, insert
  on table public.risk_share_version_items
  to service_role;

comment on table public.risk_share_version_items is
  'Immutable per-version item snapshot ledger for Risk Share Pack versions. One row per (version_lock_id, source_item_id), storing the share-relevant risk_share_items fields as they existed at lock time. company_code is enforced to match both the parent version and the source item via composite foreign keys -- a cross-tenant snapshot cannot exist. Append-only: rows are never updated or deleted after insert. SSOT for a future tenant publish RPC and for rollback (new version + copied snapshot), not a replacement for risk_share_items.version_lock_id in this PR.';

comment on column public.risk_share_version_items.source_item_id is
  'risk_share_items row this snapshot was copied from. Not unique alone: the same source item could in principle appear in a later version''s snapshot via rollback/republish, but never twice within the same version_lock_id (see risk_share_version_items_lock_source_item_uidx).';

comment on column public.risk_share_version_items.position is
  'Stable per-version display order, 1-based, unique within version_lock_id. Backfilled as row_number() over created_at asc, id asc for legacy locks.';

comment on column public.risk_share_version_items.source_review_revision is
  'risk_share_items.review_revision at snapshot time -- the optimistic-concurrency token the item had when this version captured it, for audit/debugging only.';

-- ============================================================================
-- C. Backfill: existing locked risk_share_items -> risk_share_version_items
-- ============================================================================
--
-- Four preflight checks run before any snapshot row is written, each
-- aborting the whole migration on the first violation it finds. Every
-- exception message below reports only a row count (and, for the rerun
-- check, only a count of content-mismatched pairs) -- never company_code,
-- item id, task_name/hazard text, or any other customer risk-factor or
-- identifying content.

-- C1. Required data: task_name/hazard must be non-empty (not null does not
-- forbid an empty string), and review_revision must be a valid ( >= 1)
-- optimistic-concurrency token. review_revision already has a `not null`
-- and `>= 1` check constraint on risk_share_items itself, so this can only
-- ever fire if that invariant was somehow violated -- checked here anyway
-- as defense in depth, consistent with not trusting upstream state blindly
-- during a one-time backfill.
do $$
declare
  v_malformed_count integer;
begin
  select count(*) into v_malformed_count
  from public.risk_share_items
  where version_lock_id is not null
    and (
      task_name is null or btrim(task_name) = ''
      or hazard is null or btrim(hazard) = ''
      or review_revision is null or review_revision < 1
    );

  if v_malformed_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % locked risk_share_items row(s) have empty/null task_name, empty/null hazard, or an invalid review_revision -- backfill aborted before any insert. Fix the source rows (or escalate) before re-running this migration.',
      v_malformed_count;
  end if;
end $$;

-- C2. Tenant mismatch / missing version (fail-closed): every locked item's
-- version_lock_id must resolve to a risk_share_version_locks row with the
-- exact same company_code. The LEFT JOIN plus `vl.id is null` check treats
-- a version_lock_id that fails to resolve at all the same as a tenant
-- mismatch -- both are backfill-blocking, not silently-skippable. In
-- practice risk_share_items_version_lock_id_fkey already prevents a
-- dangling version_lock_id, so this is expected to always find zero rows;
-- it is here so a genuine data problem fails loudly instead of being
-- silently excluded from the join used later in this migration.
do $$
declare
  v_tenant_mismatch_count integer;
begin
  select count(*) into v_tenant_mismatch_count
  from public.risk_share_items ri
  left join public.risk_share_version_locks vl
    on vl.id = ri.version_lock_id
  where ri.version_lock_id is not null
    and (vl.id is null or vl.company_code <> ri.company_code);

  if v_tenant_mismatch_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % locked risk_share_items row(s) reference a version_lock_id that is missing or whose company_code does not match the item''s own company_code -- backfill aborted before any insert.',
      v_tenant_mismatch_count;
  end if;
end $$;

-- C3. Publish-eligibility mismatch: every already-locked item must actually
-- satisfy the locked / customer-confirmed contract create_risk_share_version_lock
-- itself enforces at lock time (share_status = 'locked', customer_check_status
-- = 'confirmed', customer_confirmed = true). If any locked item's flags have
-- since drifted from that contract, backfilling it as if it were still a
-- valid snapshot would misrepresent history.
do $$
declare
  v_ineligible_count integer;
begin
  select count(*) into v_ineligible_count
  from public.risk_share_items
  where version_lock_id is not null
    and (
      share_status <> 'locked'
      or customer_check_status <> 'confirmed'
      or customer_confirmed is distinct from true
    );

  if v_ineligible_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % locked risk_share_items row(s) do not satisfy the locked/customer_check_status=confirmed/customer_confirmed=true publish-eligibility contract -- backfill aborted before any insert.',
      v_ineligible_count;
  end if;
end $$;

-- C4. Rerun content conflict: ON CONFLICT DO NOTHING alone only guarantees
-- no duplicate row, not that a pre-existing row (from a partial run, a
-- manual insert, or an earlier version of this migration) still matches
-- what this backfill would generate today. Compute the exact row this
-- backfill would insert for every eligible item, and for any
-- (version_lock_id, source_item_id) pair that already has a snapshot row,
-- compare every snapshot field. A single differing field anywhere aborts
-- the whole migration rather than silently keeping the stale/conflicting
-- row or silently overwriting it.
do $$
declare
  v_conflict_count integer;
begin
  with expected as (
    select
      ri.company_code,
      ri.version_lock_id,
      ri.id as source_item_id,
      (row_number() over (
        partition by ri.version_lock_id
        order by ri.created_at asc, ri.id asc
      ))::integer as position,
      ri.task_name,
      ri.hazard,
      ri.accident_type,
      ri.current_controls,
      ri.improvement_plan,
      ri.risk_level,
      ri.worker_share_summary,
      ri.worker_visible,
      ri.review_revision as source_review_revision
    from public.risk_share_items ri
    join public.risk_share_version_locks vl
      on vl.id = ri.version_lock_id
     and vl.company_code = ri.company_code
    where ri.version_lock_id is not null
      and ri.share_status = 'locked'
      and ri.customer_check_status = 'confirmed'
      and ri.customer_confirmed = true
  )
  select count(*) into v_conflict_count
  from expected e
  join public.risk_share_version_items vi
    on vi.version_lock_id = e.version_lock_id
   and vi.source_item_id = e.source_item_id
  where vi.company_code is distinct from e.company_code
     or vi.position is distinct from e.position
     or vi.task_name is distinct from e.task_name
     or vi.hazard is distinct from e.hazard
     or vi.accident_type is distinct from e.accident_type
     or vi.current_controls is distinct from e.current_controls
     or vi.improvement_plan is distinct from e.improvement_plan
     or vi.risk_level is distinct from e.risk_level
     or vi.worker_share_summary is distinct from e.worker_share_summary
     or vi.worker_visible is distinct from e.worker_visible
     or vi.source_review_revision is distinct from e.source_review_revision;

  if v_conflict_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % existing risk_share_version_items row(s) conflict with the legacy backfill content expected for the same (version_lock_id, source_item_id) pair -- migration aborted before insert. Do not silently keep a stale/partial/manual snapshot or overwrite it; investigate and reconcile before re-running this migration.',
      v_conflict_count;
  end if;
end $$;

-- Backfill insert. The JOIN to risk_share_version_locks on both id and
-- company_code, plus the explicit share_status/customer_check_status/
-- customer_confirmed conditions in WHERE, are deliberately the same
-- tenant-match and eligibility conditions already checked in C2/C3 above --
-- defense in depth, not reliance on the preflight checks alone. Even if a
-- future edit to this file altered or removed a preflight check, this
-- INSERT itself still cannot backfill a cross-tenant or ineligible row.
-- Idempotent on rerun: the (version_lock_id, source_item_id) unique index
-- makes a second run of this exact INSERT a no-op via ON CONFLICT DO
-- NOTHING (content equality for any pre-existing row was already verified
-- in C4 above, so "no-op" here means "already exactly correct", not
-- "silently ignored").
insert into public.risk_share_version_items (
  company_code,
  version_lock_id,
  source_item_id,
  position,
  task_name,
  hazard,
  accident_type,
  current_controls,
  improvement_plan,
  risk_level,
  worker_share_summary,
  worker_visible,
  source_review_revision
)
select
  ri.company_code,
  ri.version_lock_id,
  ri.id,
  (row_number() over (
    partition by ri.version_lock_id
    order by ri.created_at asc, ri.id asc
  ))::integer,
  ri.task_name,
  ri.hazard,
  ri.accident_type,
  ri.current_controls,
  ri.improvement_plan,
  ri.risk_level,
  ri.worker_share_summary,
  ri.worker_visible,
  ri.review_revision
from public.risk_share_items ri
join public.risk_share_version_locks vl
  on vl.id = ri.version_lock_id
 and vl.company_code = ri.company_code
where ri.version_lock_id is not null
  and ri.share_status = 'locked'
  and ri.customer_check_status = 'confirmed'
  and ri.customer_confirmed = true
on conflict (version_lock_id, source_item_id) do nothing;

-- Post-backfill check 1: every risk_share_version_items row's company_code
-- must equal its parent version's company_code. This is already guaranteed
-- by risk_share_version_items_version_lock_company_fkey and is expected to
-- always find zero rows; verified explicitly here as a second,
-- independent confirmation rather than trusting the constraint silently.
do $$
declare
  v_company_mismatch_count integer;
begin
  select count(*) into v_company_mismatch_count
  from public.risk_share_version_items vi
  join public.risk_share_version_locks vl
    on vl.id = vi.version_lock_id
  where vl.company_code <> vi.company_code;

  if v_company_mismatch_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % risk_share_version_items row(s) have a company_code that does not match their version_lock_id''s risk_share_version_locks.company_code.',
      v_company_mismatch_count;
  end if;
end $$;

-- Post-backfill check 2: every existing risk_share_version_locks row's
-- item_count, customer_confirmed_count, and worker_visible_count must all
-- match the number of snapshot rows actually backfilled for it (item_count
-- and customer_confirmed_count are expected to equal the same total, since
-- create_risk_share_version_lock always writes them equal at lock time --
-- see 20260713040000). This is the same worker exposure invariant
-- create_risk_share_version_lock enforces when it writes those counts at
-- lock time -- if it does not hold now, something already drifted in
-- production data independent of this migration, and this migration must
-- fail loudly rather than silently accept or "correct" the mismatch. Only
-- version_lock_id and the counts are reported; no customer risk-factor
-- text (task_name/hazard/etc.) is ever included.
do $$
declare
  v_drift record;
  v_drift_count integer := 0;
begin
  for v_drift in
    select
      vl.id as version_lock_id,
      vl.item_count as expected_item_count,
      vl.customer_confirmed_count as expected_customer_confirmed_count,
      vl.worker_visible_count as expected_worker_visible_count,
      count(vi.id) as actual_count,
      count(vi.id) filter (where vi.worker_visible) as actual_worker_visible_count
    from public.risk_share_version_locks vl
    left join public.risk_share_version_items vi
      on vi.version_lock_id = vl.id
    group by vl.id, vl.item_count, vl.customer_confirmed_count, vl.worker_visible_count
    having count(vi.id) <> vl.item_count
       or count(vi.id) <> vl.customer_confirmed_count
       or count(vi.id) filter (where vi.worker_visible) <> vl.worker_visible_count
  loop
    v_drift_count := v_drift_count + 1;
    raise warning
      'risk_share_version_snapshot_foundation: version_lock_id=% item_count expected=% actual=% customer_confirmed_count expected=% actual=% worker_visible_count expected=% actual=%',
      v_drift.version_lock_id,
      v_drift.expected_item_count,
      v_drift.actual_count,
      v_drift.expected_customer_confirmed_count,
      v_drift.actual_count,
      v_drift.expected_worker_visible_count,
      v_drift.actual_worker_visible_count;
  end loop;

  if v_drift_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % version lock(s) have item_count/customer_confirmed_count/worker_visible_count drift against the risk_share_version_items backfill -- see WARNING lines above for per-lock counts. Migration aborted; do not patch counts here, escalate for manual review.',
      v_drift_count;
  end if;
end $$;
