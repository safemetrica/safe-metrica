import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

/**
 * Server-only, read-only factual state for the A2 Preparation flow (one
 * tenant, one source). This module never authenticates a browser and never
 * derives tenant identity itself -- verifiedCompanyCode must already be the
 * server-confirmed selectedTenantCode from an authenticated tenant session
 * (see requireTenantAccessForCurrentSession), exactly like
 * listRiskShareItemsForManagerReview and listRiskShareSourcesForTenant.
 * Passing an unverified/client-supplied company code here is a caller bug,
 * not something this module can detect or correct.
 *
 * This is a FACTUAL_STATE_ONLY read model, not a second implementation of
 * prepare_risk_share_items_for_tenant's eligibility/decision logic. It
 * reports what is already durably true (item exists, latest recorded
 * Decision, mapping-version mismatch, missing-field flag) and leaves the
 * question "would a Preparation request actually succeed for this
 * candidate" to the RPC itself, which is the only authoritative per-call
 * classifier. No field here is named/shaped to imply eligibility,
 * auto-preparability, or legal/safety sufficiency.
 *
 * Hardening in this revision: (1) decision/reason_code is validated as an
 * exact pair, not two independently-valid enums; (2) a Decision requiring
 * an Item must reference the *same* Item id this candidate's own
 * risk_share_items lineage resolves to, not merely "some Item exists"
 * (Item id itself is still never exposed outward); (3) the five mapping-
 * provenance columns (mapping_version/sheet_index/source_row_number/
 * source_row_signature_sha256/import_actor) are validated as an
 * all-null-or-all-valid group, matching the DB's own
 * risk_share_item_candidates_mapping_provenance_consistency_check
 * constraint, before awaiting_preparation_request may be produced; (4) all
 * DB integer fields (mapping_version, sheet_index, source_row_number,
 * decision_seq) are parsed strictly -- a decimal, NaN, Infinity, or
 * out-of-range value is rejected, never truncated; (5) confirmed-mapping
 * embedded rows (used only to compute the mappingMismatch flag) are
 * cross-checked against verifiedCompanyCode and fail the whole source
 * lookup closed on any mismatch, non-array embed, malformed row, or
 * duplicate sheet_index -- never silently skipped; (6) summary.isComplete
 * lives inside summary (not as a top-level sibling), so the completeness
 * caveat always travels with the counts it qualifies.
 */

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_ROW_SIGNATURE_PATTERN = /^[0-9a-f]{64}$/;

/** One more than the display cap so a full page of results (exactly
 * DISPLAY_LIMIT rows) is distinguishable from a truncated one -- same
 * convention as listRiskShareItemsForManagerReview's DISPLAY_LIMIT/
 * FETCH_LIMIT pair. */
const DISPLAY_LIMIT = 200;
const FETCH_LIMIT = DISPLAY_LIMIT + 1;

const KNOWN_REVIEWER_STATUSES = new Set([
  "pending",
  "accepted",
  "edited",
  "excluded",
  "needs_customer_check",
]);

const KNOWN_IMPORT_ACTORS = new Set(["owner_console", "tenant_admin", "tenant_manager"]);

const DECISIONS_REQUIRING_ITEM = new Set(["auto_prepared", "manager_review_required"]);

/** Exact decision -> valid reason_code pairing, mirroring the DB's own
 * risk_share_prep_decisions_decision_reason_pair_check constraint
 * (20260717020000_add_risk_share_preparation_decisions.sql). A reason_code
 * that is individually a known value but paired with the wrong decision
 * (e.g. auto_prepared + MISSING_REQUIRED_FIELD) is exactly as invalid as an
 * unknown reason_code -- this map is the only place reason_code validity is
 * checked; there is no separate flat "is this a known reason_code at all"
 * check anywhere else in this module. */
