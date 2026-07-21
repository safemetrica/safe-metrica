-- SafeMetrica Commercial Core: tenant-safe Risk Share site lineage.
-- Existing rows remain NULL. There is no legacy backfill.

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
  for v_table, v_company_column, v_constraint in values
    ('risk_share_sources', 'company_code', 'risk_share_sources_site_tenant_fkey'),
    ('risk_share_item_candidates', 'company_code', 'risk_share_item_candidates_site_tenant_fkey'),
    ('risk_share_items', 'company_code', 'risk_share_items_site_tenant_fkey'),
    ('risk_share_version_locks', 'company_code', 'risk_share_version_locks_site_tenant_fkey'),
    ('risk_share_version_items', 'company_code', 'risk_share_version_items_site_tenant_fkey'),
    ('field_participation_submissions', 'tenant_code', 'field_participation_site_tenant_fkey')
  loop
    if not exists (
      select 1 from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where c.conname = v_constraint and n.nspname = 'public' and r.relname = v_table
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (site_id, %I) references public.tenant_sites (id, tenant_code) on delete restrict',
        v_table, v_constraint, v_company_column
      );
    end if;
  end loop;
end $$;

create or replace function public.bind_new_risk_share_source_to_default_site()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_site_id uuid; v_site_name text;
begin
  select ts.id, ts.site_name into v_site_id, v_site_name
  from public.tenant_registry tr
  join public.tenant_sites ts on ts.id = tr.default_site_id
    and ts.tenant_id = tr.id and ts.tenant_code = tr.company_code
    and ts.status = 'active' and ts.is_default = true
  where tr.company_code = new.company_code;
  if not found then raise exception using errcode = '23503', message = 'canonical active default site is required'; end if;
  if new.site_id is not null and new.site_id <> v_site_id then
    raise exception using errcode = '23503', message = 'source site does not match canonical tenant default';
  end if;
  new.site_id := v_site_id; new.site_name := v_site_name; return new;
end $$;
revoke all on function public.bind_new_risk_share_source_to_default_site() from public;
revoke execute on function public.bind_new_risk_share_source_to_default_site() from anon, authenticated;
drop trigger if exists bind_new_row_to_default_site on public.risk_share_sources;
drop trigger if exists bind_new_source_to_default_site on public.risk_share_sources;
create trigger bind_new_source_to_default_site before insert on public.risk_share_sources
for each row execute function public.bind_new_risk_share_source_to_default_site();

create or replace function public.bind_new_risk_share_candidate_to_source_site()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_site_id uuid; v_site_name text;
begin
  select rs.site_id, rs.site_name into v_site_id, v_site_name from public.risk_share_sources rs
  where rs.id = new.source_id and rs.company_code = new.company_code;
  if not found or v_site_id is null then raise exception using errcode = '23503', message = 'site-bound source is required'; end if;
  if new.site_id is not null and new.site_id <> v_site_id then raise exception using errcode = '23503', message = 'candidate site does not match source'; end if;
  new.site_id := v_site_id; new.site_name := v_site_name; return new;
end $$;
revoke all on function public.bind_new_risk_share_candidate_to_source_site() from public;
revoke execute on function public.bind_new_risk_share_candidate_to_source_site() from anon, authenticated;
drop trigger if exists bind_new_row_to_default_site on public.risk_share_item_candidates;
drop trigger if exists bind_new_candidate_to_source_site on public.risk_share_item_candidates;
create trigger bind_new_candidate_to_source_site before insert on public.risk_share_item_candidates
for each row execute function public.bind_new_risk_share_candidate_to_source_site();

create or replace function public.bind_new_risk_share_item_to_lineage_site()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_candidate_site uuid; v_source_site uuid; v_site_name text;
begin
  select rc.site_id, rs.site_id, rs.site_name into v_candidate_site, v_source_site, v_site_name
  from public.risk_share_item_candidates rc join public.risk_share_sources rs
    on rs.id = rc.source_id and rs.company_code = rc.company_code
  where rc.id = new.candidate_id and rc.source_id = new.source_id
    and rc.company_code = new.company_code;
  if not found or v_candidate_site is null or v_source_site is null or v_candidate_site <> v_source_site then
    raise exception using errcode = '23503', message = 'consistent site-bound candidate/source lineage is required';
  end if;
  if new.site_id is not null and new.site_id <> v_source_site then raise exception using errcode = '23503', message = 'item site does not match lineage'; end if;
  new.site_id := v_source_site; new.site_name := v_site_name; return new;
