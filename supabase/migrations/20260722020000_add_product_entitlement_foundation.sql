-- Commercial Core product entitlement foundation.
-- Separates tenant lifecycle from product access without changing existing
-- runtime authorization or backfilling Production customer rows.

create table if not exists public.tenant_product_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tenant_code text not null,
  product_code text not null,
  status text not null default 'pending',
  activation_source text not null,
  policy_version integer not null,
  effective_at timestamptz,
  expires_at timestamptz,
  suspended_at timestamptz,
  ended_at timestamptz,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tenant_product_entitlements_tenant_fk
    foreign key (tenant_id, tenant_code)
    references public.tenant_registry (id, company_code)
    on delete restrict,

  constraint tenant_product_entitlements_tenant_product_unique
    unique (tenant_id, product_code),

  constraint tenant_product_entitlements_product_check
    check (product_code in ('risk_share')),

  constraint tenant_product_entitlements_status_check
    check (status in ('pending', 'active', 'suspended', 'expired', 'terminated')),

  constraint tenant_product_entitlements_source_check
    check (activation_source in ('owner_console', 'contract', 'payment_webhook', 'partner', 'complimentary')),

  constraint tenant_product_entitlements_policy_check
    check (policy_version >= 1),

  constraint tenant_product_entitlements_external_reference_check
    check (external_reference is null or length(btrim(external_reference)) between 1 and 200),

  constraint tenant_product_entitlements_time_order_check
    check (expires_at is null or effective_at is null or expires_at > effective_at),

  constraint tenant_product_entitlements_active_effective_check
    check (status <> 'active' or effective_at is not null)
);

create index if not exists tenant_product_entitlements_access_idx
  on public.tenant_product_entitlements (tenant_code, product_code, status);

create index if not exists tenant_product_entitlements_expiry_idx
  on public.tenant_product_entitlements (status, expires_at)
  where expires_at is not null;

alter table public.tenant_product_entitlements enable row level security;

revoke all privileges
  on table public.tenant_product_entitlements
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.tenant_product_entitlements
  to service_role;

comment on table public.tenant_product_entitlements is
  'Current provider-neutral product access state. Runtime cutover requires a separately verified migration and legacy-safe rollout.';

create table if not exists public.tenant_product_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null,
  tenant_id uuid not null,
  tenant_code text not null,
  product_code text not null,
  from_status text,
  to_status text not null,
  activation_source text not null,
  policy_version integer not null,
  actor_type text not null,
  idempotency_key text not null,
  request_digest text not null,
  created_at timestamptz not null default now(),

  constraint tenant_product_entitlement_events_entitlement_fk
    foreign key (entitlement_id)
    references public.tenant_product_entitlements (id)
    on delete restrict,

  constraint tenant_product_entitlement_events_tenant_fk
    foreign key (tenant_id, tenant_code)
    references public.tenant_registry (id, company_code)
    on delete restrict,

  constraint tenant_product_entitlement_events_product_check
    check (product_code in ('risk_share')),

  constraint tenant_product_entitlement_events_from_status_check
    check (from_status is null or from_status in ('pending', 'active', 'suspended', 'expired', 'terminated')),

  constraint tenant_product_entitlement_events_to_status_check
    check (to_status in ('pending', 'active', 'suspended', 'expired', 'terminated')),

  constraint tenant_product_entitlement_events_source_check
    check (activation_source in ('owner_console', 'contract', 'payment_webhook', 'partner', 'complimentary')),

  constraint tenant_product_entitlement_events_policy_check
    check (policy_version >= 1),

  constraint tenant_product_entitlement_events_actor_check
    check (actor_type in ('owner_console', 'system_webhook')),

  constraint tenant_product_entitlement_events_idempotency_check
    check (length(btrim(idempotency_key)) between 1 and 200),

  constraint tenant_product_entitlement_events_digest_check
    check (request_digest ~ '^[0-9a-f]{64}$')
);

create unique index if not exists tenant_product_entitlement_events_idempotency_uidx
  on public.tenant_product_entitlement_events (tenant_code, product_code, idempotency_key);

create index if not exists tenant_product_entitlement_events_history_idx
  on public.tenant_product_entitlement_events (tenant_code, product_code, created_at desc);

alter table public.tenant_product_entitlement_events enable row level security;

revoke all privileges
  on table public.tenant_product_entitlement_events
  from public, anon, authenticated, service_role;

grant select, insert
  on table public.tenant_product_entitlement_events
  to service_role;

comment on table public.tenant_product_entitlement_events is
  'Append-only entitlement transition audit. No update/delete grant; exact replay is keyed by tenant, product, and idempotency key.';

-- Intentionally no backfill, trigger, activation RPC replacement, or runtime
-- authorization switch in this migration. Those require Production inventory,
-- legacy regression evidence, and an explicit migration Gate.
