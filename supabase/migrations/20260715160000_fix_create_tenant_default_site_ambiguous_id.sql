-- Fix create_tenant_default_site runtime failure caused by the
-- RETURNS TABLE output parameter `id` conflicting with an unqualified
-- tenant_registry.id reference.
--
-- This is a corrective migration. Do not edit the already-applied
-- 20260715010000_create_tenant_sites.sql migration.

create or replace function public.create_tenant_default_site(
  p_tenant_id uuid,
  p_tenant_code text,
  p_site_name text
)
returns table (id uuid, ok boolean, reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_registry_id uuid;
  v_site_name text;
  v_new_site_id uuid;
  v_existing_default_id uuid;
begin
  select tr.id into v_registry_id
  from public.tenant_registry as tr
  where tr.id = p_tenant_id
    and tr.company_code = p_tenant_code
  for update;

  if v_registry_id is null then
    return query select null::uuid, false, 'tenant_not_found';
    return;
  end if;

  v_site_name := btrim(coalesce(p_site_name, ''));

  if v_site_name = '' then
    return query select null::uuid, false, 'site_name_required';
    return;
  end if;

  select ts.id into v_existing_default_id
  from public.tenant_sites as ts
  where ts.tenant_id = p_tenant_id
    and ts.is_default = true
  limit 1;

  if v_existing_default_id is not null then
    return query
      select v_existing_default_id, false, 'default_already_exists';
    return;
  end if;

  insert into public.tenant_sites (
    tenant_id,
    tenant_code,
    site_name,
    is_default,
    status
  ) values (
    p_tenant_id,
    p_tenant_code,
    v_site_name,
    true,
    'active'
  )
  returning tenant_sites.id into v_new_site_id;

  update public.tenant_registry as tr
  set default_site_id = v_new_site_id,
      default_site_name = v_site_name,
      updated_at = now()
  where tr.id = p_tenant_id;

  return query select v_new_site_id, true, 'ok';
end;
$$;

revoke all
  on function public.create_tenant_default_site(uuid, text, text)
  from public;

revoke execute
  on function public.create_tenant_default_site(uuid, text, text)
  from anon, authenticated;

grant execute
  on function public.create_tenant_default_site(uuid, text, text)
  to service_role;
