-- Commercial Core self-service activation gate.
-- Adds an append-only lifecycle ledger and one service-role-only RPC that
-- atomically validates the tenant, authorizing tenant_admin membership, and
-- complete default-site profile before transitioning onboarding -> active.

create table if not exists public.tenant_activation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tenant_code text not null,
  actor_membership_id uuid not null,
  from_status text not null,
  to_status text not null,
  initiated_by text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),

  constraint tenant_activation_events_tenant_fk
    foreign key (tenant_id, tenant_code)
    references public.tenant_registry (id, company_code)
    on delete restrict,

  constraint tenant_activation_events_actor_fk
    foreign key (actor_membership_id, tenant_code)
    references public.tenant_membership (id, tenant_code)
    on delete restrict,

  constraint tenant_activation_events_transition_check
    check (from_status = 'onboarding' and to_status = 'active'),

  constraint tenant_activation_events_initiated_by_check
    check (initiated_by in ('self_service_profile', 'owner_console')),

  constraint tenant_activation_events_idempotency_key_check
    check (length(btrim(idempotency_key)) between 1 and 200)
);

create unique index if not exists tenant_activation_events_one_transition_uidx
  on public.tenant_activation_events (tenant_id, from_status, to_status);

create unique index if not exists tenant_activation_events_idempotency_uidx
  on public.tenant_activation_events (tenant_code, idempotency_key);

create index if not exists tenant_activation_events_tenant_created_idx
  on public.tenant_activation_events (tenant_code, created_at desc);

alter table public.tenant_activation_events enable row level security;

revoke all privileges
  on table public.tenant_activation_events
  from public, anon, authenticated, service_role;

grant select, insert
  on table public.tenant_activation_events
  to service_role;

comment on table public.tenant_activation_events is
  'Append-only audit ledger for atomic tenant onboarding-to-active transitions. No update/delete grant.';

drop function if exists public.activate_tenant_after_profile(text, uuid, text, text);

create function public.activate_tenant_after_profile(
  p_company_code text,
  p_actor_membership_id uuid,
  p_idempotency_key text,
  p_initiated_by text default 'self_service_profile'
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
  v_item text;
  v_event_id uuid;
  v_row_count integer;
begin
  if v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or p_actor_membership_id is null
     or length(v_idempotency_key) < 1
     or length(v_idempotency_key) > 200
     or coalesce(p_initiated_by, '') not in ('self_service_profile', 'owner_console') then
    return query select false, 'validation_failed', null::text, null::uuid;
    return;
  end if;

  -- One tenant lock serializes activation, profile/default-site changes, and
  -- duplicate requests for this company. Company code is normalized here;
  -- tenant id, status, and service/source eligibility are never trusted from
  -- the application request.
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

  -- The membership row is re-derived and locked in the database. Role,
  -- status, tenant id, and company linkage never come from query/form data.
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

  -- An already-committed activation is a successful replay. The tenant row
  -- lock makes concurrent calls deterministic: the loser waits, then reaches
  -- this branch without writing a second event.
  if v_tenant.status = 'active' then
    select tae.id into v_event_id
    from public.tenant_activation_events tae
    where tae.tenant_id = v_tenant.id
      and tae.from_status = 'onboarding'
      and tae.to_status = 'active'
    order by tae.created_at asc, tae.id asc
    limit 1;

    return query select true, 'already_active', 'active', v_event_id;
    return;
  end if;

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

  -- Insert and status update share this function transaction. Any unexpected
  -- error (FK, unique, trigger, or update failure) aborts both writes.
  insert into public.tenant_activation_events (
    tenant_id,
    tenant_code,
    actor_membership_id,
    from_status,
    to_status,
    initiated_by,
    idempotency_key
  ) values (
    v_tenant.id,
    v_tenant.company_code,
    v_membership.id,
    'onboarding',
    'active',
    p_initiated_by,
    v_idempotency_key
  )
  returning id into v_event_id;

  update public.tenant_registry tr
  set status = 'active',
      updated_at = now()
  where tr.id = v_tenant.id
    and tr.company_code = v_tenant.company_code
    and tr.status = 'onboarding';

  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'tenant activation update invariant failed';
  end if;

  return query select true, 'activated', 'active', v_event_id;
end;
$$;

revoke all on function public.activate_tenant_after_profile(text, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.activate_tenant_after_profile(text, uuid, text, text)
  to service_role;

comment on function public.activate_tenant_after_profile(text, uuid, text, text) is
  'Atomically validates a tenant_admin and complete active default-site profile, records an append-only event, and transitions onboarding to active. Service role only.';