const VALID_REASON_CODES_BY_DECISION: Readonly<Record<RiskSharePreparationDecisionValue, ReadonlySet<string>>> = {
  auto_prepared: new Set(["AUTO_SAME_MAPPING", "AUTO_SOURCE_FAITHFUL"]),
  manager_review_required: new Set([
    "FIRST_TEMPLATE_REVIEW",
    "LOW_CONFIDENCE",
    "SOURCE_LOCATION_UNCLEAR",
    "MAPPING_CHANGED",
    "ITEM_COUNT_DELTA",
    "CONTENT_MEANING_CHANGED",
  ]),
  owner_exception_required: new Set([
    "MISSING_REQUIRED_FIELD",
    "MAPPING_CONFLICT",
    "SENSITIVE_DATA_SUSPECTED",
    "REPEATED_PROCESSING_FAILURE",
  ]),
};

const KNOWN_DECISIONS = new Set<string>(Object.keys(VALID_REASON_CODES_BY_DECISION));

export type RiskSharePreparationCategory =
  | "awaiting_preparation_request"
  | "recorded_exception"
  | "already_prepared"
  | "not_applicable";

export type RiskSharePreparationDecisionValue =
  | "auto_prepared"
  | "manager_review_required"
  | "owner_exception_required";

export type RiskSharePreparationEntry =
  | {
      kind: "valid";
      candidateId: string;
      sourceId: string;
      taskName: string;
      hazard: string;
      reviewerStatus: string;
      category: RiskSharePreparationCategory;
      hasItem: boolean;
      latestDecision: RiskSharePreparationDecisionValue | null;
      latestReasonCode: string | null;
      mappingMismatch: boolean;
      missingRequiredField: boolean;
    }
  | { kind: "invalid"; candidateId: string | null };

export type RiskSharePreparationStateResult =
  | {
      status: "ok";
      source: {
        sourceId: string;
        sourceTitle: string;
        siteName: string | null;
      };
      /** Every count here describes only the entries actually returned in
       * `entries` (at most DISPLAY_LIMIT) -- never the full Candidate
       * population for this source. When summary.isComplete is false, these
       * are counts within a truncated window, not a source-wide total; no
       * field on this object may be read as "the full source has N
       * candidates". */
      summary: {
        loadedTotal: number;
        /** Equivalent to !overflow, nested inside summary (not top-level)
         * so it travels with the counts it qualifies -- a caller reading
         * `summary` in isolation (e.g. logging, a UI badge) always has the
         * completeness caveat attached to the same object as the counts,
         * rather than needing to separately thread the sibling `overflow`
         * field through. */
        isComplete: boolean;
        awaitingPreparationRequest: number;
        recordedException: number;
        alreadyPrepared: number;
        notApplicable: number;
        invalid: number;
      };
      entries: RiskSharePreparationEntry[];
      /** True when strictly more than DISPLAY_LIMIT Candidates exist for
       * this source (the FETCH_LIMIT-th row was present). Retained at the
       * top level alongside summary.isComplete (its exact negation) for
       * callers that only care about the raw truncation signal. */
      overflow: boolean;
    }
  /** A real, verified-tenant source with zero Candidates. Also used, by
   * design, for a source id that does not resolve for this tenant at all
   * (nonexistent or belongs to another tenant) -- see
   * fetchSourceAndConfirmedMappings below for why those two cases must
   * collapse to this same discriminant rather than a distinguishable
   * "not_found" state. */
  | { status: "empty" }
  /** A query/config failure, or a structurally invalid verifiedCompanyCode/
   * sourceId passed by the caller. Never collapsed into "empty". */
  | { status: "failed" };

type RiskShareItemLineageRow = {
  id?: unknown;
  company_code?: unknown;
  source_id?: unknown;
};

type RiskSharePreparationDecisionLineageRow = {
  decision?: unknown;
  reason_code?: unknown;
  item_id?: unknown;
  decision_seq?: unknown;
  company_code?: unknown;
  source_id?: unknown;
  candidate_id?: unknown;
};

