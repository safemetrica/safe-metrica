-- SafeMetrica Commercial Core: canonical tenant/site binding
--
-- New rows are bound to the tenant's active canonical default site inside
-- PostgreSQL. Existing rows remain NULL and are deliberately not backfilled.

create unique index if not exists tenant_sites_id_tenant_code_uidx
  on public.tenant_sites (id, tenant_code);

alter table public.risk_share_sources add column if not exists site_id uuid;
alter table public.risk_share_item_candidates add column if not exists site_id uuid;
alter table public.risk_share_items add column if not exists site_id uuid;
alter table public.risk_share_version_locks add column if not exists site_id uuid;
alter table public.risk_share_version_items add column if not exists site_id uuid;
alter table public.field_participation_submissions add column if not exists site_id uuid;

do $$
declare
  v_table text;
  v_company_column text;
  v_constraint text;
begin
  for v_table, v_company_column, v_constraint in
    values
      ('risk_share_sources', 'company_code', 'risk_share_sources_site_tenant_fkey'),
      ('risk_share_item_candidates', 'company_code', 'risk_share_item_candidates_site_tenant_fkey'),
      ('risk_share_items', 'company_code', 'risk_share_items_site_tenant_fkey'),
      ('risk_share_version_locks', 'company_code', 'risk_share_version_locks_site_tenant_fkey'),
      ('risk_share_version_items', 'company_code', 'risk_share_version_items_site_tenant_fkey'),
      ('field_participation_submissions', 'tenant_code', 'field_participation_site_tenant_fkey')
  loop
    if not exists (
      select 1 from pg_constraint where conname = v_constraint
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (site_id, %I) references public.tenant_sites (id, tenant_code) on delete restrict',
        v_table, v_constraint, v_company_column
      );
    end if;
  end loop;
end
$$;

create or replace function public.bind_new_risk_share_row_to_default_site()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_code text;
  v_site_id uuid;
  v_site_name text;
begin
  v_tenant_code := case
    when tg_table_name = 'field_participation_submissions' then new.tenant_code
    else new.company_code
  end;

  select ts.id, ts.site_name
  into v_site_id, v_site_name
  from public.tenant_registry tr
  join public.tenant_sites ts
    on ts.id = tr.default_site_id
   and ts.tenant_id = tr.id
   and ts.tenant_code = tr.company_code
   and ts.status = 'active'
   and ts.is_default = true
  where tr.company_code = v_tenant_code;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'canonical active default site is required';
  end if;

  if new.site_id is not null and new.site_id <> v_site_id then
    raise exception using
      errcode = '23503',
      message = 'site does not match canonical tenant default';
  end if;

  new.site_id := v_site_id;
  if tg_table_name in (
    'risk_share_sources',
    'risk_share_item_candidates',
    'risk_share_items',
    'risk_share_version_locks'
  ) then
    new.site_name := v_site_name;
  end if;
  return new;
end;
$$;

revoke all on function public.bind_new_risk_share_row_to_default_site() from public;
revoke execute on function public.bind_new_risk_share_row_to_default_site() from anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'risk_share_sources',
    'risk_share_item_candidates',
    'risk_share_items',
    'risk_share_version_locks'
  ]
  loop
    execute format('drop trigger if exists bind_new_row_to_default_site on public.%I', v_table);
    execute format(
      'create trigger bind_new_row_to_default_site before insert on public.%I for each row execute function public.bind_new_risk_share_row_to_default_site()',
      v_table
    );
  end loop;
end
$$;

-- Snapshot rows inherit the already captured Version site. Re-resolving the
-- tenant default here could create a split Version if the default changes.
create or replace function public.bind_new_version_item_to_version_site()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_site_id uuid;
begin
  select vl.site_id into v_site_id
  from public.risk_share_version_locks vl
  where vl.id = new.version_lock_id
    and vl.company_code = new.company_code;

  if not found or v_site_id is null then
    raise exception using errcode = '23503', message = 'site-bound version is required';
  end if;

  if new.site_id is not null and new.site_id <> v_site_id then
    raise exception using errcode = '23503', message = 'snapshot site does not match version';
  end if;

  new.site_id := v_site_id;
  return new;
end;
$$;

revoke all on function public.bind_new_version_item_to_version_site() from public;
revoke execute on function public.bind_new_version_item_to_version_site() from anon, authenticated;

drop trigger if exists bind_new_version_item_to_version_site
  on public.risk_share_version_items;
create trigger bind_new_version_item_to_version_site
  before insert on public.risk_share_version_items
  for each row execute function public.bind_new_version_item_to_version_site();

-- A confirmation is bound to the site stored on the immutable Version, not
-- to whatever default site may exist at confirmation time.
create or replace function public.bind_new_confirmation_to_version_site()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_site_id uuid;
begin
  if new.version_lock_id is null then
    if new.site_id is not null then
      raise exception using errcode = '23514', message = 'site requires a version';
    end if;
    return new;
  end if;

  select vl.site_id into v_site_id
  from public.risk_share_version_locks vl
  where vl.id = new.version_lock_id
    and vl.company_code = new.tenant_code;

  if not found or v_site_id is null then
    raise exception using errcode = '23503', message = 'site-bound version is required';
  end if;

  if new.site_id is not null and new.site_id <> v_site_id then
    raise exception using errcode = '23503', message = 'confirmation site does not match version';
  end if;

  new.site_id := v_site_id;
  return new;
end;
$$;

revoke all on function public.bind_new_confirmation_to_version_site() from public;
revoke execute on function public.bind_new_confirmation_to_version_site() from anon, authenticated;

drop trigger if exists bind_new_confirmation_to_version_site
  on public.field_participation_submissions;
create trigger bind_new_confirmation_to_version_site
  before insert on public.field_participation_submissions
  for each row execute function public.bind_new_confirmation_to_version_site();

create index if not exists risk_share_version_locks_company_site_active_idx
  on public.risk_share_version_locks (company_code, site_id, created_at desc)
  where lock_status = 'active' and site_id is not null;

create index if not exists field_participation_tenant_site_version_idx
  on public.field_participation_submissions (tenant_code, site_id, version_lock_id)
  where version_lock_id is not null;

comment on column public.risk_share_version_locks.site_id is
  'Canonical tenant_sites UUID captured at publish time. NULL only for legacy rows created before the site-binding contract.';
comment on column public.risk_share_version_items.site_id is
  'Canonical site snapshot copied at Version creation; enforced tenant-safe by composite FK.';
comment on column public.field_participation_submissions.site_id is
  'For monthly confirmation rows, copied from the referenced immutable Version by a database trigger. NULL for legacy/non-Version submissions.';

-- Apply-time structural postconditions. No row data is changed.
do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from (values
    ('risk_share_sources', 'risk_share_sources_site_tenant_fkey'),
    ('risk_share_item_candidates', 'risk_share_item_candidates_site_tenant_fkey'),
    ('risk_share_items', 'risk_share_items_site_tenant_fkey'),
    ('risk_share_version_locks', 'risk_share_version_locks_site_tenant_fkey'),
    ('risk_share_version_items', 'risk_share_version_items_site_tenant_fkey'),
    ('field_participation_submissions', 'field_participation_site_tenant_fkey')
  ) expected(table_name, constraint_name)
  where not exists (
    select 1 from pg_constraint c where c.conname = expected.constraint_name
  );

  if v_missing <> 0 then
    raise exception 'risk share site binding postcondition failed: missing constraints';
  end if;
end
$$;
