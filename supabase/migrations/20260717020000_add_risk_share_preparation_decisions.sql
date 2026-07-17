-- SafeMetrica Risk Share Pack: preparation decision ledger (DB foundation only)
--
-- Additive only: no table recreation, no destructive change, no backfill of
-- unrelated data. This migration does not add an RPC, an API route, or a
-- UI. It does not touch risk_share_item_candidates.reviewer_status,
-- risk_share_candidate_review_events, review_risk_share_item_candidate,
-- the create-from-candidate API, risk_share_items, review_risk_share_item,
-- or create_risk_share_version_lock.
--
-- Why the existing candidate review event ledger cannot be reused for this:
--   risk_share_candidate_review_events (20260616001000) constrains
--   actor_type to ('owner', 'system') only -- no tenant_admin/tenant_manager
--   -- and constrains next_status/previous_status to exactly the 5
--   risk_share_item_candidates.reviewer_status values ('pending', 'accepted',
--   'edited', 'excluded', 'needs_customer_check'). Storing a preparation
--   decision (auto_prepared / manager_review_required /
--   owner_exception_required) there would require changing both CHECK
--   constraints, which would redefine what reviewer_status/actor_type mean
--   on an already-shipped audit table -- exactly what this work is
--   forbidden from doing. A preparation decision is also a conceptually
--   different fact than a reviewer status change: it can exist before any
--   risk_share_items row does (owner_exception_required never creates one),
--   which risk_share_candidate_review_events (FK'd only to candidate_id,
--   no item_id column) cannot represent either.
--
-- This is also not a tenant/module automation *policy* table (a future,
-- separate PR): this ledger records one decision about one candidate at one
-- point in time, never a tenant-wide mode.
--
-- No RPC ships in this migration -- a future PR wires a tenant-safe batch
-- preparation RPC that writes to this table. Until then, this table has
-- zero writers and the existing Owner Candidate Review / create-from-
-- candidate path is completely unaffected.

-- =====================================================================
-- A. Composite FK targets
--
-- risk_share_items(id, company_code) and tenant_membership(id, tenant_code)
-- already have the composite unique indexes needed for a tenant-safe
-- composite FK (risk_share_items_id_company_uidx,
-- tenant_membership_id_tenant_code_uidx -- both added in
-- 20260717000000_add_risk_share_version_snapshot_foundation.sql) and are
-- not recreated here. risk_share_sources and risk_share_item_candidates do
-- not have this yet -- added below, same shape, same rationale: MATCH
-- SIMPLE on a composite FK requires the exact referenced column tuple to
-- already have a unique (or primary key) index.
-- =====================================================================

create unique index if not exists risk_share_sources_id_company_uidx
  on public.risk_share_sources (id, company_code);

create unique index if not exists risk_share_item_candidates_id_company_uidx
  on public.risk_share_item_candidates (id, company_code);

-- =====================================================================
-- B. risk_share_preparation_decisions
-- =====================================================================

