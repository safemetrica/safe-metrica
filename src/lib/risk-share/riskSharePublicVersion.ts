import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

const RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT = 100;

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
  | { ok: false; reason: "no_share" | "lookup_failed" };

type VersionLockRow = {
  id?: string | null;
  lock_title?: string | null;
  lock_month?: string | null;
  created_at?: string | null;
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

async function fetchActiveVersionLock(companyCode: string): Promise<VersionLockRow | null> {
  const query = new URLSearchParams({
    select: "id,lock_title,lock_month,created_at",
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
    limit: String(RISK_SHARE_PUBLIC_VERSION_ITEM_LIMIT),
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

    const items: RiskSharePublicVersionItem[] = itemRows
      .filter((row) => Boolean(row.id) && Boolean(readText(row.task_name)) && Boolean(readText(row.hazard)))
      .map((row) => ({
        id: String(row.id),
        taskName: readText(row.task_name),
        hazard: readText(row.hazard),
        riskLevel: readText(row.risk_level) || null,
        currentControls: readText(row.current_controls) || null,
        improvementPlan: readText(row.improvement_plan) || null,
        workerShareSummary: readText(row.worker_share_summary) || null,
      }));

    if (items.length === 0) {
      return { ok: false, reason: "no_share" };
    }

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
