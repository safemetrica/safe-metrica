-- SafeMetrica Risk Share Publish: align Owner and tenant Item row-lock order
--
-- Additive correction for PR #912 Headquarter audit. The tenant publish RPC
-- introduced by 20260719010000 locks selected risk_share_items in id ASC
-- order, while the existing Owner create_risk_share_version_lock RPC used
-- created_at ASC. The Owner path does not take the tenant advisory lock, so
-- opposite row-lock orders across the two paths could deadlock before the
-- active-month unique index conflict is reached.
--
-- This migration changes exactly one behavioral detail in the existing
-- Owner RPC: selected risk_share_items are now locked in id ASC order, the
-- same canonical order used by publish_risk_share_version_for_tenant.
-- Signature, return shape, eligibility, Version insert, snapshot content,
-- Item mutation, conflict results, ownership, search_path, and privileges
-- remain unchanged. No existing migration is edited.

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

  -- Canonical publish lock order shared with
  -- publish_risk_share_version_for_tenant. The FOR UPDATE lock is held for
  -- the remainder of this transaction, so every path that can lock the same
  -- Item set now acquires those row locks in the same deterministic order.
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
    order by risk_share_items.id asc
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
    -- RPC does not populate tenant-actor or idempotency metadata.
  )
  on conflict (company_code, lock_month) where lock_status = 'active'
  do nothing
  returning risk_share_version_locks.id into v_lock_id;

  if v_lock_id is null then
    return query select null::uuid, 0, true, false;
    return;
  end if;

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

alter function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) owner to postgres;

revoke all on function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) from public;

revoke all on function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) from anon, authenticated, service_role;

grant execute on function public.create_risk_share_version_lock(
  text, text, text, text, text, text, text, boolean, uuid[], text
) to service_role;

-- Fail the migration if the replacement did not preserve the exact function
-- identity/security contract or if either publish path no longer uses the
-- shared canonical risk_share_items.id ASC row-lock order.
do $$
declare
  v_owner_oid oid;
  v_tenant_oid oid;
  v_owner_definition text;
  v_tenant_definition text;
  v_owner_acl aclitem[];
begin
  v_owner_oid := to_regprocedure(
    'public.create_risk_share_version_lock(text,text,text,text,text,text,text,boolean,uuid[],text)'
  );
  v_tenant_oid := to_regprocedure(
    'public.publish_risk_share_version_for_tenant(text,uuid,text,text,text,uuid[],text)'
  );

  if v_owner_oid is null or v_tenant_oid is null then
    raise exception
      'align_risk_share_publish_lock_order: required Owner or tenant publish RPC is missing';
  end if;

  select pg_get_functiondef(v_owner_oid), p.proacl
  into v_owner_definition, v_owner_acl
  from pg_proc p
  where p.oid = v_owner_oid;

  select pg_get_functiondef(v_tenant_oid)
  into v_tenant_definition;

  if v_owner_definition !~* 'order by[[:space:]]+risk_share_items\.id[[:space:]]+asc[[:space:]]+for update of risk_share_items' then
    raise exception
      'align_risk_share_publish_lock_order: Owner RPC does not use risk_share_items.id ASC FOR UPDATE';
  end if;

  if v_tenant_definition !~* 'order by[[:space:]]+risk_share_items\.id[[:space:]]+asc[[:space:]]+for update of risk_share_items' then
    raise exception
      'align_risk_share_publish_lock_order: tenant RPC does not use risk_share_items.id ASC FOR UPDATE';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_roles r on r.oid = p.proowner
    where p.oid = v_owner_oid
      and r.rolname = 'postgres'
      and p.prosecdef
      and p.proconfig = array['search_path=public, pg_temp']::text[]
  ) then
    raise exception
      'align_risk_share_publish_lock_order: Owner RPC owner/security/search_path contract changed';
  end if;

  if not has_function_privilege('service_role', v_owner_oid, 'EXECUTE')
     or has_function_privilege('anon', v_owner_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_owner_oid, 'EXECUTE')
     or has_function_privilege('public', v_owner_oid, 'EXECUTE') then
    raise exception
      'align_risk_share_publish_lock_order: Owner RPC execute privilege contract changed';
  end if;
end $$;
