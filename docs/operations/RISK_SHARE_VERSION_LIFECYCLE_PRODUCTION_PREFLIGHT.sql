-- SafeMetrica Risk Share Version lifecycle Production preflight
-- SELECT-only, count-only. Does not print tenant codes, customer content,
-- worker identity, signatures, raw_payload, credentials, or source text.
-- Do not remove READ ONLY. Do not convert this file into a migration.

begin transaction read only;
set local statement_timeout = '15s';

-- A. Current-version multiplicity and fallback risk.
with active_by_tenant as (
  select company_code, count(*)::bigint as active_count
  from public.risk_share_version_locks
  where lock_status = 'active'
  group by company_code
),
active_by_tenant_month as (
  select company_code, lock_month, count(*)::bigint as active_count
  from public.risk_share_version_locks
  where lock_status = 'active'
  group by company_code, lock_month
)
select
  (select count(*)::bigint from public.risk_share_version_locks where lock_status = 'active')
    as active_version_count,
  (select count(*)::bigint from active_by_tenant where active_count > 1)
    as tenants_with_multiple_active_versions,
  (select count(*)::bigint from active_by_tenant_month where active_count > 1)
    as tenant_months_with_duplicate_active_versions,
  (select coalesce(max(active_count), 0)::bigint from active_by_tenant)
    as maximum_active_versions_for_one_tenant;

-- B. Site identity readiness without exposing site names.
select
  count(*) filter (where site_name is null or btrim(site_name) = '')::bigint
    as versions_without_site_name,
  count(*)::bigint as total_versions,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'risk_share_version_locks'
      and column_name = 'site_id'
  ) as version_lock_has_site_id
from public.risk_share_version_locks;

-- C. Immutable snapshot count drift.
with snapshot_counts as (
  select
    vl.id,
    vl.item_count,
    vl.worker_visible_count,
    count(vi.id)::bigint as actual_item_count,
    count(vi.id) filter (where vi.worker_visible = true)::bigint
      as actual_worker_visible_count
  from public.risk_share_version_locks vl
  left join public.risk_share_version_items vi
    on vi.version_lock_id = vl.id
   and vi.company_code = vl.company_code
  group by vl.id, vl.item_count, vl.worker_visible_count
)
select
  count(*) filter (
    where item_count::bigint <> actual_item_count
       or worker_visible_count::bigint <> actual_worker_visible_count
  )::bigint as version_snapshot_count_drift,
  count(*)::bigint as checked_version_count
from snapshot_counts;

-- D. Tenant lineage drift. Composite FKs should keep all values at zero.
select
  count(*) filter (
    where vl.previous_version_id is not null
      and not exists (
        select 1 from public.risk_share_version_locks previous
        where previous.id = vl.previous_version_id
          and previous.company_code = vl.company_code
      )
  )::bigint as previous_version_tenant_drift,
  count(*) filter (
    where vl.content_source_version_id is not null
      and not exists (
        select 1 from public.risk_share_version_locks source
        where source.id = vl.content_source_version_id
          and source.company_code = vl.company_code
      )
  )::bigint as content_source_tenant_drift,
  count(*) filter (
    where vl.actor_membership_id is not null
      and not exists (
        select 1 from public.tenant_membership membership
        where membership.id = vl.actor_membership_id
          and membership.tenant_code = vl.company_code
      )
  )::bigint as actor_membership_tenant_drift
from public.risk_share_version_locks vl;

select
  count(*) filter (
    where not exists (
      select 1 from public.risk_share_version_locks vl
      where vl.id = vi.version_lock_id
        and vl.company_code = vi.company_code
    )
  )::bigint as snapshot_version_tenant_drift,
  count(*) filter (
    where not exists (
      select 1 from public.risk_share_items item
      where item.id = vi.source_item_id
        and item.company_code = vi.company_code
    )
  )::bigint as snapshot_source_item_tenant_drift
from public.risk_share_version_items vi;

-- E. Confirmation linkage. Counts only; no worker row is returned.
select
  count(*) filter (where version_lock_id is not null)::bigint
    as version_linked_confirmation_count,
  count(*) filter (where version_lock_id is null)::bigint
    as legacy_or_non_version_confirmation_count,
  count(distinct version_lock_id) filter (where version_lock_id is not null)::bigint
    as confirmed_version_count,
  count(*) filter (
    where version_lock_id is not null
      and not exists (
        select 1 from public.risk_share_version_locks vl
        where vl.id = field_participation_submissions.version_lock_id
          and vl.company_code = field_participation_submissions.tenant_code
      )
  )::bigint as confirmation_version_tenant_drift
from public.field_participation_submissions
where raw_payload->>'source' = 'risk_share_participation_submit_v1'
  and raw_payload->>'mode' = 'monthly';

-- F. RPC overload and security posture summary.
with lifecycle_functions as (
  select
    p.oid,
    p.proname,
    p.prosecdef,
    p.proconfig,
    p.proacl
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'create_risk_share_version_lock',
      'publish_risk_share_version_for_tenant',
      'publish_risk_share_version_for_tenant_checked'
    )
)
select
  count(*)::bigint as matched_function_overload_count,
  count(*) filter (where prosecdef = true)::bigint
    as security_definer_count,
  count(*) filter (
    where proconfig @> array['search_path=public, pg_temp']::text[]
  )::bigint as fixed_search_path_count,
  count(*) filter (
    where coalesce(array_to_string(proacl, ','), '') ~ '(PUBLIC|=X)'
  )::bigint as public_execute_acl_count
from lifecycle_functions;

commit;