create table if not exists public.risk_share_preparation_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  company_code text not null,
  source_id uuid not null,
  candidate_id uuid not null,
  item_id uuid,

  mapping_version integer,

  decision text not null,
  reason_code text not null,
  policy_version integer not null,
  candidate_input_fingerprint text not null,

  actor_type text not null,
  actor_membership_id uuid,
  initiated_by_membership_id uuid,

  correlation_id uuid not null,
  idempotency_key text not null,
  safe_metadata jsonb not null default '{}'::jsonb,

  constraint risk_share_preparation_decisions_company_code_check check (
    company_code ~ '^[a-z0-9][a-z0-9-]{0,63}$'
  ),

  constraint risk_share_preparation_decisions_decision_check check (
    decision in ('auto_prepared', 'manager_review_required', 'owner_exception_required')
  ),

  -- MEMBERSHIP_INVALID, TENANT_MISMATCH, and SOURCE_READ_FAILED are
  -- deliberately not in this list. All three describe structural failures
  -- that must fail the whole batch closed before any per-candidate decision
  -- is safe to record: an invalid/absent membership means there is no
  -- actor identity to satisfy the actor/initiator FK contract below, a
  -- tenant mismatch is exactly what the composite tenant FKs already
  -- reject at the database level (recording it as a candidate-level
  -- decision row would require the row to reference cross-tenant objects
  -- in the first place, which those FKs make impossible), and a source
  -- read failure can happen before any candidate_id exists at all (this
  -- column is NOT NULL, so there is no row shape to represent "no
  -- candidate yet"). These three belong to a future batch/source-level
  -- exception ledger, not this per-candidate table.
  constraint risk_share_preparation_decisions_reason_code_check check (
    reason_code in (
      'AUTO_SAME_MAPPING', 'AUTO_SOURCE_FAITHFUL',
      'FIRST_TEMPLATE_REVIEW', 'LOW_CONFIDENCE', 'SOURCE_LOCATION_UNCLEAR',
      'MAPPING_CHANGED', 'ITEM_COUNT_DELTA', 'CONTENT_MEANING_CHANGED',
      'MISSING_REQUIRED_FIELD', 'MAPPING_CONFLICT', 'SENSITIVE_DATA_SUSPECTED',
      'REPEATED_PROCESSING_FAILURE'
    )
  ),

  -- MISSING_REQUIRED_FIELD is owner_exception_required, not
  -- manager_review_required: the current risk_share_items/Share Review
  -- contract has no safe way to create a reviewable item without
  -- task_name/hazard, so a candidate missing either is an exception, not a
  -- normal review queue item. Revisit only if a manager-input-only staging
  -- shape is ever added.
  --
  -- MAPPING_CONFLICT is scoped to a candidate that already exists (this
  -- table never sees a candidate before it is created) whose own stored
  -- mapping_version no longer matches the currently confirmed mapping
  -- version for its source+sheet in risk_share_source_column_mappings --
  -- a fact A2 can read directly from data already on the candidate row
  -- plus that table. It is not source-level/header-level mapping conflict
  -- before any candidate exists; that belongs to the future source/batch
  -- exception ledger, same as the three reason codes removed above.
  --
  -- REPEATED_PROCESSING_FAILURE is computed by A2 as repeated distinct
  -- owner_exception_required decisions for the same candidate_id already
  -- present in this table (a real, queryable count once semantic dedup no
  -- longer collapses re-evaluations into one row -- see the removal of
  -- risk_share_preparation_decisions_semantic_uidx below), not from an
  -- external failure counter that does not yet exist.
  constraint risk_share_preparation_decisions_decision_reason_pair_check check (
    (decision = 'auto_prepared' and reason_code in ('AUTO_SAME_MAPPING', 'AUTO_SOURCE_FAITHFUL'))
    or (decision = 'manager_review_required' and reason_code in (
      'FIRST_TEMPLATE_REVIEW', 'LOW_CONFIDENCE', 'SOURCE_LOCATION_UNCLEAR',
      'MAPPING_CHANGED', 'ITEM_COUNT_DELTA', 'CONTENT_MEANING_CHANGED'
    ))
    or (decision = 'owner_exception_required' and reason_code in (
      'MISSING_REQUIRED_FIELD', 'MAPPING_CONFLICT', 'SENSITIVE_DATA_SUSPECTED',
      'REPEATED_PROCESSING_FAILURE'
    ))
  ),

  -- auto_prepared/manager_review_required always accompany the
  -- risk_share_items row the decision produced; owner_exception_required
  -- never creates one. A decision row with a mismatched item_id presence
  -- (e.g. an exception that somehow got an item, or a prepared decision
  -- with none) is rejected at insert time rather than trusted to caller
  -- discipline.
  constraint risk_share_preparation_decisions_item_presence_check check (
    (decision in ('auto_prepared', 'manager_review_required') and item_id is not null)
    or (decision = 'owner_exception_required' and item_id is null)
  ),

  constraint risk_share_preparation_decisions_mapping_version_range_check check (
    mapping_version is null or mapping_version >= 1
  ),

  -- owner_exception_required is the only decision allowed to have no
  -- mapping_version, since it can record a source-read or mapping failure
  -- that happened before any mapping version could be resolved.
  constraint risk_share_preparation_decisions_mapping_version_presence_check check (
    decision = 'owner_exception_required' or mapping_version is not null
  ),

  constraint risk_share_preparation_decisions_candidate_input_fingerprint_check check (
    candidate_input_fingerprint ~ '^[0-9a-f]{64}$'
  ),

  constraint risk_share_preparation_decisions_policy_version_check check (
    policy_version >= 1
  ),

  constraint risk_share_preparation_decisions_actor_type_check check (
    actor_type in ('system', 'tenant_admin', 'tenant_manager')
  ),

  -- actor_membership_id = the tenant actor who actually made/confirmed this
  -- decision (must be set for a direct tenant_admin/tenant_manager
  -- decision, must be null for a system decision -- a system decision has
  -- no single human "decider" for this specific candidate).
  -- initiated_by_membership_id = the tenant actor who started the system
  -- evaluation that produced this decision (must be set for actor_type =
  -- system so a system decision always traces back to a real tenant
  -- session, must be null otherwise since actor_membership_id already
  -- identifies the human directly -- recording the same person in both
  -- columns would be redundant and would blur the "who decided vs who
  -- triggered" distinction this table exists to keep separate).
  -- owner_internal is deliberately not a valid actor_type in this PR: the
  -- Owner token is a shared secret, not a per-person identity, and this
  -- ledger only records identifiable tenant/system actors. The existing
  -- Owner Candidate Review path does not write to this table.
  constraint risk_share_preparation_decisions_actor_membership_pair_check check (
    (actor_type = 'system' and actor_membership_id is null and initiated_by_membership_id is not null)
    or (
      actor_type in ('tenant_admin', 'tenant_manager')
      and actor_membership_id is not null
      and initiated_by_membership_id is null
    )
  ),

  constraint risk_share_preparation_decisions_idempotency_key_check check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 1 and 200
  ),

  constraint risk_share_preparation_decisions_safe_metadata_object_check check (
    jsonb_typeof(safe_metadata) = 'object'
  ),

  constraint risk_share_preparation_decisions_safe_metadata_size_check check (
    octet_length(safe_metadata::text) <= 4096
  ),

  -- Composite tenant-identity FKs: source, candidate, item, and both actor
  -- columns must all resolve to the exact same company_code/tenant_code as
  -- this row, or the insert is rejected by Postgres -- not only by future
  -- RPC/session logic. MATCH SIMPLE (the default) means a null
  -- item_id/actor_membership_id/initiated_by_membership_id is not checked
  -- against company_code by these FKs; the presence/absence rules above
  -- are what require the right column to be null for a given
  -- decision/actor_type.
  constraint risk_share_preparation_decisions_source_company_fkey
    foreign key (source_id, company_code)
    references public.risk_share_sources (id, company_code)
    on delete restrict,

  constraint risk_share_preparation_decisions_candidate_company_fkey
    foreign key (candidate_id, company_code)
    references public.risk_share_item_candidates (id, company_code)
    on delete restrict,

  constraint risk_share_preparation_decisions_item_company_fkey
    foreign key (item_id, company_code)
    references public.risk_share_items (id, company_code)
    on delete restrict,

  constraint risk_share_preparation_decisions_actor_membership_company_fkey
    foreign key (actor_membership_id, company_code)
    references public.tenant_membership (id, tenant_code)
    on delete restrict,

  constraint risk_share_preparation_decisions_initiator_membership_company_fkey
    foreign key (initiated_by_membership_id, company_code)
    references public.tenant_membership (id, tenant_code)
    on delete restrict
);

