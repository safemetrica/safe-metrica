-- SafeMetrica risk_share_version_locks: atomic creation + duplicate guard
--
-- Additive only: no table recreation, no destructive change, no backfill.
--
-- The existing Owner "Version Lock 생성" flow read eligible risk_share_items,
-- inserted a risk_share_version_locks row, then updated the selected items
-- in three separate, non-transactional requests. A failure between steps
-- could leave an "active" lock row with zero items actually attached, and
-- two concurrent submissions could both select and then overwrite the same
-- items' version_lock_id. This migration adds:
--   1. A partial unique index so at most one active lock can exist per
--      company_code + lock_month.
--   2. An atomic RPC that selects eligible items (locked FOR UPDATE),
--      inserts the version lock row (relying on the unique index above to
--      reject a duplicate month atomically via ON CONFLICT), and attaches
--      the items, all within a single transaction. A genuine failure at any
--      step rolls back the whole call; nothing partially locks.
--
-- Also adds risk_share_item_candidates.updated_at so candidate field edits
-- (task_name/hazard/current_controls/improvement_plan/risk_level) made
-- during Owner review have a minimal edit timestamp. Existing rows are left
-- null: their true last-edited time is unknown and migration run time must
-- not be recorded as if it were one.

alter table public.risk_share_item_candidates
  add column if not exists updated_at timestamptz;

create unique index if not exists risk_share_version_locks_company_month_active_uidx
  on public.risk_share_version_locks (company_code, lock_month)
  where lock_status = 'active';

-- Atomic version lock creation. Locks eligible risk_share_items rows
-- (customer-confirmed, not yet locked, matching company_code and the
-- optional requested id filter) FOR UPDATE, then inserts the lock row with
-- ON CONFLICT DO NOTHING against the partial unique index above so a
-- duplicate active lock for the same company_code + lock_month is rejected
-- atomically instead of racing. Only on a successful insert does it attach
-- the locked items. When p_item_ids names specific items, the number of
-- rows that were actually FOR-UPDATE-locked as eligible must exactly equal
-- the number of distinct requested ids -- if any requested id does not
-- resolve (wrong company, wrong status, already locked, or simply does not
-- exist), the whole call is a no-op rather than silently locking a subset.
-- Always returns exactly one row:
--   - (null, 0, false, true)   requested item set did not fully resolve
--   - (null, 0, false, false)  no eligible items
--   - (null, 0, true, false)   an active lock already exists for this company+month
--   - (id, count, false, false) success
drop function if exists public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
);

create function public.create_risk_share_version_lock(
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
begin
  select coalesce(array_agg(distinct x), '{}')
  into v_requested_ids
  from unnest(coalesce(p_item_ids, '{}'::uuid[])) as x;

  v_requested_count := coalesce(array_length(v_requested_ids, 1), 0);

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
  )
  on conflict (company_code, lock_month) where lock_status = 'active'
  do nothing
  returning risk_share_version_locks.id into v_lock_id;

  if v_lock_id is null then
    return query select null::uuid, 0, true, false;
    return;
  end if;

  update public.risk_share_items
  set share_status = 'locked',
      version_lock_id = v_lock_id,
      worker_visible = p_worker_visible,
      version_locked_at = now(),
      updated_at = now()
  where risk_share_items.id = any(v_eligible_ids)
    and risk_share_items.company_code = p_company_code;

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

