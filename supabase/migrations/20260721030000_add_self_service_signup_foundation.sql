-- SafeMetrica self-service signup foundation.
-- Additive only: existing tenants, memberships, legacy routes, and public QR paths are unchanged.

create unique index if not exists tenant_registry_self_service_company_name_uidx
  on public.tenant_registry (lower(btrim(company_name)))
  where source_channel = 'self_service'
    and status <> 'archived';

create unique index if not exists tenant_membership_self_service_user_uidx
  on public.tenant_membership (user_id)
  where user_id is not null
    and invited_by = 'self_service'
    and status in ('invited', 'active', 'suspended');

create or replace function public.create_self_service_tenant(
  p_user_id text,
  p_email text,
  p_company_code text,
  p_company_name text,
  p_display_name text
)
returns table (
  ok boolean,
  result_code text,
  tenant_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text := btrim(coalesce(p_user_id, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_company_code text := lower(btrim(coalesce(p_company_code, '')));
  v_company_name text := btrim(coalesce(p_company_name, ''));
  v_display_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_existing_tenant_code text;
  v_existing_company_name text;
  v_tenant_id uuid;
begin
  if length(v_user_id) < 8
     or length(v_user_id) > 128
     or length(v_email) < 5
     or length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or length(v_company_name) < 2
     or length(v_company_name) > 120
     or length(coalesce(v_display_name, '')) > 80 then
    return query select false, 'invalid_input', null::text;
    return;
  end if;

  -- Fixed lock order prevents concurrent retries from creating duplicate companies or memberships.
  perform pg_advisory_xact_lock(hashtextextended('self-service-user:' || v_user_id, 0));
  perform pg_advisory_xact_lock(hashtextextended('self-service-company:' || lower(v_company_name), 0));

  select tm.tenant_code, tr.company_name
    into v_existing_tenant_code, v_existing_company_name
  from public.tenant_membership tm
  join public.tenant_registry tr
    on tr.id = tm.tenant_id
   and tr.company_code = tm.tenant_code
  where tm.invited_by = 'self_service'
    and tm.status in ('invited', 'active', 'suspended')
    and (tm.user_id = v_user_id or lower(tm.user_email) = v_email)
  order by tm.created_at asc, tm.id asc
  limit 1
  for update of tm;

  if v_existing_tenant_code is not null then
    if lower(btrim(v_existing_company_name)) = lower(v_company_name) then
      return query select true, 'already_exists', v_existing_tenant_code;
    else
      return query select false, 'account_company_conflict', v_existing_tenant_code;
    end if;
    return;
  end if;

  if exists (
    select 1
    from public.tenant_registry tr
    where tr.status <> 'archived'
      and (
        tr.company_code = v_company_code
        or (
          tr.source_channel = 'self_service'
          and lower(btrim(tr.company_name)) = lower(v_company_name)
        )
      )
  ) then
    return query select false, 'company_exists', null::text;
    return;
  end if;

  insert into public.tenant_registry (
    company_code,
    company_name,
    status,
    service_mode,
    enabled_modules,
    plan_type,
    source_channel,
    contact_label,
    raw_payload
  ) values (
    v_company_code,
    v_company_name,
    'onboarding',
    'risk_share_pack',
    '["worker_qr_e_confirmation","quick_feedback","manager_inbox","monthly_result","customer_delivery_pack"]'::jsonb,
    'self_service',
    'self_service',
    v_display_name,
    jsonb_build_object(
      'source', 'self_service_signup_v1',
      'onboardingStage', 'company_profile_required'
    )
  )
  returning id into v_tenant_id;

  insert into public.tenant_membership (
    tenant_id,
    tenant_code,
    user_id,
    user_email,
    display_name,
    role,
    status,
    invited_by,
    accepted_at,
    raw_payload
  ) values (
    v_tenant_id,
    v_company_code,
    v_user_id,
    v_email,
    v_display_name,
    'tenant_admin',
    'active',
    'self_service',
    now(),
    jsonb_build_object('source', 'self_service_signup_v1')
  );

  return query select true, 'created', v_company_code;
exception
  when unique_violation then
    return query select false, 'signup_conflict', null::text;
end;
$$;

revoke all on function public.create_self_service_tenant(text, text, text, text, text) from public;
revoke execute on function public.create_self_service_tenant(text, text, text, text, text) from anon, authenticated;
grant execute on function public.create_self_service_tenant(text, text, text, text, text) to service_role;

comment on function public.create_self_service_tenant(text, text, text, text, text) is
  'Atomically creates one onboarding tenant and its active tenant_admin membership for a verified Supabase Auth user. Service role only; stores no password or auth token.';
