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
-- the locked items. Always returns exactly one row:
--   - (null, 0, false)  no eligible items
--   - (null, 0, true)   an active lock already exists for this company+month
--   - (id, count, false) success
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
returns table (id uuid, item_count integer, duplicate_lock boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_eligible_ids uuid[];
  v_item_count integer;
  v_lock_id uuid;
begin
  with locked_items as (
    select risk_share_items.id
    from public.risk_share_items
    where risk_share_items.company_code = p_company_code
      and risk_share_items.share_status = 'customer_confirmed'
      and risk_share_items.customer_check_status = 'confirmed'
      and risk_share_items.customer_confirmed = true
      and risk_share_items.version_lock_id is null
      and (
        p_item_ids is null
        or array_length(p_item_ids, 1) is null
        or risk_share_items.id = any(p_item_ids)
      )
    order by risk_share_items.created_at asc
    for update of risk_share_items
  )
  select coalesce(array_agg(locked_items.id), '{}')
  into v_eligible_ids
  from locked_items;

  v_item_count := coalesce(array_length(v_eligible_ids, 1), 0);

  if v_item_count = 0 then
    return query select null::uuid, 0, false;
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
    return query select null::uuid, 0, true;
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

  return query select v_lock_id, v_item_count, false;
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
