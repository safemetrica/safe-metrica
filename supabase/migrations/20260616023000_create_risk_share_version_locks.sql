create table if not exists public.risk_share_version_locks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_code text not null,
  company_name text,
  site_name text,
  source_title text,
  lock_title text not null,
  lock_month text not null,
  item_count integer not null default 0,
  customer_confirmed_count integer not null default 0,
  worker_visible_count integer not null default 0,
  lock_status text not null default 'active',
  locked_by text,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.risk_share_version_locks
  add column if not exists id uuid default gen_random_uuid();

alter table public.risk_share_version_locks
  add column if not exists created_at timestamptz not null default now();

alter table public.risk_share_version_locks
  add column if not exists company_code text;

alter table public.risk_share_version_locks
  add column if not exists company_name text;

alter table public.risk_share_version_locks
  add column if not exists site_name text;

alter table public.risk_share_version_locks
  add column if not exists source_title text;

alter table public.risk_share_version_locks
  add column if not exists lock_title text;

alter table public.risk_share_version_locks
  add column if not exists lock_month text;

alter table public.risk_share_version_locks
  add column if not exists item_count integer not null default 0;

alter table public.risk_share_version_locks
  add column if not exists customer_confirmed_count integer not null default 0;

alter table public.risk_share_version_locks
  add column if not exists worker_visible_count integer not null default 0;

alter table public.risk_share_version_locks
  add column if not exists lock_status text not null default 'active';

alter table public.risk_share_version_locks
  add column if not exists locked_by text;

alter table public.risk_share_version_locks
  add column if not exists notes text;

alter table public.risk_share_version_locks
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.risk_share_items
  add column if not exists version_lock_id uuid;

alter table public.risk_share_items
  add column if not exists version_locked_at timestamptz;

alter table public.risk_share_items
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_lock_status_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_lock_status_check
      check (lock_status in ('active', 'superseded', 'revoked'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_item_count_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_item_count_check
      check (item_count >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_customer_confirmed_count_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_customer_confirmed_count_check
      check (customer_confirmed_count >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_version_locks_worker_visible_count_check'
  ) then
    alter table public.risk_share_version_locks
      add constraint risk_share_version_locks_worker_visible_count_check
      check (worker_visible_count >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_items_version_lock_id_fkey'
  ) then
    alter table public.risk_share_items
      add constraint risk_share_items_version_lock_id_fkey
      foreign key (version_lock_id)
      references public.risk_share_version_locks(id)
      on delete set null;
  end if;
end $$;

alter table public.risk_share_version_locks enable row level security;

create index if not exists risk_share_version_locks_company_created_idx
  on public.risk_share_version_locks (company_code, created_at desc);

create index if not exists risk_share_version_locks_company_month_idx
  on public.risk_share_version_locks (company_code, lock_month, created_at desc);

create index if not exists risk_share_version_locks_status_idx
  on public.risk_share_version_locks (company_code, lock_status, created_at desc);

create index if not exists risk_share_items_version_lock_idx
  on public.risk_share_items (version_lock_id);

create index if not exists risk_share_items_locked_exposure_idx
  on public.risk_share_items (company_code, share_status, customer_confirmed, worker_visible, version_lock_id);

comment on table public.risk_share_version_locks is
  'Risk Share Pack Version Lock ledger. Locks customer-confirmed share items into a worker QR and monthly cabinet basis.';

comment on column public.risk_share_version_locks.raw_payload is
  'Internal diagnostics only. Do not store tokens, service role keys, environment values, Owner links, API links, or sensitive customer source text.';

comment on column public.risk_share_items.version_lock_id is
  'References risk_share_version_locks after the share item is locked. customer_confirmed alone is not worker QR exposure.';

comment on column public.risk_share_items.version_locked_at is
  'Timestamp when the share item was attached to a Version Lock.';
