-- Distinguish time-boxed internal test access from contract, partner, and
-- complimentary product access. Existing rows and runtime authorization are
-- unchanged; this migration only widens the allowed source vocabulary and
-- requires test entitlements to be explicitly identifiable and expiring.

alter table public.tenant_product_entitlements
  drop constraint tenant_product_entitlements_source_check;

alter table public.tenant_product_entitlements
  add constraint tenant_product_entitlements_source_check
  check (activation_source in (
    'owner_console',
    'contract',
    'payment_webhook',
    'partner',
    'complimentary',
    'internal_test'
  ));

alter table public.tenant_product_entitlements
  add constraint tenant_product_entitlements_internal_test_check
  check (
    activation_source <> 'internal_test'
    or (
      expires_at is not null
      and external_reference is not null
      and external_reference like 'internal-test:%'
    )
  );

alter table public.tenant_product_entitlement_events
  drop constraint tenant_product_entitlement_events_source_check;

alter table public.tenant_product_entitlement_events
  add constraint tenant_product_entitlement_events_source_check
  check (activation_source in (
    'owner_console',
    'contract',
    'payment_webhook',
    'partner',
    'complimentary',
    'internal_test'
  ));

-- Intentionally no entitlement insert, event insert, backfill, runtime
-- authorization switch, or customer-data mutation.
