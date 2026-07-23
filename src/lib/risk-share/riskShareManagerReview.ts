import "server-only";

import { applyRiskShareDefaultSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import { listRiskShareSourcesForTenant } from "@/lib/risk-share/riskShareSourceRegistry";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** One more than the display cap so a full page of results (exactly
 * DISPLAY_LIMIT rows) is distinguishable from a truncated one (more than
 * DISPLAY_LIMIT rows actually exist). */
const DISPLAY_LIMIT = 200;
const FETCH_LIMIT = DISPLAY_LIMIT + 1;
const SOURCE_TITLE_LOOKUP_LIMIT = 50;
const FALLBACK_SOURCE_TITLE = "등록 원본";

const KNOWN_SHARE_STATUSES = new Set([
  "draft",
  "needs_customer_check",
  "customer_confirmed",
  "locked",
  "excluded",
]);

const KNOWN_CUSTOMER_CHECK_STATUSES = new Set([
  "not_requested",
  "requested",
  "confirmed",
  "returned",
]);

export type RiskShareManagerReviewItem = {
  id: string;
  companyCode: string;
  siteName: string | null;
  sourceId: string | null;
  candidateId: string | null;
  /** Resolved server-side from the source registry. Never the raw source
   * UUID -- falls back to FALLBACK_SOURCE_TITLE when unresolved. */
  sourceTitle: string;
  taskName: string;
  hazard: string;
  accidentType: string | null;
  riskLevel: string | null;
  currentControls: string | null;
  improvementPlan: string | null;
  workerShareSummary: string | null;
  shareStatus: string;
  customerCheckStatus: string;
  customerConfirmed: boolean;
  workerVisible: boolean;
  versionLockId: string | null;
  sourcePage: number | null;
  sourceRow: string | null;
  reviewRevision: number;
  /** Canonical PostgreSQL bigint decimal text for Publish revision guards. */
  reviewRevisionText: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RiskShareManagerReviewListEntry =
  | { kind: "valid"; item: RiskShareManagerReviewItem }
  /** A row that failed a required-field/enum check. Kept in the list (not
   * silently dropped) so a customer never sees a shorter list than what
   * actually exists, but with no editable fields available. */
  | { kind: "invalid"; id: string | null };

export type RiskShareManagerReviewListResult =
  | {
      status: "ok";
      entries: RiskShareManagerReviewListEntry[];
      /** True when more than DISPLAY_LIMIT rows exist for this tenant --
       * entries is capped at DISPLAY_LIMIT and must be shown as an overflow
       * state, not a silently truncated list. */
      overflow: boolean;
    }
  | { status: "failed" };

type RiskShareManagerReviewRow = {
  id?: unknown;
  company_code?: unknown;
  site_name?: unknown;
  source_id?: unknown;
  candidate_id?: unknown;
  task_name?: unknown;
  hazard?: unknown;
  accident_type?: unknown;
  risk_level?: unknown;
  current_controls?: unknown;
  improvement_plan?: unknown;
  worker_share_summary?: unknown;
  share_status?: unknown;
  customer_check_status?: unknown;
  customer_confirmed?: unknown;
  worker_visible?: unknown;
  version_lock_id?: unknown;
  source_page?: unknown;
  source_row?: unknown;
  review_revision?: unknown;
  review_revision_text?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();
  return COMPANY_CODE_PATTERN.test(value) ? value : null;
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

/** Parses one raw row into a valid item or flags it invalid. Never
 * coerces/defaults a malformed value into a valid-looking one -- a missing
 * or out-of-enum field fails the whole row closed. */
function toReviewListEntry(
  row: RiskShareManagerReviewRow,
  expectedCompanyCode: string,
  sourceTitleById: Map<string, string>,
): RiskShareManagerReviewListEntry {
  const id = readTrimmedString(row.id);
  const companyCode = readTrimmedString(row.company_code);
  const taskName = readTrimmedString(row.task_name);
  const hazard = readTrimmedString(row.hazard);
  const shareStatus = readTrimmedString(row.share_status);
  const customerCheckStatus = readTrimmedString(row.customer_check_status);
  const reviewRevision = row.review_revision;
  const reviewRevisionText = readTrimmedString(row.review_revision_text);

  if (
    !id ||
    companyCode !== expectedCompanyCode ||
    !taskName ||
    !hazard ||
    !KNOWN_SHARE_STATUSES.has(shareStatus) ||
    !KNOWN_CUSTOMER_CHECK_STATUSES.has(customerCheckStatus) ||
    typeof row.customer_confirmed !== "boolean" ||
    typeof row.worker_visible !== "boolean" ||
    typeof reviewRevision !== "number" ||
    !Number.isFinite(reviewRevision) ||
    reviewRevision < 1 ||
    !/^[1-9][0-9]*$/.test(reviewRevisionText)
  ) {
    return { kind: "invalid", id: id || null };
  }

  const sourceId = readNullableString(row.source_id);

  return {
    kind: "valid",
    item: {
      id,
      companyCode,
      siteName: readNullableString(row.site_name),
      sourceId,
      candidateId: readNullableString(row.candidate_id),
      sourceTitle: (sourceId && sourceTitleById.get(sourceId)) || FALLBACK_SOURCE_TITLE,
      taskName,
      hazard,
      accidentType: readNullableString(row.accident_type),
      riskLevel: readNullableString(row.risk_level),
      currentControls: readNullableString(row.current_controls),
      improvementPlan: readNullableString(row.improvement_plan),
      workerShareSummary: readNullableString(row.worker_share_summary),
      shareStatus,
      customerCheckStatus,
      customerConfirmed: row.customer_confirmed,
      workerVisible: row.worker_visible,
      versionLockId: readNullableString(row.version_lock_id),
      sourcePage: readNullableInteger(row.source_page),
      sourceRow: readNullableString(row.source_row),
      reviewRevision,
      reviewRevisionText,
      createdAt: readNullableString(row.created_at),
      updatedAt: readNullableString(row.updated_at),
    },
  };
}

/** Canonical single-site Share Review list for the manager-facing screen.
 * company_code and siteId must already be server-confirmed from the active
 * session and canonical site resolver -- this function does not itself
 * re-derive either identity, and callers must never pass client-supplied
 * scope straight through.
 * Distinguishes a real zero-row tenant from a query failure via the
 * `status` discriminant; callers must not collapse "failed" into "ok" with
 * an empty list. */
export async function listRiskShareItemsForManagerReview(
  rawCompanyCode: string,
  siteId: string,
): Promise<RiskShareManagerReviewListResult> {
  const companyCode = normalizeStrictCompanyCode(rawCompanyCode);

  if (!companyCode || !UUID_PATTERN.test(siteId)) {
    return { status: "failed" };
  }

  let sourceTitleById: Map<string, string>;

  try {
    const sources = await listRiskShareSourcesForTenant(companyCode, {
      limit: SOURCE_TITLE_LOOKUP_LIMIT,
    });
    sourceTitleById = new Map(
      sources
        .filter((source) => source.sourceTitle)
        .map((source) => [source.id, source.sourceTitle] as const),
    );
  } catch {
    // Source titles are a display nicety, not an access-control or
    // correctness concern -- a lookup failure here falls back to the
    // generic label per item rather than failing the whole list.
    sourceTitleById = new Map();
  }

  const query = new URLSearchParams({
    select:
      "id,company_code,site_name,source_id,candidate_id,task_name,hazard,accident_type,risk_level,current_controls,improvement_plan,worker_share_summary,share_status,customer_check_status,customer_confirmed,worker_visible,version_lock_id,source_page,source_row,review_revision,review_revision_text:review_revision::text,created_at,updated_at",
    company_code: `eq.${companyCode}`,
    order: "created_at.desc,id.desc",
    limit: String(FETCH_LIMIT),
  });
  applyRiskShareDefaultSiteScope(query, siteId);

  let rows: RiskShareManagerReviewRow[];

  try {
    rows = await selectSupabaseExportRows<RiskShareManagerReviewRow>("risk_share_items", query);
  } catch {
    return { status: "failed" };
  }

  const overflow = rows.length > DISPLAY_LIMIT;
  const entries = rows
    .slice(0, DISPLAY_LIMIT)
    .map((row) => toReviewListEntry(row, companyCode, sourceTitleById));

  return { status: "ok", entries, overflow };
}