type RiskSharePreparationCandidateRow = {
  id?: unknown;
  company_code?: unknown;
  source_id?: unknown;
  task_name?: unknown;
  hazard?: unknown;
  reviewer_status?: unknown;
  mapping_version?: unknown;
  sheet_index?: unknown;
  source_row_number?: unknown;
  source_row_signature_sha256?: unknown;
  import_actor?: unknown;
  risk_share_items?: unknown;
  risk_share_preparation_decisions?: unknown;
};

type RiskShareSourceWithConfirmedMappingsRow = {
  id?: unknown;
  source_title?: unknown;
  site_name?: unknown;
  risk_share_source_column_mappings?: unknown;
};

type ConfirmedMappingRow = {
  sheet_index?: unknown;
  mapping_version?: unknown;
  status?: unknown;
  company_code?: unknown;
};

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();
  return COMPANY_CODE_PATTERN.test(value) ? value : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown): string | null {
  const text = readTrimmedString(value);
  return text || null;
}

/** Strict integer parse for DB integer-typed fields: a real integer number
 * (Number.isInteger rejects a decimal, NaN, and +/-Infinity on its own) or
 * an integer-shaped string (`^-?\d+$` rejects "1.5", "1e10", "Infinity",
 * leading/trailing junk, and empty). Never truncates a decimal value --
 * 1.5 and "1.5" are both rejected outright, not silently floored to 1. */
function readStrictInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!/^-?\d+$/.test(trimmed)) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

/** Builds sheet_index -> confirmed mapping_version for one source, plus the
 * source's own display facts, in a single bounded PostgREST request: the
 * base resource is risk_share_sources filtered to exactly one id+
 * company_code (at most one row) -- that parent filter is what actually
 * scopes this whole call to one tenant. risk_share_source_column_mappings
 * is embedded and filtered only to status=eq.confirmed (at most ~20 rows --
 * sheet index is DB-constrained to 0..19); it is deliberately NOT also
 * filtered by company_code at the embedded level. Embedding a
 * company_code=eq.verifiedCompanyCode filter on the child relation would
 * make PostgREST silently drop any wrong-tenant confirmed-mapping row
 * before it ever reaches the JS validation below -- collapsing a genuine
 * tenant-drift anomaly (a confirmed row that exists but belongs to a
 * different company_code than this source's own) into the exact same
 * shape as "no confirmed mappings at all", which is precisely the
 * distinction this function exists to preserve. Every confirmed row this
 * function actually receives is instead validated in JS (company_code,
 * status, sheet_index, mapping_version, no duplicate sheet_index); a
 * mismatch on any of those fails the whole source lookup closed (ok:
 * false), never a silent per-row skip -- confirmed-mapping company_code is
 * used only to run this check and is never returned outward. */
async function fetchSourceAndConfirmedMappings(
  verifiedCompanyCode: string,
  sourceId: string,
): Promise<
  | { ok: true; found: false }
  | {
      ok: true;
      found: true;
      sourceTitle: string;
      siteName: string | null;
      confirmedMappingVersionBySheetIndex: Map<number, number>;
    }
  | { ok: false }
