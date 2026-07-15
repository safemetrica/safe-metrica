-- SafeMetrica tenant_sites v1
-- Commercial Core Gate 2: Company/Site Operational Profile.
--
-- Canonical site catalog. tenant_registry.default_site_id / default_site_name
-- remain as compatibility fields for existing readers
-- (ownerTenantCommercialActions.ts default_site_required check,
-- riskShareSourceUpload.ts's siteName fallback) and are kept in sync with
-- the tenant_sites default row through the two RPCs below -- never written
-- by two separate non-transactional requests.
--
-- Existing per-row site_name text columns (risk_share_sources,
-- risk_share_items, risk_share_item_candidates, risk_share_version_locks,
-- evidence_items, worker_representative_confirmations(_links)) are NOT
-- touched by this migration and are not backed by tenant_sites yet -- that
-- connection is a separate, later migration (see PR description).
--
-- industry_profile and worker_count_band are free text, not enums: no
-- customer-specific or unconfirmed industry taxonomy is locked in here.
-- major_processes / major_equipment are bounded text[] (<=20 items, <=80
-- chars each) instead of free JSON. Profile fields are all nullable: null
-- means not yet set, never defaulted to false or an empty array.

create extension if not exists pgcrypto;

create table if not exists public.tenant_sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tenant_code text not null,
  site_name text not null,
  is_default boolean not null default false,
  status text not null default 'active',
  industry_profile text,
  major_processes text[],
  major_equipment text[],
  worker_count_band text,
  uses_external_workforce boolean,
  has_worker_representative boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_sites_tenant_id_code_fk
    foreign key (tenant_id, tenant_code)
    references public.tenant_registry (id, company_code)
    on delete cascade,

  constraint tenant_sites_site_name_not_blank_check
    check (length(btrim(site_name)) > 0 and length(site_name) <= 160),

  constraint tenant_sites_status_check
    check (status in ('active', 'archived')),

  -- An archived site can never be the tenant's default. Application code
  -- must clear is_default (via set_tenant_default_site to another site)
  -- before archiving a current default; this constraint is the DB-level
  -- backstop if it doesn't.
  constraint tenant_sites_default_requires_active_check
    check (not is_default or status = 'active'),

  constraint tenant_sites_industry_profile_length_check
    check (industry_profile is null or length(industry_profile) <= 80),

  constraint tenant_sites_worker_count_band_length_check
    check (worker_count_band is null or length(worker_count_band) <= 40),

  constraint tenant_sites_major_processes_bounds_check
    check (
      major_processes is null
      or (
        array_length(major_processes, 1) <= 20
        and coalesce((select max(length(item)) from unnest(major_processes) as item), 0) <= 80
      )
    ),

  constraint tenant_sites_major_equipment_bounds_check
    check (
      major_equipment is null
      or (
        array_length(major_equipment, 1) <= 20
        and coalesce((select max(length(item)) from unnest(major_equipment) as item), 0) <= 80
      )
    )
);

-- Case/whitespace-insensitive per-tenant site name uniqueness. An
-- expression index (not a table constraint) because the uniqueness key is
-- lower(btrim(site_name)), not the raw column.
create unique index if not exists tenant_sites_tenant_name_unique_idx
  on public.tenant_sites (tenant_id, lower(btrim(site_name)));

-- At most one default site per tenant. Combined with
-- tenant_sites_default_requires_active_check above, this also guarantees
-- the one default row (if any) is always active.
create unique index if not exists tenant_sites_one_active_default_idx
  on public.tenant_sites (tenant_id)
  where is_default;

create index if not exists tenant_sites_tenant_id_idx
  on public.tenant_sites (tenant_id);

create index if not exists tenant_sites_tenant_code_idx
  on public.tenant_sites (tenant_code);

create index if not exists tenant_sites_status_idx
  on public.tenant_sites (tenant_id, status);

-- Server-only table, matching tenant_registry (20260713050000). No
-- anon/authenticated policy: all access goes through server-only code using
-- the service role key.
alter table public.tenant_sites enable row level security;

revoke all privileges
  on table public.tenant_sites
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.tenant_sites
  to service_role;

comment on table public.tenant_sites is
  'Commercial Core Gate 2 canonical site catalog. Server-only; RLS enabled with no client policy.';

comment on column public.tenant_sites.industry_profile is
  'Free text, not an enum. No unconfirmed industry taxonomy is locked in by this column.';

comment on column public.tenant_sites.major_processes is
  'Bounded text array (<=20 items, <=80 chars each), not free JSON.';

comment on column public.tenant_sites.major_equipment is
  'Bounded text array (<=20 items, <=80 chars each), not free JSON.';

comment on column public.tenant_sites.uses_external_workforce is
  'Null = not yet confirmed. False = confirmed no external workforce. Never defaulted.';

comment on column public.tenant_sites.has_worker_representative is
  'Null = not yet confirmed. False = confirmed no worker representative. Never defaulted.';

