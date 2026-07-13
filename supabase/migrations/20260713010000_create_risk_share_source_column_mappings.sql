-- SafeMetrica risk_share_source_column_mappings
--
-- Stores versioned column mapping decisions (source spreadsheet column ->
-- SafeMetrica canonical field) for a given risk-share source, sheet, and
-- header row. This table does not create, review, or store Risk Share
-- Pack candidates or items. It is server-only: no direct client read or
-- write policy is added. All writes go through the
-- save_risk_share_source_column_mapping_version RPC so that "confirmed"
-- supersession and version numbering stay atomic.

create table if not exists public.risk_share_source_column_mappings (
  id uuid primary key default gen_random_uuid(),
  company_code text not null,
  source_id uuid not null references public.risk_share_sources(id) on delete cascade,
  sheet_index integer not null,
  header_row_index integer not null,
  mapping_version integer not null,
  status text not null,
  header_signature_sha256 text not null,
  source_column_count integer not null,
  mappings jsonb not null,
  created_by_role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_company_code_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_company_code_check
      check (company_code ~ '^[a-z0-9][a-z0-9-]{0,63}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_sheet_index_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_sheet_index_check
      check (sheet_index >= 0 and sheet_index < 20);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_header_row_index_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_header_row_index_check
      check (header_row_index >= 0 and header_row_index < 20);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_mapping_version_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_mapping_version_check
      check (mapping_version > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_status_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_status_check
      check (status in ('draft', 'confirmed', 'superseded'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_header_signature_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_header_signature_check
      check (header_signature_sha256 ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_source_column_count_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_source_column_count_check
      check (source_column_count >= 1 and source_column_count <= 40);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_mappings_array_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_mappings_array_check
      check (jsonb_typeof(mappings) = 'array');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_created_by_role_check'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_created_by_role_check
      check (created_by_role in ('owner_console', 'tenant_admin', 'tenant_manager'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_source_column_mappings_source_sheet_version_uidx'
      and conrelid = 'public.risk_share_source_column_mappings'::regclass
  ) then
    alter table public.risk_share_source_column_mappings
      add constraint risk_share_source_column_mappings_source_sheet_version_uidx
      unique (source_id, sheet_index, mapping_version);
  end if;
end
$$;

alter table public.risk_share_source_column_mappings enable row level security;

-- Final invariant: at most one confirmed mapping version per source+sheet.
-- The RPC's row lock (see save_risk_share_source_column_mapping_version)
-- keeps the supersede-then-insert sequence race-free; this index is the
-- backstop if that invariant is ever violated by a future code path.
create unique index if not exists risk_share_source_column_mappings_one_confirmed_uidx
  on public.risk_share_source_column_mappings (source_id, sheet_index)
  where status = 'confirmed';

create index if not exists risk_share_source_column_mappings_company_idx
  on public.risk_share_source_column_mappings (company_code, created_at desc);

create index if not exists risk_share_source_column_mappings_source_idx
  on public.risk_share_source_column_mappings (source_id, created_at desc);

create index if not exists risk_share_source_column_mappings_company_source_idx
  on public.risk_share_source_column_mappings (company_code, source_id);

create index if not exists risk_share_source_column_mappings_source_sheet_status_idx
  on public.risk_share_source_column_mappings (source_id, sheet_index, status);

revoke all privileges
on table public.risk_share_source_column_mappings
from anon, authenticated, public;

grant select, insert, update, delete
on table public.risk_share_source_column_mappings
to service_role;

comment on table public.risk_share_source_column_mappings is
  'Versioned source-column to SafeMetrica canonical field mapping decisions. Does not create or review Risk Share Pack candidates or items. Server-only.';

comment on column public.risk_share_source_column_mappings.mappings is
  'Array of {sourceColumnIndex, sourceHeader, standardField}. standardField is a canonical field id or null (ignored column). No private URL, pathname, checksum, or etag is stored here.';

create or replace function public.risk_share_source_column_mappings_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists risk_share_source_column_mappings_set_updated_at_trigger
  on public.risk_share_source_column_mappings;

create trigger risk_share_source_column_mappings_set_updated_at_trigger
  before update on public.risk_share_source_column_mappings
  for each row
  execute function public.risk_share_source_column_mappings_set_updated_at();

-- Atomic version save: locks the risk_share_sources row (FOR UPDATE) so
-- concurrent saves for the same source serialize on this function -- the
-- max(mapping_version)+1 computation and the confirmed->superseded
-- supersession cannot race across two overlapping calls, for either draft
-- or confirmed status. Returns no rows when the source_id/company_code
-- pair does not match (caller must treat an empty result as "source not
-- found" and must not synthesize its own version number).
create or replace function public.save_risk_share_source_column_mapping_version(
  p_company_code text,
  p_source_id uuid,
  p_sheet_index integer,
  p_header_row_index integer,
  p_status text,
  p_header_signature_sha256 text,
  p_source_column_count integer,
  p_mappings jsonb,
  p_created_by_role text
)
returns table (id uuid, mapping_version integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next_version integer;
  v_new_id uuid;
begin
  perform 1
  from public.risk_share_sources
  where risk_share_sources.id = p_source_id
    and risk_share_sources.company_code = p_company_code
  for update;

  if not found then
    return;
  end if;

  if p_status = 'confirmed' then
    update public.risk_share_source_column_mappings
    set status = 'superseded'
    where risk_share_source_column_mappings.source_id = p_source_id
      and risk_share_source_column_mappings.sheet_index = p_sheet_index
      and risk_share_source_column_mappings.status = 'confirmed';
  end if;

  select coalesce(max(risk_share_source_column_mappings.mapping_version), 0) + 1
  into v_next_version
  from public.risk_share_source_column_mappings
  where risk_share_source_column_mappings.source_id = p_source_id
    and risk_share_source_column_mappings.sheet_index = p_sheet_index;

  insert into public.risk_share_source_column_mappings (
    company_code,
    source_id,
    sheet_index,
    header_row_index,
    mapping_version,
    status,
    header_signature_sha256,
    source_column_count,
    mappings,
    created_by_role
  ) values (
    p_company_code,
    p_source_id,
    p_sheet_index,
    p_header_row_index,
    v_next_version,
    p_status,
    p_header_signature_sha256,
    p_source_column_count,
    p_mappings,
    p_created_by_role
  )
  returning risk_share_source_column_mappings.id into v_new_id;

  return query select v_new_id, v_next_version;
end;
$$;

revoke all on function public.save_risk_share_source_column_mapping_version(
  text, uuid, integer, integer, text, text, integer, jsonb, text
) from public;

revoke execute on function public.save_risk_share_source_column_mapping_version(
  text, uuid, integer, integer, text, text, integer, jsonb, text
) from anon, authenticated;

grant execute on function public.save_risk_share_source_column_mapping_version(
  text, uuid, integer, integer, text, text, integer, jsonb, text
) to service_role;
