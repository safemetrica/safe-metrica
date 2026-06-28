-- SafeMetrica tenant_membership v1
-- Membership ledger for future tenant-isolated SafeMetrica login.
-- This migration creates the table only. It does not connect auth session lookup,
-- user invite/email, tenant data query, or existing legacy customer routes.

create extension if not exists pgcrypto;

create table if not exists public.tenant_membership (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant_registry(id) on delete cascade,
  tenant_code text not null,
  user_id text,
  user_email text not null,
  display_name text,
  role text not null,
  status text not null default 'invited',
  invited_by text,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_membership_tenant_code_check check (
    tenant_code ~ '^[a-z0-9][a-z0-9-]{0,63}$'
  ),
  constraint tenant_membership_user_email_check check (
    length(trim(user_email)) > 3 and length(user_email) <= 320
  ),
  constraint tenant_membership_role_check check (
    role in (
      'owner_internal',
      'tenant_admin',
      'tenant_manager',
      'tenant_representative',
      'tenant_viewer'
    )
  ),
  constraint tenant_membership_status_check check (
    status in (
      'invited',
      'active',
      'suspended',
      'revoked'
    )
  ),
  constraint tenant_membership_raw_payload_object_check check (
    jsonb_typeof(raw_payload) = 'object'
  ),
  constraint tenant_membership_revoked_at_check check (
    (status = 'revoked' and revoked_at is not null)
    or (status <> 'revoked')
  )
);

create index if not exists tenant_membership_tenant_id_idx
  on public.tenant_membership (tenant_id);

create index if not exists tenant_membership_tenant_code_idx
  on public.tenant_membership (tenant_code);

create index if not exists tenant_membership_user_id_idx
  on public.tenant_membership (user_id)
  where user_id is not null;

create index if not exists tenant_membership_user_email_lower_idx
  on public.tenant_membership (lower(user_email));

create index if not exists tenant_membership_role_idx
  on public.tenant_membership (role);

create index if not exists tenant_membership_status_idx
  on public.tenant_membership (status);

create unique index if not exists tenant_membership_active_email_unique_idx
  on public.tenant_membership (tenant_code, lower(user_email))
  where status in ('invited', 'active', 'suspended');

alter table public.tenant_membership enable row level security;

comment on table public.tenant_membership is
  'Tenant membership ledger for future SafeMetrica tenant-isolated login. RLS is enabled. Client policies are intentionally not created in v1.';

comment on column public.tenant_membership.tenant_id is
  'References tenant_registry.id. Existing legacy customers are not forced into this table by this migration.';

comment on column public.tenant_membership.tenant_code is
  'Stable tenant code copied for fail-closed route checks. Do not store tokens here.';

comment on column public.tenant_membership.user_id is
  'Future auth user id. Nullable during invite/onboarding draft stage.';

comment on column public.tenant_membership.user_email is
  'Login email identifier for membership lookup. Do not store passwords or auth tokens.';

comment on column public.tenant_membership.role is
  'One of owner_internal, tenant_admin, tenant_manager, tenant_representative, tenant_viewer.';

comment on column public.tenant_membership.raw_payload is
  'Non-sensitive operational metadata only. Do not store API keys, service role values, Owner Token values, passwords, personal identifiers, worker confirmation numbers, signature originals, or customer sensitive source text.';
