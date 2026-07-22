-- Corrective integrity hardening for the product entitlement foundation.
-- Every audit event must identify the same entitlement, tenant, and product.
--
-- This migration intentionally remains idempotent. Production received this
-- hardening before the duplicate 20260722030000 repository version was found;
-- a later migration version must therefore be a no-op there while still
-- applying the complete contract in a fresh database.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_product_entitlements_event_identity_unique'
      and conrelid = 'public.tenant_product_entitlements'::regclass
  ) then
    alter table public.tenant_product_entitlements
      add constraint tenant_product_entitlements_event_identity_unique
      unique (id, tenant_id, tenant_code, product_code);
  end if;
end $$;

alter table public.tenant_product_entitlement_events
  drop constraint if exists tenant_product_entitlement_events_entitlement_fk;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_product_entitlement_events_identity_fk'
      and conrelid = 'public.tenant_product_entitlement_events'::regclass
  ) then
    alter table public.tenant_product_entitlement_events
      add constraint tenant_product_entitlement_events_identity_fk
      foreign key (entitlement_id, tenant_id, tenant_code, product_code)
      references public.tenant_product_entitlements (id, tenant_id, tenant_code, product_code)
      on delete restrict;
  end if;
end $$;

-- Intentionally no backfill, tenant mutation, runtime authorization switch,
-- entitlement state transition, or customer-row mutation.
