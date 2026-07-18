-- SafeMetrica Risk Share Pack: A2 v1 batch preparation RPC -- digest schema
-- qualification fix
--
-- Corrective migration, additive only. Does not edit
-- 20260718010000_add_risk_share_batch_preparation_rpc.sql (already merged
-- and applied to Production). No table change, no RLS change, no business
-- logic change of any kind -- the only functional difference from that
-- migration's function body is a single call-site schema qualification.
--
-- =====================================================================
-- Root cause (Production preflight evidence, not local-disposable-DB
-- evidence -- this defect never reproduced in the disposable Postgres 16
-- containers used to build/audit 20260718010000, because every
-- `create extension if not exists pgcrypto;` in this repo's entire
-- migration history omits `with schema`, so a vanilla local Postgres
-- installs it into `public`; Supabase Production installs pgcrypto into a
-- separate `extensions` schema by platform convention. This is the first
-- migration in this repo to ever call a genuine pgcrypto-only function --
-- every prior `create extension if not exists pgcrypto` was actually only
-- ever needed for gen_random_uuid(), which has been a native, unqualified
-- Postgres builtin since PG13, not a pgcrypto symbol -- so no prior
-- migration's search_path was ever actually exercised against this gap):
--
--   to_regprocedure('digest(text,text)')            = null
--   to_regprocedure('public.digest(text,text)')      = null
--   to_regprocedure('extensions.digest(text,text)')  = extensions.digest(text,text)
--   to_regprocedure('extensions.digest(bytea,text)') = extensions.digest(bytea,text)
--
-- prepare_risk_share_items_for_tenant is `security definer set search_path
-- = public, pg_temp` (locked, unchanged by this migration -- see the
-- postcondition below). Its candidate fingerprint expression called
-- `digest(<text>, 'sha256')` unqualified, which cannot resolve under that
-- fixed search_path on Production, aborting the call before any candidate
-- is touched. Confirmed no runtime fixture/domain write occurred: Call 1
-- was not reached, no risk_share_items row, no risk_share_preparation_
-- decisions row, no risk_share_version_locks row.
--
-- This is not a signature, ACL, ownership, or SECURITY DEFINER defect --
-- all of those were independently verified correct in prior audits. The
-- only functional correction in this file is:
--
--   digest(<same fingerprint text expression>, 'sha256')
--   -> extensions.digest(<same fingerprint text expression>, 'sha256'::text)
--
-- wrapped in encode(..., 'hex') exactly as before. Field order, the
-- E'\x1f' delimiter, trim/coalesce behavior, and hex output format are
-- byte-for-byte unchanged -- a fingerprint computed by the corrected
-- function is identical to one that a hypothetically-working unqualified
-- call would have produced, so no previously-recorded
-- candidate_input_fingerprint value is invalidated by this fix.
--
-- =====================================================================
-- Precondition, same fail-closed contract as 20260718010000's own
-- precondition (overload / owner / direct-ACL), reproduced here rather
-- than assumed, because this migration performs its own CREATE OR
-- REPLACE against the same exact signature and must not silently replace
-- or delete a function it does not have exclusive, verified control over.
-- Additionally verifies, only for this migration's own concern:
--   - the existing function's search_path is still exactly
--     `public, pg_temp` (proves nothing has drifted before this fix
--     changes anything else about the function body)
--   - extensions.digest(text, text) actually exists, so this migration
--     fails closed with a clear, targeted message instead of a generic
--     "function does not exist" surfaced from deep inside CREATE OR
--     REPLACE's own body validation
-- =====================================================================

do $$
declare
  v_total_count integer;
  v_exact_count integer;
  v_existing_owner oid;
  v_existing_config text[];
  v_current_user_oid oid := current_user::regrole::oid;
  v_service_role_oid oid := 'service_role'::regrole::oid;
  v_unexpected_acl_count integer;
  v_expected_argtypes oid[] := array[
    'text'::regtype::oid,
    'uuid'::regtype::oid,
    'uuid'::regtype::oid,
    'int4'::regtype::oid,
    'text'::regtype::oid,
    '_uuid'::regtype::oid
  ];
begin
  if to_regprocedure('extensions.digest(text, text)') is null then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix precondition failed: extensions.digest(text, text) is not available';
  end if;

  select count(*) into v_total_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant';

  select count(*) into v_exact_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    -- proargtypes is oidvector; unnest+re-collect avoids its native
    -- 0-based subscripting defeating a direct oid[] equality comparison
    -- (verified, disposable Postgres 16 -- same reasoning as
    -- 20260718010000's own precondition/postcondition).
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_total_count <> 1 or v_exact_count <> 1 then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix precondition failed: expected exactly 1 function with the exact signature, found total=%, exact=%',
      v_total_count, v_exact_count;
  end if;

  select p.proowner, p.proconfig into v_existing_owner, v_existing_config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_existing_owner <> v_current_user_oid then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix precondition failed: function owner does not match migration role';
  end if;

  if v_existing_config is distinct from array['search_path=public, pg_temp'] then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix precondition failed: existing search_path configuration does not match the expected public, pg_temp contract';
  end if;

  select count(*) into v_unexpected_acl_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes
    and a.privilege_type = 'EXECUTE'
    and a.grantee not in (v_existing_owner, v_service_role_oid);

  if v_unexpected_acl_count > 0 then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix precondition failed: unexpected execute grant exists';
  end if;
end
$$;

-- =====================================================================
-- CREATE OR REPLACE: byte-for-byte identical to
-- 20260718010000_add_risk_share_batch_preparation_rpc.sql's function body
-- except for the single fingerprint call-site schema qualification.
-- Signature, argument order, default p_candidate_ids = null, RETURNS
-- TABLE columns/order, language, SECURITY DEFINER, search_path, all
-- structural validation, membership/source/candidate lock order,
-- eligibility logic, decision logic, item-before-decision atomicity,
-- idempotency behavior, safe_metadata, raw_payload, and result_code
-- behavior are unchanged.
-- =====================================================================

create or replace function public.prepare_risk_share_items_for_tenant(
  p_company_code text,
  p_source_id uuid,
  p_actor_membership_id uuid,
  p_policy_version integer,
  p_idempotency_key text,
  p_candidate_ids uuid[] default null
)
returns table (
  candidate_id uuid,
  decision text,
  reason_code text,
  item_id uuid,
  decision_id uuid,
  result_code text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_company_code text;
  v_idempotency_key text;
  v_requested_ids uuid[];
  v_requested_count integer;
  v_target_ids uuid[];
  v_membership_role text;
  v_membership_status text;
  v_membership_tenant_code text;
  v_correlation_id uuid := gen_random_uuid();
  v_batch_position integer := 0;
  v_candidate public.risk_share_item_candidates%rowtype;
  v_locked_ids uuid[] := '{}';
  v_missing_ids uuid[];
  v_confirmed_mapping_version integer;
  v_mapping_found boolean;
  v_existing_item_id uuid;
  v_out_decision text;
  v_out_reason_code text;
  v_out_item_id uuid;
  v_out_decision_id uuid;
  v_out_result_code text;
  v_fingerprint text;
  v_existing_decision public.risk_share_preparation_decisions%rowtype;
  v_safe_metadata jsonb;
  v_new_item_id uuid;
  v_new_decision_id uuid;
begin
  -- =====================================================================
  -- 1. Structural / malformed-input validation. Fail-closed with a single
  -- mechanical result row (candidate_id null); nothing is read or locked
  -- before every check below passes.
  -- =====================================================================

  v_company_code := lower(btrim(coalesce(p_company_code, '')));

  if v_company_code !~ '^[a-z0-9][a-z0-9-]{0,63}$' then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  if p_source_id is null or p_actor_membership_id is null then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  -- policy_version must be exactly 1 in v1 (contract lock #10). `is
  -- distinct from` (not `<>`) so a null p_policy_version is also rejected
  -- rather than short-circuiting the whole IF to unknown/false.
  if p_policy_version is distinct from 1 then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  if p_idempotency_key is null then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  v_idempotency_key := btrim(p_idempotency_key);

  if length(v_idempotency_key) = 0 or length(v_idempotency_key) > 200 then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  -- An explicit empty array is a distinct, malformed request -- not the
  -- same as omitting p_candidate_ids (which means "all eligible").
  if p_candidate_ids is not null and coalesce(array_length(p_candidate_ids, 1), 0) = 0 then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  -- A multi-dimensional array (verified, disposable Postgres 16: `uuid[]`
  -- accepts any dimensionality at the type level, and array_position
  -- raises "searching for elements in multidimensional arrays is not
  -- supported" rather than returning a value) is rejected explicitly and
  -- gracefully here, before array_position is ever called on it below --
  -- every other malformed-input case in this function returns an
  -- invalid_request row rather than letting a raw Postgres error escape,
  -- and this is no exception to that contract. array_ndims returns null
  -- for a null or empty array (already handled above) and the actual
  -- dimension count otherwise, so coalescing to 1 only affects the cases
  -- already excluded by this point.
  if p_candidate_ids is not null and coalesce(array_ndims(p_candidate_ids), 1) > 1 then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  -- A NULL element inside an otherwise non-empty array (ARRAY[NULL],
  -- ARRAY[valid_uuid, NULL], ...) is malformed input, not "no candidate" --
  -- silently dropping it via array_agg(distinct x) below would let a
  -- caller bug quietly shrink its own batch instead of failing loudly.
  -- array_position(array, null) is verified (disposable Postgres 16) to
  -- correctly locate a NULL element and return its subscript, unlike
  -- `x = ANY(array)`, which can never match NULL under standard SQL
  -- three-valued logic.
  if p_candidate_ids is not null and array_position(p_candidate_ids, null) is not null then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'invalid_request'::text;
    return;
  end if;

  if p_candidate_ids is not null then
    select coalesce(array_agg(distinct x), '{}')
    into v_requested_ids
    from unnest(p_candidate_ids) as x;

    v_requested_count := coalesce(array_length(v_requested_ids, 1), 0);

    if v_requested_count > 200 then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'too_many_candidates'::text;
      return;
    end if;
  end if;

  -- =====================================================================
  -- 2. Membership lock. FOR SHARE: this function never writes
  -- tenant_membership. Every failure mode -- missing row, wrong status,
  -- wrong role, wrong tenant -- collapses to the same generic forbidden,
  -- matching review_risk_share_item's discipline of never letting a
  -- caller distinguish "wrong tenant" from "does not exist".
  -- =====================================================================

  select tenant_membership.role, tenant_membership.status, tenant_membership.tenant_code
    into v_membership_role, v_membership_status, v_membership_tenant_code
  from public.tenant_membership
  where tenant_membership.id = p_actor_membership_id
  for share;

  if not found
     or v_membership_status <> 'active'
     or v_membership_role not in ('tenant_admin', 'tenant_manager')
     or v_membership_tenant_code <> v_company_code then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'forbidden'::text;
    return;
  end if;

  -- =====================================================================
  -- 3. Source lock. FOR UPDATE (not FOR SHARE) -- see header comment for
  -- why holding this for the whole transaction is what keeps the
  -- confirmed mapping version stable for the whole batch.
  -- =====================================================================

  perform 1
  from public.risk_share_sources
  where risk_share_sources.id = p_source_id
    and risk_share_sources.company_code = v_company_code
  for update;

  if not found then
    return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'source_not_found'::text;
    return;
  end if;

  -- =====================================================================
  -- 4. Target candidate id set.
  -- =====================================================================

  if p_candidate_ids is not null then
    v_target_ids := v_requested_ids;
  else
    select coalesce(array_agg(c.id order by c.id), '{}')
    into v_target_ids
    from public.risk_share_item_candidates c
    where c.company_code = v_company_code
      and c.source_id = p_source_id
      and c.reviewer_status = 'pending'
      and c.mapping_version is not null
      and not exists (
        select 1 from public.risk_share_items i where i.candidate_id = c.id
      );

    if coalesce(array_length(v_target_ids, 1), 0) > 200 then
      return query select null::uuid, null::text, null::text, null::uuid, null::uuid, 'too_many_candidates'::text;
      return;
    end if;
  end if;

  if coalesce(array_length(v_target_ids, 1), 0) = 0 then
    return;
  end if;

  -- =====================================================================
  -- 5. Candidate locks, deterministic ascending-id order, then per-row
  -- eligibility + decision + write. Each row is re-evaluated from its
  -- current locked state, not from whatever produced v_target_ids -- for
  -- the "all eligible" branch this matters if a concurrent Owner candidate
  -- review changes reviewer_status between the plain SELECT in section 4
  -- and this lock (READ COMMITTED re-reads fresh at each statement).
  -- =====================================================================

  for v_candidate in
    select c.*
    from public.risk_share_item_candidates c
    where c.id = any(v_target_ids)
      and c.company_code = v_company_code
      and c.source_id = p_source_id
    order by c.id asc
    for update
  loop
    v_locked_ids := array_append(v_locked_ids, v_candidate.id);
    v_batch_position := v_batch_position + 1;

    v_out_decision := null;
    v_out_reason_code := null;
    v_out_item_id := null;
    v_out_decision_id := null;

    -- 5a. Idempotency pre-check FIRST, ahead of any eligibility/state
    -- check below. This is a fingerprint-content-only lookup keyed on
    -- (company_code, idempotency_key, candidate_id); it deliberately does
    -- not depend on the candidate's current reviewer_status/mapping/item
    -- state, because a replay of a caller's own prior request must return
    -- what actually happened before, not a fresh re-derivation against
    -- possibly-changed current state. Concretely: without this ordering, a
    -- caller retrying its own successful auto_prepared call under the
    -- same idempotency_key would hit the item-already-exists check in 5c
    -- below (since its own first call already created that item) and get
    -- back item_already_exists instead of replayed -- indistinguishable
    -- from a totally unrelated process having created that item. This
    -- candidate is already FOR UPDATE locked for the rest of this
    -- transaction, so -- unlike review_risk_share_item -- no concurrent
    -- writer can race this exact candidate_id past this point; the ON
    -- CONFLICT DO NOTHING insert in 5d is defense-in-depth, not the
    -- primary race guard.
    --
    -- extensions.digest, schema-qualified: this function's search_path is
    -- fixed to `public, pg_temp` (SECURITY DEFINER). pgcrypto's hashing
    -- function lives in `public` only on a vanilla local Postgres install
    -- where no schema was specified at CREATE EXTENSION time -- Supabase
    -- Production installs pgcrypto into a separate `extensions` schema by
    -- platform convention, so an unqualified call cannot resolve there.
    -- Schema-qualifying the call, not widening search_path, is the fix:
    -- widening search_path would apply to every identifier resolved in
    -- this SECURITY DEFINER function's body, reopening exactly the
    -- search_path-hijacking risk `set search_path = public, pg_temp`
    -- exists to close. The explicit ::text cast on the second argument
    -- disambiguates against extensions.digest(bytea, text), which also
    -- exists on Production -- the first argument here is already a text
    -- expression, so this cast is redundant for correctness but removes
    -- any reliance on implicit unknown-literal overload resolution.
    v_fingerprint := encode(
      extensions.digest(
        coalesce(btrim(v_candidate.task_name), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.hazard), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.current_controls), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.improvement_plan), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.risk_level), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.worker_share_summary), '') || E'\x1f' ||
        coalesce(v_candidate.mapping_version::text, ''),
        'sha256'::text
      ),
      'hex'
    );

    select d.* into v_existing_decision
    from public.risk_share_preparation_decisions d
    where d.company_code = v_company_code
      and d.idempotency_key = v_idempotency_key
      and d.candidate_id = v_candidate.id;

    if found then
      if v_existing_decision.candidate_input_fingerprint = v_fingerprint then
        return query select
          v_candidate.id,
          v_existing_decision.decision,
          v_existing_decision.reason_code,
          v_existing_decision.item_id,
          v_existing_decision.id,
          'replayed'::text;
      else
        return query select v_candidate.id, null::text, null::text, null::uuid, null::uuid, 'idempotency_conflict'::text;
      end if;

      continue;
    end if;

    -- 5b. Eligibility gate. Purely mechanical, never touches the ledger.
    if v_candidate.reviewer_status <> 'pending' or v_candidate.mapping_version is null then
      return query select v_candidate.id, null::text, null::text, null::uuid, null::uuid, 'not_eligible'::text;
      continue;
    end if;

    select i.id into v_existing_item_id
    from public.risk_share_items i
    where i.candidate_id = v_candidate.id;

    if found then
      return query select v_candidate.id, null::text, null::text, v_existing_item_id, null::uuid, 'item_already_exists'::text;
      continue;
    end if;

    -- 5c. Decision logic, fixed order: missing field -> mapping conflict
    -- -> source-faithful auto -> not_eligible catch-all.
    if btrim(coalesce(v_candidate.task_name, '')) = '' or btrim(coalesce(v_candidate.hazard, '')) = '' then
      v_out_decision := 'owner_exception_required';
      v_out_reason_code := 'MISSING_REQUIRED_FIELD';
      v_safe_metadata := jsonb_build_object(
        'evaluation_rule_ids', jsonb_build_array('A2_V1_MISSING_REQUIRED_FIELD'),
        'batch_position', v_batch_position
      );
    else
      select m.mapping_version into v_confirmed_mapping_version
      from public.risk_share_source_column_mappings m
      where m.company_code = v_company_code
        and m.source_id = p_source_id
        and m.sheet_index = v_candidate.sheet_index
        and m.status = 'confirmed';

      v_mapping_found := found;

      if not v_mapping_found or v_confirmed_mapping_version <> v_candidate.mapping_version then
        v_out_decision := 'owner_exception_required';
        v_out_reason_code := 'MAPPING_CONFLICT';
        v_safe_metadata := jsonb_build_object(
          'mapping_match', false,
          'evaluation_rule_ids', jsonb_build_array('A2_V1_MAPPING_CONFLICT'),
          'batch_position', v_batch_position
        );
      elsif v_candidate.ai_generated = false then
        -- AUTO_SOURCE_FAITHFUL is the only auto_prepared reason_code v1
        -- ever emits (contract lock #6/#7). Every other criterion this
        -- bucket needs (pending, complete provenance, task/hazard
        -- present, no existing item) was already checked above.
        v_out_decision := 'auto_prepared';
        v_out_reason_code := 'AUTO_SOURCE_FAITHFUL';
        v_safe_metadata := jsonb_build_object(
          'mapping_match', true,
          'evaluation_rule_ids', jsonb_build_array('A2_V1_SOURCE_FAITHFUL'),
          'batch_position', v_batch_position
        );
      end if;
      -- ai_generated=true candidates fall through with v_out_decision
      -- still null -- handled as not_eligible below. Unreachable under
      -- current data (the confirmed-mapping import RPC always writes
      -- ai_generated=false), kept as an explicit, honest guard rather
      -- than an assumption.
    end if;

    if v_out_decision is null then
      return query select v_candidate.id, null::text, null::text, null::uuid, null::uuid, 'not_eligible'::text;
      continue;
    end if;

    -- 5d. Real write. Item first (only for auto_prepared), decision
    -- second -- makes "decision recorded, item missing" structurally
    -- unreachable rather than something to guard against after the fact.
    -- No exception handler wraps this: an unexpected failure here aborts
    -- this whole transaction, not just this candidate.
    v_new_item_id := null;

    if v_out_decision = 'auto_prepared' then
      insert into public.risk_share_items (
        source_id, candidate_id, company_code, company_name, site_name,
        task_name, hazard, accident_type, risk_level, current_controls,
        improvement_plan, worker_share_summary, category, share_status,
        customer_check_status, customer_confirmed, worker_visible,
        version_lock_id, source_page, source_row, owner_note, customer_note,
        raw_payload
      ) values (
        v_candidate.source_id, v_candidate.id, v_company_code, v_candidate.company_name, v_candidate.site_name,
        v_candidate.task_name, v_candidate.hazard, v_candidate.accident_type, v_candidate.risk_level, v_candidate.current_controls,
        v_candidate.improvement_plan, v_candidate.worker_share_summary, v_candidate.category, 'draft',
        'not_requested', false, false,
        null, v_candidate.source_page, v_candidate.source_row, null, null,
        jsonb_build_object(
          'source', 'a2_batch_preparation_v1',
          'decision', v_out_decision,
          'reasonCode', v_out_reason_code,
          'correlationId', v_correlation_id
        )
      )
      returning id into v_new_item_id;
    end if;

    insert into public.risk_share_preparation_decisions (
      company_code, source_id, candidate_id, item_id, mapping_version,
      decision, reason_code, policy_version, candidate_input_fingerprint,
      actor_type, actor_membership_id, initiated_by_membership_id,
      correlation_id, idempotency_key, safe_metadata
    ) values (
      v_company_code, v_candidate.source_id, v_candidate.id, v_new_item_id, v_candidate.mapping_version,
      v_out_decision, v_out_reason_code, p_policy_version, v_fingerprint,
      'system', null, p_actor_membership_id,
      v_correlation_id, v_idempotency_key, v_safe_metadata
    )
    on conflict (company_code, idempotency_key, candidate_id) do nothing
    returning id into v_new_decision_id;

    if v_new_decision_id is null then
      raise exception
        'prepare_risk_share_items_for_tenant: unexpected idempotency race for candidate % under a lock that should have prevented it',
        v_candidate.id;
    end if;

    return query select v_candidate.id, v_out_decision, v_out_reason_code, v_new_item_id, v_new_decision_id, 'created'::text;
  end loop;

  -- =====================================================================
  -- 6. Requested ids that never resolved to a lockable row in this
  -- tenant/source -- wrong tenant, wrong source, or nonexistent -- are
  -- reported as invalid_candidate without distinguishing which. Only
  -- reachable when p_candidate_ids was explicit; the "all eligible"
  -- branch derives v_target_ids from the same company_code/source_id
  -- filter this lock query re-applies, so it always fully resolves.
  -- =====================================================================

  select coalesce(array_agg(x), '{}') into v_missing_ids
  from unnest(v_target_ids) as x
  where x <> all(v_locked_ids);

  if coalesce(array_length(v_missing_ids, 1), 0) > 0 then
    return query
      select x, null::text, null::text, null::uuid, null::uuid, 'invalid_candidate'::text
      from unnest(v_missing_ids) as x;
  end if;
end;
$$;

-- =====================================================================
-- Reapply the exact privilege contract after replacement. CREATE OR
-- REPLACE does not reset ACL, but this is re-run unconditionally (not
-- gated on "did CREATE OR REPLACE just run for the first time") so this
-- migration's own privilege guarantee never silently depends on what the
-- prior migration already established.
-- =====================================================================

revoke all on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) from public;

revoke execute on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) from anon, authenticated;

revoke all on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) from service_role;

grant execute on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) to service_role;

comment on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) is
  'A2 v1 tenant-safe batch preparation RPC. Prepares source-faithful mapped candidates as private draft risk_share_items and records every candidate judgment in risk_share_preparation_decisions. Never sets worker_visible/customer_confirmed true, never creates a Version Lock, never changes reviewer_status, never emits manager_review_required or AUTO_SAME_MAPPING in v1. Server-only: no anon/authenticated execute grant. Candidate fingerprint uses extensions.digest (schema-qualified for Supabase Production, where pgcrypto is installed outside public) -- fixed by 20260718020000, see that migration for root cause.';

-- =====================================================================
-- Postcondition: everything 20260718010000's own postcondition already
-- verified, unchanged, plus two checks specific to this fix.
-- =====================================================================

do $$
declare
  v_total_count integer;
  v_exact_count integer;
  v_fn record;
  v_priv record;
  v_functiondef text;
  v_total_digest_calls integer;
  v_qualified_digest_calls integer;
  v_expected_argtypes oid[] := array[
    'text'::regtype::oid,
    'uuid'::regtype::oid,
    'uuid'::regtype::oid,
    'int4'::regtype::oid,
    'text'::regtype::oid,
    '_uuid'::regtype::oid
  ];
  v_expected_allargtypes oid[] := array[
    'text'::regtype::oid, 'uuid'::regtype::oid, 'uuid'::regtype::oid,
    'int4'::regtype::oid, 'text'::regtype::oid, '_uuid'::regtype::oid,
    'uuid'::regtype::oid, 'text'::regtype::oid, 'text'::regtype::oid,
    'uuid'::regtype::oid, 'uuid'::regtype::oid, 'text'::regtype::oid
  ];
  v_expected_argmodes "char"[] := array['i','i','i','i','i','i','t','t','t','t','t','t']::"char"[];
  v_current_user_oid oid := current_user::regrole::oid;
  v_service_role_oid oid := 'service_role'::regrole::oid;
  v_unexpected_acl_count integer;
  v_service_role_grantable boolean;
begin
  select count(*) into v_total_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'prepare_risk_share_items_for_tenant';

  select count(*) into v_exact_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_total_count <> 1 or v_exact_count <> 1 then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: expected exactly 1 function with the exact signature, found total=%, exact=%',
      v_total_count, v_exact_count;
  end if;

  select p.prokind, p.proretset, p.proallargtypes, p.proargmodes, p.proowner, p.prosecdef, p.proconfig
    into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_fn.prokind <> 'f' then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: prokind is not a plain function';
  end if;

  if v_fn.proretset is distinct from true then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: function does not return a set (RETURNS TABLE expected)';
  end if;

  if v_fn.proallargtypes::oid[] is distinct from v_expected_allargtypes then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: RETURNS TABLE column type shape does not match';
  end if;

  if v_fn.proargmodes is distinct from v_expected_argmodes then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: argument in/out mode shape does not match';
  end if;

  if v_fn.proowner <> v_current_user_oid then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: function owner does not match migration role';
  end if;

  if v_fn.prosecdef is distinct from true then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: SECURITY DEFINER is not set';
  end if;

  if v_fn.proconfig is distinct from array['search_path=public, pg_temp'] then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: search_path configuration does not match the expected public, pg_temp contract';
  end if;

  select count(*) into v_unexpected_acl_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes
    and a.privilege_type = 'EXECUTE'
    and a.grantee not in (v_current_user_oid, v_service_role_oid);

  if v_unexpected_acl_count > 0 then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: unexpected execute grant exists';
  end if;

  select a.is_grantable into v_service_role_grantable
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes
    and a.privilege_type = 'EXECUTE'
    and a.grantee = v_service_role_oid;

  if v_service_role_grantable is distinct from false then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: service_role EXECUTE grant is WITH GRANT OPTION';
  end if;

  for v_priv in
    select *
    from (values
      ('service_role', true), ('anon', false), ('authenticated', false), ('public', false)
    ) as expected(role_name, expected_value)
  loop
    if has_function_privilege(
      v_priv.role_name,
      'public.prepare_risk_share_items_for_tenant(text, uuid, uuid, integer, text, uuid[])',
      'EXECUTE'
    ) <> v_priv.expected_value then
      raise exception
        'prepare_risk_share_items_for_tenant digest-fix postcondition failed: % EXECUTE privilege does not match the expected contract',
        v_priv.role_name;
    end if;
  end loop;

  -- Digest-fix-specific: every digest( call site in the function
  -- definition is schema-qualified as extensions.digest(. Substring
  -- occurrence counting, not regex with a lookbehind (POSIX regex, the
  -- `~` operator's dialect, has no lookbehind support): 'extensions.digest('
  -- itself contains 'digest(' as a trailing substring, so counting raw
  -- occurrences of 'digest(' and of 'extensions.digest(' and requiring
  -- them equal is exactly "no unqualified digest( call exists" -- if an
  -- unqualified call were present, the total count would exceed the
  -- qualified count.
  select pg_get_functiondef(p.oid) into v_functiondef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  v_total_digest_calls := (length(v_functiondef) - length(replace(v_functiondef, 'digest(', ''))) / length('digest(');
  v_qualified_digest_calls := (length(v_functiondef) - length(replace(v_functiondef, 'extensions.digest(', ''))) / length('extensions.digest(');

  if v_qualified_digest_calls < 1 then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: no extensions.digest( call found in the function definition';
  end if;

  if v_total_digest_calls <> v_qualified_digest_calls then
    raise exception
      'prepare_risk_share_items_for_tenant digest-fix postcondition failed: an unqualified digest( call remains in the function definition';
  end if;
end
$$;
