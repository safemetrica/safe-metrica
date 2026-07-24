-- SafeMetrica synthetic tenant Production E2E live fingerprint v1.
--
-- Read-only catalog inspection only:
-- - no customer or worker rows;
-- - no credential, email, token, file name, or object path reads;
-- - no schema, policy, grant, bucket, or data changes;
-- - no fixture creation authorization.

begin transaction read only;

select
  'SYNTHETIC_E2E_LIVE_FINGERPRINT_V1_RLS_BOUNDARY' as fingerprint_version,
  current_database() as database_name,
  current_user as connected_role,
  now() as checked_at;

with required_relations(relation_name) as (
  values
    ('tenant_registry'),
    ('tenant_sites'),
    ('tenant_membership'),
    ('tenant_activation_events'),
    ('tenant_product_entitlements'),
    ('tenant_product_entitlement_events'),
    ('risk_share_sources'),
    ('risk_share_source_column_mappings'),
    ('risk_share_item_candidates'),
    ('risk_share_preparation_decisions'),
    ('risk_share_items'),
    ('risk_share_item_review_events'),
    ('risk_share_version_locks'),
    ('risk_share_version_items'),
    ('field_participation_submissions'),
    ('risk_share_confirmation_review_events'),
    ('evidence_items')
)
select
  r.relation_name,
  c.oid is not null as relation_exists,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  coalesce(c.relforcerowsecurity, false) as rls_forced,
  case
    when c.oid is null then false
    else pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT')
  end as service_role_can_select,
  case
    when c.oid is null then false
    else pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')
      or pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT')
      or pg_catalog.has_table_privilege('authenticated', c.oid, 'UPDATE')
      or pg_catalog.has_table_privilege('authenticated', c.oid, 'DELETE')
  end as authenticated_has_effective_data_privilege,
  case
    when c.oid is null then false
    else pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
      or pg_catalog.has_table_privilege('anon', c.oid, 'INSERT')
      or pg_catalog.has_table_privilege('anon', c.oid, 'UPDATE')
      or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE')
  end as anon_has_effective_data_privilege,
  case
    when c.oid is null then false
    else exists (
      select 1
      from pg_catalog.aclexplode(
        coalesce(
          c.relacl,
          pg_catalog.acldefault('r', c.relowner)
        )
      ) acl
      where acl.grantee = 0
        and acl.privilege_type in (
          'SELECT',
          'INSERT',
          'UPDATE',
          'DELETE'
        )
    )
  end as public_has_explicit_data_privilege,
  case
    when c.oid is null then false
    else exists (
      select 1
      from pg_catalog.pg_policy policy
      where policy.polrelid = c.oid
        and (
          0 = any(policy.polroles)
          or 'authenticated'::regrole::oid = any(policy.polroles)
          or 'anon'::regrole::oid = any(policy.polroles)
        )
    )
  end as client_rls_policy_exists
from required_relations r
left join pg_catalog.pg_namespace n
  on n.nspname = 'public'
left join pg_catalog.pg_class c
  on c.relnamespace = n.oid
 and c.relname = r.relation_name
 and c.relkind in ('r', 'p')
order by r.relation_name;

with required_functions(function_signature) as (
  values
    ('public.create_self_service_tenant(text,text,text,text,text)'),
    ('public.create_tenant_default_site(uuid,text,text)'),
    ('public.activate_tenant_after_profile(text,uuid,text,text)'),
    ('public.prepare_risk_share_items_for_tenant(text,uuid,uuid,integer,text,uuid[])'),
    ('public.review_risk_share_item(uuid,text,uuid,bigint,text,text,text,text,text,text,text,text,boolean)'),
    ('public.publish_risk_share_version_for_tenant_checked(text,uuid,text,text,text,uuid[],bigint[],text)'),
    ('public.update_risk_share_confirmation_review_status(text,uuid,uuid,text,text,text)')
),
resolved as (
  select
    rf.function_signature,
    pg_catalog.to_regprocedure(rf.function_signature) as function_oid
  from required_functions rf
)
select
  r.function_signature,
  r.function_oid is not null as exact_signature_exists,
  (
    select count(*)
    from pg_catalog.pg_proc overload
    join pg_catalog.pg_namespace overload_namespace
      on overload_namespace.oid = overload.pronamespace
    where overload_namespace.nspname = 'public'
      and overload.proname = p.proname
  ) as overload_count,
  pg_catalog.pg_get_userbyid(p.proowner) as owner_name,
  coalesce(p.prosecdef, false) as security_definer,
  coalesce(p.proconfig, '{}'::text[]) as function_settings,
  case
    when r.function_oid is null then false
    else pg_catalog.has_function_privilege(
      'service_role',
      r.function_oid,
      'EXECUTE'
    )
  end as service_role_can_execute,
  case
    when r.function_oid is null then false
    else pg_catalog.has_function_privilege(
      'authenticated',
      r.function_oid,
      'EXECUTE'
    )
  end as authenticated_can_execute,
  case
    when r.function_oid is null then false
    else pg_catalog.has_function_privilege(
      'anon',
      r.function_oid,
      'EXECUTE'
    )
  end as anon_can_execute
