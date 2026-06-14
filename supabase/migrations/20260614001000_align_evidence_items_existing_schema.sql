create extension if not exists pgcrypto;

alter table public.evidence_items
  add column if not exists evidence_id uuid default gen_random_uuid();

alter table public.evidence_items
  add column if not exists company_code text;

alter table public.evidence_items
  add column if not exists company_name text;

alter table public.evidence_items
  add column if not exists site_id text;

alter table public.evidence_items
  add column if not exists site_name text;

alter table public.evidence_items
  add column if not exists source_type text;

alter table public.evidence_items
  add column if not exists source_record_table text;

alter table public.evidence_items
  add column if not exists source_record_id text;

alter table public.evidence_items
  add column if not exists submission_type text;

alter table public.evidence_items
  add column if not exists file_name text;

alter table public.evidence_items
  add column if not exists file_mime_type text;

alter table public.evidence_items
  add column if not exists file_size bigint;

alter table public.evidence_items
  add column if not exists evidence_role text;

alter table public.evidence_items
  add column if not exists storage_provider text not null default 'vercel_blob';

alter table public.evidence_items
  add column if not exists submitted_at timestamptz;

alter table public.evidence_items
  add column if not exists submitted_by_label text;

alter table public.evidence_items
  add column if not exists anonymous boolean not null default false;

alter table public.evidence_items
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evidence_items'
      and column_name = 'action_id'
  ) then
    alter table public.evidence_items
      alter column action_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evidence_items'
      and column_name = 'evidence_type_code'
  ) then
    alter table public.evidence_items
      alter column evidence_type_code set default 'file_evidence';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evidence_items'
      and column_name = 'verified'
  ) then
    alter table public.evidence_items
      alter column verified set default false;
  end if;
end $$;

create index if not exists evidence_items_company_created_at_idx
  on public.evidence_items (company_code, created_at desc);

create index if not exists evidence_items_source_record_idx
  on public.evidence_items (source_type, source_record_table, source_record_id);

create index if not exists evidence_items_file_url_idx
  on public.evidence_items (file_url);

create unique index if not exists evidence_items_company_source_file_uidx
  on public.evidence_items (
    company_code,
    source_type,
    coalesce(source_record_id, ''),
    file_url
  );

alter table public.evidence_items enable row level security;

comment on table public.evidence_items is
  'SafeMetrica evidence metadata ledger. Existing action evidence rows are preserved; field participation and TBM file metadata can be added without storing binary file content.';
