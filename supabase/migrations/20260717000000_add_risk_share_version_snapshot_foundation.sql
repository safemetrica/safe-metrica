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
          btrim(idempotency_key) <> ''
          and char_length(idempotency_key) <= 200
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_previous_version_id_fkey'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_previous_version_id_fkey
      foreign key (previous_version_id)
      references public.risk_share_version_locks(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_content_source_version_id_fkey'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_content_source_version_id_fkey
      foreign key (content_source_version_id)
      references public.risk_share_version_locks(id)
      on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_actor_membership_id_fkey'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_actor_membership_id_fkey
      foreign key (actor_membership_id)
      references public.tenant_membership(id)
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
  'Version this row supersedes in the publish chain for the same company_code (unique: at most one version may claim a given predecessor). Null for the first version or a legacy Owner-created lock with no recorded predecessor.';

comment on column public.risk_share_version_locks.content_source_version_id is
  'Version whose item snapshot content was copied to produce this version (rollback lineage). Distinct from previous_version_id, which only records temporal chain order, not content provenance.';

comment on column public.risk_share_version_locks.actor_membership_id is
  'tenant_membership row of the actor who published this version. Null for legacy Owner-token-authenticated locks, which have no tenant membership actor.';

comment on column public.risk_share_version_locks.idempotency_key is
  'Caller-supplied idempotency token for a future tenant publish RPC, unique per company_code when present. Null for legacy Owner-created locks.';

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
  version_lock_id uuid not null references public.risk_share_version_locks(id) on delete restrict,
  source_item_id uuid not null references public.risk_share_items(id) on delete restrict,
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
  )
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
  'Immutable per-version item snapshot ledger for Risk Share Pack versions. One row per (version_lock_id, source_item_id), storing the share-relevant risk_share_items fields as they existed at lock time. Append-only: rows are never updated or deleted after insert. SSOT for a future tenant publish RPC and for rollback (new version + copied snapshot), not a replacement for risk_share_items.version_lock_id in this PR.';

comment on column public.risk_share_version_items.source_item_id is
  'risk_share_items row this snapshot was copied from. Not unique alone: the same source item could in principle appear in a later version''s snapshot via rollback/republish, but never twice within the same version_lock_id (see risk_share_version_items_lock_source_item_uidx).';

comment on column public.risk_share_version_items.position is
  'Stable per-version display order, 1-based, unique within version_lock_id. Backfilled as row_number() over created_at asc, id asc for legacy locks.';

comment on column public.risk_share_version_items.source_review_revision is
  'risk_share_items.review_revision at snapshot time -- the optimistic-concurrency token the item had when this version captured it, for audit/debugging only.';

-- ============================================================================
-- C. Backfill: existing locked risk_share_items -> risk_share_version_items
-- ============================================================================

-- Preflight: fail the whole migration before any snapshot row is written if
-- any already-locked item has an empty/null task_name or hazard. Both
-- columns are `not null` on risk_share_items, but not null does not forbid
-- an empty string, and the snapshot ledger's own non-empty check
-- constraints would otherwise reject only the first such row mid-backfill,
-- leaving some legacy versions backfilled and others not -- a partial
-- backfill that this migration must not silently leave in place. Counts
-- only; no task_name/hazard/company_code content is included in the
-- exception message.
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
    );

  if v_malformed_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % locked risk_share_items row(s) have empty/null task_name or hazard -- backfill aborted before any insert. Fix the source rows (or escalate) before re-running this migration.',
      v_malformed_count;
  end if;
end $$;

-- Idempotent on rerun: the (version_lock_id, source_item_id) unique index
-- makes a second run of this exact INSERT a no-op via ON CONFLICT DO
-- NOTHING rather than a duplicate-row error.
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
where ri.version_lock_id is not null
on conflict (version_lock_id, source_item_id) do nothing;

-- Post-backfill integrity check: every existing risk_share_version_locks
-- row's item_count / worker_visible_count must match the number of
-- snapshot rows actually backfilled for it. This is the same worker
-- exposure invariant create_risk_share_version_lock enforces when it writes
-- those counts at lock time -- if it does not hold now, something already
-- drifted in production data independent of this migration, and this
-- migration must fail loudly rather than silently accept or "correct" the
-- mismatch. Only version_lock_id and the four counts are reported; no
-- customer risk-factor text (task_name/hazard/etc.) is ever included.
do $$
declare
  v_drift record;
  v_drift_count integer := 0;
begin
  for v_drift in
    select
      vl.id as version_lock_id,
      vl.item_count as expected_item_count,
      count(vi.id) as actual_item_count,
      vl.worker_visible_count as expected_worker_visible_count,
      count(vi.id) filter (where vi.worker_visible) as actual_worker_visible_count
    from public.risk_share_version_locks vl
    left join public.risk_share_version_items vi
      on vi.version_lock_id = vl.id
    group by vl.id, vl.item_count, vl.worker_visible_count
    having count(vi.id) <> vl.item_count
       or count(vi.id) filter (where vi.worker_visible) <> vl.worker_visible_count
  loop
    v_drift_count := v_drift_count + 1;
    raise warning
      'risk_share_version_snapshot_foundation: version_lock_id=% item_count expected=% actual=% worker_visible_count expected=% actual=%',
      v_drift.version_lock_id,
      v_drift.expected_item_count,
      v_drift.actual_item_count,
      v_drift.expected_worker_visible_count,
      v_drift.actual_worker_visible_count;
  end loop;

  if v_drift_count > 0 then
    raise exception
      'risk_share_version_snapshot_foundation: % version lock(s) have item_count/worker_visible_count drift against the risk_share_version_items backfill -- see WARNING lines above for per-lock counts. Migration aborted; do not patch counts here, escalate for manual review.',
      v_drift_count;
  end if;
end $$;
