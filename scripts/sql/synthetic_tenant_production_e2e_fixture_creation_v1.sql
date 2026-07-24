-- SafeMetrica synthetic tenant Production E2E fixture creation v1.
--
-- Scope: one confirmed synthetic Auth user; one tenant, default site, active
-- tenant_admin membership, activation audit, and expiring internal_test
-- risk_share entitlement with its audit event.
--
-- No schema change, authenticated Runtime, Public QR submission, source/item/
-- version write, entitlement enforcement, customer-row write, or cleanup.
-- Replace every placeholder from the protected manifest or verified live
-- evidence. Never paste credentials, passwords, tokens, customer data, worker
-- data, or signatures into this file.

begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

create temporary table sm_e2e_fixture_creation_result (
  manifest_id text not null,
  tenant_code text not null,
  tenant_id uuid not null,
  site_id uuid not null,
  membership_id uuid not null,
  activation_event_id uuid not null,
  entitlement_id uuid not null,
  entitlement_event_id uuid not null,
  tenant_count integer not null,
  site_count integer not null,
  membership_count integer not null,
  activation_event_count integer not null,
  entitlement_count integer not null,
  entitlement_event_count integer not null
) on commit drop;

do $fixture$
declare
  v_manifest_id constant text := '__SM_E2E_MANIFEST_ID__';
  v_manifest_checksum constant text := '__SM_E2E_MANIFEST_SHA256__';
  v_tenant_code constant text := '__SM_E2E_TENANT_CODE__';
  v_account_email constant text := lower(btrim('__SM_E2E_ACCOUNT_EMAIL__'));
  v_approved_by constant text := '__SM_E2E_APPROVED_BY__';
  v_fixture_approval_reference constant text :=
    '__SM_E2E_FIXTURE_CREATION_APPROVAL_REFERENCE__';
  v_github_main_sha constant text := '__SM_E2E_GITHUB_MAIN_SHA__';
  v_vercel_production_reference constant text :=
    '__SM_E2E_VERCEL_PRODUCTION_REFERENCE__';
  v_migration_inventory_reference constant text :=
    '__SM_E2E_MIGRATION_INVENTORY_REFERENCE__';
  v_schema_fingerprint_reference constant text :=
    '__SM_E2E_SCHEMA_FINGERPRINT_REFERENCE__';
  v_storage_boundary_reference constant text :=
    '__SM_E2E_STORAGE_BOUNDARY_REFERENCE__';
  v_entitlement_expires_at constant timestamptz :=
    '__SM_E2E_ENTITLEMENT_EXPIRES_AT__'::timestamptz;
  v_external_reference constant text := 'internal-test:' || v_tenant_code;
  v_activation_key constant text := v_manifest_id || ':fixture-activation:v1';
  v_entitlement_key constant text := v_manifest_id || ':fixture-entitlement:v1';

  v_auth_user_id uuid;
  v_signup record;
  v_tenant_id uuid;
  v_site record;
  v_profile record;
  v_site_id uuid;
  v_membership_id uuid;
  v_activation_event_id uuid;
  v_entitlement_id uuid;
  v_entitlement_event_id uuid;
  v_request_digest text;
  v_row_count integer;
