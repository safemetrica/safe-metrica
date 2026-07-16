-- SafeMetrica risk_share_item_review_events: restrict service_role to least privilege
--
-- 20260716010000_add_risk_share_item_review_contract.sql revoked default
-- table privileges from public/anon/authenticated but never revoked
-- service_role's own default privileges first, so service_role kept
-- UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on risk_share_item_review_events
-- even though this table has no update/delete feature -- audit rows are
-- write-once from review_risk_share_item's perspective and must not be
-- editable after the fact, even by service_role via a direct REST call.
-- Production SQL QA after the PR #899 migration confirmed this exact gap:
-- service_role_select/insert = true (expected), service_role_update/delete
-- = true (expected false).
--
-- Same root cause and same fix shape as
-- 20260715070000_lock_tenant_sites_service_role_privileges.sql: the prior
-- migration's `revoke all privileges ... from public, anon, authenticated`
-- never named service_role, so it left service_role's pre-existing broader
-- privileges untouched -- the later `grant select, insert to service_role`
-- only ever adds, it does not first clear what service_role already had.
--
-- 20260716010000_add_risk_share_item_review_contract.sql is not modified:
-- it is already merged and applied to Production. This is a new, additive,
-- idempotent corrective migration. No RLS change, no function change, no
-- row change.
--
-- Idempotent: revoke all + grant the exact target set can be re-run safely
-- and always converges on the same privileges.

revoke all privileges
  on table public.risk_share_item_review_events
  from public, anon, authenticated, service_role;

grant select, insert
  on table public.risk_share_item_review_events
  to service_role;
