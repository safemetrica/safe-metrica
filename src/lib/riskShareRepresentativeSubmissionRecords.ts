import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

const RISK_SHARE_REPRESENTATIVE_SUBMISSION_SOURCE =
  "risk_share_representative_confirmation_v1";
const RISK_SHARE_REPRESENTATIVE_SUBMISSION_LIMIT = 500;

export type RiskShareRepresentativeSubmissionPeriod = {
  startDate: string;
  endDate: string;
  dayAfterEnd: string;
};

export type RiskShareRepresentativeSubmissionSummary = {
  status: "ok" | "not_configured" | "failed";
  totalCount: number;
  signatureConfirmedCount: number;
  signatureNotSubmittedCount: number;
};

type FieldParticipationSubmissionRow = {
  raw_payload?: unknown;
};

function readSignaturePresent(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return false;
  }

  return (rawPayload as Record<string, unknown>).signature_present === true;
}

export async function fetchRiskShareRepresentativeSubmissionSummary(
  companyCode: string,
  period: RiskShareRepresentativeSubmissionPeriod,
): Promise<RiskShareRepresentativeSubmissionSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set(
    "raw_payload->>source",
    `eq.${RISK_SHARE_REPRESENTATIVE_SUBMISSION_SOURCE}`,
  );
  query.set(
    "or",
    `(and(created_at.gte.${period.startDate}T00:00:00.000Z,created_at.lt.${period.dayAfterEnd}T00:00:00.000Z),and(reported_date.gte.${period.startDate},reported_date.lte.${period.endDate}))`,
  );
  query.set("limit", String(RISK_SHARE_REPRESENTATIVE_SUBMISSION_LIMIT));

  try {
    const rows = await selectSupabaseExportRows<FieldParticipationSubmissionRow>(
      "field_participation_submissions",
      query,
    );

    const signatureConfirmedCount = rows.filter((row) =>
      readSignaturePresent(row.raw_payload),
    ).length;

    return {
      status: "ok",
      totalCount: rows.length,
      signatureConfirmedCount,
      signatureNotSubmittedCount: rows.length - signatureConfirmedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing")
        ? "not_configured"
        : "failed",
      totalCount: 0,
      signatureConfirmedCount: 0,
      signatureNotSubmittedCount: 0,
    };
  }
}