-- Atomic default-site creation: used when an Owner provides a
-- default_site_name at tenant creation time (or any other path that needs
-- to create a tenant's first default site). Inserts the tenant_sites row
-- and syncs tenant_registry.default_site_id / default_site_name in one
-- transaction -- never two separate requests that could leave the site
-- created but the registry unsynced, or vice versa.
-- Locks the tenant_registry row first so this can never race with
-- set_tenant_default_site for the same tenant.
-- Always returns exactly one row:
--   (null, false, 'tenant_not_found')       tenant_id/tenant_code mismatch
--   (null, false, 'site_name_required')      blank site name
--   (id, false, 'default_already_exists')    tenant already has a default site
--   (id, true, 'ok')                         success
drop function if exists public.create_tenant_default_site(uuid, text, text);

create function public.create_tenant_default_site(
  p_tenant_id uuid,
  p_tenant_code text,
  p_site_name text
)
returns table (id uuid, ok boolean, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registry_id uuid;
  v_site_name text;
  v_new_site_id uuid;
  v_existing_default_id uuid;
begin
  select tenant_registry.id into v_registry_id
  from public.tenant_registry
  where tenant_registry.id = p_tenant_id
    and tenant_registry.company_code = p_tenant_code
  for update;

  if v_registry_id is null then
    return query select null::uuid, false, 'tenant_not_found';
    return;
  end if;

  v_site_name := btrim(coalesce(p_site_name, ''));

  if v_site_name = '' then
    return query select null::uuid, false, 'site_name_required';
    return;
  end if;

  select ts.id into v_existing_default_id
  from public.tenant_sites ts
  where ts.tenant_id = p_tenant_id
    and ts.is_default = true
  limit 1;

  if v_existing_default_id is not null then
    return query select v_existing_default_id, false, 'default_already_exists';
    return;
  end if;

  insert into public.tenant_sites (
    tenant_id, tenant_code, site_name, is_default, status
  ) values (
    p_tenant_id, p_tenant_code, v_site_name, true, 'active'
  )
  returning tenant_sites.id into v_new_site_id;

  update public.tenant_registry
  set default_site_id = v_new_site_id,
      default_site_name = v_site_name,
      updated_at = now()
  where id = p_tenant_id;

  return query select v_new_site_id, true, 'ok';
end;
$$;

revoke all on function public.create_tenant_default_site(uuid, text, text) from public;
revoke execute on function public.create_tenant_default_site(uuid, text, text) from anon, authenticated;
grant execute on function public.create_tenant_default_site(uuid, text, text) to service_role;

-- Atomic default-site switch: marks an existing active tenant_sites row as
-- the tenant's default (clearing any previous default) and syncs
-- tenant_registry.default_site_id / default_site_name in the same
-- transaction. p_tenant_id is a data selector only -- callers must already
-- have verified the actor is authorized for this tenant (Owner token
-- check) before invoking this RPC; the function itself grants no
-- authorization based on its arguments.
-- Always returns exactly one row:
--   (false, 'tenant_not_found')
--   (false, 'site_not_found')
--   (false, 'site_tenant_mismatch')   site_id belongs to a different tenant
--   (false, 'site_not_active')        cannot default to an archived site
--   (true, 'ok')                      success
drop function if exists public.set_tenant_default_site(uuid, uuid);

create function public.set_tenant_default_site(
  p_tenant_id uuid,
  p_site_id uuid
)
returns table (ok boolean, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registry_id uuid;
  v_site_tenant_id uuid;
  v_site_status text;
  v_site_name text;
begin
  select tenant_registry.id into v_registry_id
  from public.tenant_registry
  where tenant_registry.id = p_tenant_id
  for update;

  if v_registry_id is null then
    return query select false, 'tenant_not_found';
    return;
  end if;

  select tenant_sites.tenant_id, tenant_sites.status, tenant_sites.site_name
    into v_site_tenant_id, v_site_status, v_site_name
  from public.tenant_sites
  where tenant_sites.id = p_site_id
  for update;

  if v_site_tenant_id is null then
    return query select false, 'site_not_found';
    return;
  end if;

  if v_site_tenant_id <> p_tenant_id then
    return query select false, 'site_tenant_mismatch';
    return;
  end if;

  if v_site_status <> 'active' then
    return query select false, 'site_not_active';
    return;
  end if;

  update public.tenant_sites
  set is_default = false, updated_at = now()
  where tenant_id = p_tenant_id
    and is_default = true
    and id <> p_site_id;

  update public.tenant_sites
  set is_default = true, updated_at = now()
  where id = p_site_id;

  update public.tenant_registry
  set default_site_id = p_site_id,
      default_site_name = v_site_name,
      updated_at = now()
  where id = p_tenant_id;

  return query select true, 'ok';
end;
$$;

revoke all on function public.set_tenant_default_site(uuid, uuid) from public;
revoke execute on function public.set_tenant_default_site(uuid, uuid) from anon, authenticated;
grant execute on function public.set_tenant_default_site(uuid, uuid) to service_role;

-- Backfill: give every tenant that already has a default_site_name but no
-- tenant_sites row yet a single default site. Idempotent -- the `not
-- exists` guard means an insert is only attempted for tenants that still
-- have zero tenant_sites rows, so re-running this file after a first
-- successful run inserts nothing new. Tenants with no default_site_name are
-- left alone; no placeholder name is invented for them.
insert into public.tenant_sites (
  tenant_id, tenant_code, site_name, is_default, status
)
select
  tr.id,
  tr.company_code,
  btrim(tr.default_site_name),
  true,
  'active'
from public.tenant_registry tr
where tr.default_site_name is not null
  and length(btrim(tr.default_site_name)) > 0
  and not exists (
    select 1 from public.tenant_sites ts where ts.tenant_id = tr.id
  );

-- Sync default_site_id to the (freshly backfilled or already-existing)
-- default tenant_sites row for each tenant. `is distinct from` makes this a
-- no-op update when already in sync, so re-running is safe.
update public.tenant_registry tr
set default_site_id = ts.id,
    updated_at = now()
from public.tenant_sites ts
where ts.tenant_id = tr.id
  and ts.is_default = true
  and ts.status = 'active'
  and tr.default_site_id is distinct from ts.id;
