-- SafeMetrica field_participation_submissions baseline
--
-- Captures the Production schema inspected on 2026-07-12.
-- Existing rows are not modified.
-- Client-facing roles intentionally receive no direct table access.
-- SafeMetrica writes and reads this table through server-only routes.

create extension if not exists pgcrypto;

create table if not exists public.field_participation_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_code text not null,
  company_name text,
  submission_type text not null,
  legacy_type text,
  title text,
  content text,
  location text,
  submitter text,
  anonymous boolean default false,
  reported_date date,
  status text,
  notion_page_id text,
  notion_url text,
  file_urls jsonb default '[]'::jsonb,
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_field_participation_tenant_created
  on public.field_participation_submissions
  using btree (tenant_code, created_at desc);

create index if not exists idx_field_participation_type_created
  on public.field_participation_submissions
  using btree (submission_type, created_at desc);

alter table public.field_participation_submissions
  enable row level security;

-- This table is server-only. Remove any dashboard/manual client policies
-- that may exist in an older environment.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'field_participation_submissions'
  loop
    execute format(
      'drop policy if exists %I on public.field_participation_submissions',
      policy_row.policyname
    );
  end loop;
end
$$;

revoke all privileges
on table public.field_participation_submissions
from anon, authenticated, public;

grant select, insert, update, delete
on table public.field_participation_submissions
to service_role;
