import "server-only";

import type { ManagerInboxStatus } from "@/lib/risk-share/riskShareManagerInbox";
import { applyRiskShareDefaultSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

export type ManagerInboxReviewResultCode =
  | "updated"
  | "replayed"
  | "validation_failed"
  | "forbidden"
  | "not_found"
  | "unsupported_type"
  | "idempotency_conflict"
  | "status_conflict"
  | "site_scope_unavailable"
  | "target_scope_mismatch"
  | "request_failed"
  | "invalid_response";

type RpcRow = {
  ok?: unknown;
  result_code?: unknown;
  review_status?: unknown;
  event_id?: unknown;
  replayed?: unknown;
};

type TargetRow = {
  id?: unknown;
  source?: unknown;
  mode?: unknown;
};

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FAILURE_CODES = new Set<ManagerInboxReviewResultCode>([
  "validation_failed",
  "forbidden",
  "not_found",
  "unsupported_type",
  "idempotency_conflict",
  "status_conflict",
]);

function isSupportedInboxTarget(row: TargetRow) {
  const source = typeof row.source === "string" ? row.source : "";
  const mode = typeof row.mode === "string" ? row.mode : "";
  return (
    (source === "risk_share_participation_submit_v1" && mode === "prework")
    || source === "risk_share_anonymous_feedback_v1"
    || source === "anonymous_worker_feedback_v1"
    || source === "risk_share_visitor_confirmation_v1"
    || source === "risk_share_representative_confirmation_v1"
  );
}

export async function updateManagerInboxReview(input: {
  companyCode: string;
  siteId: string;
  actorMembershipId: string;
  submissionId: string;
  expectedStatus: Exclude<ManagerInboxStatus, "completed">;
  nextStatus: Exclude<ManagerInboxStatus, "unreviewed">;
  actionNote: string;
  idempotencyKey: string;
}): Promise<
  | { ok: true; code: "updated" | "replayed"; status: ManagerInboxStatus; eventId: string; replayed: boolean }
  | { ok: false; code: Exclude<ManagerInboxReviewResultCode, "updated" | "replayed"> }
> {
  const validTransition =
    (input.expectedStatus === "unreviewed" && input.nextStatus === "in_review")
    || (input.expectedStatus === "in_review" && input.nextStatus === "completed");

  if (
    !COMPANY_CODE_PATTERN.test(input.companyCode)
    || !UUID_PATTERN.test(input.siteId)
    || !UUID_PATTERN.test(input.actorMembershipId)
    || !UUID_PATTERN.test(input.submissionId)
    || !validTransition
    || input.actionNote.length > 500
    || input.idempotencyKey.length < 1
    || input.idempotencyKey.length > 200
  ) {
    return { ok: false, code: "validation_failed" };
  }

  const targetQuery = new URLSearchParams({
    select: "id,source:raw_payload->>source,mode:raw_payload->>mode",
    id: `eq.${input.submissionId}`,
    tenant_code: `eq.${input.companyCode}`,
    manager_review_status: `eq.${input.expectedStatus}`,
    limit: "2",
  });
  applyRiskShareDefaultSiteScope(targetQuery, input.siteId);

  const targetRows = await selectSupabaseExportRows<TargetRow>(
    "field_participation_submissions",
    targetQuery,
  ).catch(() => null);
  if (!targetRows) return { ok: false, code: "request_failed" };
  if (
    targetRows.length !== 1
    || targetRows[0]?.id !== input.submissionId
    || !isSupportedInboxTarget(targetRows[0])
  ) {
    return { ok: false, code: "target_scope_mismatch" };
  }

  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, code: "request_failed" };

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/rpc/update_risk_share_inbox_review_status`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_company_code: input.companyCode,
        p_actor_membership_id: input.actorMembershipId,
        p_submission_id: input.submissionId,
        p_expected_status: input.expectedStatus,
        p_next_status: input.nextStatus,
        p_action_note: input.actionNote || null,
        p_idempotency_key: input.idempotencyKey,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "request_failed" };
  }

  if (!response.ok) return { ok: false, code: "request_failed" };

  const rows = await response.json().catch(() => null);
  const row: RpcRow | null = Array.isArray(rows) && rows.length === 1
    && rows[0] && typeof rows[0] === "object" && !Array.isArray(rows[0])
    ? rows[0] as RpcRow
    : null;
  if (!row || typeof row.result_code !== "string") {
    return { ok: false, code: "invalid_response" };
  }

  if (row.ok === true && (row.result_code === "updated" || row.result_code === "replayed")) {
    const expectedReplay = row.result_code === "replayed";
    if (
      row.review_status !== input.nextStatus
      || !UUID_PATTERN.test(typeof row.event_id === "string" ? row.event_id : "")
      || row.replayed !== expectedReplay
    ) {
      return { ok: false, code: "invalid_response" };
    }
    return {
      ok: true,
      code: row.result_code,
      status: input.nextStatus,
      eventId: row.event_id as string,
      replayed: expectedReplay,
    };
  }

  if (row.ok === false && FAILURE_CODES.has(row.result_code as ManagerInboxReviewResultCode)) {
    return { ok: false, code: row.result_code as Exclude<ManagerInboxReviewResultCode, "updated" | "replayed" | "request_failed" | "invalid_response"> };
  }

  return { ok: false, code: "invalid_response" };
}
