-- Commercial Core: tenant-safe manager review for the four non-monthly inbox types.
--
-- Scope is deliberately additive:
--   * pre-work confirmation
--   * anonymous feedback
--   * visitor confirmation
--   * worker-representative confirmation
--
-- The existing monthly confirmation RPC and audit ledger are not changed.
-- `completed` below means that the customer manager finished this inbox workflow.
-- It does not certify legal compliance, the adequacy of a safety measure, or the
-- final closure of an incident or corrective action.

-- Supabase Production installs pgcrypto in `extensions`, outside this
-- SECURITY DEFINER function's deliberately narrow search_path. Fail the
-- migration before creating any contract object if the qualified bytea
-- overload required below is unavailable.
do $$
begin
  if to_regprocedure('extensions.digest(bytea, text)') is null then
    raise exception
      'manager inbox review RPC precondition failed: extensions.digest(bytea, text) is not available';
  end if;
end
$$;

-- Every object below is new. Refuse to overwrite or silently reuse a drifted
-- table, index, or overload. Supabase migrations run transactionally, so a
-- failed precondition leaves the schema unchanged.
do $$
begin
  if to_regclass('public.risk_share_inbox_review_events') is not null
     or to_regclass('public.field_participation_submissions_id_tenant_uidx') is not null
     or to_regclass('public.risk_share_inbox_review_events_tenant_idempotency_uidx') is not null
     or to_regclass('public.risk_share_inbox_review_events_tenant_submission_sequence_idx') is not null
     or to_regclass('public.risk_share_inbox_review_events_event_sequence_seq') is not null
     or exists (
       select 1
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = 'update_risk_share_inbox_review_status'
     ) then
    raise exception
      'manager inbox review RPC precondition failed: a new contract object already exists';
  end if;
end
$$;

-- A composite tenant identity is required so the audit ledger cannot point at a
-- submission id from one tenant while storing another tenant_code.
create unique index field_participation_submissions_id_tenant_uidx
  on public.field_participation_submissions (id, tenant_code);

create table public.risk_share_inbox_review_events (
  id uuid primary key default gen_random_uuid(),
  event_sequence bigint generated always as identity,
  tenant_code text not null,
  submission_id uuid not null,
  inbox_type text not null,
  from_status text not null,
  to_status text not null,
  action_note text,
  actor_membership_id uuid not null,
  idempotency_key text not null,
  request_digest text not null,
  created_at timestamptz not null default now(),

  constraint risk_share_inbox_review_events_submission_tenant_fk
    foreign key (submission_id, tenant_code)
    references public.field_participation_submissions (id, tenant_code)
    on delete restrict,

  constraint risk_share_inbox_review_events_actor_tenant_fk
    foreign key (actor_membership_id, tenant_code)
    references public.tenant_membership (id, tenant_code)
    on delete restrict,

  constraint risk_share_inbox_review_events_type_check
    check (inbox_type in ('prework', 'anonymous', 'visitor', 'representative')),

  constraint risk_share_inbox_review_events_transition_check
    check (
      (from_status = 'unreviewed' and to_status = 'in_review')
      or (from_status = 'in_review' and to_status = 'completed')
    ),

  constraint risk_share_inbox_review_events_action_note_length_check
    check (action_note is null or char_length(action_note) <= 500),

  constraint risk_share_inbox_review_events_idempotency_key_check
    check (
      idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 1 and 200
    ),

  constraint risk_share_inbox_review_events_request_digest_check
    check (request_digest ~ '^[0-9a-f]{64}$'),

  constraint risk_share_inbox_review_events_sequence_unique
    unique (event_sequence)
);

create unique index risk_share_inbox_review_events_tenant_idempotency_uidx
  on public.risk_share_inbox_review_events (tenant_code, idempotency_key);

create index risk_share_inbox_review_events_tenant_submission_sequence_idx
  on public.risk_share_inbox_review_events (tenant_code, submission_id, event_sequence asc);

alter table public.risk_share_inbox_review_events enable row level security;

alter table public.risk_share_inbox_review_events owner to postgres;

alter sequence public.risk_share_inbox_review_events_event_sequence_seq owner to postgres;

revoke all privileges
  on table public.risk_share_inbox_review_events
  from public, anon, authenticated, service_role;

grant select
  on table public.risk_share_inbox_review_events
  to service_role;