> {
  const query = new URLSearchParams();
  query.set(
    "select",
    "id,source_title,site_name,risk_share_source_column_mappings!risk_share_source_column_mappings_source_id_fkey(sheet_index,mapping_version,status,company_code)",
  );
  query.set("id", `eq.${sourceId}`);
  query.set("company_code", `eq.${verifiedCompanyCode}`);
  query.set("risk_share_source_column_mappings.status", "eq.confirmed");
  // No embedded company_code filter here -- see the function-level comment
  // above for why: filtering the child relation by tenant would hide a
  // wrong-tenant confirmed row from the JS validation loop below instead of
  // letting it be caught and fail closed. Tenant scoping for this whole
  // call comes from the parent risk_share_sources id+company_code filter
  // above; every embedded row this query does return is independently
  // re-validated against verifiedCompanyCode in JS (see the fail-closed
  // loop below).
  query.set("limit", "1");

  let rows: RiskShareSourceWithConfirmedMappingsRow[];

  try {
    rows = await selectSupabaseExportRows<RiskShareSourceWithConfirmedMappingsRow>(
      "risk_share_sources",
      query,
    );
  } catch {
    return { ok: false };
  }

  const row = rows[0];

  if (!row) {
    return { ok: true, found: false };
  }

  const sourceTitle = readTrimmedString(row.source_title);

  if (!sourceTitle) {
    // A source row that exists but fails its own required-field shape is
    // treated the same as a query failure -- never surfaced as if it were
    // a normal, displayable source.
    return { ok: false };
  }

  // A non-array embedded value is itself a malformed response shape -- it
  // is never silently treated as "no confirmed mappings" (that is what a
  // real empty array means, and the two must stay distinguishable).
  if (!Array.isArray(row.risk_share_source_column_mappings)) {
    return { ok: false };
  }

  const confirmedRows = row.risk_share_source_column_mappings as ConfirmedMappingRow[];
  const confirmedMappingVersionBySheetIndex = new Map<number, number>();

  for (const confirmedRow of confirmedRows) {
    const confirmedRowCompanyCode = readTrimmedString(confirmedRow.company_code);
    const status = readTrimmedString(confirmedRow.status);
    const sheetIndex = readStrictInteger(confirmedRow.sheet_index);
    const mappingVersion = readStrictInteger(confirmedRow.mapping_version);

    // Every field is validated together; a single malformed or
    // wrong-tenant confirmed-mapping row fails the whole source lookup
    // closed (not skipped) -- confirmed-mapping data feeds the
    // mappingMismatch flag for every Candidate in this source, so a row
    // that cannot be trusted here must not be silently dropped from the
    // map it builds.
    if (
      confirmedRowCompanyCode !== verifiedCompanyCode ||
      status !== "confirmed" ||
      sheetIndex === null ||
      sheetIndex < 0 ||
      sheetIndex > 19 ||
      mappingVersion === null ||
      mappingVersion < 1
    ) {
      return { ok: false };
    }

    if (confirmedMappingVersionBySheetIndex.has(sheetIndex)) {
      // More than one confirmed row for the same sheet_index is a
      // contradiction (there is supposed to be at most one confirmed
      // mapping per source+sheet at any time) -- fail closed rather than
      // silently keep whichever row happened to be seen first/last.
      return { ok: false };
    }

    confirmedMappingVersionBySheetIndex.set(sheetIndex, mappingVersion);
  }

  return {
    ok: true,
    found: true,
    sourceTitle,
    siteName: readNullableString(row.site_name),
    confirmedMappingVersionBySheetIndex,
  };
}

/** Fetches up to FETCH_LIMIT Candidates for one source, each with its item-
 * existence lineage and its latest Preparation Decision embedded in the
 * same request via PostgREST resource embedding -- not one request per
 * Candidate. The Decision embed is bounded per Candidate (not globally) by
 * explicit embedded order (decision_seq.desc) and embedded limit (1),
 * documented PostgREST resource-embedding behavior for a to-many
 * relationship: PostgREST evaluates embedded order/limit as a per-parent-
 * row window (a lateral "top-N per group"), not a single limit applied
 * across the whole embedded result set. Both embeds use an explicit
 * `!constraint_name` relationship hint so there is no ambiguity to resolve
 * at query time, even if an unrelated future FK is added to either table:
 *   - risk_share_items!risk_share_items_candidate_id_fkey
 *     (the only FK from risk_share_items to risk_share_item_candidates,
 *     auto-named by Postgres from the inline `references` clause in
 *     20260616002000_create_risk_share_items.sql)
 *   - risk_share_preparation_decisions!risk_share_prep_decisions_candidate_lineage_fkey
 *     (the only FK from risk_share_preparation_decisions to
 *     risk_share_item_candidates, explicitly named in
 *     20260717020000_add_risk_share_preparation_decisions.sql)
 */
