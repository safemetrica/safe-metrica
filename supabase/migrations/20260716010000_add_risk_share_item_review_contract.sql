-- SafeMetrica Manager Share Review: DB-only mutation + audit contract.
--
-- Additive only: no table recreation, no destructive change, no backfill of
-- unrelated data. This migration does not add a UI, an API route, or touch
-- Share Version Publish (create_risk_share_version_lock is untouched).
--
-- Adds:
--   1. risk_share_items.review_revision -- optimistic concurrency token,
--      independent of updated_at (no trigger exists on this table, so a
--      timestamp-based token would be caller-set and unreliable).
--   2. risk_share_item_review_events -- item-scoped audit ledger. The
--      existing risk_share_candidate_review_events table is candidate-only
--      (FK to risk_share_item_candidates, status enum matches
--      reviewer_status, actor_type constrained to owner/system) and is not
--      reused here by design: item review and candidate extraction review
--      are different lifecycle events with different actors.
--   3. review_risk_share_item -- atomic, SECURITY DEFINER RPC.
--      - Re-derives actor role/status/company from tenant_membership inside
--        the transaction (FOR SHARE lock -- see below); never trusts a
--        client-supplied role.
--      - Locks the item row FOR UPDATE before checking lock state and
--        revision, so concurrent/duplicate submissions for the *same* item
--        serialize on that lock instead of racing.
--      - The audit event is inserted first, via
--        INSERT ... ON CONFLICT (company_code, idempotency_key) DO NOTHING
--        RETURNING id, and risk_share_items is only mutated when that
--        insert actually wins the row. This is what makes a *cross-item*
--        race on the same idempotency_key safe: two concurrent calls for
--        two different items both hold their own item's FOR UPDATE lock
--        (no conflict there), and an earlier SELECT-based idempotency
--        pre-check cannot see the other transaction's uncommitted row --
--        only the unique index backing this INSERT is a real arbiter. The
--        loser's item row is never touched, and if the item UPDATE itself
--        does not affect exactly one row, the whole transaction (including
--        the audit insert) aborts via exception rather than leaving the
--        audit event and the item out of sync.
--      - `include` and `edit_include` are different actions: `include`
--        acknowledges the item's current content as-is (only share status /
--        worker_visible / review_revision may change; any submitted content
--        field must match the current normalized value or the call fails
--        validation), while `edit_include` is the only action that may
--        actually change task_name/hazard/current_controls/
--        improvement_plan/risk_level/worker_share_summary. This keeps the
--        audit `action` column an honest record of what happened.
--      - `idempotency_key` is canonicalized (btrim) before it is validated,
--        looked up, stored, or compared, so a key that differs only in
--        surrounding whitespace is treated as the same request. An
--        `exclude` request's `workerVisible` is likewise canonicalized to
--        `false` in the stored payload regardless of what the caller
--        literally passed, so two exclude calls that differ only in that
--        detail are idempotency-equivalent.

-- =====================================================================
-- A. risk_share_items.review_revision
-- =====================================================================

alter table public.risk_share_items
  add column if not exists review_revision bigint not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'risk_share_items_review_revision_check'
  ) then
    alter table public.risk_share_items
      add constraint risk_share_items_review_revision_check
      check (review_revision >= 1);
  end if;
end $$;

comment on column public.risk_share_items.review_revision is
  'Optimistic concurrency token for tenant Share Review mutations via review_risk_share_item. Increments by exactly 1 on each successful mutation. Not a timestamp: this table has no updated_at trigger, so revision is the only reliable stale-write guard.';

-- =====================================================================
-- B. risk_share_item_review_events
-- =====================================================================

