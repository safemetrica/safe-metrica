-- SafeMetrica risk_share_sources private storage metadata
--
-- Additive only: no table recreation, no destructive change, no backfill.
-- Adds columns needed to record private-Blob source uploads (Commercial Core P2).
-- Existing rows and their storage_access are not assumed or modified.

alter table public.risk_share_sources
  add column if not exists updated_at timestamptz not null default now();

alter table public.risk_share_sources
  add column if not exists file_pathname text;

alter table public.risk_share_sources
  add column if not exists file_checksum_sha256 text;

alter table public.risk_share_sources
  add column if not exists file_etag text;

alter table public.risk_share_sources
  add column if not exists storage_access text;

alter table public.risk_share_sources
  add column if not exists source_document_date date;

alter table public.risk_share_sources
  drop constraint if exists risk_share_sources_storage_access_check;

alter table public.risk_share_sources
  add constraint risk_share_sources_storage_access_check check (
    storage_access is null or storage_access in ('private', 'public', 'unknown')
  );

comment on column public.risk_share_sources.storage_access is
  'Access level of file_url at upload time: private, public, or unknown for rows predating this column. Not backfilled or inferred for existing rows.';

comment on column public.risk_share_sources.file_checksum_sha256 is
  'SHA-256 of the uploaded file content, used for duplicate detection only. Not a unique constraint.';

comment on column public.risk_share_sources.file_pathname is
  'Blob storage pathname for the uploaded file. Does not contain company name, email, or other customer-sensitive text.';

create index if not exists risk_share_sources_company_checksum_idx
  on public.risk_share_sources (company_code, file_checksum_sha256);

create index if not exists risk_share_sources_company_uploaded_at_idx
  on public.risk_share_sources (company_code, uploaded_at desc);
