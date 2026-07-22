-- Corrective integrity hardening for the product entitlement foundation.
-- Every audit event must identify the same entitlement, tenant, and product.

alter table public.tenant_product_entitlements
  add constraint tenant_product_entitlements_event_identity_unique
  unique (id, tenant_id, tenant_code, product_code);

alter table public.tenant_product_entitlement_events
  drop constraint tenant_product_entitlement_events_entitlement_fk;

alter table public.tenant_product_entitlement_events
  add constraint tenant_product_entitlement_events_identity_fk
  foreign key (entitlement_id, tenant_id, tenant_code, product_code)
  references public.tenant_product_entitlements (id, tenant_id, tenant_code, product_code)
  on delete restrict;

-- Intentionally no backfill, tenant mutation, runtime authorization switch,
-- entitlement state transition, or customer-row mutation.