async function fetchCandidatesWithLineage(
  verifiedCompanyCode: string,
  sourceId: string,
): Promise<RiskSharePreparationCandidateRow[]> {
  const query = new URLSearchParams();
  query.set(
    "select",
    [
      "id",
      "company_code",
      "source_id",
      "task_name",
      "hazard",
      "reviewer_status",
      "mapping_version",
      "sheet_index",
      "source_row_number",
      "source_row_signature_sha256",
      "import_actor",
      "risk_share_items!risk_share_items_candidate_id_fkey(id,company_code,source_id)",
      "risk_share_preparation_decisions!risk_share_prep_decisions_candidate_lineage_fkey(decision,reason_code,item_id,decision_seq,company_code,source_id,candidate_id)",
    ].join(","),
  );
  query.set("company_code", `eq.${verifiedCompanyCode}`);
  query.set("source_id", `eq.${sourceId}`);
  query.set("order", "id.asc");
  query.set("limit", String(FETCH_LIMIT));
  // Per-Candidate bound on the embedded Decision relationship -- the
  // single hard requirement this helper must prove (see module comment
  // above and the contract verification script's "Latest Decision" check).
  query.set("risk_share_preparation_decisions.order", "decision_seq.desc");
  query.set("risk_share_preparation_decisions.limit", "1");

  return selectSupabaseExportRows<RiskSharePreparationCandidateRow>(
    "risk_share_item_candidates",
    query,
  );
}

/** itemId is resolved and validated here for internal lineage cross-checks
 * only (see toPreparationEntry) -- it is never placed on
 * RiskSharePreparationEntry or any other outward-facing shape. */
type ItemLineageResult =
  | { ok: true; hasItem: boolean; itemId: string | null }
  | { ok: false };

function resolveItemLineage(
  raw: unknown,
  verifiedCompanyCode: string,
  sourceId: string,
): ItemLineageResult {
  if (!Array.isArray(raw)) {
    return { ok: false };
  }

  if (raw.length === 0) {
    return { ok: true, hasItem: false, itemId: null };
  }

  if (raw.length > 1) {
    // risk_share_items.candidate_id is unique at the DB level -- more than
    // one embedded row is a contradiction, not a value worth guessing at.
    return { ok: false };
  }

  const item = raw[0] as RiskShareItemLineageRow;
  const id = readTrimmedString(item.id);
  const companyCode = readTrimmedString(item.company_code);
  const itemSourceId = readTrimmedString(item.source_id);

  if (!isUuid(id) || companyCode !== verifiedCompanyCode || itemSourceId !== sourceId) {
    return { ok: false };
  }

  return { ok: true, hasItem: true, itemId: id.toLowerCase() };
}

/** decisionItemId is resolved and validated here for internal lineage
 * cross-checks only (see toPreparationEntry) -- it is never placed on
 * RiskSharePreparationEntry or any other outward-facing shape. */
type DecisionLineageResult =
  | { ok: true; decision: null; reasonCode: null; decisionItemId: null }
  | {
      ok: true;
      decision: RiskSharePreparationDecisionValue;
      reasonCode: string;
      decisionItemId: string | null;
    }
  | { ok: false };