-- No semantic (candidate_id, candidate_input_fingerprint, policy_version)
-- uniqueness in this PR: candidate_input_fingerprint only covers candidate
-- content + mapping_version, not the full set of inputs a decision can
-- depend on (membership/tenant validation, source processing state,
-- mapping conflict result, confidence/rule result, sensitive-data flag,
-- previous-version comparison, item-count delta, repeated-processing
-- state). Two evaluations with identical candidate content and
-- policy_version can legitimately reach different decisions once those
-- other inputs are considered, so collapsing them into one row here would
-- silently discard a real re-evaluation. A new correlation_id/
-- idempotency_key always allows a fresh decision for the same candidate;
-- only the two indexes below (dedup within one batch/request) are
-- enforced. The full decision-input fingerprint contract is not yet
-- defined -- do not reintroduce candidate-content-only semantic dedup
-- until it is.

-- Same batch (correlation_id) must not record the same candidate twice,
-- even if a caller bug or retry re-submits the same candidate_ids array
-- mid-batch. Multiple different candidates sharing one correlation_id is
-- the normal, expected shape of a batch call.
create unique index if not exists risk_share_preparation_decisions_correlation_candidate_uidx
  on public.risk_share_preparation_decisions (company_code, correlation_id, candidate_id);

-- Same idempotency_key must not record the same candidate twice either --
-- distinct from the correlation_id index above because a caller retry may
-- reuse the same idempotency_key under a new correlation_id (a fresh HTTP
-- request retrying a previous logical batch). Multiple different candidates
-- sharing one idempotency_key is expected (one batch call, many candidates).
create unique index if not exists risk_share_preparation_decisions_idempotency_candidate_uidx
  on public.risk_share_preparation_decisions (company_code, idempotency_key, candidate_id);

