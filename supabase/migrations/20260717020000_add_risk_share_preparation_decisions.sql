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
--
-- Two further targets are added below, specifically so this ledger's own
-- FKs (section B) can enforce *lineage*, not just tenant membership:
-- company_code alone does not prove that a given candidate_id actually
-- belongs to the given source_id, or that a given item_id actually
-- belongs to the given candidate_id -- two same-tenant objects that are
-- individually valid can still be assembled into a row that lies about
-- how they relate to each other. risk_share_candidates_id_company_source_uidx
-- and risk_share_items_id_company_candidate_source_uidx close that gap by
-- giving the ledger's FKs something to pin the full chain to.
-- =====================================================================

create unique index if not exists risk_share_sources_id_company_uidx
  on public.risk_share_sources (id, company_code);

create unique index if not exists risk_share_item_candidates_id_company_uidx
  on public.risk_share_item_candidates (id, company_code);

-- Lineage target: a candidate's own (id, company_code, source_id) tuple,
-- so a ledger row can be required to reference the source that candidate
-- actually belongs to, not merely a same-tenant source.
create unique index if not exists risk_share_candidates_id_company_source_uidx
  on public.risk_share_item_candidates (id, company_code, source_id);

-- Lineage target: an item's own (id, company_code, candidate_id,
-- source_id) tuple, so a ledger row can be required to reference the
-- candidate (and, transitively, source) that item actually belongs to,
-- not merely a same-tenant item.
create unique index if not exists risk_share_items_id_company_candidate_source_uidx
  on public.risk_share_items (id, company_code, candidate_id, source_id);

-- =====================================================================
-- B. risk_share_preparation_decisions
-- =====================================================================

