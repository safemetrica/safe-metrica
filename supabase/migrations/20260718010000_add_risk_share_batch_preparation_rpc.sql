-- SafeMetrica Risk Share Pack: A2 v1 tenant-safe batch preparation RPC
--
-- Additive only: no table recreation, no destructive change, no backfill,
-- no existing migration touched. Writes ONLY to risk_share_items (insert)
-- and risk_share_preparation_decisions (insert) -- risk_share_sources and
-- risk_share_item_candidates are locked/read but never mutated by this
-- function. Does not touch risk_share_item_candidates.reviewer_status, the
-- existing Owner create-from-candidate route, risk_share_candidate_review_
-- events, review_risk_share_item, or create_risk_share_version_lock.
--
-- This migration deletes no database object under any circumstance,
-- including a same-named function it does not recognize: the deployment
-- precondition immediately below fails the whole migration closed via
-- RAISE EXCEPTION if any unexpected prepare_risk_share_items_for_tenant
-- overload exists, rather than dropping and replacing it. CREATE OR
-- REPLACE only ever runs against the one exact signature this file
-- defines -- either because no function with this name existed yet, or
-- because the exact signature already existed (an idempotent re-run of
-- this same migration). p_candidate_ids also rejects a NULL element
-- anywhere inside a non-empty array (invalid_request, section 1 below) --
-- not the same input as p_candidate_ids itself being NULL, which still
-- means "all eligible candidates for the source".
--
-- Idempotency contract, precisely (not "a new key always permits a fresh
-- decision" -- that is only true for a candidate that has not yet
-- produced an item):
--   - Same idempotency_key, same candidate content (fingerprint matches
--     the stored decision): replayed. No new write.
--   - Same idempotency_key, different candidate content (fingerprint
--     differs): idempotency_conflict. No new write.
--   - New idempotency_key, candidate has no item yet (owner_exception_
--     required so far, or never evaluated): a fresh decision is possible
--     and may reach a different outcome than before -- e.g. a candidate
--     content fix can turn a prior owner_exception_required into
--     auto_prepared under the new key.
--   - New idempotency_key, candidate already has an item (a prior call --
--     under any key -- already resolved it to auto_prepared): item_
--     already_exists. No new Decision is ever recorded once an item
--     exists for a candidate, regardless of key or content changes. A2 v1
--     never regenerates, updates, or re-decides an already-prepared item.
--
-- A2 v1 is preparation, not publish:
--   - worker_visible is never set true here.
--   - customer_confirmed is never set true here.
--   - No Version Lock row is ever created or referenced here.
--   - manager_review_required is never produced in v1 (contract lock #8) --
--     every eligible candidate resolves to exactly auto_prepared or
--     owner_exception_required, or is returned as not_eligible/
--     invalid_candidate with no ledger/item write at all.
--   - AUTO_SAME_MAPPING is never produced in v1 (contract lock #7). The
--     only auto_prepared reason_code this function ever emits is
--     AUTO_SOURCE_FAITHFUL, defined exactly by the criteria in section 5C
--     below -- reviewer_status='pending', complete mapping provenance,
--     candidate.mapping_version matches the currently confirmed mapping
--     for its own (source_id, sheet_index), ai_generated=false,
--     task_name/hazard non-blank, no existing risk_share_items row.
--
-- Lock order, fixed for every call: tenant_membership (FOR SHARE) ->
-- risk_share_sources (FOR UPDATE) -> risk_share_item_candidates (FOR
-- UPDATE, ascending id). No other code path in this schema ever locks
-- these in the reverse order, so two concurrent calls to this function (or
-- to any existing RPC that also touches these tables) can only ever
-- serialize on this order, never deadlock against it.
--
-- Why no explicit lock is taken on risk_share_source_column_mappings:
-- save_risk_share_source_column_mapping_version (20260713010000) opens
-- with `... from risk_share_sources where id=... and company_code=... for
-- update` on the exact same source row before it supersedes/inserts a
-- mapping version. Holding FOR UPDATE on that same row for this entire
-- transaction (see section 3 below) already blocks any concurrent mapping
-- save for this source until this call commits or rolls back -- that is
-- what makes "the confirmed mapping version stays stable for the whole
-- batch" true, not a lock taken on the mapping table itself.
--
-- Why no explicit lock is needed to make the "existing item" check
-- race-free against the existing (unlocked, non-atomic) Owner create-
-- from-candidate route: risk_share_items.candidate_id has a NOT NULL
-- foreign key to risk_share_item_candidates(id). Postgres requires a FOR
-- KEY SHARE lock on the referenced row to satisfy that FK check during any
-- INSERT into risk_share_items -- and FOR KEY SHARE conflicts with FOR
-- UPDATE held by another session on the same row. This function holds FOR
-- UPDATE on every candidate row it processes for the rest of the
-- transaction (section 5 below), so a concurrent create-from-candidate
-- INSERT for that same candidate_id blocks until this call ends, even
-- though that route itself takes no explicit lock. The "existing item"
-- SELECT in 5a is therefore race-free as long as it runs after the
-- candidate lock is acquired, which it always does here.
--
-- Result shape: always exactly one row per candidate this call actually
-- attempted (candidate_id set), OR, for a structural failure that fails
-- the whole batch before any candidate is touched, exactly one row with
-- candidate_id = null and result_code carrying the structural code. A
-- caller must check candidate_id IS NULL on the first row to distinguish
-- the two shapes. `decision` is populated only for `result_code = created`
-- or `result_code = replayed`; it is null for every mechanical result_code
-- (not_eligible / invalid_candidate / item_already_exists /
-- idempotency_conflict / any structural code).

-- Fail-closed precondition, not an auto-repair: this migration must never
-- delete or replace a function it did not itself define the shape of. An
-- earlier draft of this block queried pg_proc for every function named
-- prepare_risk_share_items_for_tenant and DROP FUNCTION'd any whose
-- argument types did not match -- destructive, and silently so: a
-- differently-shaped function under this exact name (a hotfix, a v2 draft
-- being tested, anything not authored by this migration) would have been
-- deleted with no confirmation, contradicting this file's own "additive
-- only" header. That auto-drop is removed. The only two states this
-- migration proceeds past are: no function with this name exists yet, or
-- exactly one exists and it already has the exact expected signature (a
-- re-run of this same migration). Any other state -- one or more
-- differently-shaped overloads, with or without the exact signature also
-- present -- aborts the whole migration via exception before CREATE OR
-- REPLACE runs and before anything is touched. The error message below
-- intentionally carries no function definition, argument values, or
-- customer data -- only the fact that the precondition failed.
--
-- Trusted owner + direct-grant contract, checked only when the exact
-- signature already exists (an idempotent re-run): CREATE OR REPLACE
-- FUNCTION never changes an existing function's owner or resets its ACL --
-- both persist across a re-run exactly as they were, even under a
-- superuser-run re-application (verified, disposable Postgres 16: a
-- function whose owner was reassigned to an unrelated role, or which had
-- EXECUTE granted directly to an unrelated role, kept both after a clean
-- re-run of the unmodified original version of this migration). A
-- postcondition alone cannot fix this -- it can only detect and fail loud
-- after the fact, by which point CREATE OR REPLACE has already run against
-- a function this migration does not have exclusive control over. So this
-- is checked here, before CREATE OR REPLACE, not only after:
--   - Owner must equal current_user (the trusted role actually applying
--     this migration). A mismatch aborts before anything is touched --
--     never auto-corrected via ALTER OWNER, since silently reassigning
--     ownership of a function this migration did not create is exactly
--     the kind of auto-repair section 2 above already rejects for DROP.
--   - No direct EXECUTE grant may exist on any grantee other than the
--     owner itself or service_role. aclexplode(coalesce(proacl,
--     acldefault('f', proowner))) is required, not proacl alone: a
--     function that has never had an explicit REVOKE/GRANT run against it
--     has proacl = null (verified, disposable Postgres 16) and relies on
--     acldefault('f', proowner) to expose Postgres's implicit default --
--     EXECUTE granted to PUBLIC -- which a bare `proacl is null` check
--     would miss entirely. Grantee 0 in the exploded result is PUBLIC;
--     since it is never equal to a real role's OID, comparing against
--     (owner OID, service_role OID) already catches it with no special
--     case. This never auto-repairs via REVOKE either -- it aborts before
--     CREATE OR REPLACE runs, leaving the pre-existing grant untouched for
--     an operator to investigate.
do $$
declare
  v_total_count integer;
  v_exact_count integer;
  v_existing_owner oid;
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
    -- proargtypes is oidvector, not oid[]; casting it directly to oid[]
    -- preserves oidvector's native 0-based subscripting ([0:5]=...), and
    -- Postgres array equality is bound-sensitive -- a [0:5] array never
    -- equals an ordinary (1-based) array literal even with identical
    -- elements in the same order (verified, disposable Postgres 16).
    -- array(select unnest(...)) re-collects the elements into a normal
    -- 1-based array so this comparison actually compares values, not
    -- incidental subscript bounds.
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if not (v_total_count = 0 or (v_total_count = 1 and v_exact_count = 1)) then
    raise exception
      'prepare_risk_share_items_for_tenant precondition failed: unexpected overload exists';
  end if;

  if v_total_count = 1 and v_exact_count = 1 then
    select p.proowner into v_existing_owner
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'prepare_risk_share_items_for_tenant'
      and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

    if v_existing_owner <> v_current_user_oid then
      raise exception
        'prepare_risk_share_items_for_tenant precondition failed: function owner does not match migration role';
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
        'prepare_risk_share_items_for_tenant precondition failed: unexpected execute grant exists';
    end if;
  end if;
end
$$;

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
    v_fingerprint := encode(
      digest(
        coalesce(btrim(v_candidate.task_name), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.hazard), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.current_controls), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.improvement_plan), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.risk_level), '') || E'\x1f' ||
        coalesce(btrim(v_candidate.worker_share_summary), '') || E'\x1f' ||
        coalesce(v_candidate.mapping_version::text, ''),
        'sha256'
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

