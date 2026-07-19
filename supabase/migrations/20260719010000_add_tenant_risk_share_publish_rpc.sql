-- SafeMetrica Manager Publish: tenant-safe atomic publish RPC
--
-- Additive DB-only contract. No API, UI, RLS, auth, middleware, Public QR,
-- fixture, republish, rollback, supersede, or Production write is included.

-- Fail closed if an unexpected overload already exists. This migration only
-- creates or replaces the one exact signature it owns.
do $$
declare
  v_total_count integer;
  v_exact_count integer;
  v_expected_argtypes oid[] := array[
    'text'::regtype::oid,
    'uuid'::regtype::oid,
    'text'::regtype::oid,
    'text'::regtype::oid,
    'text'::regtype::oid,
    '_uuid'::regtype::oid,
    'text'::regtype::oid
  ];
begin
  select count(*) into v_total_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'publish_risk_share_version_for_tenant';

  select count(*) into v_exact_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'publish_risk_share_version_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if not (
    v_total_count = 0
    or (v_total_count = 1 and v_exact_count = 1)
  ) then
    raise exception
      'publish_risk_share_version_for_tenant precondition failed: unexpected overload exists';
  end if;
end
$$;

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
#variable_conflict use_column
declare
  v_company_code text;
  v_lock_month text;
  v_lock_title text;
  v_notes text;
  v_idempotency_key text;
  v_control_char_pattern text := '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]';

  v_requested_raw_count integer;
  v_requested_count integer;
  v_item_ids uuid[];

  v_membership_role text;
  v_membership_status text;
  v_membership_tenant_code text;

  v_existing_lock public.risk_share_version_locks%rowtype;
  v_stored_item_ids uuid[];
  v_replay_snapshot_count integer;
  v_replay_snapshot_worker_visible_count integer;
  v_replay_live_item_ids uuid[];
  v_replay_live_item_count integer;
  v_replay_live_worker_visible_count integer;

  v_eligible_ids uuid[];
  v_eligible_worker_visible_ids uuid[];
  v_eligible_worker_visible_count integer;
  v_item_count integer;

  v_lock_id uuid;
  v_snapshot_insert_count integer;
  v_item_update_count integer;

  v_final_snapshot_count integer;
  v_final_snapshot_worker_visible_count integer;
  v_final_snapshot_item_ids uuid[];
  v_final_live_item_count integer;
  v_final_live_customer_confirmed_count integer;
  v_final_live_item_ids uuid[];
  v_final_live_worker_visible_ids uuid[];