create table if not exists public.risk_share_preparation_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Monotonic append-only insertion order. id is a random uuid (gen_random_uuid,
  -- v4) and created_at has only microsecond resolution, so neither can safely
  -- answer "which decision for this candidate happened last" -- a random uuid's
  -- ordering has no relationship to insertion time, and two decisions can share
  -- a created_at value. decision_seq is `generated always`, not `generated by
  -- default`: callers cannot supply their own value (only OVERRIDING SYSTEM
  -- VALUE, which no code path here uses), so it always reflects real insertion
  -- order. A rollback can leave gaps in the sequence -- that is expected and
  -- not an error; gaps do not break "latest = max decision_seq for this
  -- candidate".
  decision_seq bigint generated always as identity,

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

  constraint risk_share_prep_decisions_company_code_check check (
    company_code ~ '^[a-z0-9][a-z0-9-]{0,63}$'
  ),

  constraint risk_share_prep_decisions_decision_check check (
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
  constraint risk_share_prep_decisions_reason_code_check check (
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
  -- present in this table: this table has no candidate-content-only
  -- semantic uniqueness (a new correlation_id/idempotency_key always
  -- allows a fresh decision for the same candidate -- see the dedup
  -- indexes near the end of this migration), so every real re-evaluation
  -- is preserved as its own row and a repeated-failure count is a
  -- straightforward query over this table's own history, not an external
  -- failure counter that does not yet exist.
  constraint risk_share_prep_decisions_decision_reason_pair_check check (
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
  constraint risk_share_prep_decisions_item_presence_check check (
    (decision in ('auto_prepared', 'manager_review_required') and item_id is not null)
    or (decision = 'owner_exception_required' and item_id is null)
  ),

  constraint risk_share_prep_decisions_mapping_version_range_check check (
    mapping_version is null or mapping_version >= 1
  ),

  -- owner_exception_required is the only decision allowed to have no
  -- mapping_version. This is not about a source-level failure (this table
  -- never records those -- see the reason_code check above): a candidate
  -- that already exists can still have no mapping provenance, e.g. one
  -- created through the legacy/manual Owner "candidate 수동 생성" path
  -- rather than the confirmed-mapping import RPC (risk_share_item_candidates
  -- .mapping_version is nullable for exactly this reason -- see
  -- 20260713020000_add_risk_share_candidate_source_mapping_provenance.sql).
  -- auto_prepared and manager_review_required both require a resolved
  -- mapping_version because they are decisions about a *mapping-imported*
  -- candidate's readiness; a candidate with no mapping provenance to
  -- evaluate is out of scope for those two decisions and falls to
  -- owner_exception_required instead.
  constraint risk_share_prep_decisions_mapping_version_presence_check check (
    decision = 'owner_exception_required' or mapping_version is not null
  ),

  constraint risk_share_prep_decisions_candidate_input_fingerprint_check check (
    candidate_input_fingerprint ~ '^[0-9a-f]{64}$'
  ),

  constraint risk_share_prep_decisions_policy_version_check check (
    policy_version >= 1
  ),

  constraint risk_share_prep_decisions_actor_type_check check (
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
  constraint risk_share_prep_decisions_actor_membership_pair_check check (
    (actor_type = 'system' and actor_membership_id is null and initiated_by_membership_id is not null)
    or (
      actor_type in ('tenant_admin', 'tenant_manager')
      and actor_membership_id is not null
      and initiated_by_membership_id is null
    )
  ),

  constraint risk_share_prep_decisions_idempotency_key_check check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 1 and 200
  ),

  constraint risk_share_prep_decisions_safe_metadata_object_check check (
    jsonb_typeof(safe_metadata) = 'object'
  ),

  constraint risk_share_prep_decisions_safe_metadata_size_check check (
    octet_length(safe_metadata::text) <= 4096
  ),

  -- Composite tenant-identity FKs: source, both actor columns, and (see
  -- below) candidate/item must all resolve to the exact same
  -- company_code/tenant_code as this row, or the insert is rejected by
  -- Postgres -- not only by future RPC/session logic. MATCH SIMPLE (the
  -- default) means a null item_id/actor_membership_id/
  -- initiated_by_membership_id is not checked against company_code by
  -- these FKs; the presence/absence rules above are what require the
  -- right column to be null for a given decision/actor_type.
  constraint risk_share_prep_decisions_source_company_fkey
    foreign key (source_id, company_code)
    references public.risk_share_sources (id, company_code)
    on delete restrict,

  -- Lineage FK, not just tenant-membership FK: candidate_id must resolve
  -- to a risk_share_item_candidates row whose OWN source_id equals this
  -- row's source_id. A same-tenant candidate that actually belongs to a
  -- different source is rejected here -- company_code alone (the previous
  -- shape of this FK) could not tell the two apart. candidate_id is
  -- NOT NULL and source_id is NOT NULL, so MATCH SIMPLE never skips this
  -- check for any row in this table -- lineage is enforced for every
  -- decision, including owner_exception_required (item_id is null there,
  -- but candidate_id/source_id lineage still is not).
  constraint risk_share_prep_decisions_candidate_lineage_fkey
    foreign key (candidate_id, company_code, source_id)
    references public.risk_share_item_candidates (id, company_code, source_id)
    on delete restrict,

  -- Lineage FK: item_id must resolve to a risk_share_items row whose OWN
  -- candidate_id and source_id equal this row's candidate_id and
  -- source_id. A same-tenant item that actually belongs to a different
  -- candidate (or was created against a different source) is rejected
  -- here. item_id is nullable (owner_exception_required never sets it),
  -- so MATCH SIMPLE skips this specific FK when item_id is null -- that
  -- case still gets full lineage coverage from
  -- risk_share_prep_decisions_candidate_lineage_fkey above, which is
  -- never skipped.
  constraint risk_share_prep_decisions_item_lineage_fkey
    foreign key (item_id, company_code, candidate_id, source_id)
    references public.risk_share_items (id, company_code, candidate_id, source_id)
    on delete restrict,

  constraint risk_share_prep_decisions_actor_membership_company_fkey
    foreign key (actor_membership_id, company_code)
    references public.tenant_membership (id, tenant_code)
    on delete restrict,

  constraint risk_share_prep_decisions_initiator_membership_company_fkey
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
create unique index if not exists risk_share_prep_decisions_correlation_candidate_uidx
  on public.risk_share_preparation_decisions (company_code, correlation_id, candidate_id);

-- Same idempotency_key must not record the same candidate twice either --
-- distinct from the correlation_id index above because a caller retry may
-- reuse the same idempotency_key under a new correlation_id (a fresh HTTP
-- request retrying a previous logical batch). Multiple different candidates
-- sharing one idempotency_key is expected (one batch call, many candidates).
create unique index if not exists risk_share_prep_decisions_idempotency_candidate_uidx
  on public.risk_share_preparation_decisions (company_code, idempotency_key, candidate_id);

-- Belt-and-suspenders uniqueness on decision_seq: `generated always as
-- identity` guarantees the underlying sequence never repeats a value under
-- normal operation, but does not itself add a unique constraint to the
-- column. This makes that guarantee an explicit, independently-checkable
-- database contract rather than an assumption about identity internals.
create unique index if not exists risk_share_prep_decisions_seq_uidx
  on public.risk_share_preparation_decisions (decision_seq);

-- "Latest decision for this candidate" is decision_seq desc, NOT
-- created_at desc / id desc. created_at has only microsecond resolution
-- (two decisions can share a value) and id is a random uuid (its ordering
-- has no relationship to insertion time) -- neither can answer "which
-- decision actually happened last". decision_seq is monotonic
-- append-only insertion order (see the column definition above) and is
-- the only column in this table that chronology can be built on.
-- created_at remains on the table for display/audit-timestamp/date-range
-- query purposes only.
create index if not exists risk_share_prep_decisions_candidate_seq_idx
  on public.risk_share_preparation_decisions (company_code, candidate_id, decision_seq desc);

create index if not exists risk_share_prep_decisions_source_created_idx
  on public.risk_share_preparation_decisions (company_code, source_id, created_at desc);

create index if not exists risk_share_prep_decisions_decision_created_idx
  on public.risk_share_preparation_decisions (company_code, decision, created_at desc);

create index if not exists risk_share_prep_decisions_correlation_idx
  on public.risk_share_preparation_decisions (correlation_id);

create index if not exists risk_share_prep_decisions_item_idx
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

-- decision_seq's identity sequence is a real pg_class sequence object
-- (Postgres system-generated name, resolved via pg_get_serial_sequence
-- rather than hardcoded so this stays correct regardless of naming
-- edge cases). Its default privileges are no less broad than any other
-- object's, so -- same rationale as the table grant above -- they are
-- revoked first and only USAGE is granted back to service_role.
-- USAGE (not SELECT/UPDATE) is sufficient and correct: an identity
-- column's nextval() advance during INSERT happens as part of executing
-- the column default, which only requires USAGE on the sequence, not
-- direct SELECT (reading currval/lastval) or UPDATE (setval) access.
-- Granting the latter would let service_role read or rewrite the
-- sequence's counter directly via SQL, which nothing in this ledger's
-- contract needs.
do $$
declare
  v_seq text := pg_get_serial_sequence('public.risk_share_preparation_decisions', 'decision_seq');
begin
  execute format('revoke all privileges on sequence %s from public, anon, authenticated, service_role', v_seq);
  execute format('grant usage on sequence %s to service_role', v_seq);
end
$$;

comment on table public.risk_share_preparation_decisions is
  'Append-only ledger of per-candidate preparation decisions (auto_prepared / manager_review_required / owner_exception_required) for the Risk Share Pack candidate-to-item pipeline. Distinct from a future tenant/module automation policy table -- this table records what was decided for one candidate at one point in time, never a tenant-wide mode. No RPC/API/UI ships in this migration; a future PR adds the tenant-safe batch preparation RPC that writes here.';

comment on column public.risk_share_preparation_decisions.decision_seq is
  'Monotonic append-only insertion order (generated always as identity -- callers cannot supply a value). The only column "latest decision for this candidate" may be ordered by; created_at is display/audit-timestamp only (two decisions can share a value) and id is a random uuid (its ordering has no relationship to insertion time). Rollback-caused gaps are expected and not an error.';

comment on column public.risk_share_preparation_decisions.actor_membership_id is
  'The tenant_membership that made or confirmed this decision. Null when actor_type = system (a system decision has no single human decider for this specific candidate) -- see initiated_by_membership_id for who started that evaluation.';

comment on column public.risk_share_preparation_decisions.initiated_by_membership_id is
  'The tenant_membership that started the system evaluation which produced this decision. Null when actor_type is tenant_admin/tenant_manager, since actor_membership_id already identifies the human directly.';

comment on column public.risk_share_preparation_decisions.candidate_input_fingerprint is
  'sha256 hex of the candidate content (task_name/hazard/current_controls/improvement_plan/risk_level/worker_share_summary) plus mapping_version, computed at decision time. Not risk_share_item_candidates.source_row_signature_sha256, which only reflects the originally imported row and does not change if the candidate content is later edited. This is a candidate-content fingerprint only, for identifying/explaining which candidate state a decision was made against -- it does not represent the full set of inputs a decision can depend on (membership/tenant validation, source/mapping state, confidence, sensitive-data flag, previous-version comparison, item-count delta, repeated-processing state), and it is not used in any uniqueness constraint on this table.';

comment on column public.risk_share_preparation_decisions.safe_metadata is
  'Decision explanation metadata only: confidence bands, boolean rule flags, changed-field counts, rule result codes. Never task_name/hazard/current_controls/improvement_plan/worker_share_summary text, raw AI provider output, email, phone number, name, signature, token, URL credential, or service role information.';

-- =====================================================================
-- C. Postcondition check
--
-- `create table if not exists` and `create index if not exists` both
-- silently no-op against a same-named object that already exists, even
-- one that does not match this migration's shape (e.g. left over from an
-- earlier, incomplete run of an earlier draft of this same file). This
-- migration has no ALTER-TABLE-ADD-CONSTRAINT fallback path for the main
-- table the way some other tables in this schema do, so a stale
-- incomplete (or wrong-shaped-but-same-named) table would otherwise let
-- this migration finish with exit code 0 while quietly missing the
-- lineage/RLS/privilege contract this file exists to establish.
--
-- This block verifies *definitions*, not just names: an earlier version
-- checked only `pg_constraint.conname`/`pg_indexes.indexname` existence,
-- which a same-named-but-differently-defined object (e.g. a stale
-- 2-column candidate lineage FK left over from a pre-lineage-fix version
-- of this migration) passes trivially, since `create table if not
-- exists` never re-examines a table it decides already exists. Every FK
-- below is checked against its exact source/referenced table, exact
-- ordered source/referenced column name arrays (via conkey/confkey +
-- pg_attribute, not hardcoded attnums, so this stays correct regardless
-- of physical column order), VALIDATED status, and ON DELETE RESTRICT.
-- Every index below is checked against its exact table, uniqueness,
-- valid/ready/live status, absence of an expression or partial
-- predicate, and exact ordered column list including DESC direction
-- (via pg_index.indoption, not pg_get_indexdef's per-column form, which
-- does not render sort direction).
--
-- This block never alters anything, only verifies and raises. It checks
-- the constraints/indexes this fix specifically introduced or corrected
-- (lineage, decision_seq, dedup, latest-lookup), not every object in the
-- file -- enough to catch a shape mismatch without turning this into a
-- full schema-diff tool.
-- =====================================================================

do $$
declare
  v_fk record;
  v_fk_ok boolean;
  v_actual_source_cols name[];
  v_actual_ref_cols name[];
  v_idx record;
  v_idx_ok boolean;
  v_actual_cols text[];
  v_priv record;
  v_seq text;
begin
  if to_regclass('public.risk_share_preparation_decisions') is null then
    raise exception 'risk_share_preparation_decisions postcondition failed: table does not exist';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.risk_share_preparation_decisions'::regclass
  ) then
    raise exception 'risk_share_preparation_decisions postcondition failed: RLS is not enabled';
  end if;

  if (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'risk_share_preparation_decisions'
  ) <> 0 then
    raise exception 'risk_share_preparation_decisions postcondition failed: unexpected RLS policy present (this table must have zero policies)';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'risk_share_preparation_decisions'
      and column_name = 'decision_seq'
      and data_type = 'bigint'
      and is_identity = 'YES'
      and identity_generation = 'ALWAYS'
  ) then
    raise exception 'risk_share_preparation_decisions postcondition failed: decision_seq is missing or is not a GENERATED ALWAYS AS IDENTITY bigint column';
  end if;

  if pg_get_serial_sequence('public.risk_share_preparation_decisions', 'decision_seq') is null then
    raise exception 'risk_share_preparation_decisions postcondition failed: decision_seq has no owned sequence';
  end if;

  -- ---------------------------------------------------------------
  -- Foreign keys: exact source table, ordered source columns, exact
  -- referenced table, ordered referenced columns, VALIDATED, RESTRICT.
  -- ---------------------------------------------------------------
  for v_fk in
    select *
    from (values
      ('risk_share_prep_decisions_source_company_fkey',
       'public.risk_share_preparation_decisions'::regclass,
       array['source_id', 'company_code']::name[],
       'public.risk_share_sources'::regclass,
       array['id', 'company_code']::name[]),
      ('risk_share_prep_decisions_candidate_lineage_fkey',
       'public.risk_share_preparation_decisions'::regclass,
       array['candidate_id', 'company_code', 'source_id']::name[],
       'public.risk_share_item_candidates'::regclass,
       array['id', 'company_code', 'source_id']::name[]),
      ('risk_share_prep_decisions_item_lineage_fkey',
       'public.risk_share_preparation_decisions'::regclass,
       array['item_id', 'company_code', 'candidate_id', 'source_id']::name[],
       'public.risk_share_items'::regclass,
       array['id', 'company_code', 'candidate_id', 'source_id']::name[]),
      ('risk_share_prep_decisions_actor_membership_company_fkey',
       'public.risk_share_preparation_decisions'::regclass,
       array['actor_membership_id', 'company_code']::name[],
       'public.tenant_membership'::regclass,
       array['id', 'tenant_code']::name[]),
      ('risk_share_prep_decisions_initiator_membership_company_fkey',
       'public.risk_share_preparation_decisions'::regclass,
       array['initiated_by_membership_id', 'company_code']::name[],
       'public.tenant_membership'::regclass,
       array['id', 'tenant_code']::name[])
    ) as expected(conname, conrelid, source_cols, confrelid, ref_cols)
  loop
    select
      (c.contype = 'f' and c.convalidated and c.confdeltype = 'r' and c.confrelid = v_fk.confrelid),
      (
        select array_agg(a.attname order by k.ord)
        from unnest(c.conkey) with ordinality as k(attnum, ord)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
      ),
      (
        select array_agg(a.attname order by k.ord)
        from unnest(c.confkey) with ordinality as k(attnum, ord)
        join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum
      )
    into v_fk_ok, v_actual_source_cols, v_actual_ref_cols
    from pg_constraint c
    where c.conname = v_fk.conname and c.conrelid = v_fk.conrelid;

    if not found then
      raise exception 'risk_share_preparation_decisions postcondition failed: % is missing', v_fk.conname;
    end if;

    if not coalesce(v_fk_ok, false)
       or v_actual_source_cols is distinct from v_fk.source_cols
       or v_actual_ref_cols is distinct from v_fk.ref_cols then
      raise exception 'risk_share_preparation_decisions postcondition failed: % definition mismatch', v_fk.conname;
    end if;
  end loop;

  -- ---------------------------------------------------------------
  -- Indexes: exact table, uniqueness, valid/ready/live, no expression/
  -- predicate, exact ordered column list (DESC direction included).
  -- ---------------------------------------------------------------
  for v_idx in
    select *
    from (values
      ('risk_share_candidates_id_company_source_uidx',
       'public.risk_share_item_candidates'::regclass, true,
       array['id', 'company_code', 'source_id']::text[]),
      ('risk_share_items_id_company_candidate_source_uidx',
       'public.risk_share_items'::regclass, true,
       array['id', 'company_code', 'candidate_id', 'source_id']::text[]),
      ('risk_share_prep_decisions_seq_uidx',
       'public.risk_share_preparation_decisions'::regclass, true,
       array['decision_seq']::text[]),
      ('risk_share_prep_decisions_candidate_seq_idx',
       'public.risk_share_preparation_decisions'::regclass, false,
       array['company_code', 'candidate_id', 'decision_seq DESC']::text[]),
      ('risk_share_prep_decisions_correlation_candidate_uidx',
       'public.risk_share_preparation_decisions'::regclass, true,
       array['company_code', 'correlation_id', 'candidate_id']::text[]),
      ('risk_share_prep_decisions_idempotency_candidate_uidx',
       'public.risk_share_preparation_decisions'::regclass, true,
       array['company_code', 'idempotency_key', 'candidate_id']::text[])
    ) as expected(indexname, indrelid, is_unique, expected_cols)
  loop
    if to_regclass('public.' || v_idx.indexname) is null then
      raise exception 'risk_share_preparation_decisions postcondition failed: % is missing', v_idx.indexname;
    end if;

    select
      (
        i.indisunique = v_idx.is_unique
        and i.indisvalid and i.indisready and i.indislive
        and i.indexprs is null and i.indpred is null
        and i.indrelid = v_idx.indrelid
      ),
      (
        select array_agg(
          a.attname || case when (i.indoption[k.ord - 1] & 1) = 1 then ' DESC' else '' end
          order by k.ord
        )
        from unnest(i.indkey) with ordinality as k(attnum, ord)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
      )
    into v_idx_ok, v_actual_cols
    from pg_index i
    where i.indexrelid = ('public.' || v_idx.indexname)::regclass;

    if not coalesce(v_idx_ok, false) or v_actual_cols is distinct from v_idx.expected_cols then
      raise exception 'risk_share_preparation_decisions postcondition failed: % definition mismatch', v_idx.indexname;
    end if;
  end loop;

  -- ---------------------------------------------------------------
  -- Table privilege matrix.
  -- ---------------------------------------------------------------
  for v_priv in
    select *
    from (values
      ('service_role', 'SELECT', true), ('service_role', 'INSERT', true),
      ('service_role', 'UPDATE', false), ('service_role', 'DELETE', false),
      ('service_role', 'TRUNCATE', false), ('service_role', 'REFERENCES', false),
      ('service_role', 'TRIGGER', false),
      ('anon', 'SELECT', false), ('anon', 'INSERT', false),
      ('authenticated', 'SELECT', false), ('authenticated', 'INSERT', false),
      ('public', 'SELECT', false)
    ) as expected(role_name, privilege, expected_value)
  loop
    if has_table_privilege(v_priv.role_name, 'public.risk_share_preparation_decisions', v_priv.privilege) <> v_priv.expected_value then
      raise exception 'risk_share_preparation_decisions postcondition failed: % % table privilege does not match the expected contract', v_priv.role_name, v_priv.privilege;
    end if;
  end loop;

  -- ---------------------------------------------------------------
  -- decision_seq identity sequence privilege matrix.
  -- ---------------------------------------------------------------
  v_seq := pg_get_serial_sequence('public.risk_share_preparation_decisions', 'decision_seq');

  for v_priv in
    select *
    from (values
      ('service_role', 'USAGE', true), ('service_role', 'SELECT', false), ('service_role', 'UPDATE', false),
      ('anon', 'USAGE', false), ('authenticated', 'USAGE', false), ('public', 'USAGE', false)
    ) as expected(role_name, privilege, expected_value)
  loop
    if has_sequence_privilege(v_priv.role_name, v_seq, v_priv.privilege) <> v_priv.expected_value then
      raise exception 'risk_share_preparation_decisions postcondition failed: % sequence % privilege does not match the expected contract', v_priv.role_name, v_priv.privilege;
    end if;
  end loop;
end
$$;