-- Atomic Owner candidate review: locks the candidate row (FOR UPDATE),
-- validates task_name/hazard are non-empty when moving to accepted/edited,
-- updates the candidate fields + status + updated_at, and inserts the
-- matching risk_share_candidate_review_events audit row, all in one
-- transaction. If the event insert fails for any reason, the candidate
-- update in the same call rolls back too -- the two writes are no longer
-- two separate HTTP requests that could partially succeed.
-- worker_visible and customer_confirmed are hardcoded to false here: this
-- Owner review path never grants worker exposure or customer confirmation:
-- those only happen at the Item / Version Lock and Customer Check stages.
-- Always returns exactly one row:
--   - (null, 'not_found')             candidate/company_code did not match
--   - (null, 'missing_required_fields') accepted/edited with empty task_name or hazard
--   - (id, 'ok')                       success
create or replace function public.review_risk_share_item_candidate(
  p_candidate_id uuid,
  p_company_code text,
  p_reviewer_status text,
  p_reviewer_note text,
  p_task_name text,
  p_hazard text,
  p_current_controls text,
  p_improvement_plan text,
  p_risk_level text,
  p_actor_type text,
  p_actor_label text
)
returns table (id uuid, result text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous_status text;
  v_source_id uuid;
  v_company_name text;
  v_current_task_name text;
  v_current_hazard text;
  v_current_controls text;
  v_current_improvement_plan text;
  v_current_risk_level text;
  v_final_task_name text;
  v_final_hazard text;
  v_final_current_controls text;
  v_final_improvement_plan text;
  v_final_risk_level text;
  v_fields_changed boolean;
begin
  select risk_share_item_candidates.reviewer_status,
         risk_share_item_candidates.source_id,
         risk_share_item_candidates.company_name,
         risk_share_item_candidates.task_name,
         risk_share_item_candidates.hazard,
         risk_share_item_candidates.current_controls,
         risk_share_item_candidates.improvement_plan,
         risk_share_item_candidates.risk_level
  into v_previous_status, v_source_id, v_company_name, v_current_task_name, v_current_hazard,
       v_current_controls, v_current_improvement_plan, v_current_risk_level
  from public.risk_share_item_candidates
  where risk_share_item_candidates.id = p_candidate_id
    and risk_share_item_candidates.company_code = p_company_code
  for update;

  if not found then
    return query select null::uuid, 'not_found';
    return;
  end if;

  v_final_task_name := coalesce(nullif(p_task_name, ''), v_current_task_name, '');
  v_final_hazard := coalesce(nullif(p_hazard, ''), v_current_hazard, '');
  v_final_current_controls := coalesce(nullif(p_current_controls, ''), v_current_controls);
  v_final_improvement_plan := coalesce(nullif(p_improvement_plan, ''), v_current_improvement_plan);
  v_final_risk_level := coalesce(nullif(p_risk_level, ''), v_current_risk_level);

  if p_reviewer_status in ('accepted', 'edited')
     and (v_final_task_name = '' or v_final_hazard = '') then
    return query select null::uuid, 'missing_required_fields';
    return;
  end if;

  v_fields_changed :=
    v_final_task_name <> v_current_task_name
    or v_final_hazard <> v_current_hazard
    or v_final_current_controls is distinct from v_current_controls
    or v_final_improvement_plan is distinct from v_current_improvement_plan
    or v_final_risk_level is distinct from v_current_risk_level;

  update public.risk_share_item_candidates
  set reviewer_status = p_reviewer_status,
      reviewer_note = p_reviewer_note,
      task_name = v_final_task_name,
      hazard = v_final_hazard,
      current_controls = v_final_current_controls,
      improvement_plan = v_final_improvement_plan,
      risk_level = v_final_risk_level,
      worker_visible = false,
      customer_confirmed = false,
      updated_at = now()
  where risk_share_item_candidates.id = p_candidate_id
    and risk_share_item_candidates.company_code = p_company_code;

  insert into public.risk_share_candidate_review_events (
    candidate_id,
    source_id,
    company_code,
    company_name,
    previous_status,
    next_status,
    reviewer_note,
    actor_type,
    actor_label,
    worker_visible,
    customer_confirmed,
    event_type,
    raw_payload
  ) values (
    p_candidate_id,
    v_source_id,
    p_company_code,
    v_company_name,
    v_previous_status,
    p_reviewer_status,
    p_reviewer_note,
    p_actor_type,
    p_actor_label,
    false,
    false,
    'status_change',
    jsonb_build_object(
      'source', 'review_risk_share_item_candidate_v1',
      'fieldsEdited', v_fields_changed,
      'previousStatus', v_previous_status,
      'nextStatus', p_reviewer_status
    )
  );

  return query select p_candidate_id, 'ok';
end;
$$;

revoke all on function public.review_risk_share_item_candidate(
  uuid, text, text, text, text, text, text, text, text, text, text
) from public;

revoke execute on function public.review_risk_share_item_candidate(
  uuid, text, text, text, text, text, text, text, text, text, text
) from anon, authenticated;

grant execute on function public.review_risk_share_item_candidate(
  uuid, text, text, text, text, text, text, text, text, text, text
) to service_role;