function resolveDecisionLineage(
  raw: unknown,
  verifiedCompanyCode: string,
  sourceId: string,
  candidateId: string,
): DecisionLineageResult {
  if (!Array.isArray(raw)) {
    return { ok: false };
  }

  if (raw.length === 0) {
    return { ok: true, decision: null, reasonCode: null, decisionItemId: null };
  }

  if (raw.length > 1) {
    // The embedded query explicitly requests limit=1 for this relationship;
    // more than one row back means that bound was not honored, and this
    // candidate's state must not be guessed at from an arbitrary row.
    return { ok: false };
  }

  const row = raw[0] as RiskSharePreparationDecisionLineageRow;
  const decision = readTrimmedString(row.decision);
  const reasonCode = readTrimmedString(row.reason_code);
  const companyCode = readTrimmedString(row.company_code);
  const decisionSourceId = readTrimmedString(row.source_id);
  const decisionCandidateId = readTrimmedString(row.candidate_id);

  if (
    !KNOWN_DECISIONS.has(decision) ||
    companyCode !== verifiedCompanyCode ||
    decisionSourceId !== sourceId ||
    decisionCandidateId !== candidateId
  ) {
    return { ok: false };
  }

  // Exact decision/reason_code pairing, not two independently-valid enums:
  // a reason_code that is a known value for a *different* decision (e.g.
  // MISSING_REQUIRED_FIELD paired with auto_prepared) is exactly as invalid
  // as an unrecognized reason_code string.
  const decisionValue = decision as RiskSharePreparationDecisionValue;

  if (!VALID_REASON_CODES_BY_DECISION[decisionValue].has(reasonCode)) {
    return { ok: false };
  }

  const decisionSeq = readStrictInteger(row.decision_seq);

  // decision_seq is never returned outward, but its shape is still
  // validated here: this row was selected specifically as "the row with
  // the highest decision_seq" (embedded order=decision_seq.desc&limit=1),
  // so a decision_seq that is not itself a valid positive integer means
  // the embed did not return what this module's whole latest-Decision
  // contract depends on.
  if (decisionSeq === null || decisionSeq < 1) {
    return { ok: false };
  }

  const itemIdRaw = row.item_id;
  const itemPresent = itemIdRaw !== null && itemIdRaw !== undefined;

  if (itemPresent && !isUuid(itemIdRaw)) {
    return { ok: false };
  }

  const decisionItemId = itemPresent ? (itemIdRaw as string).toLowerCase() : null;

  // Structural presence rule mirrors the DB CHECK constraint
  // (risk_share_prep_decisions_item_presence_check): auto_prepared/
  // manager_review_required must carry an item_id, owner_exception_required
  // must not. A Decision row that disagrees with its own DB contract is
  // never trusted here.
  const requiresItem = DECISIONS_REQUIRING_ITEM.has(decisionValue);

  if (requiresItem !== itemPresent) {
    return { ok: false };
  }

  // Explicit, named restatement of the owner_exception_required half of
  // the rule above -- kept as its own check (not only the generic
  // requiresItem comparison) so this specific contract can never silently
  // regress if the generic check is ever refactored.
  if (decisionValue === "owner_exception_required" && decisionItemId !== null) {
    return { ok: false };
  }

  return {
    ok: true,
    decision: decisionValue,
    reasonCode,
    decisionItemId,
  };
}

type MappingProvenanceResult =
  | { ok: true; complete: false }
  | { ok: true; complete: true; mappingVersion: number; sheetIndex: number }
  | { ok: false };

/** All five mapping-provenance columns must be either all null (a manual/
 * legacy candidate with no import lineage) or all present and individually
 * valid -- mirrors the DB's own
 * risk_share_item_candidates_mapping_provenance_consistency_check
 * constraint (20260713020000_add_risk_share_candidate_source_mapping_provenance.sql).
 * source_row_number, source_row_signature_sha256, and import_actor are
 * read and validated here only to enforce that all-or-nothing shape --
 * none of the three is ever exposed outward; only the derived
 * mappingVersion/sheetIndex (used for the mappingMismatch flag and the
 * awaiting_preparation_request gate) escape this function. */
function resolveMappingProvenance(row: RiskSharePreparationCandidateRow): MappingProvenanceResult {
  const mappingVersionRaw = row.mapping_version;
  const sheetIndexRaw = row.sheet_index;
  const sourceRowNumberRaw = row.source_row_number;
  const sourceRowSignatureRaw = row.source_row_signature_sha256;
  const importActorRaw = row.import_actor;

  const allNull =
    mappingVersionRaw === null &&
    sheetIndexRaw === null &&
    sourceRowNumberRaw === null &&
    sourceRowSignatureRaw === null &&
    importActorRaw === null;

  if (allNull) {
    return { ok: true, complete: false };
  }

  const mappingVersion = readStrictInteger(mappingVersionRaw);
  const sheetIndex = readStrictInteger(sheetIndexRaw);
  const sourceRowNumber = readStrictInteger(sourceRowNumberRaw);
  const sourceRowSignatureValid =
    typeof sourceRowSignatureRaw === "string" &&
    SOURCE_ROW_SIGNATURE_PATTERN.test(sourceRowSignatureRaw);
  const importActorValid =
    typeof importActorRaw === "string" && KNOWN_IMPORT_ACTORS.has(importActorRaw);

  if (
    mappingVersion === null ||
    mappingVersion < 1 ||
    sheetIndex === null ||
    sheetIndex < 0 ||
    sheetIndex > 19 ||
    sourceRowNumber === null ||
    sourceRowNumber < 1 ||
    !sourceRowSignatureValid ||
    !importActorValid
  ) {
    return { ok: false };
  }

  return { ok: true, complete: true, mappingVersion, sheetIndex };
}