begin
  -- 1. Canonical input validation.
  v_company_code := lower(btrim(coalesce(p_company_code, '')));

  if v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or p_actor_membership_id is null then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_lock_month := btrim(coalesce(p_lock_month, ''));
  if v_lock_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_lock_title := btrim(coalesce(p_lock_title, ''));
  if char_length(v_lock_title) not between 1 and 160
     or v_lock_title ~ v_control_char_pattern then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null
     and (
       char_length(v_notes) > 500
       or v_notes ~ v_control_char_pattern
     ) then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_idempotency_key := btrim(coalesce(p_idempotency_key, ''));
  if char_length(v_idempotency_key) not between 1 and 200 then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  if p_item_ids is null
     or coalesce(array_length(p_item_ids, 1), 0) = 0
     or coalesce(array_ndims(p_item_ids), 1) > 1
     or array_position(p_item_ids, null) is not null then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  v_requested_raw_count := array_length(p_item_ids, 1);

  select array_agg(distinct requested_id order by requested_id)
  into v_item_ids
  from unnest(p_item_ids) as requested(requested_id);

  v_requested_count := coalesce(array_length(v_item_ids, 1), 0);

  if v_requested_count <> v_requested_raw_count
     or v_requested_count not between 1 and 200 then
    return query
      select false, 'validation_failed'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- 2. Re-derive actor role/status/tenant inside the transaction.
  select
    tm.role,
    tm.status,
    tm.tenant_code
  into
    v_membership_role,
    v_membership_status,
    v_membership_tenant_code
  from public.tenant_membership tm
  where tm.id = p_actor_membership_id
  for share;

  if not found
     or v_membership_status <> 'active'
     or v_membership_role not in ('tenant_admin', 'tenant_manager')
     or v_membership_tenant_code <> v_company_code then
    return query
      select false, 'forbidden'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- 3. Serialize this tenant's publish requests.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'publish_risk_share_version_for_tenant:' || v_company_code,
      0
    )
  );

  -- 4. Exact idempotent replay requires metadata and durable state parity.
  select vl.*
  into v_existing_lock
  from public.risk_share_version_locks vl
  where vl.company_code = v_company_code
    and vl.idempotency_key = v_idempotency_key;

  if found then
    select
      count(*)::integer,
      (count(*) filter (where vi.worker_visible = true))::integer,
      coalesce(
        array_agg(vi.source_item_id order by vi.source_item_id),
        '{}'::uuid[]
      )
    into
      v_replay_snapshot_count,
      v_replay_snapshot_worker_visible_count,
      v_stored_item_ids
    from public.risk_share_version_items vi
    where vi.company_code = v_company_code
      and vi.version_lock_id = v_existing_lock.id;

    select
      count(*)::integer,
      (count(*) filter (where ri.worker_visible = true))::integer,
      coalesce(array_agg(ri.id order by ri.id), '{}'::uuid[])
    into
      v_replay_live_item_count,
      v_replay_live_worker_visible_count,
      v_replay_live_item_ids
    from public.risk_share_items ri
    where ri.company_code = v_company_code
      and ri.version_lock_id = v_existing_lock.id
      and ri.share_status = 'locked'
      and ri.customer_check_status = 'confirmed'
      and ri.customer_confirmed = true;

    if v_existing_lock.lock_status = 'active'
       and v_existing_lock.publish_action = 'publish'
       and v_existing_lock.actor_membership_id = p_actor_membership_id
       and v_existing_lock.lock_month = v_lock_month
       and v_existing_lock.lock_title = v_lock_title
       and coalesce(v_existing_lock.notes, '') = coalesce(v_notes, '')
       and v_existing_lock.item_count = v_requested_count
       and v_existing_lock.item_count = v_replay_snapshot_count
       and v_existing_lock.item_count = v_replay_live_item_count
       and v_existing_lock.worker_visible_count =
         v_replay_snapshot_worker_visible_count
       and v_existing_lock.worker_visible_count =
         v_replay_live_worker_visible_count
       and v_stored_item_ids = v_item_ids
       and v_replay_live_item_ids = v_item_ids then
      return query
        select
          true,
          'ok'::text,
          true,
          v_existing_lock.id,
          v_existing_lock.item_count,
          v_existing_lock.worker_visible_count;
      return;
    end if;

    return query
      select false, 'idempotency_conflict'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- 5. Lock only the explicit, eligible, same-tenant Item set.
  with locked_items as (
    select
      ri.id,
      ri.worker_visible
    from public.risk_share_items ri
    where ri.company_code = v_company_code
      and ri.id = any(v_item_ids)
      and ri.share_status = 'customer_confirmed'
      and ri.customer_check_status = 'confirmed'
      and ri.customer_confirmed = true
      and ri.version_lock_id is null
      and btrim(coalesce(ri.task_name, '')) <> ''
      and btrim(coalesce(ri.hazard, '')) <> ''
      and ri.review_revision >= 1
      and ri.worker_visible is not null
    order by ri.id asc
    for update of ri
  )
  select
    coalesce(array_agg(li.id order by li.id), '{}'::uuid[]),
    coalesce(
      array_agg(li.id order by li.id) filter (where li.worker_visible = true),
      '{}'::uuid[]
    ),
    (count(*) filter (where li.worker_visible = true))::integer
  into
    v_eligible_ids,
    v_eligible_worker_visible_ids,
    v_eligible_worker_visible_count
  from locked_items li;

  v_item_count := coalesce(array_length(v_eligible_ids, 1), 0);

  if v_item_count <> v_requested_count then
    return query
      select false, 'selection_mismatch'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- 6. Create the Version. Existing active month wins atomically.
  insert into public.risk_share_version_locks (
    company_code,
    lock_title,
    lock_month,
    item_count,
    customer_confirmed_count,
    worker_visible_count,
    lock_status,
    locked_by,
    notes,
    actor_membership_id,
    idempotency_key,
    publish_action,
    previous_version_id,
    content_source_version_id,
    superseded_at,
    raw_payload
  ) values (
    v_company_code,
    v_lock_title,
    v_lock_month,
    v_item_count,
    v_item_count,
    v_eligible_worker_visible_count,
    'active',
    v_membership_role,
    v_notes,
    p_actor_membership_id,
    v_idempotency_key,
    'publish',
    null,
    null,
    null,
    jsonb_build_object(
      'source',
      'publish_risk_share_version_for_tenant_v1'
    )
  )
  on conflict (company_code, lock_month)
    where lock_status = 'active'
  do nothing
  returning risk_share_version_locks.id
  into v_lock_id;

  if v_lock_id is null then
    return query
      select false, 'active_month_exists'::text, false, null::uuid, 0, 0;
    return;
  end if;

  -- 7. Capture an immutable share-relevant snapshot.
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
  where ri.company_code = v_company_code
    and ri.id = any(v_eligible_ids);

  get diagnostics v_snapshot_insert_count = row_count;

  if v_snapshot_insert_count <> v_item_count then
    raise exception
      'publish_risk_share_version_for_tenant: snapshot insert count mismatch';
  end if;

  -- 8. Lock the live Items without changing review content or worker_visible.
  update public.risk_share_items ri
  set
    share_status = 'locked',
    version_lock_id = v_lock_id,
    version_locked_at = now(),
    updated_at = now()
  where ri.company_code = v_company_code
    and ri.id = any(v_eligible_ids);

  get diagnostics v_item_update_count = row_count;

  if v_item_update_count <> v_item_count then
    raise exception
      'publish_risk_share_version_for_tenant: Item update count mismatch';
  end if;

  -- 9. Re-read durable state. Any mismatch aborts the whole transaction.
  select
    count(*)::integer,
    (count(*) filter (where vi.worker_visible = true))::integer,
    coalesce(
      array_agg(vi.source_item_id order by vi.source_item_id),
      '{}'::uuid[]
    )
  into
    v_final_snapshot_count,
    v_final_snapshot_worker_visible_count,
    v_final_snapshot_item_ids
  from public.risk_share_version_items vi
  where vi.company_code = v_company_code
    and vi.version_lock_id = v_lock_id;

  if v_final_snapshot_count <> v_item_count
     or v_final_snapshot_worker_visible_count <>
       v_eligible_worker_visible_count
     or v_final_snapshot_item_ids <> v_item_ids then
    raise exception
      'publish_risk_share_version_for_tenant: final snapshot mismatch';
  end if;

  select
    count(*)::integer,
    (count(*) filter (where ri.customer_confirmed = true))::integer,
    coalesce(array_agg(ri.id order by ri.id), '{}'::uuid[]),
    coalesce(
      array_agg(ri.id order by ri.id)
        filter (where ri.worker_visible = true),
      '{}'::uuid[]
    )
  into
    v_final_live_item_count,
    v_final_live_customer_confirmed_count,
    v_final_live_item_ids,
    v_final_live_worker_visible_ids
  from public.risk_share_items ri
  where ri.company_code = v_company_code
    and ri.version_lock_id = v_lock_id
    and ri.share_status = 'locked'
    and ri.customer_check_status = 'confirmed';

  if v_final_live_item_count <> v_item_count
     or v_final_live_customer_confirmed_count <> v_item_count
     or v_final_live_item_ids <> v_item_ids
     or v_final_live_worker_visible_ids <> v_eligible_worker_visible_ids then
    raise exception
      'publish_risk_share_version_for_tenant: final live Item mismatch';
  end if;

  return query
    select
      true,
      'ok'::text,
      false,
      v_lock_id,
      v_item_count,
      v_eligible_worker_visible_count;