revoke all on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) from public;

revoke execute on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) from anon, authenticated;

-- Reset service_role to exactly EXECUTE, nothing more, before granting it --
-- not because this migration has ever granted it anything else, but so
-- this statement sequence does not silently depend on service_role
-- carrying no other privilege on this function from any source (default
-- privileges, role membership, a future edit to this file). No custom
-- role is named here: a fresh CREATE has no prior grants to reset by
-- definition, and a re-run's unexpected-grant case is already rejected by
-- the precondition above before this point is ever reached.
revoke all on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) from service_role;

grant execute on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) to service_role;

comment on function public.prepare_risk_share_items_for_tenant(
  text, uuid, uuid, integer, text, uuid[]
) is
  'A2 v1 tenant-safe batch preparation RPC. Prepares source-faithful mapped candidates as private draft risk_share_items and records every candidate judgment in risk_share_preparation_decisions. Never sets worker_visible/customer_confirmed true, never creates a Version Lock, never changes reviewer_status, never emits manager_review_required or AUTO_SAME_MAPPING in v1. Server-only: no anon/authenticated execute grant.';

-- =====================================================================
-- Postcondition check: exactly one function under this name/signature,
-- and the service_role-only privilege matrix, are non-negotiable parts of
-- this migration's contract -- verify rather than assume.
-- =====================================================================

