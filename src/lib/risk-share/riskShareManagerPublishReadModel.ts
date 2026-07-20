import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import {
  listRiskShareItemsForManagerReview,
  type RiskShareManagerReviewListEntry,
} from "@/lib/risk-share/riskShareManagerReview";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LOCK_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ACTIVE_VERSION_FETCH_LIMIT = 2;

export type RiskShareManagerPublishEntryState =
  | "ready_to_publish"
  | "already_locked"
  | "review_required";

export type RiskShareManagerPublishReviewReason =
  | "excluded"
  | "share_status_not_customer_confirmed"
  | "customer_check_not_confirmed"
  | "customer_confirmation_missing";

export type RiskShareManagerPublishEntry =
  | {
      kind: "valid";
      id: string;
      siteName: string | null;
      sourceTitle: string;
      taskName: string;
      hazard: string;
      riskLevel: string | null;
      currentControls: string | null;
      improvementPlan: string | null;
      workerShareSummary: string | null;
      workerVisible: boolean;
      /** Canonical PostgreSQL bigint decimal text. */
      reviewRevision: string;
      state: RiskShareManagerPublishEntryState;
      reviewReasons: RiskShareManagerPublishReviewReason[];
    }
  | {
      kind: "invalid";
      id: string | null;
      state: "invalid";
    };

export type RiskShareManagerPublishActiveVersion = {
  lockTitle: string;
  lockMonth: string;
  itemCount: number;
  workerVisibleCount: number;
  createdAt: string;
};

export type RiskShareManagerPublishCounts = {
  readyToPublish: number;
  alreadyLocked: number;
  reviewRequired: number;
  invalid: number;
};

export type RiskShareManagerPublishReadModelResult =
  | {
      status: "ok";
      lockMonth: string;
      activeVersion: RiskShareManagerPublishActiveVersion | null;
      entries: RiskShareManagerPublishEntry[];
      overflow: boolean;
      counts: RiskShareManagerPublishCounts;
    }
  | { status: "failed" };

type ActiveVersionRow = {
  company_code?: unknown;
  lock_title?: unknown;
  lock_month?: unknown;
  item_count?: unknown;
  customer_confirmed_count?: unknown;
  worker_visible_count?: unknown;
  lock_status?: unknown;
  created_at?: unknown;
};

type ActiveVersionLookupResult =
  | { status: "ok"; activeVersion: RiskShareManagerPublishActiveVersion | null }
  | { status: "failed" };

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();
  return COMPANY_CODE_PATTERN.test(value) ? value : null;
}

