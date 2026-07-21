-- Commercial Core: make the monthly confirmation audit ledger append-only
-- outside its SECURITY DEFINER RPC.

do $$
declare
  v_function record;
  v_policy_count integer;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'risk_share_confirmation_review_events'
      and c.relkind = 'r'
      and c.relowner = 'postgres'::regrole
      and c.relrowsecurity = true
  ) then
    raise exception
      'confirmation review ledger privilege hardening failed: table owner or RLS mismatch';
  end if;

  select p.proowner, p.prosecdef, p.proconfig
  into v_function
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_risk_share_confirmation_review_status'
    and array(select unnest(p.proargtypes::oid[])) = array[
      'text'::regtype::oid,
      'uuid'::regtype::oid,
      'uuid'::regtype::oid,
      'text'::regtype::oid,
      'text'::regtype::oid,
      'text'::regtype::oid
    ];

  if not found
     or v_function.proowner <> 'postgres'::regrole
     or v_function.prosecdef is distinct from true
     or v_function.proconfig is distinct from
       array['search_path=public, pg_temp'] then
    raise exception
      'confirmation review ledger privilege hardening failed: RPC contract mismatch';
  end if;

  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'risk_share_confirmation_review_events';

  if v_policy_count <> 0 then
    raise exception
      'confirmation review ledger privilege hardening failed: unexpected client policy';
  end if;
end
$$;

revoke all privileges
on table public.risk_share_confirmation_review_events
from public, anon, authenticated, service_role;

grant select
on table public.risk_share_confirmation_review_events
to service_role;

comment on table public.risk_share_confirmation_review_events is
  'Append-only audit ledger for monthly confirmation manager review. SELECT-only to service_role; writes occur only through the SECURITY DEFINER RPC.';

do $$
declare
  v_unexpected_acl_count integer;
  v_service_select_grantable boolean;
begin
  select count(*) into v_unexpected_acl_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace,
  lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as a
  where n.nspname = 'public'
    and c.relname = 'risk_share_confirmation_review_events'
    and (
      a.grantee not in ('postgres'::regrole, 'service_role'::regrole)
      or (
        a.grantee = 'service_role'::regrole
        and a.privilege_type <> 'SELECT'
      )
    );

  if v_unexpected_acl_count <> 0 then
    raise exception
      'confirmation review ledger privilege hardening failed: unexpected table grant';
  end if;

  select a.is_grantable into v_service_select_grantable
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace,
  lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as a
  where n.nspname = 'public'
    and c.relname = 'risk_share_confirmation_review_events'
    and a.grantee = 'service_role'::regrole
    and a.privilege_type = 'SELECT';

  if v_service_select_grantable is distinct from false
     or has_table_privilege(
       'service_role',
       'public.risk_share_confirmation_review_events',
       'SELECT'
     ) <> true
     or has_table_privilege(
       'service_role',
       'public.risk_share_confirmation_review_events',
       'INSERT'
     ) <> false
     or has_table_privilege(
       'service_role',
       'public.risk_share_confirmation_review_events',
       'UPDATE'
     ) <> false
     or has_table_privilege(
       'service_role',
       'public.risk_share_confirmation_review_events',
       'DELETE'
     ) <> false
     or has_function_privilege(
       'service_role',
       'public.update_risk_share_confirmation_review_status(text, uuid, uuid, text, text, text)',
       'EXECUTE'
     ) <> true then
    raise exception
      'confirmation review ledger privilege hardening failed: service_role ACL mismatch';
  end if;

  if has_table_privilege(
       'anon',
       'public.risk_share_confirmation_review_events',
       'SELECT, INSERT, UPDATE, DELETE'
     )
     or has_table_privilege(
       'authenticated',
       'public.risk_share_confirmation_review_events',
       'SELECT, INSERT, UPDATE, DELETE'
     ) then
    raise exception
      'confirmation review ledger privilege hardening failed: client table access remains';
  end if;
end
$$;
