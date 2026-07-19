-- SafeMetrica Tenant Risk Share Publish: DB-only atomic publish RPC
--
-- Additive only: no table recreation, no destructive change, no existing
-- migration touched. Builds on the version-chain / actor / idempotency
-- columns and immutable risk_share_version_items snapshot ledger added by
-- 20260717000000_add_risk_share_version_snapshot_foundation.sql (PR #902)
-- and the atomic Owner publish path in
-- 20260717010000_snapshot_owner_created_risk_share_versions.sql. Neither of
-- those files is modified here, and neither create_risk_share_version_lock
-- (Owner path) nor review_risk_share_item nor
-- prepare_risk_share_items_for_tenant is touched.
--
-- publish_risk_share_version_for_tenant is the first tenant-actor-authored
-- publish path: a tenant_admin/tenant_manager membership, revalidated inside
-- the transaction (never trusted from the caller), selects an explicit,
-- distinct, deterministic 1-200 Item set to lock into exactly one new
-- Version for one (company_code, lock_month). It is publish-only:
--   - no republish, rollback, supersede, or reactivation of any existing
--     Version -- attempting to publish into a month with an existing active
--     Version returns active_month_exists rather than creating a second
--     Version or touching the first.
--   - each selected Item's existing worker_visible value (set earlier, per
--     item, by review_risk_share_item) is preserved verbatim into its
--     immutable risk_share_version_items snapshot row and is never
--     overwritten -- unlike create_risk_share_version_lock, this function
--     takes no p_worker_visible parameter at all.
--
-- Lock order, fixed for every call: tenant_membership (FOR SHARE) -> a
-- tenant-scoped transaction advisory lock (pg_advisory_xact_lock, keyed off
-- a namespaced hash of company_code so it can never collide with an
-- unrelated advisory lock elsewhere in this schema) -> risk_share_items
-- (FOR UPDATE, ascending id). The advisory lock is acquired only after
-- membership revalidation succeeds (so an unauthenticated/wrong-tenant
-- caller never contends for it) and is held for the rest of the
-- transaction, which fully serializes every call this function ever makes
-- for the same tenant: idempotency lookup, item selection, and the Version
-- Lock insert all run as if single-threaded per tenant. This is what makes
-- an idempotency-key race between two calls of this exact function
-- impossible (not merely improbable) -- the second caller always blocks
-- until the first commits or rolls back, then re-reads committed state.
-- risk_share_version_locks_company_month_active_uidx (added in
-- 20260713040000) still backs the ON CONFLICT DO NOTHING publish insert
-- below as defense in depth against a concurrent Owner
-- create_risk_share_version_lock call for the same company_code +
-- lock_month, since that path does not take this function's advisory lock.
--
-- Idempotency contract, precisely: a repeat call with the same
-- (company_code, idempotency_key) replays only when actor_membership_id,
-- lock_month, normalized lock_title, normalized notes, the exact selected
-- Item id set, and item_count all match the Version Lock the key already
-- produced, and that Version Lock is still lock_status = 'active' (its
-- risk_share_version_items snapshot and worker_visible_count are immutable
-- by construction, so they need no re-comparison -- they cannot have
-- changed since that Version was created). Any of those differing returns
-- idempotency_conflict. A key that was never actually committed (an earlier
-- call under the same key failed validation/forbidden/selection_mismatch/
-- active_month_exists before any insert happened) is not "used" at all --
-- risk_share_version_locks.idempotency_key is only ever written on a
-- successful publish, so a retry after any failure reattempts fresh rather
-- than replaying or conflicting.
--
-- Selection contract: p_item_ids is required and must be non-empty -- an
-- explicit empty array is rejected as validation_failed, never silently
-- treated as "publish every eligible Item" (unlike
-- prepare_risk_share_items_for_tenant's p_candidate_ids, where omission
-- means "all eligible" -- there is no such "all" mode here at all, and no
-- omission form: the parameter has no default). Duplicate ids, a NULL
-- element, or a multi-dimensional array are all rejected as
-- validation_failed rather than silently deduplicated/coerced. Every
-- surviving id is locked FOR UPDATE in ascending order (deterministic, and
-- consistent with every other lock order in this schema) and must resolve,
-- inside the caller's own tenant, to a customer-confirmed
-- (share_status = 'customer_confirmed', customer_check_status = 'confirmed',
-- customer_confirmed = true), not-yet-locked (version_lock_id is null),
-- structurally valid (non-blank task_name and hazard) risk_share_items row.
-- A requested id that fails any part of that -- wrong tenant, already
-- locked, not customer-confirmed, or missing entirely -- is never
-- distinguished from any other: the locked count simply comes up short and
-- the whole call returns selection_mismatch, exactly the same response a
-- genuinely cross-tenant id set would get.
--
-- Out of scope for this migration (deliberately not implemented here):
-- republish, rollback, supersede, reactivation of any Version; any
-- API/UI/RLS/auth/middleware change; Public QR read change; Action Center;
-- Evidence Export; fixture creation; Production apply.

