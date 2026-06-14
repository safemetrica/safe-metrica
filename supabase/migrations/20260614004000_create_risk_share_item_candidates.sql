create table if not exists public.risk_share_item_candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_id uuid not null references public.risk_share_sources(id) on delete cascade,
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
  source_page integer,
  source_row text,
  confidence numeric(5,4),
  ai_generated boolean not null default true,
  reviewer_status text not null default 'pending',
  reviewer_note text,
  worker_visible boolean not null default true,
  customer_confirmed boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.risk_share_item_candidates
  add column if not exists created_at timestamptz not null default now();

alter table public.risk_share_item_candidates
  add column if not exists source_id uuid;

alter table public.risk_share_item_candidates
  add column if not exists company_code text;

alter table public.risk_share_item_candidates
  add column if not exists company_name text;

alter table public.risk_share_item_candidates
  add column if not exists site_name text;

alter table public.risk_share_item_candidates
  add column if not exists task_name text;

alter table public.risk_share_item_candidates
  add column if not exists hazard text;

alter table public.risk_share_item_candidates
  add column if not exists accident_type text;

alter table public.risk_share_item_candidates
  add column if not exists risk_level text;

alter table public.risk_share_item_candidates
  add column if not exists current_controls text;

alter table public.risk_share_item_candidates
  add column if not exists improvement_plan text;

alter table public.risk_share_item_candidates
  add column if not exists worker_share_summary text;

alter table public.risk_share_item_candidates
  add column if not exists category text not null default 'other';

alter table public.risk_share_item_candidates
  add column if not exists source_page integer;

alter table public.risk_share_item_candidates
  add column if not exists source_row text;

alter table public.risk_share_item_candidates
  add column if not exists confidence numeric(5,4);

alter table public.risk_share_item_candidates
  add column if not exists ai_generated boolean not null default true;

alter table public.risk_share_item_candidates
  add column if not exists reviewer_status text not null default 'pending';

alter table public.risk_share_item_candidates
  add column if not exists reviewer_note text;

alter table public.risk_share_item_candidates
  add column if not exists worker_visible boolean not null default true;

alter table public.risk_share_item_candidates
  add column if not exists customer_confirmed boolean not null default false;

alter table public.risk_share_item_candidates
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'risk_share_item_candidates_category_check'
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_category_check
      check (category in ('common', 'non_common', 'site_specific', 'worker_signal', 'other'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'risk_share_item_candidates_reviewer_status_check'
  ) then
    alter table public.risk_share_item_candidates
      add constraint risk_share_item_candidates_reviewer_status_check
      check (reviewer_status in ('pending', 'accepted', 'edited', 'excluded', 'needs_customer_check'));
  end if;
end $$;

alter table public.risk_share_item_candidates enable row level security;

create index if not exists risk_share_item_candidates_company_created_at_idx
  on public.risk_share_item_candidates (company_code, created_at desc);

create index if not exists risk_share_item_candidates_source_idx
  on public.risk_share_item_candidates (source_id, created_at desc);

create index if not exists risk_share_item_candidates_review_status_idx
  on public.risk_share_item_candidates (company_code, reviewer_status, created_at desc);

create index if not exists risk_share_item_candidates_category_idx
  on public.risk_share_item_candidates (company_code, category, created_at desc);

create index if not exists risk_share_item_candidates_customer_confirmed_idx
  on public.risk_share_item_candidates (company_code, customer_confirmed, worker_visible);

comment on table public.risk_share_item_candidates is
  'AI-extracted Risk Share Pack candidate items from customer source files. Candidates require operator review and customer confirmation before version lock.';

comment on column public.risk_share_item_candidates.raw_payload is
  'Internal AI extraction payload. Do not expose to worker-facing screens or customer exports by default.';
