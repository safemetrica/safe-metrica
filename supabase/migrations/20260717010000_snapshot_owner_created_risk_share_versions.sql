-- SafeMetrica Owner Version Lock: write immutable snapshot rows atomically
--
-- Depends on 20260717000000_add_risk_share_version_snapshot_foundation.sql
-- (PR #902), which added risk_share_version_items but left
-- create_risk_share_version_lock unmodified -- every new Owner-created
-- version since #902 has zero snapshot rows until this migration replaces
-- the function. This migration:
--   1. Preflights that the #902 foundation objects actually exist.
--   2. Reconciles any existing risk_share_version_locks row whose
--      risk_share_version_items count is short (the same fail-closed
--      backfill #902 itself ran, re-run here so this migration is correct
--      whether it lands immediately after #902 or after a gap in which new
--      legacy-path locks were created).
--   3. Replaces create_risk_share_version_lock (create or replace, same
--      name/argument types/order/return columns) so Version creation, Item
--      locking, and snapshot creation happen in one transaction going
--      forward.
--
-- Out of scope (unchanged in this migration): tenant publish RPC, Manager
-- Publish API/UI, same-month republish, supersede/rollback workflow, Public
-- QR snapshot read, Monthly Evidence, Owner route/API, Notification/Outbox,
-- the #902 migration file itself.
--
-- Not applied to production by this migration file -- see the PR body for
-- the intended apply sequence.

-- ============================================================================
-- 0. Preflight: #902 foundation objects must already exist
-- ============================================================================

do $$
begin
  if to_regclass('public.risk_share_version_items') is null then
    raise exception
      'snapshot_owner_created_risk_share_versions: public.risk_share_version_items does not exist -- 20260717000000_add_risk_share_version_snapshot_foundation.sql (PR #902) must be applied first.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_items_version_lock_company_fkey'
  ) then
    raise exception
      'snapshot_owner_created_risk_share_versions: risk_share_version_items_version_lock_company_fkey is missing -- the #902 foundation migration must be fully applied (not partially) before this migration runs.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_items_source_item_company_fkey'
  ) then
    raise exception
      'snapshot_owner_created_risk_share_versions: risk_share_version_items_source_item_company_fkey is missing -- the #902 foundation migration must be fully applied (not partially) before this migration runs.';
  end if;
end $$;

