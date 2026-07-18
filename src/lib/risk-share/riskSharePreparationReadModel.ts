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
 */

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const KNOWN_DECISIONS = new Set([
  "auto_prepared",
  "manager_review_required",
  "owner_exception_required",
]);

const KNOWN_REASON_CODES = new Set([
  "AUTO_SAME_MAPPING",
  "AUTO_SOURCE_FAITHFUL",
  "FIRST_TEMPLATE_REVIEW",
  "LOW_CONFIDENCE",
  "SOURCE_LOCATION_UNCLEAR",
  "MAPPING_CHANGED",
  "ITEM_COUNT_DELTA",
  "CONTENT_MEANING_CHANGED",
  "MISSING_REQUIRED_FIELD",
  "MAPPING_CONFLICT",
  "SENSITIVE_DATA_SUSPECTED",
  "REPEATED_PROCESSING_FAILURE",
]);

const DECISIONS_REQUIRING_ITEM = new Set(["auto_prepared", "manager_review_required"]);

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
      summary: {
        total: number;
        awaitingPreparationRequest: number;
        recordedException: number;
        alreadyPrepared: number;
        notApplicable: number;
        invalid: number;
      };
      entries: RiskSharePreparationEntry[];
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

function readNullableInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
}

/** Builds sheet_index -> confirmed mapping_version for one source, plus the
 * source's own display facts, in a single bounded PostgREST request: the
 * base resource is risk_share_sources filtered to exactly one id+
 * company_code (at most one row), with risk_share_source_column_mappings
 * embedded and filtered to status=eq.confirmed (at most ~20 rows -- sheet
 * index is DB-constrained to 0..19). This is not a per-candidate query and
 * is issued once per call, independent of how many candidates the source
 * has. */
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
    "id,source_title,site_name,risk_share_source_column_mappings!risk_share_source_column_mappings_source_id_fkey(sheet_index,mapping_version,status)",
  );
  query.set("id", `eq.${sourceId}`);
  query.set("company_code", `eq.${verifiedCompanyCode}`);
  query.set("risk_share_source_column_mappings.status", "eq.confirmed");
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

  const confirmedRows = Array.isArray(row.risk_share_source_column_mappings)
    ? (row.risk_share_source_column_mappings as ConfirmedMappingRow[])
    : [];

  const confirmedMappingVersionBySheetIndex = new Map<number, number>();

  for (const confirmedRow of confirmedRows) {
    if (readTrimmedString(confirmedRow.status) !== "confirmed") {
      // Defensive: the embedded filter above should already guarantee
      // this, but a malformed/unexpected row is skipped rather than
      // trusted, not treated as a whole-query failure -- confirmed-mapping
      // data is used only to compute a boolean mismatch flag, never
      // returned to the browser directly.
      continue;
    }

    const sheetIndex = readNullableInteger(confirmedRow.sheet_index);
    const mappingVersion = readNullableInteger(confirmedRow.mapping_version);

    if (sheetIndex === null || sheetIndex < 0 || mappingVersion === null || mappingVersion < 1) {
      continue;
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

type ItemLineageResult = { ok: true; hasItem: boolean } | { ok: false };

function resolveItemLineage(
  raw: unknown,
  verifiedCompanyCode: string,
  sourceId: string,
): ItemLineageResult {
  if (!Array.isArray(raw)) {
    return { ok: false };
  }

  if (raw.length === 0) {
    return { ok: true, hasItem: false };
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

  return { ok: true, hasItem: true };
}

type DecisionLineageResult =
  | { ok: true; decision: null; reasonCode: null }
  | {
      ok: true;
      decision: RiskSharePreparationDecisionValue;
      reasonCode: string;
      itemPresent: boolean;
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
    return { ok: true, decision: null, reasonCode: null };
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
    !KNOWN_REASON_CODES.has(reasonCode) ||
    companyCode !== verifiedCompanyCode ||
    decisionSourceId !== sourceId ||
    decisionCandidateId !== candidateId
  ) {
    return { ok: false };
  }

  const itemIdRaw = row.item_id;
  const itemPresent = itemIdRaw !== null && itemIdRaw !== undefined;

  if (itemPresent && !isUuid(itemIdRaw)) {
    return { ok: false };
  }

  // Structural presence rule mirrors the DB CHECK constraint
  // (risk_share_prep_decisions_item_presence_check): auto_prepared/
  // manager_review_required must carry an item_id, owner_exception_required
  // must not. A Decision row that disagrees with its own DB contract is
  // never trusted here.
  const requiresItem = DECISIONS_REQUIRING_ITEM.has(decision);

  if (requiresItem !== itemPresent) {
    return { ok: false };
  }

  return {
    ok: true,
    decision: decision as RiskSharePreparationDecisionValue,
    reasonCode,
    itemPresent,
  };
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
  const mappingVersion = readNullableInteger(row.mapping_version);
  const sheetIndex = readNullableInteger(row.sheet_index);

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

  // Cross-check the two independent signals: a Decision requiring an item
  // must agree with the actual risk_share_items lineage lookup, not merely
  // with its own item_id column. Disagreement between the two is exactly
  // the "contradictory row" case section 7A calls out and must fail
  // closed rather than pick one signal to trust.
  if (latestDecision !== null && DECISIONS_REQUIRING_ITEM.has(latestDecision) && !itemLineage.hasItem) {
    return { kind: "invalid", candidateId };
  }

  const hasItem = itemLineage.hasItem;

  let mappingMismatch = false;

  if (mappingVersion !== null && sheetIndex !== null) {
    const confirmedVersion = confirmedMappingVersionBySheetIndex.get(sheetIndex);
    mappingMismatch = confirmedVersion === undefined || confirmedVersion !== mappingVersion;
  }

  const missingRequiredField = taskName.length === 0 || hazard.length === 0;

  let category: RiskSharePreparationCategory;

  if (hasItem) {
    category = "already_prepared";
  } else if (latestDecision === "owner_exception_required") {
    category = "recorded_exception";
  } else if (latestDecision === null && reviewerStatus === "pending" && mappingVersion !== null) {
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
    total: entries.length,
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