begin
  if v_manifest_id !~ '^sm-e2e-prod-[0-9]{8}-[0-9]{3}$'
     or v_tenant_code !~ '^sm-e2e-[0-9]{8}-[0-9]{3}$'
     or replace(v_manifest_id, 'sm-e2e-prod-', '') <>
        replace(v_tenant_code, 'sm-e2e-', '') then
    raise exception 'HOLD invalid synthetic manifest identity';
  end if;

  if v_manifest_checksum !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'HOLD protected manifest checksum required';
  end if;

  if v_account_email like '__sm_e2e_%'
     or v_account_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(v_account_email) > 320 then
    raise exception 'HOLD exact synthetic account email required';
  end if;

  if length(btrim(v_approved_by)) not between 1 and 120
     or v_approved_by like '__SM_E2E_%'
     or length(btrim(v_fixture_approval_reference)) not between 1 and 200
     or v_fixture_approval_reference like '__SM_E2E_%' then
    raise exception 'HOLD fixture_creation approval reference required';
  end if;

  if v_github_main_sha !~ '^[0-9a-f]{40}$'
     or v_vercel_production_reference like '__SM_E2E_%'
     or v_migration_inventory_reference like '__SM_E2E_%'
     or v_schema_fingerprint_reference like '__SM_E2E_%'
     or v_storage_boundary_reference like '__SM_E2E_%'
     or length(btrim(v_vercel_production_reference)) < 1
     or length(btrim(v_migration_inventory_reference)) < 1
     or length(btrim(v_schema_fingerprint_reference)) < 1
     or length(btrim(v_storage_boundary_reference)) < 1 then
    raise exception 'HOLD live Production evidence references required';
  end if;

  if v_entitlement_expires_at <= now()
     or v_entitlement_expires_at > now() + interval '14 days' then
    raise exception 'HOLD internal_test expiry must be within 14 days';
  end if;

  if v_tenant_code = 'test-risk-pack-01' or v_tenant_code !~ '^sm-e2e-' then
    raise exception 'HOLD existing or non-dedicated tenant prohibited';
  end if;

  select u.id into v_auth_user_id
  from auth.users u
  where lower(u.email) = v_account_email
    and u.email_confirmed_at is not null;

  if v_auth_user_id is null then
    raise exception 'HOLD one confirmed synthetic Auth user required';
  end if;

  if (select count(*) from auth.users u where lower(u.email) = v_account_email) <> 1
     or exists (
       select 1 from public.tenant_registry tr
       where tr.company_code = v_tenant_code
     )
     or exists (
       select 1 from public.tenant_membership tm
       where tm.tenant_code = v_tenant_code
          or lower(tm.user_email) = v_account_email
          or tm.user_id = v_auth_user_id::text
     )
     or exists (
       select 1 from public.tenant_product_entitlements tpe
       where tpe.tenant_code = v_tenant_code
     ) then
    raise exception 'HOLD reserved synthetic identity is not absent';
  end if;

  select * into v_signup
  from public.create_self_service_tenant(
    v_auth_user_id::text,
    v_account_email,
    v_tenant_code,
    'SafeMetrica Synthetic E2E ' || replace(v_tenant_code, 'sm-e2e-', ''),
    'Synthetic Tenant Admin'
  );

  if v_signup.ok is not true
     or v_signup.result_code <> 'created'
     or v_signup.tenant_code <> v_tenant_code then
    raise exception 'HOLD atomic tenant and membership creation failed';
  end if;

  select tr.id into strict v_tenant_id
  from public.tenant_registry tr
  where tr.company_code = v_tenant_code
    and tr.status = 'onboarding'
    and tr.service_mode = 'risk_share_pack'
    and tr.source_channel = 'self_service';

  select tm.id into strict v_membership_id
  from public.tenant_membership tm
  where tm.tenant_id = v_tenant_id
    and tm.tenant_code = v_tenant_code
    and tm.user_id = v_auth_user_id::text
    and lower(tm.user_email) = v_account_email
    and tm.role = 'tenant_admin'
    and tm.status = 'active';

  update public.tenant_registry tr
  set raw_payload = jsonb_build_object(
        'source', 'synthetic_e2e_fixture_v1',
        'manifestId', v_manifest_id,
        'manifestChecksum', v_manifest_checksum,
        'lifecycleState', 'fixture_created',
        'fixtureApprovalReference', v_fixture_approval_reference
      ),
      updated_at = now()
  where tr.id = v_tenant_id
    and tr.company_code = v_tenant_code
    and tr.status = 'onboarding';
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'HOLD synthetic fixture registry marker failed';
  end if;

  update public.tenant_membership tm
  set raw_payload = jsonb_build_object(
        'source', 'synthetic_e2e_fixture_v1',
        'manifestId', v_manifest_id
      ),
      updated_at = now()
  where tm.id = v_membership_id
    and tm.tenant_id = v_tenant_id
    and tm.tenant_code = v_tenant_code;
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'HOLD synthetic membership marker failed';
  end if;

  select * into v_site
  from public.create_tenant_default_site(
    v_tenant_id,
    v_tenant_code,
    'Synthetic Site ' || replace(v_tenant_code, 'sm-e2e-', '')
  );

  if v_site.ok is not true or v_site.reason <> 'ok' or v_site.id is null then
    raise exception 'HOLD atomic default-site creation failed';
  end if;
  v_site_id := v_site.id;

  select * into v_profile
  from public.update_tenant_site_profile(
    v_tenant_id,
    v_site_id,
    'Synthetic Site ' || replace(v_tenant_code, 'sm-e2e-', ''),
    'synthetic_e2e',
    array['synthetic_process']::text[],
    array['synthetic_equipment']::text[],
    'synthetic',
    false,
    false
  );

  if v_profile.ok is not true or v_profile.reason <> 'ok'
     or v_profile.id <> v_site_id then
    raise exception 'HOLD atomic site-profile update failed';
  end if;

  insert into public.tenant_activation_events (
    tenant_id, tenant_code, actor_membership_id, from_status, to_status,
    initiated_by, idempotency_key
  ) values (
    v_tenant_id, v_tenant_code, v_membership_id, 'onboarding', 'active',
    'owner_console', v_activation_key
  )
  returning id into v_activation_event_id;

  update public.tenant_registry tr
  set status = 'active', updated_at = now()
  where tr.id = v_tenant_id
    and tr.company_code = v_tenant_code
    and tr.status = 'onboarding';
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'HOLD tenant activation delta mismatch';
  end if;

  insert into public.tenant_product_entitlements (
    tenant_id, tenant_code, product_code, status, activation_source,
    policy_version, effective_at, expires_at, external_reference
  ) values (
    v_tenant_id, v_tenant_code, 'risk_share', 'active', 'internal_test',
    1, now(), v_entitlement_expires_at, v_external_reference
  )
  returning id into v_entitlement_id;

  v_request_digest := encode(
    extensions.digest(
      concat_ws(
        '|', v_entitlement_id::text, v_tenant_id::text, v_tenant_code,
        'risk_share', '', 'active', 'internal_test', '1',
        v_external_reference, v_entitlement_expires_at::text, v_entitlement_key
      )::text,
      'sha256'::text
    ),
    'hex'
  );

  insert into public.tenant_product_entitlement_events (
    entitlement_id, tenant_id, tenant_code, product_code, from_status,
    to_status, activation_source, policy_version, actor_type,
    idempotency_key, request_digest
  ) values (
    v_entitlement_id, v_tenant_id, v_tenant_code, 'risk_share', null,
    'active', 'internal_test', 1, 'owner_console',
    v_entitlement_key, v_request_digest
  )
  returning id into v_entitlement_event_id;

  insert into sm_e2e_fixture_creation_result
  select
    v_manifest_id, v_tenant_code, v_tenant_id, v_site_id, v_membership_id,
    v_activation_event_id, v_entitlement_id, v_entitlement_event_id,
    (select count(*)::integer from public.tenant_registry
      where company_code = v_tenant_code),
    (select count(*)::integer from public.tenant_sites
      where tenant_id = v_tenant_id and tenant_code = v_tenant_code),
    (select count(*)::integer from public.tenant_membership
      where tenant_id = v_tenant_id and tenant_code = v_tenant_code),
    (select count(*)::integer from public.tenant_activation_events
      where tenant_id = v_tenant_id and tenant_code = v_tenant_code),
    (select count(*)::integer from public.tenant_product_entitlements
      where tenant_id = v_tenant_id and tenant_code = v_tenant_code),
    (select count(*)::integer from public.tenant_product_entitlement_events
      where tenant_id = v_tenant_id and tenant_code = v_tenant_code);

  if not exists (
    select 1 from sm_e2e_fixture_creation_result r
    where r.tenant_count = 1
      and r.site_count = 1
      and r.membership_count = 1
      and r.activation_event_count = 1
      and r.entitlement_count = 1
      and r.entitlement_event_count = 1
  )
  or not exists (
    select 1
    from public.tenant_registry tr
    where tr.id = v_tenant_id
      and tr.company_code = v_tenant_code
      and tr.status = 'active'
      and tr.raw_payload ->> 'source' = 'synthetic_e2e_fixture_v1'
      and tr.raw_payload ->> 'manifestId' = v_manifest_id
      and tr.raw_payload ->> 'manifestChecksum' = v_manifest_checksum
      and tr.raw_payload ->> 'lifecycleState' = 'fixture_created'
  ) then
    raise exception 'HOLD fixture counted delta mismatch';
  end if;
end
$fixture$;

select
  'SYNTHETIC_E2E_FIXTURE_CREATION_V1' as executor_version,
  'FIXTURE_CREATION_COMMITTED' as result,
  manifest_id,
  tenant_code,
  tenant_id,
  site_id,
  membership_id,
  activation_event_id,
  entitlement_id,
  entitlement_event_id,
  tenant_count,
  site_count,
  membership_count,
  activation_event_count,
  entitlement_count,
  entitlement_event_count,
  false as authenticated_runtime_authorized,
  false as public_qr_submission_authorized,
  false as cleanup_writes_authorized,
  false as entitlement_enforcement_authorized
from sm_e2e_fixture_creation_result;

commit;