end $$;
revoke all on function public.bind_new_risk_share_item_to_lineage_site() from public;
revoke execute on function public.bind_new_risk_share_item_to_lineage_site() from anon, authenticated;
drop trigger if exists bind_new_row_to_default_site on public.risk_share_items;
drop trigger if exists bind_new_item_to_lineage_site on public.risk_share_items;
create trigger bind_new_item_to_lineage_site before insert on public.risk_share_items
for each row execute function public.bind_new_risk_share_item_to_lineage_site();

-- Version site is initialized by its first immutable snapshot Item. Every later
-- snapshot must match it. A legacy NULL Item is never implicitly attributed.
drop trigger if exists bind_new_row_to_default_site on public.risk_share_version_locks;
create or replace function public.bind_new_version_item_to_item_site()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_item_site uuid; v_version_site uuid; v_site_name text;
begin
  select ri.site_id into v_item_site from public.risk_share_items ri
  where ri.id = new.source_item_id and ri.company_code = new.company_code;
  if not found or v_item_site is null then raise exception using errcode = '23503', message = 'site-bound source item is required'; end if;
  select vl.site_id into v_version_site from public.risk_share_version_locks vl
  where vl.id = new.version_lock_id and vl.company_code = new.company_code for update;
  if not found then raise exception using errcode = '23503', message = 'tenant-matched version is required'; end if;
  if v_version_site is null then
    select ts.site_name into v_site_name from public.tenant_sites ts where ts.id = v_item_site and ts.tenant_code = new.company_code;
    update public.risk_share_version_locks set site_id = v_item_site, site_name = v_site_name where id = new.version_lock_id and company_code = new.company_code;
    v_version_site := v_item_site;
  end if;
  if v_version_site <> v_item_site then raise exception using errcode = '23514', message = 'all Version items must share one site'; end if;
  if new.site_id is not null and new.site_id <> v_item_site then raise exception using errcode = '23503', message = 'snapshot site does not match source item'; end if;
  new.site_id := v_item_site; return new;
end $$;
revoke all on function public.bind_new_version_item_to_item_site() from public;
revoke execute on function public.bind_new_version_item_to_item_site() from anon, authenticated;
drop trigger if exists bind_new_version_item_to_version_site on public.risk_share_version_items;
drop trigger if exists bind_new_version_item_to_item_site on public.risk_share_version_items;
create trigger bind_new_version_item_to_item_site before insert on public.risk_share_version_items
for each row execute function public.bind_new_version_item_to_item_site();

create or replace function public.bind_new_confirmation_to_version_site()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_site_id uuid;
begin
  if new.version_lock_id is null then
    if new.site_id is not null then raise exception using errcode = '23514', message = 'site requires a version'; end if;
    return new;
  end if;
  select vl.site_id into v_site_id from public.risk_share_version_locks vl
  where vl.id = new.version_lock_id and vl.company_code = new.tenant_code;
  if not found then raise exception using errcode = '23503', message = 'tenant-matched version is required'; end if;
  -- Legacy active Version confirmations remain NULL until an explicit transition.
  if v_site_id is null then
    if new.site_id is not null then raise exception using errcode = '23514', message = 'legacy version cannot accept a site'; end if;
    return new;
  end if;
  if new.site_id is not null and new.site_id <> v_site_id then raise exception using errcode = '23503', message = 'confirmation site does not match version'; end if;
  new.site_id := v_site_id; return new;
end $$;
revoke all on function public.bind_new_confirmation_to_version_site() from public;
revoke execute on function public.bind_new_confirmation_to_version_site() from anon, authenticated;
drop trigger if exists bind_new_confirmation_to_version_site on public.field_participation_submissions;
create trigger bind_new_confirmation_to_version_site before insert on public.field_participation_submissions
for each row execute function public.bind_new_confirmation_to_version_site();

create index if not exists risk_share_version_locks_company_site_active_idx on public.risk_share_version_locks (company_code, site_id, created_at desc) where lock_status = 'active' and site_id is not null;
create index if not exists field_participation_tenant_site_version_idx on public.field_participation_submissions (tenant_code, site_id, version_lock_id) where version_lock_id is not null;

comment on column public.risk_share_version_locks.site_id is 'Site inherited atomically from the first immutable snapshot Item. NULL only for legacy or incomplete rows.';
comment on column public.risk_share_version_items.site_id is 'Site inherited from source_item_id and required to match the Version site.';
comment on column public.field_participation_submissions.site_id is 'Site inherited from the referenced site-bound Version; NULL for legacy/non-Version submissions.';
