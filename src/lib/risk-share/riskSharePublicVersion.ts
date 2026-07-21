import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

const RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT = 100;
const RISK_SHARE_PUBLIC_VERSION_ITEM_FETCH_LIMIT = RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT + 1;

export type RiskSharePublicVersionLock = {
  id: string;
  siteId: string | null;
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
  site_id?: string | null;
  lock_title?: string | null;
  lock_month?: string | null;
  created_at?: string | null;
  worker_visible_count?: number | null;
};

type SnapshotItemRow = {
  source_item_id?: string | null;
  position?: number | null;
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

async function fetchCanonicalDefaultSiteId(companyCode: string): Promise<string | null> {
  const query = new URLSearchParams({
    select: "default_site_id",
    company_code: `eq.${companyCode}`,
    limit: "2",
  });
  const rows = await selectSupabaseExportRows<{ default_site_id?: string | null }>(
    "tenant_registry",
    query,
  );
  return rows.length === 1 && readText(rows[0].default_site_id)
    ? readText(rows[0].default_site_id)
    : null;
}

async function fetchActiveVersionLock(companyCode: string): Promise<VersionLockRow | null> {
  const siteId = await fetchCanonicalDefaultSiteId(companyCode);
  if (!siteId) return null;

  const query = new URLSearchParams({
    select: "id,site_id,lock_title,lock_month,created_at,worker_visible_count",
    company_code: `eq.${companyCode}`,
    site_id: `eq.${siteId}`,
    lock_status: "eq.active",
    order: "created_at.desc",
    limit: "1",
  });

  try {
    const rows = await selectSupabaseExportRows<VersionLockRow>("risk_share_version_locks", query);
    if (rows[0]) return rows[0];

    // Transition continuity: Production already has active immutable Versions
    // created before site binding. Keep those exact NULL-site Versions readable
    // until an explicit human-reviewed replacement is published. A site-bound
    // Version always wins; this fallback never mixes another site's record.
    query.set("site_id", "is.null");
    const legacyRows = await selectSupabaseExportRows<VersionLockRow>(
      "risk_share_version_locks",
      query,
    );
    return legacyRows[0] ?? null;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("site_id")) throw error;
    query.set("select", "id,lock_title,lock_month,created_at,worker_visible_count");
    query.delete("site_id");
    const rows = await selectSupabaseExportRows<VersionLockRow>("risk_share_version_locks", query);
    return rows[0] ?? null;
  }
}

async function fetchWorkerVisibleSnapshotItems(
  companyCode: string,
  versionLockId: string,
): Promise<SnapshotItemRow[]> {
  const query = new URLSearchParams({
    select:
      "source_item_id,position,task_name,hazard,risk_level,current_controls,improvement_plan,worker_share_summary",
    company_code: `eq.${companyCode}`,
    version_lock_id: `eq.${versionLockId}`,
    worker_visible: "eq.true",
    order: "position.asc,source_item_id.asc",
    limit: String(RISK_SHARE_PUBLIC_VERSION_ITEM_FETCH_LIMIT),
  });

  return selectSupabaseExportRows<SnapshotItemRow>(
    "risk_share_version_items",
    query,
  );
}

/**
 * Resolves the single current worker-facing Version Lock for a tenant, plus
 * its worker-visible immutable snapshot items. "Current" is the most recently created
 * active lock for the company_code -- risk_share_version_locks allows at
 * most one active lock per company_code+lock_month (partial unique index),
 * but a company can still have multiple different months active at once, so
 * ties across months are broken deterministically by created_at desc. Only worker_visible=true rows from risk_share_version_items scoped to
 * that exact lock id are returned. The live risk_share_items table is never
 * read, so later review or status changes cannot alter what a worker sees.
 * Only worker-safe snapshot fields are selected.
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

    const itemRows = await fetchWorkerVisibleSnapshotItems(companyCode, lockRow.id);

    if (itemRows.length > RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT) {
      return { ok: false, reason: "invalid_share" };
    }

    const seenItemIds = new Set<string>();

    for (const row of itemRows) {
      const id = readText(row.source_item_id);
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
      id: readText(row.source_item_id),
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
          siteId: readText(lockRow.site_id) || null,
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