from resolved r
left join pg_catalog.pg_proc p
  on p.oid = r.function_oid
order by r.function_signature;

with required_constraints(table_name, constraint_name, constraint_type) as (
  values
    (
      'tenant_product_entitlements',
      'tenant_product_entitlements_internal_test_check',
      'c'
    ),
    (
      'tenant_product_entitlements',
      'tenant_product_entitlements_event_identity_unique',
      'u'
    ),
    (
      'tenant_product_entitlement_events',
      'tenant_product_entitlement_events_identity_fk',
      'f'
    )
)
select
  r.table_name,
  r.constraint_name,
  r.constraint_type,
  c.oid is not null as constraint_exists,
  coalesce(c.convalidated, false) as constraint_validated
from required_constraints r
left join pg_catalog.pg_namespace n
  on n.nspname = 'public'
left join pg_catalog.pg_class t
  on t.relnamespace = n.oid
 and t.relname = r.table_name
left join pg_catalog.pg_constraint c
  on c.conrelid = t.oid
 and c.conname = r.constraint_name
 and c.contype = r.constraint_type::"char"
order by r.table_name, r.constraint_name;

select
  pg_catalog.to_regprocedure(
    'extensions.digest(text,text)'
  ) is not null as extensions_digest_text_available,
  pg_catalog.to_regprocedure(
    'extensions.digest(bytea,text)'
  ) is not null as extensions_digest_bytea_available;

select
  b.id as bucket_id,
  b.name as bucket_name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types,
  case
    when b.id is null then 'NO_SUPABASE_BUCKET'
    when b.public then 'UNUSED_PUBLIC_BUCKET_REQUIRES_SEPARATE_REMEDIATION'
    else 'PRIVATE_BUCKET_REQUIRES_POLICY_AND_RUNTIME_VERIFICATION'
  end as boundary_state
from (values ('evidence')) required(bucket_id)
left join storage.buckets b
  on b.id = required.bucket_id;

