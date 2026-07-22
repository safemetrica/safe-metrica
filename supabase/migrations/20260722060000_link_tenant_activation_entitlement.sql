-- General SaaS commercial activation integrity.
-- Owner-confirmed tenant activation and the risk_share entitlement now commit
-- in one transaction. This migration changes no tenant or entitlement rows by
-- itself; rows change only when the service-role-only RPC is called.

do $$
begin
  if to_regprocedure('extensions.digest(text, text)') is null then
    raise exception
      'tenant activation entitlement precondition failed: extensions.digest(text, text) is not available';
  end if;
end
$$;

create or replace function public.activate_tenant_after_profile(
  p_company_code text,
  p_actor_membership_id uuid,
  p_idempotency_key text,
  p_initiated_by text default 'owner_console'
)
returns table (
  ok boolean,
  result_code text,
  tenant_status text,
  event_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_code text := lower(btrim(coalesce(p_company_code, '')));
  v_idempotency_key text := btrim(coalesce(p_idempotency_key, ''));
  v_tenant public.tenant_registry%rowtype;
  v_membership public.tenant_membership%rowtype;
  v_site public.tenant_sites%rowtype;
  v_entitlement public.tenant_product_entitlements%rowtype;
  v_item text;
  v_event_id uuid;
  v_entitlement_id uuid;
  v_entitlement_from_status text;
  v_request_digest text;
  v_result_code text;
  v_row_count integer;
begin
  if v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or p_actor_membership_id is null
     or length(v_idempotency_key) < 1
     or length(v_idempotency_key) > 200
     or coalesce(p_initiated_by, '') <> 'owner_console' then
    return query select false, 'validation_failed', null::text, null::uuid;
    return;
  end if;

  -- The tenant lock serializes activation and entitlement issuance for the
  -- same customer, including concurrent retries.
  select tr.* into v_tenant
  from public.tenant_registry tr
  where tr.company_code = v_company_code
  for update;

  if not found then
    return query select false, 'tenant_not_found', null::text, null::uuid;
    return;
  end if;

  if v_tenant.status not in ('onboarding', 'active')
     or v_tenant.service_mode not in ('risk_share_pack', 'full_safemetrica')
     or coalesce(v_tenant.source_channel, '') not in ('self_service', 'owner_direct') then
    return query select false, 'tenant_not_eligible', v_tenant.status, null::uuid;
    return;
  end if;

  select tm.* into v_membership
  from public.tenant_membership tm
  where tm.id = p_actor_membership_id
  for share;

  if not found
     or v_membership.status <> 'active'
     or v_membership.role <> 'tenant_admin'
     or v_membership.tenant_id <> v_tenant.id
     or v_membership.tenant_code <> v_tenant.company_code then
    return query select false, 'forbidden', v_tenant.status, null::uuid;
    return;
  end if;

  if v_tenant.status = 'onboarding' then
    select ts.* into v_site
    from public.tenant_sites ts
    where ts.id = v_tenant.default_site_id
      and ts.tenant_id = v_tenant.id
      and ts.tenant_code = v_tenant.company_code
      and ts.is_default = true
      and ts.status = 'active'
    for share;

    if not found then
      return query select false, 'default_site_required', v_tenant.status, null::uuid;
      return;
    end if;

    if length(btrim(coalesce(v_site.site_name, ''))) < 1
       or length(v_site.site_name) > 160
       or length(btrim(coalesce(v_site.industry_profile, ''))) < 1
       or length(v_site.industry_profile) > 80
       or length(btrim(coalesce(v_site.worker_count_band, ''))) < 1
       or length(v_site.worker_count_band) > 40
       or v_site.major_processes is null
       or cardinality(v_site.major_processes) not between 1 and 20
       or v_site.major_equipment is null
       or cardinality(v_site.major_equipment) not between 1 and 20
       or v_site.uses_external_workforce is null
       or v_site.has_worker_representative is null then
      return query select false, 'profile_incomplete', v_tenant.status, null::uuid;
      return;
    end if;

    foreach v_item in array v_site.major_processes loop
      if length(btrim(coalesce(v_item, ''))) < 1 or length(v_item) > 80 then
        return query select false, 'profile_incomplete', v_tenant.status, null::uuid;
        return;
      end if;
    end loop;

    foreach v_item in array v_site.major_equipment loop
      if length(btrim(coalesce(v_item, ''))) < 1 or length(v_item) > 80 then
        return query select false, 'profile_incomplete', v_tenant.status, null::uuid;
        return;
      end if;
    end loop;
  end if;

  -- Lock the current product state before changing the tenant lifecycle.
  -- Revoked or ended access is never silently restored by activation.
  select tpe.* into v_entitlement
  from public.tenant_product_entitlements tpe
  where tpe.tenant_id = v_tenant.id
    and tpe.product_code = 'risk_share'
  for update;

  if found and v_entitlement.status not in ('pending', 'active') then
    return query select false, 'entitlement_conflict', v_tenant.status, null::uuid;
    return;
  end if;

  if v_tenant.status = 'onboarding' then
    insert into public.tenant_activation_events (
      tenant_id, tenant_code, actor_membership_id, from_status, to_status,
      initiated_by, idempotency_key
    ) values (
      v_tenant.id, v_tenant.company_code, v_membership.id, 'onboarding',
      'active', 'owner_console', v_idempotency_key
    )
    returning id into v_event_id;

    update public.tenant_registry tr
    set status = 'active', updated_at = now()
    where tr.id = v_tenant.id
      and tr.company_code = v_tenant.company_code
      and tr.status = 'onboarding';

    get diagnostics v_row_count = row_count;
    if v_row_count <> 1 then
      raise exception 'tenant activation update invariant failed';
    end if;

    v_result_code := 'activated';
  else
    select tae.id into v_event_id
    from public.tenant_activation_events tae
    where tae.tenant_id = v_tenant.id
      and tae.from_status = 'onboarding'
      and tae.to_status = 'active'
    order by tae.created_at asc, tae.id asc
    limit 1;

    v_result_code := 'already_active';
  end if;

  if v_entitlement.id is null then
    insert into public.tenant_product_entitlements (
      tenant_id, tenant_code, product_code, status, activation_source,
      policy_version, effective_at
    ) values (
      v_tenant.id, v_tenant.company_code, 'risk_share', 'active',
      'owner_console', 1, now()
    )
    returning id into v_entitlement_id;

    v_entitlement_from_status := null;
  elsif v_entitlement.status = 'pending' then
    update public.tenant_product_entitlements tpe
    set status = 'active',
        activation_source = 'owner_console',
        policy_version = 1,
        effective_at = coalesce(tpe.effective_at, now()),
        suspended_at = null,
        ended_at = null,
        updated_at = now()
    where tpe.id = v_entitlement.id
      and tpe.tenant_id = v_tenant.id
      and tpe.tenant_code = v_tenant.company_code
      and tpe.product_code = 'risk_share'
      and tpe.status = 'pending';

    get diagnostics v_row_count = row_count;
    if v_row_count <> 1 then
      raise exception 'entitlement activation update invariant failed';
    end if;

    v_entitlement_id := v_entitlement.id;
    v_entitlement_from_status := 'pending';
  else
    v_entitlement_id := v_entitlement.id;
  end if;

  -- A current active entitlement is an exact state replay. New and pending
  -- transitions receive one append-only event in the same transaction.
  if v_entitlement.id is null or v_entitlement.status = 'pending' then
    v_request_digest := encode(extensions.digest(concat_ws('|',
      v_tenant.id::text,
      v_tenant.company_code,
      'risk_share',
      coalesce(v_entitlement_from_status, ''),
      'active',
      'owner_console',
      '1',
      v_idempotency_key
    )::text, 'sha256'::text), 'hex');

    insert into public.tenant_product_entitlement_events (
      entitlement_id, tenant_id, tenant_code, product_code, from_status,
      to_status, activation_source, policy_version, actor_type,
      idempotency_key, request_digest
    ) values (
      v_entitlement_id, v_tenant.id, v_tenant.company_code, 'risk_share',
      v_entitlement_from_status, 'active', 'owner_console', 1,
      'owner_console', v_idempotency_key, v_request_digest
    );
  end if;

  return query select true, v_result_code, 'active', v_event_id;
end;
$$;

revoke all on function public.activate_tenant_after_profile(text, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.activate_tenant_after_profile(text, uuid, text, text)
  to service_role;

comment on function public.activate_tenant_after_profile(text, uuid, text, text) is
  'Owner-only atomic commercial activation: validates tenant and manager, activates the tenant, grants risk_share entitlement, and appends both audits. Suspended, expired, and terminated access is never restored automatically.';

-- Intentionally no direct tenant update, entitlement backfill, runtime
-- enforcement switch, or customer-row mutation during migration apply.