create table if not exists public.risk_share_item_review_events (
  id uuid primary key default gen_random_uuid(),
  company_code text not null,
  site_name text,
  item_id uuid not null references public.risk_share_items(id) on delete restrict,
  candidate_id uuid references public.risk_share_item_candidates(id) on delete set null,
  source_id uuid references public.risk_share_sources(id) on delete set null,
  actor_membership_id uuid not null references public.tenant_membership(id) on delete restrict,
  actor_role text not null,
  action text not null,
  previous_revision bigint not null,
  next_revision bigint not null,
  idempotency_key text not null,
  request_payload jsonb not null default '{}'::jsonb,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),

  constraint risk_share_item_review_events_actor_role_check check (
    actor_role in ('tenant_admin', 'tenant_manager')
  ),
  constraint risk_share_item_review_events_action_check check (
    action in ('include', 'edit_include', 'exclude')
  ),
  constraint risk_share_item_review_events_revision_step_check check (
    next_revision = previous_revision + 1
  ),
  constraint risk_share_item_review_events_idempotency_key_check check (
    length(btrim(idempotency_key)) between 1 and 200
  ),
  constraint risk_share_item_review_events_request_payload_object_check check (
    jsonb_typeof(request_payload) = 'object'
  ),
  constraint risk_share_item_review_events_before_snapshot_object_check check (
    jsonb_typeof(before_snapshot) = 'object'
  ),
  constraint risk_share_item_review_events_after_snapshot_object_check check (
    jsonb_typeof(after_snapshot) = 'object'
  )
);

create unique index if not exists risk_share_item_review_events_company_idempotency_uidx
  on public.risk_share_item_review_events (company_code, idempotency_key);

create index if not exists risk_share_item_review_events_item_occurred_idx
  on public.risk_share_item_review_events (item_id, occurred_at desc);

create index if not exists risk_share_item_review_events_company_occurred_idx
  on public.risk_share_item_review_events (company_code, occurred_at desc);

create index if not exists risk_share_item_review_events_actor_occurred_idx
  on public.risk_share_item_review_events (actor_membership_id, occurred_at desc);

-- Server-only table, matching tenant_sites (20260715010000). No
-- anon/authenticated policy: all access goes through review_risk_share_item
-- using the service role key. No update/delete grant: audit rows are
-- write-once from the RPC's perspective and must not be editable after the
-- fact, even by service_role via a direct REST call.
alter table public.risk_share_item_review_events enable row level security;

revoke all privileges
  on table public.risk_share_item_review_events
  from public, anon, authenticated;

grant select, insert
  on table public.risk_share_item_review_events
  to service_role;

comment on table public.risk_share_item_review_events is
  'Tenant Share Review audit ledger for risk_share_items mutations (include / edit_include / exclude) by tenant_admin / tenant_manager actors. Distinct from risk_share_candidate_review_events, which covers Owner candidate extraction review only.';

comment on column public.risk_share_item_review_events.actor_role is
  'Role read from tenant_membership at mutation time inside review_risk_share_item. Never accepted as an RPC argument.';

comment on column public.risk_share_item_review_events.action is
  'include = acknowledge current content as-is, no content field change. edit_include = content fields may change. exclude = removed from share, worker_visible forced false. Always matches what actually happened to the item in the same transaction.';

comment on column public.risk_share_item_review_events.request_payload is
  'Normalized client-submitted review fields only (task_name/hazard/current_controls/improvement_plan/risk_level/worker_share_summary/worker_visible + action). idempotency_key and workerVisible are canonicalized before comparison/storage. No raw source row, private Blob pathname/URL, checksum, token, email, phone number, or signature original.';

comment on column public.risk_share_item_review_events.before_snapshot is
  'risk_share_items review-relevant fields immediately before this mutation. Same field allowlist as request_payload plus share_status/customer_check_status/customer_confirmed/version_lock_id/review_revision.';

comment on column public.risk_share_item_review_events.after_snapshot is
  'risk_share_items review-relevant fields immediately after this mutation. Returned verbatim on idempotent replay.';

-- =====================================================================
-- C. review_risk_share_item RPC
-- =====================================================================

