-- SafeMetrica tenant_registry: lock direct table access
--
-- tenant_registry is a server-only registry. Public QR flows and customer
-- manager sessions never query this table directly -- all access goes
-- through server guards (requireTenantAccessForCurrentSession,
-- requireTenantManagerAccessForCurrentSession, resolveActiveRiskSharePublicTenant,
-- getTenantRegistryConfigByCode) that call Supabase using the service role
-- key from server-only code. This migration was missing from the original
-- 20260618123328_create_tenant_registry.sql: the table was created without
-- enabling row level security or revoking default table privileges.
--
-- This migration does not create any anon/authenticated policy: the table
-- stays policy-free and server-only, matching field_participation_submissions
-- and risk_share_source_column_mappings. Service role key values are never
-- recorded in code or migrations.

alter table public.tenant_registry
  enable row level security;

revoke all privileges
  on table public.tenant_registry
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.tenant_registry
  to service_role;
