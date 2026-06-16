create table if not exists public.risk_share_candidate_review_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  candidate_id uuid not null references public.risk_share_item_candidates(id) on delete cascade,
  source_id uuid references public.risk_share_sources(id) on delete set null,
  company_code text not null,
  company_name text,
  previous_status text,
  next_status text not null,
  reviewer_note text,
  actor_type text not null default 'owner',
  actor_label text,
  worker_visible boolean not null default false,
  customer_confirmed boolean not null default false,
  event_type text not null default 'status_change',
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.risk_share_candidate_review_events
  add column if not exists id uuid default gen_random_uuid();

alter table public.risk_share_candidate_review_events
  add column if not exists created_at timestamptz not null default now();

alter table public.risk_share_candidate_review_events
  add column if not exists candidate_id uuid;

alter table public.risk_share_candidate_review_events
  add column if not exists source_id uuid;

alter table public.risk_share_candidate_review_events
  add column if not exists company_code text;

alter table public.risk_share_candidate_review_events
  add column if not exists company_name text;

alter table public.risk_share_candidate_review_events
  add column if not exists previous_status text;

alter table public.risk_share_candidate_review_events
  add column if not exists next_status text;

alter table public.risk_share_candidate_review_events
  add column if not exists reviewer_note text;

alter table public.risk_share_candidate_review_events
  add column if not exists actor_type text not null default 'owner';

alter table public.risk_share_candidate_review_events
  add column if not exists actor_label text;

alter table public.risk_share_candidate_review_events
  add column if not exists worker_visible boolean not null default false;

alter table public.risk_share_candidate_review_events
  add column if not exists customer_confirmed boolean not null default false;

alter table public.risk_share_candidate_review_events
  add column if not exists event_type text not null default 'status_change';

alter table public.risk_share_candidate_review_events
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_candidate_review_events_next_status_check'
  ) then
    alter table public.risk_share_candidate_review_events
      add constraint risk_share_candidate_review_events_next_status_check
      check (next_status in ('pending', 'accepted', 'edited', 'excluded', 'needs_customer_check'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_candidate_review_events_previous_status_check'
  ) then
    alter table public.risk_share_candidate_review_events
      add constraint risk_share_candidate_review_events_previous_status_check
      check (
        previous_status is null
        or previous_status in ('pending', 'accepted', 'edited', 'excluded', 'needs_customer_check')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_candidate_review_events_actor_type_check'
  ) then
    alter table public.risk_share_candidate_review_events
      add constraint risk_share_candidate_review_events_actor_type_check
      check (actor_type in ('owner', 'system'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_candidate_review_events_event_type_check'
  ) then
    alter table public.risk_share_candidate_review_events
      add constraint risk_share_candidate_review_events_event_type_check
      check (event_type in ('status_change'));
  end if;
end $$;

alter table public.risk_share_candidate_review_events enable row level security;

create index if not exists risk_share_candidate_review_events_company_created_idx
  on public.risk_share_candidate_review_events (company_code, created_at desc);

create index if not exists risk_share_candidate_review_events_candidate_created_idx
  on public.risk_share_candidate_review_events (candidate_id, created_at desc);

create index if not exists risk_share_candidate_review_events_source_created_idx
  on public.risk_share_candidate_review_events (source_id, created_at desc);

create index if not exists risk_share_candidate_review_events_status_idx
  on public.risk_share_candidate_review_events (company_code, next_status, created_at desc);

comment on table public.risk_share_candidate_review_events is
  'Risk Share Pack candidate reviewer status audit events. Current state stays in risk_share_item_candidates.';

comment on column public.risk_share_candidate_review_events.raw_payload is
  'Internal minimal diagnostics only. Do not store tokens, service role keys, environment values, internal links, storage keys, or sensitive customer source text.';