do $$
declare
  v_total_count integer;
  v_exact_count integer;
  v_fn record;
  v_priv record;
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
  -- 't' (table), not 'o' (out): verified, disposable Postgres 16 -- a
  -- RETURNS TABLE(...) column's proargmodes entry is 't', which is
  -- distinct from a plain OUT parameter's 'o'.
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
    -- See the precondition block above for why unnest+re-collect is
    -- required here instead of a direct oidvector::oid[] comparison.
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_total_count <> 1 or v_exact_count <> 1 then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: expected exactly 1 function with the exact signature, found total=%, exact=%',
      v_total_count, v_exact_count;
  end if;

  select p.prokind, p.proretset, p.proallargtypes, p.proargmodes, p.proowner, p.prosecdef
    into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'prepare_risk_share_items_for_tenant'
    -- See the precondition block above for why unnest+re-collect is
    -- required here instead of a direct oidvector::oid[] comparison.
    and array(select unnest(p.proargtypes::oid[])) = v_expected_argtypes;

  if v_fn.prokind <> 'f' then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: prokind is not a plain function';
  end if;

  if v_fn.proretset is distinct from true then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: function does not return a set (RETURNS TABLE expected)';
  end if;

  if v_fn.proallargtypes::oid[] is distinct from v_expected_allargtypes then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: RETURNS TABLE column type shape does not match';
  end if;

  if v_fn.proargmodes is distinct from v_expected_argmodes then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: argument in/out mode shape does not match';
  end if;

  -- Trusted owner + SECURITY DEFINER contract, verified after CREATE OR
  -- REPLACE the same way the precondition verified it before -- CREATE OR
  -- REPLACE never touches an existing function's owner or ACL, so this
  -- check is only meaningful in combination with the precondition above,
  -- not a substitute for it (by the time a postcondition failure is
  -- raised, CREATE OR REPLACE has already run against whatever was there).
  if v_fn.proowner <> v_current_user_oid then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: function owner does not match migration role';
  end if;

  if v_fn.prosecdef is distinct from true then
    raise exception
      'prepare_risk_share_items_for_tenant postcondition failed: SECURITY DEFINER is not set';
  end if;

  -- Full direct-EXECUTE-grant enumeration, not just the four named-role
  -- booleans below: has_function_privilege for service_role/anon/
  -- authenticated/public only proves those four roles have the right
  -- boolean answer, and says nothing about a fifth, unnamed role holding
  -- a direct grant this migration never revoked because it never knew to
  -- look for it. aclexplode(coalesce(proacl, acldefault('f', proowner)))
  -- enumerates every actual grantee; grantee 0 is PUBLIC and is never
  -- equal to a real role OID, so it is caught by the same owner/
  -- service_role allowlist with no special case.
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
      'prepare_risk_share_items_for_tenant postcondition failed: unexpected execute grant exists';
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
      'prepare_risk_share_items_for_tenant postcondition failed: service_role EXECUTE grant is WITH GRANT OPTION';
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
        'prepare_risk_share_items_for_tenant postcondition failed: % EXECUTE privilege does not match the expected contract',
        v_priv.role_name;
    end if;
  end loop;
end
$$;