with required_relations(relation_name) as (
  values
    ('tenant_registry'),
    ('tenant_sites'),
    ('tenant_membership'),
    ('tenant_activation_events'),
    ('tenant_product_entitlements'),
    ('tenant_product_entitlement_events'),
    ('risk_share_sources'),
    ('risk_share_source_column_mappings'),
    ('risk_share_item_candidates'),
    ('risk_share_preparation_decisions'),
    ('risk_share_items'),
    ('risk_share_item_review_events'),
    ('risk_share_version_locks'),
    ('risk_share_version_items'),
    ('field_participation_submissions'),
    ('risk_share_confirmation_review_events'),
    ('evidence_items')
),
relation_checks as (
  select
    bool_and(c.oid is not null)
      as required_relations_exist_pass,
    bool_and(coalesce(c.relrowsecurity, false))
      as required_relations_rls_enabled_pass,
    bool_and(
      c.oid is not null
      and pg_catalog.has_table_privilege(
        'service_role',
        c.oid,
        'SELECT'
      )
    ) as service_role_select_grants_pass,
    bool_and(
      c.oid is not null
      and not (
        pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT')
        or pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT')
        or pg_catalog.has_table_privilege('authenticated', c.oid, 'UPDATE')
        or pg_catalog.has_table_privilege('authenticated', c.oid, 'DELETE')
        or pg_catalog.has_table_privilege('anon', c.oid, 'SELECT')
        or pg_catalog.has_table_privilege('anon', c.oid, 'INSERT')
        or pg_catalog.has_table_privilege('anon', c.oid, 'UPDATE')
        or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE')
      )
    ) as client_effective_data_grants_absent_pass,
    bool_and(
      c.oid is not null
      and not exists (
        select 1
        from pg_catalog.pg_policy policy
        where policy.polrelid = c.oid
          and (
            0 = any(policy.polroles)
            or 'authenticated'::regrole::oid = any(policy.polroles)
            or 'anon'::regrole::oid = any(policy.polroles)
          )
      )
    ) as client_rls_policies_absent_pass,
    bool_and(
      c.oid is not null
      and c.relrowsecurity
      and pg_catalog.has_table_privilege(
        'service_role',
        c.oid,
        'SELECT'
      )
      and not exists (
        select 1
        from pg_catalog.pg_policy policy
        where policy.polrelid = c.oid
          and (
            0 = any(policy.polroles)
            or 'authenticated'::regrole::oid = any(policy.polroles)
            or 'anon'::regrole::oid = any(policy.polroles)
          )
      )
    ) as pass
  from required_relations r
  left join pg_catalog.pg_namespace n
    on n.nspname = 'public'
  left join pg_catalog.pg_class c
    on c.relnamespace = n.oid
   and c.relname = r.relation_name
   and c.relkind in ('r', 'p')
),
required_functions(function_signature) as (
  values
    ('public.create_self_service_tenant(text,text,text,text,text)'),
    ('public.create_tenant_default_site(uuid,text,text)'),
    ('public.activate_tenant_after_profile(text,uuid,text,text)'),
    ('public.prepare_risk_share_items_for_tenant(text,uuid,uuid,integer,text,uuid[])'),
    ('public.review_risk_share_item(uuid,text,uuid,bigint,text,text,text,text,text,text,text,text,boolean)'),
    ('public.publish_risk_share_version_for_tenant_checked(text,uuid,text,text,text,uuid[],bigint[],text)'),
    ('public.update_risk_share_confirmation_review_status(text,uuid,uuid,text,text,text)')
),
function_checks as (
  select bool_and(
    p.oid is not null
    and pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
    and p.prosecdef
    and coalesce(p.proconfig, '{}'::text[])
      @> array['search_path=public, pg_temp']
    and (
      select count(*)
      from pg_catalog.pg_proc overload
      join pg_catalog.pg_namespace overload_namespace
        on overload_namespace.oid = overload.pronamespace
      where overload_namespace.nspname = 'public'
        and overload.proname = p.proname
    ) = 1
    and pg_catalog.has_function_privilege(
      'service_role',
      p.oid,
      'EXECUTE'
    )
    and not pg_catalog.has_function_privilege(
      'authenticated',
      p.oid,
      'EXECUTE'
    )
    and not pg_catalog.has_function_privilege(
      'anon',
      p.oid,
      'EXECUTE'
    )
  ) as pass
  from required_functions r
  left join pg_catalog.pg_proc p
    on p.oid = pg_catalog.to_regprocedure(r.function_signature)
),
constraint_checks as (
  select count(*) = 3 and bool_and(c.convalidated) as pass
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_class t
    on t.oid = c.conrelid
  join pg_catalog.pg_namespace n
    on n.oid = t.relnamespace
  where n.nspname = 'public'
    and (
      (
        t.relname = 'tenant_product_entitlements'
        and c.conname in (
          'tenant_product_entitlements_internal_test_check',
          'tenant_product_entitlements_event_identity_unique'
        )
      )
      or (
        t.relname = 'tenant_product_entitlement_events'
        and c.conname = 'tenant_product_entitlement_events_identity_fk'
      )
    )
)
select
  'SYNTHETIC_E2E_LIVE_FINGERPRINT_V1_RLS_BOUNDARY' as fingerprint_version,
  case
    when relation_checks.pass
      and function_checks.pass
      and constraint_checks.pass
      and pg_catalog.to_regprocedure(
        'extensions.digest(text,text)'
      ) is not null
    then 'SCHEMA_RLS_AND_SERVICE_GRANT_FINGERPRINT_PASS'
    else 'HOLD_SCHEMA_OR_GRANT_DRIFT'
  end as result,
  relation_checks.required_relations_exist_pass,
  relation_checks.required_relations_rls_enabled_pass,
  relation_checks.service_role_select_grants_pass,
  relation_checks.client_effective_data_grants_absent_pass,
  relation_checks.client_rls_policies_absent_pass,
  case
    when relation_checks.client_effective_data_grants_absent_pass
      then 'CLIENT_ACL_LEAST_PRIVILEGE_PASS'
    when relation_checks.client_rls_policies_absent_pass
      then 'CLIENT_ACL_HARDENING_GAP_WITH_NO_RLS_POLICY'
    else 'HOLD_CLIENT_RLS_POLICY_REVIEW'
  end as client_access_boundary_state,
  relation_checks.pass as required_relations_rls_and_service_grants_pass,
  function_checks.pass as required_functions_and_grants_pass,
  constraint_checks.pass as entitlement_constraints_pass,
  pg_catalog.to_regprocedure(
    'extensions.digest(text,text)'
  ) is not null as digest_dependency_pass,
  false as migration_inventory_verified,
  false as vercel_private_blob_verified,
  false as fixture_creation_authorized,
  false as write_authorized
from relation_checks, function_checks, constraint_checks;

rollback;
