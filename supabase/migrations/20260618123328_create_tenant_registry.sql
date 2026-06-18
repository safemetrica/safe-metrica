-- SafeMetrica tenant_registry v1
-- Supabase-first tenant source for new trial tenants.
-- Existing legacy tenants may continue through the Notion Companies DB bridge during transition.

create extension if not exists pgcrypto;

create table if not exists public.tenant_registry (
  id uuid primary key default gen_random_uuid(),
  company_code text not null,
  company_name text not null,
  status text not null default 'onboarding',
  service_mode text not null,
  enabled_modules jsonb not null default '[]'::jsonb,
  plan_type text,
  trial_start_date date,
  trial_end_date date,
  default_site_id uuid,
  default_site_name text,
  owner_notes text,
  source_channel text,
  contact_label text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_registry_company_code_unique unique (company_code),
  constraint tenant_registry_status_check check (
    status in (
      'onboarding',
      'active',
      'paused',
      'offboarding',
      'archived',
      'internal_test'
    )
  ),
  constraint tenant_registry_service_mode_check check (
    service_mode in (
      'risk_share_pack',
      'full_safemetrica',
      'food_factory_e_confirmation_trial',
      'hoist_work_order_trial',
      'partner_demo',
      'internal_test'
    )
  ),
  constraint tenant_registry_enabled_modules_array_check check (jsonb_typeof(enabled_modules) = 'array'),
  constraint tenant_registry_raw_payload_object_check check (jsonb_typeof(raw_payload) = 'object')
);

create index if not exists tenant_registry_company_code_idx
  on public.tenant_registry (company_code);

create index if not exists tenant_registry_status_idx
  on public.tenant_registry (status);

create index if not exists tenant_registry_service_mode_idx
  on public.tenant_registry (service_mode);

create index if not exists tenant_registry_enabled_modules_gin_idx
  on public.tenant_registry using gin (enabled_modules);

comment on table public.tenant_registry is 'Supabase-first tenant registry for new SafeMetrica trial and production tenants.';
comment on column public.tenant_registry.company_code is 'Stable tenant code such as richi or hyundai-hoist. Do not store tokens here.';
comment on column public.tenant_registry.enabled_modules is 'Array of enabled module keys. Example: ["worker_qr_e_confirmation", "quick_feedback"].';
comment on column public.tenant_registry.raw_payload is 'Non-sensitive operational metadata only. Do not store API keys, tokens, service role values, or customer personal data.';
