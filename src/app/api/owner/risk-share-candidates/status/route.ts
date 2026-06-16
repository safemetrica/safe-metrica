import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  insertRiskShareCandidateReviewEventRecord,
  selectSupabaseExportRows,
  updateRiskShareItemCandidateReviewStatus,
  type RiskShareItemCandidateReviewerStatus,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CandidateRow = {
  id?: string;
  source_id?: string;
  company_code?: string;
  company_name?: string;
  reviewer_status?: RiskShareItemCandidateReviewerStatus;
  worker_visible?: boolean;
  customer_confirmed?: boolean;
};

const REVIEWER_STATUSES = new Set<RiskShareItemCandidateReviewerStatus>([
  "pending",
  "accepted",
  "edited",
  "excluded",
  "needs_customer_check",
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
    select: "id,source_id,company_code,company_name,reviewer_status,worker_visible,customer_confirmed",
    id: `eq.${candidateId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<CandidateRow>("risk_share_item_candidates", query);
  return rows[0] ?? null;
}

async function preflightCandidateReviewEventsTable(candidateId: string, companyCode: string) {
  const query = new URLSearchParams({
    select: "id",
    candidate_id: `eq.${candidateId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  await selectSupabaseExportRows("risk_share_candidate_review_events", query);
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
  const statusInput = readText(formData, "reviewerStatus", 40);
  const reviewerStatus = REVIEWER_STATUSES.has(statusInput as RiskShareItemCandidateReviewerStatus)
    ? (statusInput as RiskShareItemCandidateReviewerStatus)
    : null;

  const redirectParams = {
    companyCode,
    status: reviewerStatus ?? "pending",
  };

  if (!isUuid(candidateId) || !companyCode || !reviewerStatus) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "invalid_status_request",
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

  try {
    await preflightCandidateReviewEventsTable(candidateId, companyCode);
  } catch {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "review_event_table_unavailable",
    });
  }

  const reviewerNote = readText(formData, "reviewerNote", 500) || null;
  const workerVisible = formData.get("workerVisible") === "on";
  const customerConfirmed = formData.get("customerConfirmed") === "on";
  const previousStatus = candidate.reviewer_status ?? "pending";

  const result = await updateRiskShareItemCandidateReviewStatus(candidateId, companyCode, {
    reviewer_status: reviewerStatus,
    reviewer_note: reviewerNote,
    worker_visible: workerVisible,
    customer_confirmed: customerConfirmed,
  });

  if (!result.ok) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "status_update_failed",
    });
  }

  const eventResult = await insertRiskShareCandidateReviewEventRecord({
    candidate_id: candidateId,
    source_id: candidate.source_id ?? null,
    company_code: companyCode,
    company_name: candidate.company_name ?? null,
    previous_status: previousStatus,
    next_status: reviewerStatus,
    reviewer_note: reviewerNote,
    actor_type: "owner",
    actor_label: "Owner",
    worker_visible: workerVisible,
    customer_confirmed: customerConfirmed,
    event_type: "status_change",
    raw_payload: {
      source: "owner_candidate_status_update_v1",
      changedBy: "owner",
      previousStatus,
      nextStatus: reviewerStatus,
      changedAt: new Date().toISOString(),
    },
  });

  if (!eventResult.ok) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "review_event_insert_failed",
    });
  }

  return buildRedirect(request, "/owner/risk-share-activation/candidates", {
    ...redirectParams,
    updated: "1",
  });
}
