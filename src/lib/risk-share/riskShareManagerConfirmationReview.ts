import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import { applyRiskShareDefaultSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";

export type ConfirmationReviewStatus = "unreviewed" | "in_review" | "completed";

export type ManagerConfirmationReviewRow = {
  id: string;
  versionLockId: string;
  title: string;
  createdAt: string;
  reviewStatus: ConfirmationReviewStatus;
  actionNote: string;
};

type DbRow = {
  id?: unknown;
  version_lock_id?: unknown;
  title?: unknown;
  created_at?: unknown;
  manager_review_status?: unknown;
  manager_action_note?: unknown;
};

const STATUSES = new Set<ConfirmationReviewStatus>(["unreviewed", "in_review", "completed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listManagerConfirmationReviews(companyCode: string, siteId: string | null = null) {
  const query = new URLSearchParams({
    select: "id,version_lock_id,title,created_at,manager_review_status,manager_action_note",
    tenant_code: `eq.${companyCode}`,
    "raw_payload->>source": "eq.risk_share_participation_submit_v1",
    "raw_payload->>mode": "eq.monthly",
    version_lock_id: "not.is.null",
    order: "created_at.desc",
    limit: "100",
  });
  applyRiskShareDefaultSiteScope(query, siteId);
  const rows = await selectSupabaseExportRows<DbRow>("field_participation_submissions", query);
  return rows.flatMap((row): ManagerConfirmationReviewRow[] => {
    if (typeof row.id !== "string" || typeof row.version_lock_id !== "string") return [];
    const status = STATUSES.has(row.manager_review_status as ConfirmationReviewStatus)
      ? (row.manager_review_status as ConfirmationReviewStatus)
      : "unreviewed";
    return [{
      id: row.id,
      versionLockId: row.version_lock_id,
      title: typeof row.title === "string" ? row.title : "근로자 공유확인",
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
      reviewStatus: status,
      actionNote: typeof row.manager_action_note === "string" ? row.manager_action_note : "",
    }];
  });
}

export async function updateManagerConfirmationReview(input: {
  companyCode: string;
  siteId: string;
  actorMembershipId: string;
  submissionId: string;
  expectedStatus: ConfirmationReviewStatus;
  nextStatus: Exclude<ConfirmationReviewStatus, "unreviewed">;
  actionNote: string;
}) {
  if (
    !input.companyCode
    || !UUID_PATTERN.test(input.siteId)
    || !UUID_PATTERN.test(input.actorMembershipId)
    || !UUID_PATTERN.test(input.submissionId)
    || !STATUSES.has(input.expectedStatus)
    || !(["in_review", "completed"] as string[]).includes(input.nextStatus)
    || input.actionNote.length > 500
    || (input.expectedStatus === "unreviewed" && input.nextStatus !== "in_review")
    || (input.expectedStatus === "in_review" && input.nextStatus !== "completed")
    || input.expectedStatus === "completed"
  ) {
    return { ok: false as const, code: "validation_failed" };
  }
  const targetQuery = new URLSearchParams({
    select: "id",
    id: `eq.${input.submissionId}`,
    tenant_code: `eq.${input.companyCode}`,
    "raw_payload->>source": "eq.risk_share_participation_submit_v1",
    "raw_payload->>mode": "eq.monthly",
    version_lock_id: "not.is.null",
    manager_review_status: `eq.${input.expectedStatus}`,
    limit: "2",
  });
  applyRiskShareDefaultSiteScope(targetQuery, input.siteId);

  const targetRows = await selectSupabaseExportRows<{ id?: unknown }>(
    "field_participation_submissions",
    targetQuery,
  ).catch(() => null);
  if (!targetRows) return { ok: false as const, code: "request_failed" };
  if (targetRows.length !== 1 || targetRows[0]?.id !== input.submissionId) {
    return { ok: false as const, code: "target_scope_mismatch" };
  }

  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false as const, code: "request_failed" };
  const response = await fetch(`${url}/rest/v1/rpc/update_risk_share_confirmation_review_status`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_company_code: input.companyCode,
      p_actor_membership_id: input.actorMembershipId,
      p_submission_id: input.submissionId,
      p_expected_status: input.expectedStatus,
      p_next_status: input.nextStatus,
      p_action_note: input.actionNote || null,
    }),
    cache: "no-store",
  });
  if (!response.ok) return { ok: false as const, code: "request_failed" };
  const rows = await response.json().catch(() => null);
  const row = Array.isArray(rows) ? rows[0] : null;
  return row?.ok === true
    ? { ok: true as const, status: row.review_status as ConfirmationReviewStatus }
    : { ok: false as const, code: typeof row?.code === "string" ? row.code : "invalid_response" };
}
