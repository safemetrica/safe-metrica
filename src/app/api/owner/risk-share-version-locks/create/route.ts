import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  insertRiskShareVersionLockRecord,
  selectSupabaseExportRows,
  updateRiskShareItemsForVersionLock,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ShareItemRow = {
  id?: string;
  company_code?: string;
  company_name?: string | null;
  site_name?: string | null;
  source_title?: string | null;
  share_status?: string | null;
  customer_check_status?: string | null;
  customer_confirmed?: boolean | null;
  worker_visible?: boolean | null;
  version_lock_id?: string | null;
};

type VersionLockInsertData = {
  id?: string;
};

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readMany(formData: FormData, key: string, maxItems = 200) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeLockMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? value : "";
}

function buildRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/owner/risk-share-activation/version-lock", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return NextResponse.redirect(url);
}

function extractInsertedLockId(data: unknown) {
  if (!Array.isArray(data)) return "";
  const row = data[0] as VersionLockInsertData | undefined;
  return typeof row?.id === "string" && isUuid(row.id) ? row.id : "";
}

async function fetchEligibleShareItems(companyCode: string) {
  const query = new URLSearchParams({
    select:
      "id,company_code,company_name,site_name,source_title,share_status,customer_check_status,customer_confirmed,worker_visible,version_lock_id",
    company_code: `eq.${companyCode}`,
    share_status: "eq.customer_confirmed",
    customer_check_status: "eq.confirmed",
    customer_confirmed: "eq.true",
    version_lock_id: "is.null",
    order: "created_at.asc",
    limit: "200",
  });

  return selectSupabaseExportRows<ShareItemRow>("risk_share_items", query);
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, { error: "owner_required" });
  }

  const formData = await request.formData();
  const companyCode = normalizeCompanyCode(readText(formData, "companyCode", 80));
  const companyName = readText(formData, "companyName", 120) || null;
  const siteName = readText(formData, "siteName", 120) || null;
  const sourceTitle = readText(formData, "sourceTitle", 160) || null;
  const lockMonth = normalizeLockMonth(readText(formData, "lockMonth", 20));
  const lockTitle =
    readText(formData, "lockTitle", 160) ||
    `${companyCode || "company"} ${lockMonth || "month"} Risk Share Version Lock`;
  const notes = readText(formData, "notes", 500) || null;
  const lockWorkerVisible = formData.get("workerVisible") === "on";
  const requestedItemIds = readMany(formData, "itemIds").filter(isUuid);

  const redirectParams = {
    companyCode,
    companyName: companyName ?? "",
    sourceTitle: sourceTitle ?? "",
  };

  if (!companyCode || !lockMonth) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "invalid_version_lock_request",
    });
  }

  let eligibleItems: ShareItemRow[] = [];

  try {
    eligibleItems = await fetchEligibleShareItems(companyCode);
  } catch {
    return buildRedirect(request, {
      ...redirectParams,
      error: "version_lock_items_lookup_failed",
    });
  }

  const selectedItems =
    requestedItemIds.length > 0
      ? eligibleItems.filter((item) => typeof item.id === "string" && requestedItemIds.includes(item.id))
      : eligibleItems;

  const selectedItemIds = selectedItems
    .map((item) => item.id)
    .filter((id): id is string => typeof id === "string" && isUuid(id));

  if (selectedItemIds.length === 0) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "no_customer_confirmed_items",
    });
  }

  const now = new Date().toISOString();
  const fallbackCompanyName = companyName ?? selectedItems[0]?.company_name ?? null;
  const fallbackSiteName = siteName ?? selectedItems[0]?.site_name ?? null;
  const fallbackSourceTitle = sourceTitle ?? selectedItems[0]?.source_title ?? null;

  const lockResult = await insertRiskShareVersionLockRecord({
    company_code: companyCode,
    company_name: fallbackCompanyName,
    site_name: fallbackSiteName,
    source_title: fallbackSourceTitle,
    lock_title: lockTitle,
    lock_month: lockMonth,
    item_count: selectedItemIds.length,
    customer_confirmed_count: selectedItemIds.length,
    worker_visible_count: lockWorkerVisible ? selectedItemIds.length : 0,
    lock_status: "active",
    locked_by: "Owner",
    notes,
    raw_payload: {
      source: "owner_version_lock_create_v1",
      selectedItemCount: selectedItemIds.length,
      workerVisible: lockWorkerVisible,
      createdAt: now,
    },
  });

  if (!lockResult.ok) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "version_lock_create_failed",
    });
  }

  const versionLockId = extractInsertedLockId(lockResult.data);

  if (!versionLockId) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "version_lock_id_missing",
    });
  }

  const updateResult = await updateRiskShareItemsForVersionLock(selectedItemIds, companyCode, {
    share_status: "locked",
    version_lock_id: versionLockId,
    worker_visible: lockWorkerVisible,
    version_locked_at: now,
    updated_at: now,
  });

  if (!updateResult.ok) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "version_lock_items_update_failed",
    });
  }

  return buildRedirect(request, {
    ...redirectParams,
    versionLocked: "1",
    versionLockId,
  });
}
