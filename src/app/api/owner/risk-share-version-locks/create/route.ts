import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ShareItemRow = {
  id?: string;
  company_code?: string;
  company_name?: string | null;
  site_name?: string | null;
  source_title?: string | null;
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

// Best-effort only: used to pre-fill company_name/site_name/source_title
// fallback display text if the form did not supply them. The actual item
// selection and locking decision is made inside create_risk_share_version_lock,
// not from this read.
async function fetchAnyCustomerConfirmedShareItem(companyCode: string) {
  const query = new URLSearchParams({
    select: "id,company_code,company_name,site_name,source_title",
    company_code: `eq.${companyCode}`,
    share_status: "eq.customer_confirmed",
    customer_check_status: "eq.confirmed",
    customer_confirmed: "eq.true",
    version_lock_id: "is.null",
    order: "created_at.asc",
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<ShareItemRow>("risk_share_items", query);
  return rows[0] ?? null;
}

type CreateVersionLockRpcResult =
  | { ok: true; id: string; itemCount: number; duplicate: false }
  | { ok: true; id: null; itemCount: 0; duplicate: boolean }
  | { ok: false };

async function callCreateVersionLockRpc(params: {
  companyCode: string;
  companyName: string | null;
  siteName: string | null;
  sourceTitle: string | null;
  lockTitle: string;
  lockMonth: string;
  notes: string | null;
  workerVisible: boolean;
  itemIds: string[];
  lockedBy: string;
}): Promise<CreateVersionLockRpcResult> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false };
  }

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/create_risk_share_version_lock`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_company_code: params.companyCode,
        p_company_name: params.companyName,
        p_site_name: params.siteName,
        p_source_title: params.sourceTitle,
        p_lock_title: params.lockTitle,
        p_lock_month: params.lockMonth,
        p_notes: params.notes,
        p_worker_visible: params.workerVisible,
        p_item_ids: params.itemIds,
        p_locked_by: params.lockedBy,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false };
  }

  if (!res.ok) {
    return { ok: false };
  }

  const data = await res.json().catch(() => undefined);
  const row = Array.isArray(data) ? data[0] : undefined;

  if (!row) {
    return { ok: false };
  }

  const duplicate = row.duplicate_lock === true;
  const itemCount = typeof row.item_count === "number" ? row.item_count : 0;
  const id = typeof row.id === "string" && isUuid(row.id) ? row.id : null;

  if (id && !duplicate && itemCount > 0) {
    return { ok: true, id, itemCount, duplicate: false };
  }

  return { ok: true, id: null, itemCount: 0, duplicate };
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

  let fallbackItem: ShareItemRow | null = null;

  try {
    fallbackItem = await fetchAnyCustomerConfirmedShareItem(companyCode);
  } catch {
    // Non-fatal: fallback display text only. The RPC below independently
    // re-checks for eligible items and is the actual source of truth.
  }

  const rpcResult = await callCreateVersionLockRpc({
    companyCode,
    companyName: companyName ?? fallbackItem?.company_name ?? null,
    siteName: siteName ?? fallbackItem?.site_name ?? null,
    sourceTitle: sourceTitle ?? fallbackItem?.source_title ?? null,
    lockTitle,
    lockMonth,
    notes,
    workerVisible: lockWorkerVisible,
    itemIds: requestedItemIds,
    lockedBy: "Owner",
  });

  if (!rpcResult.ok) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "version_lock_create_failed",
    });
  }

  if (rpcResult.duplicate) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "version_lock_month_exists",
    });
  }

  if (!rpcResult.id) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "no_customer_confirmed_items",
    });
  }

  return buildRedirect(request, {
    ...redirectParams,
    versionLocked: "1",
    versionLockId: rpcResult.id,
  });
}