function toPreparationEntry(
  row: RiskSharePreparationCandidateRow,
  verifiedCompanyCode: string,
  sourceId: string,
  confirmedMappingVersionBySheetIndex: Map<number, number>,
): RiskSharePreparationEntry {
  const candidateId = readTrimmedString(row.id);

  if (!isUuid(candidateId)) {
    return { kind: "invalid", candidateId: candidateId || null };
  }

  const companyCode = readTrimmedString(row.company_code);
  const rowSourceId = readTrimmedString(row.source_id);
  const taskName = readTrimmedString(row.task_name);
  const hazard = readTrimmedString(row.hazard);
  const reviewerStatus = readTrimmedString(row.reviewer_status);

  if (
    companyCode !== verifiedCompanyCode ||
    rowSourceId !== sourceId ||
    !KNOWN_REVIEWER_STATUSES.has(reviewerStatus)
  ) {
    return { kind: "invalid", candidateId };
  }

  // task_name/hazard are NOT NULL columns but are not empty-checked at the
  // DB level -- an empty value is a real, valid stored fact (surfaced via
  // missingRequiredField below), not a malformed row.
  if (typeof row.task_name !== "string" || typeof row.hazard !== "string") {
    return { kind: "invalid", candidateId };
  }

  const provenance = resolveMappingProvenance(row);

  if (!provenance.ok) {
    return { kind: "invalid", candidateId };
  }

  const itemLineage = resolveItemLineage(row.risk_share_items, verifiedCompanyCode, sourceId);

  if (!itemLineage.ok) {
    return { kind: "invalid", candidateId };
  }

  const decisionLineage = resolveDecisionLineage(
    row.risk_share_preparation_decisions,
    verifiedCompanyCode,
    sourceId,
    candidateId,
  );

  if (!decisionLineage.ok) {
    return { kind: "invalid", candidateId };
  }

  const latestDecision = decisionLineage.decision;
  const latestReasonCode = decisionLineage.decision === null ? null : decisionLineage.reasonCode;

  // Exact Item-lineage cross-check: a Decision requiring an Item must
  // point at the *same* Item id this candidate's own risk_share_items
  // lookup resolved to -- not merely "some Item exists for this
  // candidate". Both "no embedded Item at all" and "embedded Item id
  // differs from the Decision's item_id" fail closed here. Neither id is
  // ever exposed outward; this comparison exists purely to catch a
  // contradictory row.
  if (latestDecision !== null && DECISIONS_REQUIRING_ITEM.has(latestDecision)) {
    if (
      !itemLineage.hasItem ||
      decisionLineage.decisionItemId === null ||
      decisionLineage.decisionItemId !== itemLineage.itemId
    ) {
      return { kind: "invalid", candidateId };
    }
  }

  const hasItem = itemLineage.hasItem;

  let mappingMismatch = false;

  if (provenance.complete) {
    const confirmedVersion = confirmedMappingVersionBySheetIndex.get(provenance.sheetIndex);
    mappingMismatch = confirmedVersion === undefined || confirmedVersion !== provenance.mappingVersion;
  }

  const missingRequiredField = taskName.length === 0 || hazard.length === 0;

  let category: RiskSharePreparationCategory;

  if (hasItem) {
    category = "already_prepared";
  } else if (latestDecision === "owner_exception_required") {
    category = "recorded_exception";
  } else if (latestDecision === null && reviewerStatus === "pending" && provenance.complete) {
    // awaiting_preparation_request is allowed only when complete, valid
    // mapping provenance exists -- not merely a non-null mapping_version.
    category = "awaiting_preparation_request";
  } else {
    category = "not_applicable";
  }

  return {
    kind: "valid",
    candidateId,
    sourceId,
    taskName,
    hazard,
    reviewerStatus,
    category,
    hasItem,
    latestDecision,
    latestReasonCode,
    mappingMismatch,
    missingRequiredField,
  };
}

