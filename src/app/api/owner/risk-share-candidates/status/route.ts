import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { RiskShareItemCandidateReviewerStatus } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type ReviewCandidateRpcResult =
  | { ok: true; result: "ok"; id: string }
  | { ok: true; result: "not_found" | "missing_required_fields" }
  | { ok: false };

async function callReviewCandidateRpc(params: {
  candidateId: string;
  companyCode: string;
  reviewerStatus: RiskShareItemCandidateReviewerStatus;
  reviewerNote: string | null;
  taskName: string;
  hazard: string;
  currentControls: string | null;
  improvementPlan: string | null;
  riskLevel: string | null;
}): Promise<ReviewCandidateRpcResult> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false };
  }

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/review_risk_share_item_candidate`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_candidate_id: params.candidateId,
        p_company_code: params.companyCode,
        p_reviewer_status: params.reviewerStatus,
        p_reviewer_note: params.reviewerNote,
        p_task_name: params.taskName,
        p_hazard: params.hazard,
        p_current_controls: params.currentControls,
        p_improvement_plan: params.improvementPlan,
        p_risk_level: params.riskLevel,
        p_actor_type: "owner",
        p_actor_label: "Owner",
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

  if (!row || typeof row.result !== "string") {
    return { ok: false };
  }

  if (row.result === "ok" && typeof row.id === "string" && isUuid(row.id)) {
    return { ok: true, result: "ok", id: row.id };
  }

  if (row.result === "not_found" || row.result === "missing_required_fields") {
    return { ok: true, result: row.result };
  }

  return { ok: false };
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

  const reviewerNote = readText(formData, "reviewerNote", 500) || null;
  const taskName = readText(formData, "taskName", 200);
  const hazard = readText(formData, "hazard", 500);
  const currentControls = readText(formData, "currentControls", 800) || null;
  const improvementPlan = readText(formData, "improvementPlan", 800) || null;
  const riskLevel = readText(formData, "riskLevel", 40) || null;

  const rpcResult = await callReviewCandidateRpc({
    candidateId,
    companyCode,
    reviewerStatus,
    reviewerNote,
    taskName,
    hazard,
    currentControls,
    improvementPlan,
    riskLevel,
  });

  if (!rpcResult.ok) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "status_update_failed",
    });
  }

  if (rpcResult.result === "not_found") {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "candidate_not_found",
    });
  }

  if (rpcResult.result === "missing_required_fields") {
    return buildRedirect(request, "/owner/risk-share-activation/candidates", {
      ...redirectParams,
      error: "candidate_missing_required_fields",
    });
  }

  return buildRedirect(request, "/owner/risk-share-activation/candidates", {
    ...redirectParams,
    updated: "1",
  });
}