-- Atomic tenant Share Review mutation for a single risk_share_items row.
-- Always returns exactly one row: (ok, code, replayed, item, review_event_id).
--
-- code values:
--   invalid_action      p_action not in (include, edit_include, exclude)
--   validation_failed    idempotency_key/expected_revision missing or malformed,
--                        or field-level validation failed for the action
--                        (including: include submitted a content field that
--                        differs from the item's current value)
--   forbidden            membership missing / not active / wrong role / wrong company
--   not_found            item does not resolve for (p_item_id, p_company_code)
--   locked                item already has version_lock_id or share_status = 'locked'
--   idempotency_conflict  same (company_code, idempotency_key) used with a
--                        different item_id / action / normalized payload,
--                        whether detected by the pre-check or by losing the
--                        atomic INSERT ... ON CONFLICT race
--   stale_revision       p_expected_revision does not match the current row
--   ok                    success (replayed = true on idempotent replay)
--
-- worker_visible=true on a successful include/edit_include is a Share Review
-- preference only. It does not expose the item on the Public QR by itself --
-- actual worker exposure only happens through a later Share Version Lock,
-- which this RPC never creates or touches.
create or replace function public.review_risk_share_item(
  p_item_id uuid,
  p_company_code text,
  p_actor_membership_id uuid,
  p_expected_revision bigint,
  p_action text,
  p_idempotency_key text,
  p_task_name text,
  p_hazard text,
  p_current_controls text,
  p_improvement_plan text,
  p_risk_level text,
  p_worker_share_summary text,
  p_worker_visible boolean
)
returns table (
  ok boolean,
  code text,
  replayed boolean,
  item jsonb,
  review_event_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_code text;
  v_idempotency_key text;
  v_membership_role text;
  v_membership_status text;
  v_membership_tenant_code text;
  v_item public.risk_share_items%rowtype;
  v_existing_event public.risk_share_item_review_events%rowtype;
  v_normalized_payload jsonb;
  v_payload_worker_visible boolean;
  v_task_name text;
  v_hazard text;
  v_current_controls text;
  v_improvement_plan text;
  v_risk_level text;
  v_worker_share_summary text;
  v_worker_visible boolean;
  v_before_snapshot jsonb;
  v_after_snapshot jsonb;
  v_next_share_status text;
  v_next_customer_check_status text;
  v_next_customer_confirmed boolean;
  v_next_revision bigint;
  v_event_id uuid;
  v_row_count integer;
  v_control_char_pattern text := '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]';
begin
  if p_action is null or p_action not in ('include', 'edit_include', 'exclude') then
    return query select false, 'invalid_action', false, null::jsonb, null::uuid;
    return;
  end if;

  if p_idempotency_key is null then
    return query select false, 'validation_failed', false, null::jsonb, null::uuid;
    return;
  end if;

  -- Canonicalize once; every validation/lookup/insert/comparison below uses
  -- this value, never the raw p_idempotency_key, so a key that differs only
  -- in surrounding whitespace is the same request.
  v_idempotency_key := btrim(p_idempotency_key);

  if length(v_idempotency_key) = 0 or length(v_idempotency_key) > 200 then
    return query select false, 'validation_failed', false, null::jsonb, null::uuid;
    return;
  end if;

  if p_expected_revision is null or p_expected_revision < 1 then
    return query select false, 'validation_failed', false, null::jsonb, null::uuid;
    return;
  end if;

  v_company_code := lower(btrim(coalesce(p_company_code, '')));

  -- 1. Membership verification. FOR SHARE, not FOR UPDATE: this RPC never
  -- writes to tenant_membership, so a shared lock is enough to let multiple
  -- concurrent reviewers read the same membership row, while still
  -- serializing against a concurrent transaction that suspends/revokes/
  -- reassigns this exact membership (which needs an exclusive row lock to
  -- UPDATE it). Whichever transaction requests its lock second waits for
  -- the first to commit, so a revoke and a review can never interleave
  -- against the same membership row -- one fully precedes the other.
  select tenant_membership.role, tenant_membership.status, tenant_membership.tenant_code
    into v_membership_role, v_membership_status, v_membership_tenant_code
  from public.tenant_membership
  where tenant_membership.id = p_actor_membership_id
  for share;

  if not found then
    return query select false, 'forbidden', false, null::jsonb, null::uuid;
    return;
  end if;

  if v_membership_status <> 'active'
     or v_membership_role not in ('tenant_admin', 'tenant_manager')
     or v_membership_tenant_code <> v_company_code then
    return query select false, 'forbidden', false, null::jsonb, null::uuid;
    return;
  end if;

  -- 2. Item row lock. A mismatched company_code resolves the same as a
  -- nonexistent item -- callers cannot distinguish "wrong tenant" from
  -- "does not exist".
  select risk_share_items.* into v_item
  from public.risk_share_items
  where risk_share_items.id = p_item_id
    and risk_share_items.company_code = v_company_code
  for update;

  if not found then
    return query select false, 'not_found', false, null::jsonb, null::uuid;
    return;
  end if;

  -- 3. Locked item block, checked inside the row lock (not a prior
  -- check-then-update in application code).
  if v_item.version_lock_id is not null or v_item.share_status = 'locked' then
    return query select false, 'locked', false, null::jsonb, null::uuid;
    return;
  end if;

  v_task_name := nullif(btrim(coalesce(p_task_name, '')), '');
  v_hazard := nullif(btrim(coalesce(p_hazard, '')), '');
  v_current_controls := nullif(btrim(coalesce(p_current_controls, '')), '');
  v_improvement_plan := nullif(btrim(coalesce(p_improvement_plan, '')), '');
  v_risk_level := nullif(btrim(coalesce(p_risk_level, '')), '');
  v_worker_share_summary := nullif(btrim(coalesce(p_worker_share_summary, '')), '');

  -- exclude always means worker_visible=false. Canonicalizing the payload's
  -- workerVisible here (not only when the item is actually updated) keeps
  -- two exclude requests that differ only in whether the caller passed
  -- worker_visible=false or left it null idempotency-equivalent.
  v_payload_worker_visible := case when p_action = 'exclude' then false else p_worker_visible end;

  v_normalized_payload := jsonb_build_object(
    'action', p_action,
    'taskName', v_task_name,
    'hazard', v_hazard,
    'currentControls', v_current_controls,
    'improvementPlan', v_improvement_plan,
    'riskLevel', v_risk_level,
    'workerShareSummary', v_worker_share_summary,
    'workerVisible', v_payload_worker_visible
  );

  -- 4. Idempotency pre-check. This is a fast path only -- it lets an
  -- obvious same-item replay/conflict return without redoing validation --
  -- and cannot see another transaction's uncommitted row, so it is not the
  -- safety guarantee for a cross-item race. That guarantee is the atomic
  -- INSERT ... ON CONFLICT DO NOTHING in step 7 below.
  select risk_share_item_review_events.* into v_existing_event
  from public.risk_share_item_review_events
  where risk_share_item_review_events.company_code = v_company_code
    and risk_share_item_review_events.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_event.item_id <> p_item_id
       or v_existing_event.action <> p_action
       or v_existing_event.request_payload <> v_normalized_payload then
      return query select false, 'idempotency_conflict', false, null::jsonb, null::uuid;
      return;
    end if;

    return query select
      true,
      'ok',
      true,
      jsonb_build_object('id', v_existing_event.item_id, 'companyCode', v_existing_event.company_code)
        || v_existing_event.after_snapshot,
      v_existing_event.id;
    return;
  end if;

  -- 5. Stale revision check.
  if v_item.review_revision <> p_expected_revision then
    return query select false, 'stale_revision', false, null::jsonb, null::uuid;
    return;
  end if;

  -- 6. Validation + state transition. include and edit_include are
  -- distinct actions with distinct mutation contracts.
  if p_action = 'include' then
    -- Acknowledgement only. A submitted content field is accepted only when
    -- it matches the item's current normalized value; null/blank means
    -- "leave as-is". Any real content change must go through edit_include,
    -- so the audit action column always matches what actually happened.
    if (v_task_name is not null and v_task_name <> btrim(coalesce(v_item.task_name, '')))
       or (v_hazard is not null and v_hazard <> btrim(coalesce(v_item.hazard, '')))
       or (v_current_controls is not null and v_current_controls <> btrim(coalesce(v_item.current_controls, '')))
       or (v_improvement_plan is not null and v_improvement_plan <> btrim(coalesce(v_item.improvement_plan, '')))
       or (v_risk_level is not null and v_risk_level <> btrim(coalesce(v_item.risk_level, '')))
       or (v_worker_share_summary is not null and v_worker_share_summary <> btrim(coalesce(v_item.worker_share_summary, ''))) then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    v_task_name := v_item.task_name;
    v_hazard := v_item.hazard;
    v_current_controls := v_item.current_controls;
    v_improvement_plan := v_item.improvement_plan;
    v_risk_level := v_item.risk_level;
    v_worker_share_summary := v_item.worker_share_summary;

    if v_task_name is null or v_task_name = '' or v_hazard is null or v_hazard = '' then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    if p_worker_visible is null then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    v_worker_visible := p_worker_visible;
    v_next_share_status := 'customer_confirmed';
    v_next_customer_check_status := 'confirmed';
    v_next_customer_confirmed := true;
  elsif p_action = 'edit_include' then
    v_task_name := coalesce(v_task_name, v_item.task_name);
    v_hazard := coalesce(v_hazard, v_item.hazard);
    v_current_controls := coalesce(v_current_controls, v_item.current_controls);
    v_improvement_plan := coalesce(v_improvement_plan, v_item.improvement_plan);
    v_risk_level := coalesce(v_risk_level, v_item.risk_level);
    v_worker_share_summary := coalesce(v_worker_share_summary, v_item.worker_share_summary);

    if v_task_name is null or v_hazard is null then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    if length(v_task_name) > 200
       or length(v_hazard) > 500
       or (v_current_controls is not null and length(v_current_controls) > 800)
       or (v_improvement_plan is not null and length(v_improvement_plan) > 800)
       or (v_worker_share_summary is not null and length(v_worker_share_summary) > 800)
       or (v_risk_level is not null and length(v_risk_level) > 40) then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    if v_task_name ~ v_control_char_pattern
       or v_hazard ~ v_control_char_pattern
       or (v_current_controls is not null and v_current_controls ~ v_control_char_pattern)
       or (v_improvement_plan is not null and v_improvement_plan ~ v_control_char_pattern)
       or (v_worker_share_summary is not null and v_worker_share_summary ~ v_control_char_pattern)
       or (v_risk_level is not null and v_risk_level ~ v_control_char_pattern) then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    if p_worker_visible is null then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    v_worker_visible := p_worker_visible;
    v_next_share_status := 'customer_confirmed';
    v_next_customer_check_status := 'confirmed';
    v_next_customer_confirmed := true;
  else
    -- exclude: edit-field payload and worker_visible=true are treated as a
    -- confused/invalid request rather than silently ignored.
    if v_task_name is not null
       or v_hazard is not null
       or v_current_controls is not null
       or v_improvement_plan is not null
       or v_risk_level is not null
       or v_worker_share_summary is not null
       or p_worker_visible is true then
      return query select false, 'validation_failed', false, null::jsonb, null::uuid;
      return;
    end if;

    v_task_name := v_item.task_name;
    v_hazard := v_item.hazard;
    v_current_controls := v_item.current_controls;
    v_improvement_plan := v_item.improvement_plan;
    v_risk_level := v_item.risk_level;
    v_worker_share_summary := v_item.worker_share_summary;
    v_worker_visible := false;
    v_next_share_status := 'excluded';
    v_next_customer_check_status := 'confirmed';
    v_next_customer_confirmed := true;
  end if;

  v_next_revision := v_item.review_revision + 1;

  v_before_snapshot := jsonb_build_object(
    'taskName', v_item.task_name,
    'hazard', v_item.hazard,
    'currentControls', v_item.current_controls,
    'improvementPlan', v_item.improvement_plan,
    'riskLevel', v_item.risk_level,
    'workerShareSummary', v_item.worker_share_summary,
    'shareStatus', v_item.share_status,
    'customerCheckStatus', v_item.customer_check_status,
    'customerConfirmed', v_item.customer_confirmed,
    'workerVisible', v_item.worker_visible,
    'versionLockId', v_item.version_lock_id,
    'reviewRevision', v_item.review_revision
  );

  v_after_snapshot := jsonb_build_object(
    'taskName', v_task_name,
    'hazard', v_hazard,
    'currentControls', v_current_controls,
    'improvementPlan', v_improvement_plan,
    'riskLevel', v_risk_level,
    'workerShareSummary', v_worker_share_summary,
    'shareStatus', v_next_share_status,
    'customerCheckStatus', v_next_customer_check_status,
    'customerConfirmed', v_next_customer_confirmed,
    'workerVisible', v_worker_visible,
    'versionLockId', v_item.version_lock_id,
    'reviewRevision', v_next_revision
  );

  -- 7. Audit insert first, atomically gated on the idempotency key. This is
  -- the real cross-item race guard: two concurrent transactions targeting
  -- different items each hold their own item's FOR UPDATE lock (no
  -- conflict there) and can both pass the step-4 pre-check (neither has
  -- committed yet), but only one of them can win this
  -- INSERT ... ON CONFLICT DO NOTHING against the (company_code,
  -- idempotency_key) unique index -- Postgres serializes concurrent
  -- inserters targeting the same key, so the loser blocks here until the
  -- winner commits or rolls back. The loser's v_event_id stays null and it
  -- must not touch risk_share_items at all.
  insert into public.risk_share_item_review_events (
    company_code,
    site_name,
    item_id,
    candidate_id,
    source_id,
    actor_membership_id,
    actor_role,
    action,
    previous_revision,
    next_revision,
    idempotency_key,
    request_payload,
    before_snapshot,
    after_snapshot
  ) values (
    v_company_code,
    v_item.site_name,
    p_item_id,
    v_item.candidate_id,
    v_item.source_id,
    p_actor_membership_id,
    v_membership_role,
    p_action,
    v_item.review_revision,
    v_next_revision,
    v_idempotency_key,
    v_normalized_payload,
    v_before_snapshot,
    v_after_snapshot
  )
  on conflict (company_code, idempotency_key) do nothing
  returning risk_share_item_review_events.id into v_event_id;

  if v_event_id is null then
    -- Lost the race: re-read whichever event actually won and decide
    -- replay vs conflict the same way step 4 does. risk_share_items is
    -- left completely untouched for this call.
    select risk_share_item_review_events.* into v_existing_event
    from public.risk_share_item_review_events
    where risk_share_item_review_events.company_code = v_company_code
      and risk_share_item_review_events.idempotency_key = v_idempotency_key;

    if not found
       or v_existing_event.item_id <> p_item_id
       or v_existing_event.action <> p_action
       or v_existing_event.request_payload <> v_normalized_payload then
      return query select false, 'idempotency_conflict', false, null::jsonb, null::uuid;
      return;
    end if;

    return query select
      true,
      'ok',
      true,
      jsonb_build_object('id', v_existing_event.item_id, 'companyCode', v_existing_event.company_code)
        || v_existing_event.after_snapshot,
      v_existing_event.id;
    return;
  end if;

  -- 8. Only the transaction that won the audit insert mutates the item.
  -- A row count other than 1 here means the earlier FOR UPDATE lock and
  -- this UPDATE somehow targeted different rows -- an invariant violation,
  -- not a normal outcome -- so the whole transaction, including the audit
  -- row just inserted, aborts via exception rather than leaving a
  -- committed audit event with no matching item mutation.
  update public.risk_share_items
  set task_name = v_task_name,
      hazard = v_hazard,
      current_controls = v_current_controls,
      improvement_plan = v_improvement_plan,
      risk_level = v_risk_level,
      worker_share_summary = v_worker_share_summary,
      share_status = v_next_share_status,
      customer_check_status = v_next_customer_check_status,
      customer_confirmed = v_next_customer_confirmed,
      worker_visible = v_worker_visible,
      review_revision = v_next_revision,
      updated_at = now()
  where risk_share_items.id = p_item_id
    and risk_share_items.company_code = v_company_code;

  get diagnostics v_row_count = row_count;

  if v_row_count <> 1 then
    raise exception
      'review_risk_share_item: expected exactly 1 row updated for item %, got %',
      p_item_id, v_row_count;
  end if;

  return query select
    true,
    'ok',
    false,
    jsonb_build_object('id', p_item_id, 'companyCode', v_company_code) || v_after_snapshot,
    v_event_id;
end;
$$;

revoke all on function public.review_risk_share_item(
  uuid, text, uuid, bigint, text, text, text, text, text, text, text, text, boolean
) from public;

revoke execute on function public.review_risk_share_item(
  uuid, text, uuid, bigint, text, text, text, text, text, text, text, text, boolean
) from anon, authenticated;

grant execute on function public.review_risk_share_item(
  uuid, text, uuid, bigint, text, text, text, text, text, text, text, text, boolean
) to service_role;
