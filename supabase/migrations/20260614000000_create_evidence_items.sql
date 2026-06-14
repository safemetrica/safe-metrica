create extension if not exists pgcrypto;

create table if not exists public.evidence_items (
  evidence_id uuid primary key default gen_random_uuid(),
  company_code text not null,
  company_name text,
  site_id text,
  site_name text,
  source_type text not null,
  source_record_table text,
  source_record_id text,
  submission_type text,
  file_url text not null,
  file_name text,
  file_mime_type text,
  file_size bigint,
  evidence_role text,
  storage_provider text not null default 'vercel_blob',
  submitted_at timestamptz,
  submitted_by_label text,
  anonymous boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

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
  add column if not exists file_url text;

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

alter table public.evidence_items
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

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
    (coalesce(source_record_id, '')),
    file_url
  );

alter table public.evidence_items enable row level security;

comment on table public.evidence_items is
  'SafeMetrica evidence metadata ledger for photos and files. Raw files are stored in Blob/Storage; this table stores metadata and source linkage only.';

comment on column public.evidence_items.source_type is
  'Source flow such as field_participation, tbm_voice, contractor_submission, action, risk_assessment, or manual.';

comment on column public.evidence_items.source_record_id is
  'Source record reference such as Notion page id, Supabase row id, or client submission id.';

comment on column public.evidence_items.file_url is
  'Public or controlled storage URL. Do not store binary file content in this table.';
