-- READ-ONLY B2 inventory. This file must never mutate Production data.
-- It identifies the entitlement state of active Commercial Core tenants but
-- deliberately does not infer a commercial basis or approve backfill.

with active_commercial_tenants as (
  select
    tr.id as tenant_id,
    tr.company_code as tenant_code,
    tr.service_mode,
    tr.source_channel,
    tr.status as tenant_status
  from public.tenant_registry tr
  where tr.status = 'active'
    and tr.service_mode in ('risk_share_pack', 'full_safemetrica')
),
current_entitlements as (
  select
    e.id as entitlement_id,
    e.tenant_id,
    e.tenant_code,
    e.status as entitlement_status,
    e.activation_source,
    e.policy_version,
    e.effective_at,
    e.expires_at,
    e.external_reference
  from public.tenant_product_entitlements e
  where e.product_code = 'risk_share'
),
classified as (
  select
    t.tenant_id,
    t.tenant_code,
    t.service_mode,
    t.source_channel,
    t.tenant_status,
    e.entitlement_id,
    e.entitlement_status,
    e.activation_source,
    e.policy_version,
    e.effective_at,
    e.expires_at,
    e.external_reference,
    case
      when e.entitlement_id is null then 'hold_missing_approval_evidence'
      when e.tenant_code <> t.tenant_code then 'conflict_tenant_identity'
      when e.entitlement_status = 'active'
        and e.effective_at <= now()
        and (e.expires_at is null or e.expires_at > now())
        then 'already_covered'
      when e.entitlement_status in ('suspended', 'expired', 'terminated')
        then 'hold_inactive_entitlement'
      else 'hold_entitlement_review'
    end as inventory_class
  from active_commercial_tenants t
  left join current_entitlements e on e.tenant_id = t.tenant_id
)
select
  tenant_id,
  tenant_code,
  service_mode,
  source_channel,
  tenant_status,
  entitlement_id,
  entitlement_status,
  activation_source,
  policy_version,
  effective_at,
  expires_at,
  external_reference,
  inventory_class
from classified
order by inventory_class, tenant_code;