-- id desc as a tie-breaker (not just created_at desc): created_at has only
-- microsecond resolution and a fast re-evaluation (e.g. an immediate retry
-- after a stale read) can share a timestamp with the row before it. "latest
-- decision for this candidate" must resolve to exactly one row even then.
create index if not exists risk_share_preparation_decisions_candidate_created_idx
  on public.risk_share_preparation_decisions (company_code, candidate_id, created_at desc, id desc);

create index if not exists risk_share_preparation_decisions_source_created_idx
  on public.risk_share_preparation_decisions (company_code, source_id, created_at desc);

create index if not exists risk_share_preparation_decisions_decision_created_idx
  on public.risk_share_preparation_decisions (company_code, decision, created_at desc);

create index if not exists risk_share_preparation_decisions_correlation_idx
  on public.risk_share_preparation_decisions (correlation_id);

create index if not exists risk_share_preparation_decisions_item_idx
  on public.risk_share_preparation_decisions (item_id)
  where item_id is not null;

-- Server-only, append-only ledger, matching risk_share_item_review_events
-- (20260716010000 + its service_role privilege fix 20260716020000) and
-- risk_share_version_items (20260717000000): RLS enabled with zero
-- policies, and the revoke targets service_role explicitly (not only
-- public/anon/authenticated) so service_role never keeps its broader
-- Postgres-default privileges on this table from the start -- no repeat of
-- the gap that #900 had to correct after #899. No update/delete/truncate/
-- references/trigger grant to service_role at all: a decision row is
-- written once by the (future) batch preparation RPC and never modified or
-- removed after that.
alter table public.risk_share_preparation_decisions enable row level security;

revoke all privileges
  on table public.risk_share_preparation_decisions
  from public, anon, authenticated, service_role;

grant select, insert
  on table public.risk_share_preparation_decisions
  to service_role;

comment on table public.risk_share_preparation_decisions is
  'Append-only ledger of per-candidate preparation decisions (auto_prepared / manager_review_required / owner_exception_required) for the Risk Share Pack candidate-to-item pipeline. Distinct from a future tenant/module automation policy table -- this table records what was decided for one candidate at one point in time, never a tenant-wide mode. No RPC/API/UI ships in this migration; a future PR adds the tenant-safe batch preparation RPC that writes here.';

comment on column public.risk_share_preparation_decisions.actor_membership_id is
  'The tenant_membership that made or confirmed this decision. Null when actor_type = system (a system decision has no single human decider for this specific candidate) -- see initiated_by_membership_id for who started that evaluation.';

comment on column public.risk_share_preparation_decisions.initiated_by_membership_id is
  'The tenant_membership that started the system evaluation which produced this decision. Null when actor_type is tenant_admin/tenant_manager, since actor_membership_id already identifies the human directly.';

comment on column public.risk_share_preparation_decisions.candidate_input_fingerprint is
  'sha256 hex of the candidate content (task_name/hazard/current_controls/improvement_plan/risk_level/worker_share_summary) plus mapping_version, computed at decision time. Not risk_share_item_candidates.source_row_signature_sha256, which only reflects the originally imported row and does not change if the candidate content is later edited. This is a candidate-content fingerprint only, for identifying/explaining which candidate state a decision was made against -- it does not represent the full set of inputs a decision can depend on (membership/tenant validation, source/mapping state, confidence, sensitive-data flag, previous-version comparison, item-count delta, repeated-processing state), and it is not used in any uniqueness constraint on this table.';

comment on column public.risk_share_preparation_decisions.safe_metadata is
  'Decision explanation metadata only: confidence bands, boolean rule flags, changed-field counts, rule result codes. Never task_name/hazard/current_controls/improvement_plan/worker_share_summary text, raw AI provider output, email, phone number, name, signature, token, URL credential, or service role information.';
