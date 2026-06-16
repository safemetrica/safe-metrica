import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  selectSupabaseExportRows,
  updateRiskShareItemCustomerCheckStatus,
  type RiskShareItemCustomerCheckStatus,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ShareItemRow = {
  id?: string;
  company_code?: string;
  share_status?: string | null;
  customer_check_status?: RiskShareItemCustomerCheckStatus | null;
  customer_confirmed?: boolean | null;
  worker_visible?: boolean | null;
  version_lock_id?: string | null;
};

const CUSTOMER_CHECK_STATUSES = new Set<RiskShareItemCustomerCheckStatus>([
  "not_requested",
  "requested",
  "confirmed",
  "returned",
]);

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function buildRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/owner/risk-share-activation/share-items", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

async function findShareItem(itemId: string, companyCode: string) {
  const query = new URLSearchParams({
    select:
      "id,company_code,share_status,customer_check_status,customer_confirmed,worker_visible,version_lock_id",
    id: `eq.${itemId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<ShareItemRow>("risk_share_items", query);
  return rows[0] ?? null;
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, { error: "owner_required" });
  }

  const formData = await request.formData();
  const itemId = readText(formData, "itemId", 80);
  const companyCode = normalizeCompanyCode(readText(formData, "companyCode", 80));
  const customerCheckStatusInput = readText(formData, "customerCheckStatus", 40);
  const customerCheckStatus = CUSTOMER_CHECK_STATUSES.has(
    customerCheckStatusInput as RiskShareItemCustomerCheckStatus
  )
    ? (customerCheckStatusInput as RiskShareItemCustomerCheckStatus)
    : null;
  const customerNote = readText(formData, "customerNote", 500) || null;

  const redirectParams = { companyCode };

  if (!isUuid(itemId) || !companyCode || !customerCheckStatus) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "invalid_customer_check_request",
    });
  }

  let item: ShareItemRow | null = null;

  try {
    item = await findShareItem(itemId, companyCode);
  } catch {
    return buildRedirect(request, {
      ...redirectParams,
      error: "share_item_lookup_failed",
    });
  }

  if (!item) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "share_item_not_found",
    });
  }

  if (item.share_status === "locked" || item.version_lock_id) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "share_item_locked",
    });
  }

  const result = await updateRiskShareItemCustomerCheckStatus(itemId, companyCode, {
    customer_check_status: customerCheckStatus,
    customer_note: customerNote,
    updated_at: new Date().toISOString(),
  });

  if (!result.ok) {
    return buildRedirect(request, {
      ...redirectParams,
      error: "customer_check_update_failed",
    });
  }

  return buildRedirect(request, {
    ...redirectParams,
    customerCheckUpdated: "1",
  });
}
