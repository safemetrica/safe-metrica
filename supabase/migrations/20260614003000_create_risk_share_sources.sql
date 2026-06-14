create table if not exists public.risk_share_sources (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_code text not null,
  company_name text,
  site_name text,
  source_title text not null,
  source_type text not null default 'risk_assessment_pdf',
  file_url text not null,
  file_name text,
  file_mime_type text,
  file_size bigint,
  storage_provider text not null default 'vercel_blob',
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  raw_text_status text not null default 'pending',
  extraction_status text not null default 'pending',
  review_status text not null default 'pending',
  source_note text
);

alter table public.risk_share_sources
  add column if not exists created_at timestamptz not null default now();

alter table public.risk_share_sources
  add column if not exists company_code text;

alter table public.risk_share_sources
  add column if not exists company_name text;

alter table public.risk_share_sources
  add column if not exists site_name text;

alter table public.risk_share_sources
  add column if not exists source_title text;

alter table public.risk_share_sources
  add column if not exists source_type text not null default 'risk_assessment_pdf';

alter table public.risk_share_sources
  add column if not exists file_url text;

alter table public.risk_share_sources
  add column if not exists file_name text;

alter table public.risk_share_sources
  add column if not exists file_mime_type text;

alter table public.risk_share_sources
  add column if not exists file_size bigint;

alter table public.risk_share_sources
  add column if not exists storage_provider text not null default 'vercel_blob';

alter table public.risk_share_sources
  add column if not exists uploaded_by text;

alter table public.risk_share_sources
  add column if not exists uploaded_at timestamptz not null default now();

alter table public.risk_share_sources
  add column if not exists raw_text_status text not null default 'pending';

alter table public.risk_share_sources
  add column if not exists extraction_status text not null default 'pending';

alter table public.risk_share_sources
  add column if not exists review_status text not null default 'pending';

alter table public.risk_share_sources
  add column if not exists source_note text;

alter table public.risk_share_sources enable row level security;

create index if not exists risk_share_sources_company_created_at_idx
  on public.risk_share_sources (company_code, created_at desc);

create index if not exists risk_share_sources_status_idx
  on public.risk_share_sources (company_code, extraction_status, review_status);

create unique index if not exists risk_share_sources_company_file_uidx
  on public.risk_share_sources (company_code, file_url);

comment on table public.risk_share_sources is
  'Risk Share Pack customer source files for AI intake and extraction workflow.';

comment on column public.risk_share_sources.file_url is
  'Source original file URL stored in Blob or Storage. Do not store raw customer source files in GitHub.';