end;
$$;

alter function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) owner to postgres;

revoke all on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) from public;

revoke all on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) from anon, authenticated, service_role;

grant execute on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) to service_role;

-- Apply-time contract postconditions.
do $$
declare
  v_rpc_oid oid;
  v_total_count integer;
  v_exact_count integer;
  v_unexpected_acl_count integer;
  v_expected_argtypes oid[] := array[
    'text'::regtype::oid,
    'uuid'::regtype::oid,
    'text'::regtype::oid,
    'text'::regtype::oid,
    'text'::regtype::oid,
    '_uuid'::regtype::oid,
    'text'::regtype::oid
  ];
begin
  select count(*) into v_total_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'publish_risk_share_version_for_tenant';

  select count(*) into v_exact_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'publish_risk_share_version_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_total_count <> 1 or v_exact_count <> 1 then
    raise exception
      'publish_risk_share_version_for_tenant postcondition: overload/signature mismatch';
  end if;

  select p.oid
  into v_rpc_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'publish_risk_share_version_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if pg_get_function_identity_arguments(v_rpc_oid) <>
       'p_company_code text, p_actor_membership_id uuid, p_lock_month text, p_lock_title text, p_notes text, p_item_ids uuid[], p_idempotency_key text'
     or lower(pg_get_function_result(v_rpc_oid)) <>
       lower(
         'TABLE(ok boolean, code text, replayed boolean, version_lock_id uuid, item_count integer, worker_visible_count integer)'
       ) then
    raise exception
      'publish_risk_share_version_for_tenant postcondition: argument/return mismatch';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_roles r on r.oid = p.proowner
    where p.oid = v_rpc_oid
      and r.rolname = 'postgres'
      and p.prosecdef
      and p.proconfig = array['search_path=public, pg_temp']::text[]
  ) then
    raise exception
      'publish_risk_share_version_for_tenant postcondition: owner/security/search_path mismatch';
  end if;

  if not has_function_privilege('service_role', v_rpc_oid, 'EXECUTE')
     or has_function_privilege('anon', v_rpc_oid, 'EXECUTE')
     or has_function_privilege('authenticated', v_rpc_oid, 'EXECUTE') then
    raise exception
      'publish_risk_share_version_for_tenant postcondition: execute privilege mismatch';
  end if;

  select count(*)
  into v_unexpected_acl_count
  from pg_proc p
  cross join lateral
    aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  left join pg_roles grantee_role
    on grantee_role.oid = acl.grantee
  where p.oid = v_rpc_oid
    and acl.privilege_type = 'EXECUTE'
    and acl.grantee <> p.proowner
    and (
      acl.grantee = 0
      or grantee_role.rolname is distinct from 'service_role'
      or acl.is_grantable
    );

  if v_unexpected_acl_count <> 0 then
    raise exception
      'publish_risk_share_version_for_tenant postcondition: unexpected/grant-option execute privilege';
  end if;
end
$$;

comment on function public.publish_risk_share_version_for_tenant(
  text, uuid, text, text, text, uuid[], text
) is
  'Tenant Manager publish v1. Revalidates tenant membership, locks an explicit 1-200 Item set, writes one immutable Version snapshot, preserves each Item worker_visible value, and records the membership actor. Server-only; no republish, rollback, or automatic selection.';