create or replace function public.publish_risk_share_version_for_tenant(
  p_company_code text,
  p_actor_membership_id uuid,
  p_lock_month text,
  p_lock_title text,
  p_notes text,
  p_item_ids uuid[],
  p_idempotency_key text
)
returns table (
  ok boolean,
  code text,
  replayed boolean,
  version_lock_id uuid,
  item_count integer,
  worker_visible_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_code text;
  v_lock_month text;
  v_lock_title text;
  v_notes text;
  v_idempotency_key text;
  v_requested_raw_count integer;
  v_item_ids uuid[];
  v_requested_count integer;
  v_membership_role text;
  v_membership_status text;
  v_membership_tenant_code text;
  v_existing_lock public.risk_share_version_locks%rowtype;
  v_stored_item_ids uuid[];
  v_eligible_ids uuid[];
  v_eligible_worker_visible_count integer;
  v_item_count integer;
  v_lock_id uuid;
  v_snapshot_insert_count integer;
  v_item_update_count integer;
  v_final_snapshot_count integer;
  v_final_worker_visible_count integer;
begin
  -- =====================================================================
  -- 1. Structural / malformed-input validation. Nothing is read or locked
  -- until every check below passes.
  -- =====================================================================

  v_company_code := lower(btrim(coalesce(p_company_code, '')));

  if v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$' then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if p_actor_membership_id is null then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if p_lock_month is null then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_lock_month := btrim(p_lock_month);

  if v_lock_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if p_lock_title is null then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_lock_title := btrim(p_lock_title);

  if length(v_lock_title) = 0 or length(v_lock_title) > 200 then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if v_notes is not null and length(v_notes) > 800 then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if p_idempotency_key is null then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_idempotency_key := btrim(p_idempotency_key);

  if length(v_idempotency_key) = 0 or length(v_idempotency_key) > 200 then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- p_item_ids: required, non-empty, single-dimension, no NULL element. An
  -- explicit empty array is malformed input here -- it is never treated as
  -- "select every eligible Item" (there is no "all" mode for this RPC).
  if p_item_ids is null or coalesce(array_length(p_item_ids, 1), 0) = 0 then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if coalesce(array_ndims(p_item_ids), 1) > 1 then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if array_position(p_item_ids, null) is not null then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_requested_raw_count := array_length(p_item_ids, 1);

  select array_agg(distinct x order by x)
  into v_item_ids
  from unnest(p_item_ids) as x;

  v_requested_count := coalesce(array_length(v_item_ids, 1), 0);

  -- Duplicate ids are rejected outright rather than silently deduplicated:
  -- a caller-side bug that double-submits an id must never quietly publish
  -- fewer distinct Items than the caller believes it selected.
  if v_requested_count <> v_requested_raw_count then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if v_requested_count > 200 then
    return query select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- =====================================================================
  -- 2. Membership revalidation. FOR SHARE: this function never writes
  -- tenant_membership. Every failure mode collapses to the same generic
  -- forbidden -- missing row, wrong status, wrong role, wrong tenant are
  -- never distinguishable to the caller.
  -- =====================================================================

  select tenant_membership.role, tenant_membership.status, tenant_membership.tenant_code
    into v_membership_role, v_membership_status, v_membership_tenant_code
  from public.tenant_membership
  where tenant_membership.id = p_actor_membership_id
  for share;

  if not found
     or v_membership_status <> 'active'
     or v_membership_role not in ('tenant_admin', 'tenant_manager')
     or v_membership_tenant_code <> v_company_code then
    return query select false, 'forbidden'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- =====================================================================
  -- 3. Tenant-scoped transaction advisory lock. Held for the remainder of
  -- this transaction -- see header comment for why this fully serializes
  -- every call this function makes for the same tenant.
  -- =====================================================================

  perform pg_advisory_xact_lock(
    hashtextextended('publish_risk_share_version_for_tenant:' || v_company_code, 0)
  );

  -- =====================================================================
  -- 4. Idempotency lookup. Runs before the active-month check so that an
  -- exact replay of the call that itself created the currently-active
  -- Version for this month returns replayed=true, not active_month_exists.
  -- =====================================================================

  select * into v_existing_lock
  from public.risk_share_version_locks
  where risk_share_version_locks.company_code = v_company_code
    and risk_share_version_locks.idempotency_key = v_idempotency_key;

  if found then
    select coalesce(array_agg(source_item_id order by source_item_id), '{}')
    into v_stored_item_ids
    from public.risk_share_version_items
    where risk_share_version_items.version_lock_id = v_existing_lock.id;

    if v_existing_lock.lock_status = 'active'
       and v_existing_lock.actor_membership_id = p_actor_membership_id
       and v_existing_lock.lock_month = v_lock_month
       and v_existing_lock.lock_title = v_lock_title
       and coalesce(v_existing_lock.notes, '') = coalesce(v_notes, '')
       and v_existing_lock.item_count = v_requested_count
       and v_stored_item_ids = v_item_ids then
      return query select
        true, 'ok'::text, true,
        v_existing_lock.id, v_existing_lock.item_count, v_existing_lock.worker_visible_count;
      return;
    end if;

    return query select false, 'idempotency_conflict'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- =====================================================================
  -- 5. Item selection: distinct, deterministic (ascending id), FOR UPDATE.
  -- Cross-tenant, already-locked, not-customer-confirmed, structurally
  -- invalid, and simply-missing ids are all excluded by the same WHERE
  -- clause -- none of them are ever distinguished from each other in the
  -- response.
  -- =====================================================================

  with locked_items as (
    select risk_share_items.id, risk_share_items.worker_visible
    from public.risk_share_items
    where risk_share_items.company_code = v_company_code
      and risk_share_items.id = any(v_item_ids)
      and risk_share_items.share_status = 'customer_confirmed'
      and risk_share_items.customer_check_status = 'confirmed'
      and risk_share_items.customer_confirmed = true
      and risk_share_items.version_lock_id is null
      and btrim(coalesce(risk_share_items.task_name, '')) <> ''
      and btrim(coalesce(risk_share_items.hazard, '')) <> ''
    order by risk_share_items.id asc
    for update of risk_share_items
  )
  select
    coalesce(array_agg(locked_items.id order by locked_items.id), '{}'),
    coalesce(count(*) filter (where locked_items.worker_visible), 0)::integer
  into v_eligible_ids, v_eligible_worker_visible_count
  from locked_items;

  v_item_count := coalesce(array_length(v_eligible_ids, 1), 0);

  if v_item_count <> v_requested_count then
    return query select false, 'selection_mismatch'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- =====================================================================
  -- 6. Version Lock insert. ON CONFLICT against
  -- risk_share_version_locks_company_month_active_uidx (20260713040000) is
  -- the atomic active_month_exists guard -- defense in depth against a
  -- concurrent Owner create_risk_share_version_lock call for the same
  -- company_code + lock_month, which does not take this function's
  -- advisory lock. Nothing has been written yet at this point, so a
  -- conflict here leaves the transaction with only harmless FOR UPDATE
  -- locks that release when it ends.
  -- =====================================================================

  insert into public.risk_share_version_locks (
    company_code,
    lock_title,
    lock_month,
    item_count,
    customer_confirmed_count,
    worker_visible_count,
    lock_status,
    notes,
    actor_membership_id,
    idempotency_key,
    publish_action,
    raw_payload
  ) values (
    v_company_code,
    v_lock_title,
    v_lock_month,
    v_requested_count,
    v_requested_count,
    v_eligible_worker_visible_count,
    'active',
    v_notes,
    p_actor_membership_id,
    v_idempotency_key,
    'publish',
    jsonb_build_object('source', 'publish_risk_share_version_for_tenant_v1')
  )
  on conflict (company_code, lock_month) where lock_status = 'active'
  do nothing
  returning risk_share_version_locks.id into v_lock_id;

  if v_lock_id is null then
    return query select false, 'active_month_exists'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- =====================================================================
  -- 7. Immutable snapshot insert. Each row's worker_visible is copied
  -- verbatim from the Item's own current value -- this function has no
  -- worker_visible parameter and never overrides it.
  -- =====================================================================

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
    ri.worker_visible,
    ri.review_revision
  from public.risk_share_items ri
  where ri.id = any(v_eligible_ids)
    and ri.company_code = v_company_code;

  get diagnostics v_snapshot_insert_count = row_count;

  if v_snapshot_insert_count <> v_item_count then
    raise exception
      'publish_risk_share_version_for_tenant: snapshot insert count % does not match eligible item count % for lock %',
      v_snapshot_insert_count, v_item_count, v_lock_id;
  end if;

  -- =====================================================================
  -- 8. Lock the selected Items to this Version. worker_visible is
  -- deliberately absent from this SET list -- it is never overwritten.
  -- =====================================================================

  update public.risk_share_items
  set share_status = 'locked',
      version_lock_id = v_lock_id,
      version_locked_at = now(),
      updated_at = now()
  where risk_share_items.id = any(v_eligible_ids)
    and risk_share_items.company_code = v_company_code;

  get diagnostics v_item_update_count = row_count;

  if v_item_update_count <> v_item_count then
    raise exception
      'publish_risk_share_version_for_tenant: item update count % does not match eligible item count % for lock %',
      v_item_update_count, v_item_count, v_lock_id;
  end if;

  -- =====================================================================
  -- 9. Final re-verification before returning success -- re-derived from
  -- the rows actually attached to this lock, not merely the row counts
  -- captured above.
  -- =====================================================================

  select count(*)
  into v_final_snapshot_count
  from public.risk_share_version_items
  where version_lock_id = v_lock_id;

  if v_final_snapshot_count <> v_item_count then
    raise exception
      'publish_risk_share_version_for_tenant: final snapshot count % does not match item_count % for lock %',
      v_final_snapshot_count, v_item_count, v_lock_id;
  end if;

  select count(*)
  into v_final_worker_visible_count
  from public.risk_share_version_items
  where version_lock_id = v_lock_id
    and worker_visible = true;

  if v_final_worker_visible_count <> v_eligible_worker_visible_count then
    raise exception
      'publish_risk_share_version_for_tenant: final worker_visible snapshot count % does not match expected % for lock %',
      v_final_worker_visible_count, v_eligible_worker_visible_count, v_lock_id;
  end if;

  return query select
    true, 'ok'::text, false, v_lock_id, v_item_count, v_eligible_worker_visible_count;
end;
$$;

alter function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) owner to postgres;

revoke all on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) from public;

-- Reset every non-owner grantee to nothing before granting service_role
-- EXECUTE, so this statement sequence does not silently depend on
-- service_role (or anon/authenticated) carrying some other privilege on
-- this function from any source.
revoke all on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) from anon, authenticated, service_role;

grant execute on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) to service_role;

comment on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) is
  'Tenant-actor publish RPC: locks an explicit, distinct, deterministic 1-200 Item selection into exactly one new Version for one (company_code, lock_month), preserving each Item''s existing worker_visible value verbatim. Publish-only -- no republish/rollback/supersede/reactivation. Server-only: no anon/authenticated execute grant.';