/**
 * Factual Preparation state for one tenant + one source. Callers must
 * supply:
 *   - verifiedCompanyCode: already the server-confirmed selectedTenantCode
 *     from an authenticated tenant session (this function does not
 *     authenticate a browser and does not itself re-derive tenant identity)
 *   - sourceId: must be UUID-shaped; a malformed sourceId returns
 *     status "failed", not "empty"
 *
 * A source id that does not resolve for verifiedCompanyCode -- either
 * because it does not exist at all, or because it belongs to a different
 * tenant -- returns status "empty", identical to a real source with zero
 * Candidates. This is intentional: distinguishing "wrong tenant" from
 * "does not exist" would leak a cross-tenant existence signal to whatever
 * UI/route calls this helper.
 */
export async function listRiskSharePreparationStateForSource(
  verifiedCompanyCode: string,
  sourceId: string,
): Promise<RiskSharePreparationStateResult> {
  const companyCode = normalizeStrictCompanyCode(verifiedCompanyCode);

  if (!companyCode || !isUuid(sourceId)) {
    console.error("[risk-share-preparation-read-model] invalid caller input", {
      operation: "listRiskSharePreparationStateForSource",
    });

    return { status: "failed" };
  }

  const normalizedSourceId = sourceId.toLowerCase();

  const sourceResult = await fetchSourceAndConfirmedMappings(companyCode, normalizedSourceId);

  if (!sourceResult.ok) {
    console.error("[risk-share-preparation-read-model] source lookup failed", {
      operation: "fetchSourceAndConfirmedMappings",
    });

    return { status: "failed" };
  }

  if (!sourceResult.found) {
    return { status: "empty" };
  }

  let candidateRows: RiskSharePreparationCandidateRow[];

  try {
    candidateRows = await fetchCandidatesWithLineage(companyCode, normalizedSourceId);
  } catch {
    console.error("[risk-share-preparation-read-model] candidate lookup failed", {
      operation: "fetchCandidatesWithLineage",
    });

    return { status: "failed" };
  }

  if (candidateRows.length === 0) {
    return { status: "empty" };
  }

  const overflow = candidateRows.length > DISPLAY_LIMIT;
  const boundedRows = candidateRows.slice(0, DISPLAY_LIMIT);

  const entries: RiskSharePreparationEntry[] = boundedRows.map((row) =>
    toPreparationEntry(
      row,
      companyCode,
      normalizedSourceId,
      sourceResult.confirmedMappingVersionBySheetIndex,
    ),
  );

  const summary = {
    loadedTotal: entries.length,
    isComplete: !overflow,
    awaitingPreparationRequest: 0,
    recordedException: 0,
    alreadyPrepared: 0,
    notApplicable: 0,
    invalid: 0,
  };

  for (const entry of entries) {
    if (entry.kind === "invalid") {
      summary.invalid += 1;
      continue;
    }

    switch (entry.category) {
      case "awaiting_preparation_request":
        summary.awaitingPreparationRequest += 1;
        break;
      case "recorded_exception":
        summary.recordedException += 1;
        break;
      case "already_prepared":
        summary.alreadyPrepared += 1;
        break;
      case "not_applicable":
        summary.notApplicable += 1;
        break;
    }
  }

  return {
    status: "ok",
    source: {
      sourceId: normalizedSourceId,
      sourceTitle: sourceResult.sourceTitle,
      siteName: sourceResult.siteName,
    },
    summary,
    entries,
    overflow,
  };
}