function normalizeStrictLockMonth(rawLockMonth: string): string | null {
  const value = rawLockMonth.trim();
  return LOCK_MONTH_PATTERN.test(value) ? value : null;
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStrictInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function parseActiveVersionRow(
  row: ActiveVersionRow,
  expectedCompanyCode: string,
  expectedLockMonth: string,
): RiskShareManagerPublishActiveVersion | null {
  const companyCode = readTrimmedString(row.company_code);
  const lockTitle = readTrimmedString(row.lock_title);
  const lockMonth = readTrimmedString(row.lock_month);
  const lockStatus = readTrimmedString(row.lock_status);
  const createdAt = readTrimmedString(row.created_at);
  const itemCount = readStrictInteger(row.item_count);
  const customerConfirmedCount = readStrictInteger(row.customer_confirmed_count);
  const workerVisibleCount = readStrictInteger(row.worker_visible_count);

  if (
    companyCode !== expectedCompanyCode ||
    !lockTitle ||
    lockMonth !== expectedLockMonth ||
    lockStatus !== "active" ||
    !createdAt ||
    itemCount === null ||
    itemCount < 1 ||
    customerConfirmedCount !== itemCount ||
    workerVisibleCount === null ||
    workerVisibleCount < 0 ||
    workerVisibleCount > itemCount
  ) {
    return null;
  }

  return {
    lockTitle,
    lockMonth,
    itemCount,
    workerVisibleCount,
    createdAt,
  };
}

async function fetchActiveVersionForMonth(
  companyCode: string,
  lockMonth: string,
): Promise<ActiveVersionLookupResult> {
  const query = new URLSearchParams({
    select:
      "company_code,lock_title,lock_month,item_count,customer_confirmed_count,worker_visible_count,lock_status,created_at",
    company_code: `eq.${companyCode}`,
    lock_month: `eq.${lockMonth}`,
    lock_status: "eq.active",
    order: "created_at.desc",
    limit: String(ACTIVE_VERSION_FETCH_LIMIT),
  });

  let rows: ActiveVersionRow[];

  try {
    rows = await selectSupabaseExportRows<ActiveVersionRow>(
      "risk_share_version_locks",
      query,
    );
  } catch {
    return { status: "failed" };
  }

  if (rows.length > 1) {
    return { status: "failed" };
  }

  if (rows.length === 0) {
    return { status: "ok", activeVersion: null };
  }

  const activeVersion = parseActiveVersionRow(rows[0], companyCode, lockMonth);
  return activeVersion
    ? { status: "ok", activeVersion }
    : { status: "failed" };
}

function toPublishEntry(
  entry: RiskShareManagerReviewListEntry,
): RiskShareManagerPublishEntry {
  if (entry.kind === "invalid") {
    return { kind: "invalid", id: entry.id, state: "invalid" };
  }

  const item = entry.item;
  const hasVersionLock = Boolean(item.versionLockId);
  const hasLockedStatus = item.shareStatus === "locked";

  // A live Item must never look half-locked. Treat one-sided lock state as
  // malformed rather than guessing whether it is already published.
  if (hasVersionLock !== hasLockedStatus) {
    return { kind: "invalid", id: item.id, state: "invalid" };
  }

  if (hasVersionLock && hasLockedStatus) {
    if (item.customerCheckStatus !== "confirmed" || !item.customerConfirmed) {
      return { kind: "invalid", id: item.id, state: "invalid" };
    }

    return {
      kind: "valid",
      id: item.id,
      siteName: item.siteName,
      sourceTitle: item.sourceTitle,
      taskName: item.taskName,
      hazard: item.hazard,
      riskLevel: item.riskLevel,
      currentControls: item.currentControls,
      improvementPlan: item.improvementPlan,
      workerShareSummary: item.workerShareSummary,
      workerVisible: item.workerVisible,
      reviewRevision: item.reviewRevisionText,
      state: "already_locked",
      reviewReasons: [],
    };
  }

  const reviewReasons: RiskShareManagerPublishReviewReason[] = [];

  if (item.shareStatus === "excluded") {
    reviewReasons.push("excluded");
  } else if (item.shareStatus !== "customer_confirmed") {
    reviewReasons.push("share_status_not_customer_confirmed");
  }

  if (item.customerCheckStatus !== "confirmed") {
    reviewReasons.push("customer_check_not_confirmed");
  }

  if (!item.customerConfirmed) {
    reviewReasons.push("customer_confirmation_missing");
  }

  return {
    kind: "valid",
    id: item.id,
    siteName: item.siteName,
    sourceTitle: item.sourceTitle,
    taskName: item.taskName,
    hazard: item.hazard,
    riskLevel: item.riskLevel,
    currentControls: item.currentControls,
    improvementPlan: item.improvementPlan,
    workerShareSummary: item.workerShareSummary,
    workerVisible: item.workerVisible,
    reviewRevision: item.reviewRevisionText,
    state: reviewReasons.length === 0 ? "ready_to_publish" : "review_required",
    reviewReasons,
  };
}

function countEntries(entries: RiskShareManagerPublishEntry[]): RiskShareManagerPublishCounts {
  const counts: RiskShareManagerPublishCounts = {
    readyToPublish: 0,
    alreadyLocked: 0,
    reviewRequired: 0,
    invalid: 0,
  };

  for (const entry of entries) {
    if (entry.kind === "invalid") {
      counts.invalid += 1;
    } else if (entry.state === "ready_to_publish") {
      counts.readyToPublish += 1;
    } else if (entry.state === "already_locked") {
      counts.alreadyLocked += 1;
    } else {
      counts.reviewRequired += 1;
    }
  }

  return counts;
}

/**
 * Server-only presentation Read Model for the future Manager Publish UI.
 * The caller must pass the server-confirmed selectedTenantCode, never a raw
 * browser/query value. This function does not publish, does not call the
 * Publish RPC, and does not recreate the RPC's transaction-time authority:
 * `publish_risk_share_version_for_tenant_checked` remains the final eligibility,
 * active-month, locking, snapshot and idempotency decision boundary.
 */
export async function listRiskShareManagerPublishState(
  rawCompanyCode: string,
  rawLockMonth: string,
): Promise<RiskShareManagerPublishReadModelResult> {
  const companyCode = normalizeStrictCompanyCode(rawCompanyCode);
  const lockMonth = normalizeStrictLockMonth(rawLockMonth);

  if (!companyCode || !lockMonth) {
    return { status: "failed" };
  }

  const [reviewResult, activeVersionResult] = await Promise.all([
    listRiskShareItemsForManagerReview(companyCode),
    fetchActiveVersionForMonth(companyCode, lockMonth),
  ]);

  if (reviewResult.status !== "ok" || activeVersionResult.status !== "ok") {
    return { status: "failed" };
  }

  const entries = reviewResult.entries.map(toPublishEntry);

  return {
    status: "ok",
    lockMonth,
    activeVersion: activeVersionResult.activeVersion,
    entries,
    overflow: reviewResult.overflow,
    counts: countEntries(entries),
  };
}
