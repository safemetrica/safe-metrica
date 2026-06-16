create table if not exists public.risk_share_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_id uuid not null references public.risk_share_sources(id) on delete restrict,
  candidate_id uuid not null references public.risk_share_item_candidates(id) on delete restrict,
  company_code text not null,
  company_name text,
  site_name text,
  task_name text not null,
  hazard text not null,
  accident_type text,
  risk_level text,
  current_controls text,
  improvement_plan text,
  worker_share_summary text,
  category text not null default 'other',
  share_status text not null default 'draft',
  customer_check_status text not null default 'not_requested',
  customer_confirmed boolean not null default false,
  worker_visible boolean not null default false,
  version_lock_id uuid,
  source_page integer,
  source_row text,
  owner_note text,
  customer_note text,
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.risk_share_items
  add column if not exists id uuid default gen_random_uuid();

alter table public.risk_share_items
  add column if not exists created_at timestamptz not null default now();

alter table public.risk_share_items
  add column if not exists updated_at timestamptz not null default now();

alter table public.risk_share_items
  add column if not exists source_id uuid;

alter table public.risk_share_items
  add column if not exists candidate_id uuid;

alter table public.risk_share_items
  add column if not exists company_code text;

alter table public.risk_share_items
  add column if not exists company_name text;

alter table public.risk_share_items
  add column if not exists site_name text;

alter table public.risk_share_items
  add column if not exists task_name text;

alter table public.risk_share_items
  add column if not exists hazard text;

alter table public.risk_share_items
  add column if not exists accident_type text;

alter table public.risk_share_items
  add column if not exists risk_level text;

alter table public.risk_share_items
  add column if not exists current_controls text;

alter table public.risk_share_items
  add column if not exists improvement_plan text;

alter table public.risk_share_items
  add column if not exists worker_share_summary text;

alter table public.risk_share_items
  add column if not exists category text not null default 'other';

alter table public.risk_share_items
  add column if not exists share_status text not null default 'draft';

alter table public.risk_share_items
  add column if not exists customer_check_status text not null default 'not_requested';

alter table public.risk_share_items
  add column if not exists customer_confirmed boolean not null default false;

alter table public.risk_share_items
  add column if not exists worker_visible boolean not null default false;

alter table public.risk_share_items
  add column if not exists version_lock_id uuid;

alter table public.risk_share_items
  add column if not exists source_page integer;

alter table public.risk_share_items
  add column if not exists source_row text;

alter table public.risk_share_items
  add column if not exists owner_note text;

alter table public.risk_share_items
  add column if not exists customer_note text;

alter table public.risk_share_items
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_items_candidate_unique'
  ) then
    alter table public.risk_share_items
      add constraint risk_share_items_candidate_unique unique (candidate_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_items_category_check'
  ) then
    alter table public.risk_share_items
      add constraint risk_share_items_category_check
      check (category in ('common', 'non_common', 'site_specific', 'worker_signal', 'other'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_items_share_status_check'
  ) then
    alter table public.risk_share_items
      add constraint risk_share_items_share_status_check
      check (share_status in ('draft', 'needs_customer_check', 'customer_confirmed', 'locked', 'excluded'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_items_customer_check_status_check'
  ) then
    alter table public.risk_share_items
      add constraint risk_share_items_customer_check_status_check
      check (customer_check_status in ('not_requested', 'requested', 'confirmed', 'returned'));
  end if;
end $$;

alter table public.risk_share_items enable row level security;

create index if not exists risk_share_items_company_status_created_idx
  on public.risk_share_items (company_code, share_status, created_at desc);

create index if not exists risk_share_items_company_customer_status_idx
  on public.risk_share_items (company_code, customer_check_status, created_at desc);

create index if not exists risk_share_items_source_created_idx
  on public.risk_share_items (source_id, created_at desc);

create index if not exists risk_share_items_candidate_idx
  on public.risk_share_items (candidate_id);

create index if not exists risk_share_items_worker_visibility_idx
  on public.risk_share_items (company_code, worker_visible, customer_confirmed, share_status);

comment on table public.risk_share_items is
  'Risk Share Pack share preparation items. Candidate accepted status is not worker-visible final content until customer confirmation and Version Lock.';

comment on column public.risk_share_items.version_lock_id is
  'Version Lock reference placeholder. Worker QR should rely on locked share items only.';

comment on column public.risk_share_items.raw_payload is
  'Internal minimal diagnostics only. Do not store tokens, service role keys, environment values, internal links, storage keys, or sensitive customer source text.';
