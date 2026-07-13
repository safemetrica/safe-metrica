-- SafeMetrica risk_share_item_candidates: confirmed source-mapping provenance
--
-- Additive only: no table recreation, no destructive change, no backfill.
-- Adds the minimal columns needed to trace a candidate back to the exact
-- confirmed column-mapping version, sheet, and source row it was imported
-- from, and to make re-running that import idempotent. Existing manual
-- candidates (Owner "수동 후보 생성") are untouched: these columns stay
-- null for them, and the partial unique index below only applies to rows
-- that carry mapping provenance.

alter table public.risk_share_item_candidates
  add column if not exists mapping_version integer;

alter table public.risk_share_item_candidates
  add column if not exists sheet_index integer;

alter table public.risk_share_item_candidates
  add column if not exists source_row_number integer;

alter table public.risk_share_item_candidates
  add column if not exists source_row_signature_sha256 text;

alter table public.risk_share_item_candidates
  add column if not exists import_actor text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_item_candidates_mapping_version_check'
      and conrelid = 'public.risk_share_item_candidates'::regclass
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_mapping_version_check
      check (mapping_version is null or mapping_version > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_item_candidates_sheet_index_check'
      and conrelid = 'public.risk_share_item_candidates'::regclass
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_sheet_index_check
      check (sheet_index is null or (sheet_index >= 0 and sheet_index < 20));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_item_candidates_source_row_number_check'
      and conrelid = 'public.risk_share_item_candidates'::regclass
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_source_row_number_check
      check (source_row_number is null or source_row_number > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_item_candidates_source_row_signature_check'
      and conrelid = 'public.risk_share_item_candidates'::regclass
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_source_row_signature_check
      check (source_row_signature_sha256 is null or source_row_signature_sha256 ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_item_candidates_import_actor_check'
      and conrelid = 'public.risk_share_item_candidates'::regclass
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_import_actor_check
      check (import_actor is null or import_actor in ('owner_console', 'tenant_admin', 'tenant_manager'));
  end if;
end
$$;

-- Mapping provenance is all-or-nothing per row: a mapped-row candidate must
-- carry every provenance field, a manual candidate must carry none of them.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_item_candidates_mapping_provenance_consistency_check'
      and conrelid = 'public.risk_share_item_candidates'::regclass
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_mapping_provenance_consistency_check
      check (
        (
          mapping_version is null
          and sheet_index is null
          and source_row_number is null
          and source_row_signature_sha256 is null
          and import_actor is null
        )
        or
        (
          mapping_version is not null
          and sheet_index is not null
          and source_row_number is not null
          and source_row_signature_sha256 is not null
          and import_actor is not null
        )
      );
  end if;
end
$$;

-- Idempotency: re-running an import for the same confirmed mapping version,
-- sheet, and source row must not create a duplicate candidate.
create unique index if not exists risk_share_item_candidates_mapped_row_uidx
  on public.risk_share_item_candidates (
    company_code,
    source_id,
    mapping_version,
    sheet_index,
    source_row_number,
    source_row_signature_sha256
  )
  where mapping_version is not null;

create index if not exists risk_share_item_candidates_source_mapping_idx
  on public.risk_share_item_candidates (source_id, mapping_version, sheet_index)
  where mapping_version is not null;

comment on column public.risk_share_item_candidates.source_row_number is
  'Human-visible row number in the confirmed source sheet/CSV (1-based), not an internal parser offset.';

comment on column public.risk_share_item_candidates.source_row_signature_sha256 is
  'SHA-256 of the mapped source row cell values, used only for import idempotency and row identification.';

-- Atomic, idempotent import: locks the risk_share_sources row (FOR UPDATE),
-- re-checks that the referenced mapping version is still confirmed, then
-- bulk-inserts candidate rows with ON CONFLICT DO NOTHING against the
-- partial unique index above. A genuine failure (e.g. a NOT NULL violation
-- on hazard) aborts the whole call; duplicate rows are not an error, they
-- are silently skipped and counted. Returns no rows when the
-- source_id/company_code pair does not match, or when the referenced
-- mapping version is not currently confirmed.
create or replace function public.create_risk_share_candidates_from_source_mapping(
  p_company_code text,
  p_source_id uuid,
  p_mapping_version integer,
  p_sheet_index integer,
  p_import_actor text,
  p_candidates jsonb
)
returns table (inserted_count integer, duplicate_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_inserted integer;
begin
  perform 1
  from public.risk_share_sources
  where risk_share_sources.id = p_source_id
    and risk_share_sources.company_code = p_company_code
  for update;

  if not found then
    return;
  end if;

  if not exists (
    select 1
    from public.risk_share_source_column_mappings m
    where m.source_id = p_source_id
      and m.sheet_index = p_sheet_index
      and m.mapping_version = p_mapping_version
      and m.status = 'confirmed'
  ) then
    return;
  end if;

  select count(*) into v_total from jsonb_array_elements(p_candidates);

  with rows as (
    select *
    from jsonb_to_recordset(p_candidates) as r(
      source_row_number integer,
      source_row_signature_sha256 text,
      company_name text,
      site_name text,
      task_name text,
      hazard text,
      current_controls text,
      improvement_plan text,
      risk_level text,
      raw_payload jsonb
    )
  ),
  inserted as (
    insert into public.risk_share_item_candidates (
      source_id,
      company_code,
      company_name,
      site_name,
      task_name,
      hazard,
      risk_level,
      current_controls,
      improvement_plan,
      category,
      source_row,
      confidence,
      ai_generated,
      reviewer_status,
      worker_visible,
      customer_confirmed,
      raw_payload,
      mapping_version,
      sheet_index,
      source_row_number,
      source_row_signature_sha256,
      import_actor
    )
    select
      p_source_id,
      p_company_code,
      rows.company_name,
      rows.site_name,
      coalesce(rows.task_name, ''),
      rows.hazard,
      rows.risk_level,
      rows.current_controls,
      rows.improvement_plan,
      'other',
      rows.source_row_number::text,
      null,
      false,
      'pending',
      true,
      false,
      coalesce(rows.raw_payload, '{}'::jsonb),
      p_mapping_version,
      p_sheet_index,
      rows.source_row_number,
      rows.source_row_signature_sha256,
      p_import_actor
    from rows
    on conflict (
      company_code, source_id, mapping_version, sheet_index, source_row_number, source_row_signature_sha256
    )
    where mapping_version is not null
    do nothing
    returning 1
  )
  select count(*) into v_inserted from inserted;

  return query select v_inserted, (v_total - v_inserted);
end;
$$;

revoke all on function public.create_risk_share_candidates_from_source_mapping(
  text, uuid, integer, integer, text, jsonb
) from public;

revoke execute on function public.create_risk_share_candidates_from_source_mapping(
  text, uuid, integer, integer, text, jsonb
) from anon, authenticated;

grant execute on function public.create_risk_share_candidates_from_source_mapping(
  text, uuid, integer, integer, text, jsonb
) to service_role;
