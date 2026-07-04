-- SafeMetrica tenant_membership v2
-- Hardens tenant_code integrity against tenant_registry for risk-share
-- manager/monthly session access. tenant_membership.tenant_id already
-- references tenant_registry.id, but tenant_code was only a denormalized
-- copy with a format check, so a row could in theory carry a tenant_id
-- and tenant_code that point at two different tenant_registry rows. This
-- adds a composite foreign key so tenant_id and tenant_code must always
-- resolve to the same tenant_registry row.
--
-- This migration only adds constraints. It does not seed, invite, or
-- insert any membership rows, and it does not touch auth.users,
-- auth.sessions, or public.profiles.

alter table public.tenant_registry
  add constraint tenant_registry_id_company_code_unique unique (id, company_code);

alter table public.tenant_membership
  add constraint tenant_membership_tenant_id_code_fk
  foreign key (tenant_id, tenant_code)
  references public.tenant_registry (id, company_code)
  on delete cascade;