-- ============================================================================
-- 1. Legacy Version reconciliation: backfill any snapshot rows still
--    missing for an existing risk_share_version_locks row (either because
--    #902's own backfill somehow missed it, or because a new legacy-path
--    lock was created by the old create_risk_share_version_lock between
--    #902's apply and this migration's apply). Deliberately the same
--    eligibility/tenant-match conditions and preflight order as #902's
--    backfill: read-only preflight checks first, write second, so a genuine
--    violation is caught before any insert happens, not after.
-- ============================================================================

-- 1a. Required data (defense in depth -- see #902's identical check for why
-- this is expected to always find zero rows).
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
      'snapshot_owner_created_risk_share_versions: % locked risk_share_items row(s) have empty/null task_name, empty/null hazard, or an invalid review_revision -- reconciliation aborted before any insert.',
      v_malformed_count;
  end if;
end $$;

-- 1b. Tenant mismatch / missing version (fail-closed).
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
      'snapshot_owner_created_risk_share_versions: % locked risk_share_items row(s) reference a version_lock_id that is missing or whose company_code does not match the item''s own company_code -- reconciliation aborted before any insert.',
      v_tenant_mismatch_count;
  end if;
end $$;

-- 1c. Publish-eligibility mismatch.
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
      'snapshot_owner_created_risk_share_versions: % locked risk_share_items row(s) do not satisfy the locked/customer_check_status=confirmed/customer_confirmed=true publish-eligibility contract -- reconciliation aborted before any insert.',
      v_ineligible_count;
  end if;
end $$;

-- 1d. Rerun content conflict: any (version_lock_id, source_item_id) pair
-- that already has a snapshot row must match, in all eleven content
-- fields, what reconciliation would generate today. A single differing
-- field aborts the whole migration rather than silently keeping the
-- stale/conflicting row or silently overwriting it.
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
      'snapshot_owner_created_risk_share_versions: % existing risk_share_version_items row(s) conflict with the reconciliation content expected for the same (version_lock_id, source_item_id) pair -- migration aborted before insert. Do not silently keep a stale/partial/manual snapshot or overwrite it; investigate and reconcile before re-running this migration.',
      v_conflict_count;
  end if;
end $$;

-- Reconciliation insert. ON CONFLICT DO NOTHING is a true no-op here for
-- any version whose snapshot is already complete (1d already proved any
-- pre-existing row matches exactly); this only ever inserts genuinely
-- missing rows.
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

-- 1e. Post-reconciliation check: company_code parity (already guaranteed
-- by the composite FK; verified explicitly, same as #902).
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
      'snapshot_owner_created_risk_share_versions: % risk_share_version_items row(s) have a company_code that does not match their version_lock_id''s risk_share_version_locks.company_code.',
      v_company_mismatch_count;
  end if;
end $$;

-- 1f. Post-reconciliation check: item_count / customer_confirmed_count /
-- worker_visible_count drift. No automatic correction -- a real mismatch
-- aborts the migration with counts only (never item content).
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
      'snapshot_owner_created_risk_share_versions: version_lock_id=% item_count expected=% actual=% customer_confirmed_count expected=% actual=% worker_visible_count expected=% actual=%',
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
      'snapshot_owner_created_risk_share_versions: % version lock(s) still have item_count/customer_confirmed_count/worker_visible_count drift against risk_share_version_items after reconciliation -- see WARNING lines above for per-lock counts. Migration aborted; do not patch counts here, escalate for manual review.',
      v_drift_count;
  end if;
end $$;

-- ============================================================================
-- 2. create_risk_share_version_lock: same name, same argument types/order,
--    same return columns, same early-exit result shapes (0 eligible items /
--    duplicate active lock / selection mismatch / success). The only
--    behavioral change is that a successful call now also writes the
--    matching risk_share_version_items rows, atomically, in the same
--    function invocation -- Version creation, Item locking, and snapshot
--    creation either all happen or none do; there is no code path that
--    returns a success row shape without every count already verified.
-- ============================================================================

create or replace function public.create_risk_share_version_lock(
  p_company_code text,
  p_company_name text,
  p_site_name text,
  p_source_title text,
  p_lock_title text,
  p_lock_month text,
  p_notes text,
  p_worker_visible boolean,
  p_item_ids uuid[],
  p_locked_by text
)
returns table (id uuid, item_count integer, duplicate_lock boolean, selection_mismatch boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requested_ids uuid[];
  v_requested_count integer;
  v_eligible_ids uuid[];
  v_item_count integer;
  v_lock_id uuid;
  v_snapshot_insert_count integer;
  v_item_update_count integer;
  v_final_snapshot_count integer;
  v_final_worker_visible_snapshot_count integer;
begin
  select coalesce(array_agg(distinct x), '{}')
  into v_requested_ids
  from unnest(coalesce(p_item_ids, '{}'::uuid[])) as x;

  v_requested_count := coalesce(array_length(v_requested_ids, 1), 0);

  -- Unchanged from the prior revision: select and row-lock eligible items
  -- first. The FOR UPDATE lock is held for the rest of this transaction, so
  -- no concurrent transaction can alter these specific rows' content
  -- between this lock and the snapshot SELECT further below.
  with locked_items as (
    select risk_share_items.id
    from public.risk_share_items
    where risk_share_items.company_code = p_company_code
      and risk_share_items.share_status = 'customer_confirmed'
      and risk_share_items.customer_check_status = 'confirmed'
      and risk_share_items.customer_confirmed = true
      and risk_share_items.version_lock_id is null
      and (
        v_requested_count = 0
        or risk_share_items.id = any(v_requested_ids)
      )
    order by risk_share_items.created_at asc
    for update of risk_share_items
  )
  select coalesce(array_agg(locked_items.id), '{}')
  into v_eligible_ids
  from locked_items;

  v_item_count := coalesce(array_length(v_eligible_ids, 1), 0);

  if v_requested_count > 0 and v_item_count <> v_requested_count then
    return query select null::uuid, 0, false, true;
    return;
  end if;

  if v_item_count = 0 then
    return query select null::uuid, 0, false, false;
    return;
  end if;

  insert into public.risk_share_version_locks (
    company_code,
    company_name,
    site_name,
    source_title,
    lock_title,
    lock_month,
    item_count,
    customer_confirmed_count,
    worker_visible_count,
    lock_status,
    locked_by,
    notes,
    raw_payload
  ) values (
    p_company_code,
    p_company_name,
    p_site_name,
    p_source_title,
    p_lock_title,
    p_lock_month,
    v_item_count,
    v_item_count,
    case when p_worker_visible then v_item_count else 0 end,
    'active',
    p_locked_by,
    p_notes,
    jsonb_build_object('source', 'create_risk_share_version_lock_v1')
    -- previous_version_id, content_source_version_id, actor_membership_id,
    -- idempotency_key, superseded_at all left at their column defaults
    -- (null); publish_action left at its column default ('legacy'). This
    -- RPC does not populate tenant-actor or idempotency metadata -- that is
    -- explicitly deferred to the future tenant publish RPC.
  )
  on conflict (company_code, lock_month) where lock_status = 'active'
  do nothing
  returning risk_share_version_locks.id into v_lock_id;

  if v_lock_id is null then
    return query select null::uuid, 0, true, false;
    return;
  end if;

  -- Snapshot insert: one immutable risk_share_version_items row per
  -- eligible item, read fresh from risk_share_items (still row-locked from
  -- the CTE above) so the snapshot reflects the exact content this call is
  -- about to lock -- not a stale copy captured before this transaction
  -- started.
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
    v_lock_id,
    ri.id,
    (row_number() over (order by ri.created_at asc, ri.id asc))::integer,
    ri.task_name,
    ri.hazard,
    ri.accident_type,
    ri.current_controls,
    ri.improvement_plan,
    ri.risk_level,
    ri.worker_share_summary,
    p_worker_visible,
    ri.review_revision
  from public.risk_share_items ri
  where ri.id = any(v_eligible_ids)
    and ri.company_code = p_company_code;

  get diagnostics v_snapshot_insert_count = row_count;

  if v_snapshot_insert_count <> v_item_count then
    raise exception
      'create_risk_share_version_lock: snapshot insert count % does not match eligible item count % for lock %',
      v_snapshot_insert_count, v_item_count, v_lock_id;
  end if;

  update public.risk_share_items
  set share_status = 'locked',
      version_lock_id = v_lock_id,
      worker_visible = p_worker_visible,
      version_locked_at = now(),
      updated_at = now()
  where risk_share_items.id = any(v_eligible_ids)
    and risk_share_items.company_code = p_company_code;

  get diagnostics v_item_update_count = row_count;

  if v_item_update_count <> v_item_count then
    raise exception
      'create_risk_share_version_lock: item update count % does not match eligible item count % for lock %',
      v_item_update_count, v_item_count, v_lock_id;
  end if;

  -- Final re-verification before returning success: re-derive both counts
  -- from the rows actually attached to this lock, rather than trusting the
  -- row counts captured above. A mismatch here means something about this
  -- transaction's own writes is inconsistent, and that must never be
  -- reported to the caller as success.
  select count(*)
  into v_final_snapshot_count
  from public.risk_share_version_items
  where version_lock_id = v_lock_id;

  if v_final_snapshot_count <> v_item_count then
    raise exception
      'create_risk_share_version_lock: final snapshot count % does not match item_count % for lock %',
      v_final_snapshot_count, v_item_count, v_lock_id;
  end if;

  if p_worker_visible then
    select count(*)
    into v_final_worker_visible_snapshot_count
    from public.risk_share_version_items
    where version_lock_id = v_lock_id
      and worker_visible = true;

    if v_final_worker_visible_snapshot_count <> v_item_count then
      raise exception
        'create_risk_share_version_lock: final worker_visible snapshot count % does not match item_count % for lock %',
        v_final_worker_visible_snapshot_count, v_item_count, v_lock_id;
    end if;
  end if;

  return query select v_lock_id, v_item_count, false, false;
end;
$$;

revoke all on function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) from public;

revoke execute on function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) from anon, authenticated;

grant execute on function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) to service_role;
