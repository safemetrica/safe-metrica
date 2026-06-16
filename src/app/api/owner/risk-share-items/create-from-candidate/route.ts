import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  insertRiskShareItemRecord,
  selectSupabaseExportRows,
  type RiskShareItemInsertRecord,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CandidateRow = {
  id?: string;
  source_id?: string;
  company_code?: string;
  company_name?: string | null;
  site_name?: string | null;
  task_name?: string | null;
  hazard?: string | null;
  accident_type?: string | null;
  risk_level?: string | null;
  current_controls?: string | null;
  improvement_plan?: string | null;
  worker_share_summary?: string | null;
  category?: RiskShareItemInsertRecord["category"];
  source_page?: number | null;
  source_row?: string | null;
  reviewer_status?: string | null;
  reviewer_note?: string | null;
  raw_payload?: Record<string, unknown>;
};

type ExistingShareItemRow = {
  id?: string;
};

const CONVERTIBLE_STATUSES = new Set(["accepted", "edited"]);

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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildRedirect(request: NextRequest, path: string, params: Record<string, string>) {
  const url = new URL(path, request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return NextResponse.redirect(url);
}

async function findCandidate(candidateId: string, companyCode: string) {
  const query = new URLSearchParams({
    select:
      "id,source_id,company_code,company_name,site_name,task_name,hazard,accident_type,risk_level,current_controls,improvement_plan,worker_share_summary,category,source_page,source_row,reviewer_status,reviewer_note,raw_payload",
    id: `eq.${candidateId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<CandidateRow>("risk_share_item_candidates", query);
  return rows[0] ?? null;
}

async function findExistingShareItem(candidateId: string, companyCode: string) {
  const query = new URLSearchParams({
    select: "id",
    candidate_id: `eq.${candidateId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<ExistingShareItemRow>("risk_share_items", query);
  return rows[0] ?? null;
}

function normalizeCategory(value: CandidateRow["category"]): RiskShareItemInsertRecord["category"] {
  if (
    value === "common" ||
    value === "non_common" ||
    value === "site_specific" ||
    value === "worker_signal" ||
    value === "other"
  ) {
    return value;
  }

  return "other";
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, "/login", { error: "owner_required" });
  }

  const formData = await request.formData();
  const candidateId = readText(formData, "candidateId", 80);
  const companyCode = normalizeCompanyCode(readText(formData, "companyCode", 80));

  const redirectParams = {
    companyCode,
    status: readText(formData, "status", 40) || "accepted",
  };

  if (!isUuid(candidateId) || !companyCode) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "invalid_share_item_request",
    });
  }

  let candidate: CandidateRow | null = null;

  try {
    candidate = await findCandidate(candidateId, companyCode);
  } catch {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "candidate_lookup_failed",
    });
  }

  if (!candidate) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "candidate_not_found",
    });
  }

  if (!CONVERTIBLE_STATUSES.has(candidate.reviewer_status ?? "")) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "candidate_not_convertible",
    });
  }

  if (!candidate.source_id || !candidate.task_name || !candidate.hazard) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "candidate_missing_required_fields",
    });
  }

  try {
    const existing = await findExistingShareItem(candidateId, companyCode);

    if (existing) {
      return buildRedirect(request, "/owner/risk-share-activation/share-items", {
        companyCode,
        created: "already_exists",
      });
    }
  } catch {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "share_item_lookup_failed",
    });
  }

  const result = await insertRiskShareItemRecord({
    source_id: candidate.source_id,
    candidate_id: candidateId,
    company_code: companyCode,
    company_name: candidate.company_name ?? null,
    site_name: candidate.site_name ?? null,
    task_name: candidate.task_name,
    hazard: candidate.hazard,
    accident_type: candidate.accident_type ?? null,
    risk_level: candidate.risk_level ?? null,
    current_controls: candidate.current_controls ?? null,
    improvement_plan: candidate.improvement_plan ?? null,
    worker_share_summary: candidate.worker_share_summary ?? null,
    category: normalizeCategory(candidate.category),
    share_status: "draft",
    customer_check_status: "not_requested",
    customer_confirmed: false,
    worker_visible: false,
    version_lock_id: null,
    source_page: candidate.source_page ?? null,
    source_row: candidate.source_row ?? null,
    owner_note: candidate.reviewer_note ?? null,
    customer_note: null,
    raw_payload: {
      source: "owner_create_share_item_from_candidate_v1",
      candidateStatus: candidate.reviewer_status ?? null,
      convertedBy: "owner",
      convertedAt: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "share_item_insert_failed",
    });
  }

  return buildRedirect(request, "/owner/risk-share-activation/share-items", {
    companyCode,
    created: "1",
  });
}
