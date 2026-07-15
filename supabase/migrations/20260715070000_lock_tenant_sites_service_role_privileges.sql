-- SafeMetrica tenant_sites: restrict service_role to least privilege
--
-- 20260715010000_create_tenant_sites.sql revoked default table privileges
-- from public/anon/authenticated but never revoked service_role's own
-- default privileges first, so a freshly created or rebuilt database can
-- leave service_role with DELETE, TRUNCATE, REFERENCES and TRIGGER on
-- tenant_sites even though this table has no row-delete feature (the Owner
-- screen only ever sets status='archived'). This migration reproduces, as a
-- migration, the least-privilege grant set already applied by hand in
-- Production: service_role keeps SELECT/INSERT/UPDATE only.
--
-- Idempotent: revoke all + grant the exact target set can be re-run safely
-- and always converges on the same privileges.

revoke all privileges
  on table public.tenant_sites
  from public, anon, authenticated, service_role;

grant select, insert, update
  on table public.tenant_sites
  to service_role;
