import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

const RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT = 100;
const RISK_SHARE_PUBLIC_VERSION_ITEM_FETCH_LIMIT = RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT + 1;

export type RiskSharePublicVersionLock = {
  id: string;
  title: string;
  month: string;
  createdAt: string;
};

export type RiskSharePublicVersionItem = {
  id: string;
  taskName: string;
  hazard: string;
  riskLevel: string | null;
  currentControls: string | null;
  improvementPlan: string | null;
  workerShareSummary: string | null;
};

export type RiskSharePublicVersion = {
  lock: RiskSharePublicVersionLock;
  items: RiskSharePublicVersionItem[];
};

export type ResolveRiskSharePublicVersionResult =
  | { ok: true; version: RiskSharePublicVersion }
  | { ok: false; reason: "no_share" | "invalid_share" | "lookup_failed" };

type VersionLockRow = {
  id?: string | null;
  lock_title?: string | null;
  lock_month?: string | null;
  created_at?: string | null;
  worker_visible_count?: number | null;
};

type LockedItemRow = {
  id?: string | null;
  task_name?: string | null;
  hazard?: string | null;
  risk_level?: string | null;
  current_controls?: string | null;
  improvement_plan?: string | null;
  worker_share_summary?: string | null;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchActiveVersionLock(companyCode: string): Promise<VersionLockRow | null> {
  const query = new URLSearchParams({
    select: "id,lock_title,lock_month,created_at,worker_visible_count",
    company_code: `eq.${companyCode}`,
    lock_status: "eq.active",
    order: "created_at.desc",
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<VersionLockRow>("risk_share_version_locks", query);
  return rows[0] ?? null;
}

async function fetchWorkerVisibleLockedItems(
  companyCode: string,
  versionLockId: string,
): Promise<LockedItemRow[]> {
  const query = new URLSearchParams({
    select:
      "id,task_name,hazard,risk_level,current_controls,improvement_plan,worker_share_summary",
    company_code: `eq.${companyCode}`,
    version_lock_id: `eq.${versionLockId}`,
    share_status: "eq.locked",
    customer_confirmed: "eq.true",
    worker_visible: "eq.true",
    order: "created_at.asc,id.asc",
    limit: String(RISK_SHARE_PUBLIC_VERSION_ITEM_FETCH_LIMIT),
  });

  return selectSupabaseExportRows<LockedItemRow>("risk_share_items", query);
}

/**
 * Resolves the single current worker-facing Version Lock for a tenant, plus
 * its worker-visible locked items. "Current" is the most recently created
 * active lock for the company_code -- risk_share_version_locks allows at
 * most one active lock per company_code+lock_month (partial unique index),
 * but a company can still have multiple different months active at once, so
 * ties across months are broken deterministically by created_at desc. Only
 * share_status=locked / customer_confirmed=true / worker_visible=true rows
 * scoped to that exact lock id are returned -- this is the same worker
 * exposure condition the create_risk_share_version_lock RPC enforces when it
 * attaches items to a lock. Only worker-safe fields are selected; raw_payload,
 * customer_note, owner_note, and other internal/Owner-only fields are never
 * read here.
 *
 * Fail-closed on data integrity problems rather than silently truncating or
 * skipping rows: the item query asks for one row more than the display/limit
 * ceiling so an overflow can be detected instead of quietly clipped, and any
 * row missing id/task_name/hazard, any duplicate item id, or a mismatch
 * against the lock's own worker_visible_count is reported as "invalid_share"
 * (never rendered, never confirmable) instead of being filtered out and
 * mistaken by the caller for the complete list.
 */
export async function resolveActiveRiskSharePublicVersion(
  companyCode: string,
): Promise<ResolveRiskSharePublicVersionResult> {
  try {
    const lockRow = await fetchActiveVersionLock(companyCode);

    if (!lockRow?.id) {
      return { ok: false, reason: "no_share" };
    }

    const itemRows = await fetchWorkerVisibleLockedItems(companyCode, lockRow.id);

    if (itemRows.length > RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT) {
      return { ok: false, reason: "invalid_share" };
    }

    const seenItemIds = new Set<string>();

    for (const row of itemRows) {
      const id = readText(row.id);
      const taskName = readText(row.task_name);
      const hazard = readText(row.hazard);

      if (!id || !taskName || !hazard) {
        return { ok: false, reason: "invalid_share" };
      }

      if (seenItemIds.has(id)) {
        return { ok: false, reason: "invalid_share" };
      }

      seenItemIds.add(id);
    }

    const workerVisibleCount = readOptionalCount(lockRow.worker_visible_count);

    if (workerVisibleCount !== null && workerVisibleCount !== itemRows.length) {
      return { ok: false, reason: "invalid_share" };
    }

    if (itemRows.length === 0) {
      return { ok: false, reason: "no_share" };
    }

    const items: RiskSharePublicVersionItem[] = itemRows.map((row) => ({
      id: readText(row.id),
      taskName: readText(row.task_name),
      hazard: readText(row.hazard),
      riskLevel: readText(row.risk_level) || null,
      currentControls: readText(row.current_controls) || null,
      improvementPlan: readText(row.improvement_plan) || null,
      workerShareSummary: readText(row.worker_share_summary) || null,
    }));

    return {
      ok: true,
      version: {
        lock: {
          id: String(lockRow.id),
          title: readText(lockRow.lock_title),
          month: readText(lockRow.lock_month),
          createdAt: readText(lockRow.created_at),
        },
        items,
      },
    };
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }
}