revoke all privileges
  on sequence public.risk_share_inbox_review_events_event_sequence_seq
  from public, anon, authenticated, service_role;

comment on table public.risk_share_inbox_review_events is
  'Append-only audit ledger for customer-manager review of the four non-monthly inbox types. No update/delete grant.';

comment on column public.risk_share_inbox_review_events.request_digest is
  'Database-derived SHA-256 digest of the normalized mutation request. Used only to distinguish an exact replay from idempotency-key reuse with different input.';

create function public.update_risk_share_inbox_review_status(
  p_company_code text,
  p_actor_membership_id uuid,
  p_submission_id uuid,
  p_expected_status text,
  p_next_status text,
  p_action_note text,
  p_idempotency_key text
)
returns table (
  ok boolean,
  result_code text,
  review_status text,
  event_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_code text := lower(btrim(coalesce(p_company_code, '')));
  v_action_note text := nullif(btrim(coalesce(p_action_note, '')), '');
  v_idempotency_key text := btrim(coalesce(p_idempotency_key, ''));
  v_membership public.tenant_membership%rowtype;
  v_submission public.field_participation_submissions%rowtype;
  v_replay public.risk_share_inbox_review_events%rowtype;
  v_inbox_type text;
  v_current_status text;
  v_request_digest text;
  v_event_id uuid;
  v_row_count integer;
begin
  if v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or p_actor_membership_id is null
     or p_submission_id is null
     or coalesce(p_expected_status, '') not in ('unreviewed', 'in_review')
     or coalesce(p_next_status, '') not in ('in_review', 'completed')
     or not (
       (p_expected_status = 'unreviewed' and p_next_status = 'in_review')
       or (p_expected_status = 'in_review' and p_next_status = 'completed')
     )
     or char_length(coalesce(p_action_note, '')) > 500
     or char_length(v_idempotency_key) not between 1 and 200 then
    return query
      select false, 'validation_failed', null::text, null::uuid, false;
    return;
  end if;

  -- Re-derive role, status, and tenant in the database. A shared lock keeps
  -- authorization stable until this transaction commits or rolls back.
  select tm.* into v_membership
  from public.tenant_membership tm
  where tm.id = p_actor_membership_id
  for share;

  if not found
     or v_membership.tenant_code <> v_company_code
     or v_membership.status <> 'active'
     or v_membership.role not in ('tenant_admin', 'tenant_manager') then
    return query
      select false, 'forbidden', null::text, null::uuid, false;
    return;
  end if;

  -- Lock one tenant-scoped submission before reading its current status or
  -- source. This is the stale-write serialization point.
  select fps.* into v_submission
  from public.field_participation_submissions fps
  where fps.id = p_submission_id
    and fps.tenant_code = v_company_code
  for update;

  if not found then
    return query
      select false, 'not_found', null::text, null::uuid, false;
    return;
  end if;

  v_inbox_type := case
    when v_submission.raw_payload->>'source' = 'risk_share_participation_submit_v1'
      and v_submission.raw_payload->>'mode' = 'prework'
      then 'prework'
    when v_submission.raw_payload->>'source' in (
      'risk_share_anonymous_feedback_v1',
      'anonymous_worker_feedback_v1'
    ) then 'anonymous'
    when v_submission.raw_payload->>'source' = 'risk_share_visitor_confirmation_v1'
      then 'visitor'
    when v_submission.raw_payload->>'source' = 'risk_share_representative_confirmation_v1'
      then 'representative'
    else null
  end;

  if v_inbox_type is null then
    return query
      select false, 'unsupported_type', null::text, null::uuid, false;
    return;
  end if;

  v_current_status := coalesce(v_submission.manager_review_status, 'unreviewed');

  -- The database derives the digest from normalized inputs. The application
  -- cannot make two different requests look like the same replay by supplying
  -- its own digest.
  v_request_digest := encode(
    extensions.digest(
      convert_to(
        jsonb_build_array(
          v_company_code,
          p_actor_membership_id::text,
          p_submission_id::text,
          v_inbox_type,
          p_expected_status,
          p_next_status,
          v_action_note
        )::text,
        'UTF8'
      ),
      'sha256'::text
    ),
    'hex'
  );

  -- Serialize reuse of one tenant idempotency key, including the edge case
  -- where a caller accidentally reuses it for a different submission.
  perform pg_advisory_xact_lock(
    hashtextextended(v_company_code || ':' || v_idempotency_key, 0)
  );

  select rie.* into v_replay
  from public.risk_share_inbox_review_events rie
  where rie.tenant_code = v_company_code
    and rie.idempotency_key = v_idempotency_key;

  if found then
    if v_replay.request_digest = v_request_digest
       and v_replay.submission_id = p_submission_id
       and v_replay.actor_membership_id = p_actor_membership_id
       and v_replay.inbox_type = v_inbox_type
       and v_replay.from_status = p_expected_status
       and v_replay.to_status = p_next_status
       and v_replay.action_note is not distinct from v_action_note then
      return query
        select true, 'replayed', v_replay.to_status, v_replay.id, true;
      return;
    end if;

    return query
      select false, 'idempotency_conflict', v_current_status, v_replay.id, false;
    return;
  end if;

  if v_current_status <> p_expected_status then
    return query
      select false, 'status_conflict', v_current_status, null::uuid, false;
    return;
  end if;

  -- The row update and event insert are one function transaction. Any raised
  -- error aborts both writes; there is intentionally no exception handler that
  -- could convert a partial failure into success.
  update public.field_participation_submissions fps
  set manager_review_status = p_next_status,
      manager_action_note = v_action_note,
      manager_reviewed_at = now(),
      manager_reviewed_by_membership_id = p_actor_membership_id
  where fps.id = p_submission_id
    and fps.tenant_code = v_company_code
    and coalesce(fps.manager_review_status, 'unreviewed') = p_expected_status;

  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then
    raise exception 'manager inbox review update invariant failed';
  end if;

  insert into public.risk_share_inbox_review_events (
    tenant_code,
    submission_id,
    inbox_type,
    from_status,
    to_status,
    action_note,
    actor_membership_id,
    idempotency_key,
    request_digest
  ) values (
    v_company_code,
    p_submission_id,
    v_inbox_type,
    p_expected_status,
    p_next_status,
    v_action_note,
    p_actor_membership_id,
    v_idempotency_key,
    v_request_digest
  )
  returning id into v_event_id;

  return query
    select true, 'updated', p_next_status, v_event_id, false;
end;
$$;

alter function public.update_risk_share_inbox_review_status(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text
)
owner to postgres;

revoke all on function public.update_risk_share_inbox_review_status(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text
)
from public, anon, authenticated, service_role;

grant execute on function public.update_risk_share_inbox_review_status(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text
)
to service_role;

comment on function public.update_risk_share_inbox_review_status(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  text
) is
  'Atomically updates one tenant-scoped non-monthly manager inbox status and appends its immutable audit event. Exact retries replay; stale writes and idempotency-key conflicts fail closed. Service role only.';

-- Catalog postconditions make apply-time drift fail closed. Static repository
-- verification is still not a substitute for an isolated runtime matrix.
do $$
declare
  v_function_count integer;
  v_function record;
  v_policy_count integer;
  v_role record;
  v_unexpected_acl_count integer;
  v_service_role_grantable boolean;
  v_identity_sequence text;
begin
  select count(*) into v_function_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_risk_share_inbox_review_status';

  if v_function_count <> 1 then
    raise exception
      'manager inbox review RPC postcondition failed: function overload count is not exactly one';
  end if;

  select p.proowner, p.prosecdef, p.proconfig
  into v_function
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_risk_share_inbox_review_status'
    and array(select unnest(p.proargtypes::oid[])) = array[
      'text'::regtype::oid,
      'uuid'::regtype::oid,
      'uuid'::regtype::oid,
      'text'::regtype::oid,
      'text'::regtype::oid,
      'text'::regtype::oid,
      'text'::regtype::oid
    ];

  if not found
     or v_function.proowner <> 'postgres'::regrole
     or v_function.prosecdef is distinct from true
     or v_function.proconfig is distinct from array['search_path=public, pg_temp'] then
    raise exception
      'manager inbox review RPC postcondition failed: signature, owner, SECURITY DEFINER, or search_path mismatch';
  end if;

  if not exists (
       select 1
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'risk_share_inbox_review_events'
         and c.relkind = 'r'
         and c.relowner = 'postgres'::regrole
         and c.relrowsecurity = true
     ) then
    raise exception
      'manager inbox review RPC postcondition failed: event table owner or RLS mismatch';
  end if;

  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'risk_share_inbox_review_events';

  if v_policy_count <> 0 then
    raise exception
      'manager inbox review RPC postcondition failed: event table must have no client policy';
  end if;

  select pg_get_serial_sequence(
    'public.risk_share_inbox_review_events',
    'event_sequence'
  ) into v_identity_sequence;

  if v_identity_sequence is distinct from
       'public.risk_share_inbox_review_events_event_sequence_seq'
     or not exists (
       select 1
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'risk_share_inbox_review_events_event_sequence_seq'
         and c.relkind = 'S'
         and c.relowner = 'postgres'::regrole
     ) then
    raise exception
      'manager inbox review RPC postcondition failed: identity sequence association or owner mismatch';
  end if;

  -- Default privileges may add grants at CREATE time. Inspect the effective
  -- ACL instead of assuming the explicit REVOKE/GRANT statements were enough.
  select count(*) into v_unexpected_acl_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
  where n.nspname = 'public'
    and p.proname = 'update_risk_share_inbox_review_status'
    and a.privilege_type = 'EXECUTE'
    and a.grantee not in ('postgres'::regrole, 'service_role'::regrole);

  if v_unexpected_acl_count <> 0 then
    raise exception
      'manager inbox review RPC postcondition failed: unexpected function grantee';
  end if;

  select a.is_grantable into v_service_role_grantable
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
  where n.nspname = 'public'
    and p.proname = 'update_risk_share_inbox_review_status'
    and a.privilege_type = 'EXECUTE'
    and a.grantee = 'service_role'::regrole;

  if v_service_role_grantable is distinct from false then
    raise exception
      'manager inbox review RPC postcondition failed: service_role function grant option mismatch';
  end if;

  select count(*) into v_unexpected_acl_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace,
  lateral aclexplode(coalesce(c.relacl, acldefault('S', c.relowner))) as a
  where n.nspname = 'public'
    and c.relname = 'risk_share_inbox_review_events_event_sequence_seq'
    and a.grantee <> 'postgres'::regrole;

  if v_unexpected_acl_count <> 0 then
    raise exception
      'manager inbox review RPC postcondition failed: unexpected identity sequence grant';
  end if;

  select count(*) into v_unexpected_acl_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace,
  lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as a
  where n.nspname = 'public'
    and c.relname = 'risk_share_inbox_review_events'
    and (
      a.grantee not in ('postgres'::regrole, 'service_role'::regrole)
      or (
        a.grantee = 'service_role'::regrole
        and a.privilege_type <> 'SELECT'
      )
    );

  if v_unexpected_acl_count <> 0 then
    raise exception
      'manager inbox review RPC postcondition failed: unexpected event table grant';
  end if;

  select a.is_grantable into v_service_role_grantable
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace,
  lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) as a
  where n.nspname = 'public'
    and c.relname = 'risk_share_inbox_review_events'
    and a.grantee = 'service_role'::regrole
    and a.privilege_type = 'SELECT';

  if v_service_role_grantable is distinct from false then
    raise exception
      'manager inbox review RPC postcondition failed: service_role table grant option mismatch';
  end if;

  for v_role in
    select *
    from (values
      ('service_role', true, true),
      ('anon', false, false),
      ('authenticated', false, false),
      ('public', false, false)
    ) as expected(role_name, expected_select, expected_execute)
  loop
    if has_table_privilege(
         v_role.role_name,
         'public.risk_share_inbox_review_events',
         'SELECT'
       ) <> v_role.expected_select
       or has_table_privilege(v_role.role_name, 'public.risk_share_inbox_review_events', 'INSERT') <> false
       or has_table_privilege(v_role.role_name, 'public.risk_share_inbox_review_events', 'UPDATE') <> false
       or has_table_privilege(v_role.role_name, 'public.risk_share_inbox_review_events', 'DELETE') <> false
       or has_function_privilege(
         v_role.role_name,
         'public.update_risk_share_inbox_review_status(text, uuid, uuid, text, text, text, text)',
         'EXECUTE'
       ) <> v_role.expected_execute then
      raise exception
        'manager inbox review RPC postcondition failed: % ACL mismatch',
        v_role.role_name;
    end if;
  end loop;
end
$$;
