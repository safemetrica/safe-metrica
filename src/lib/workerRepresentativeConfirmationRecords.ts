import "server-only";

const TABLE_NAME = "worker_representative_confirmations";
const DEFAULT_LIMIT = 100;

export const WORKER_REPRESENTATIVE_REVIEW_STATUSES = [
  "미확인",
  "확인",
  "검토 필요",
  "이견 검토 중",
  "보완 요청",
  "검토 완료",
  "반려",
] as const;

export type WorkerRepresentativeReviewStatus =
  (typeof WORKER_REPRESENTATIVE_REVIEW_STATUSES)[number];

export type WorkerRepresentativeConfirmationRecord = {
  confirmationId: string;
  companyCode: string;
  siteName: string | null;
  riskAssessmentId: string | null;
  confirmationScope: string | null;
  representativeName: string;
  representativeDepartment: string | null;
  representativeRole: string;
  confirmedAt: string;
  opinion: string | null;
  hasObjection: boolean;
  objectionDetail: string | null;
  reviewStatus: WorkerRepresentativeReviewStatus;
  submittedAt: string;
};

export type FetchWorkerRepresentativeConfirmationRecordsResult =
  | {
      status: "ok";
      records: WorkerRepresentativeConfirmationRecord[];
    }
  | {
      status: "not_configured" | "failed";
      records: [];
    };

type SupabaseRecord = {
  confirmation_id?: unknown;
  related_company_code?: unknown;
  related_site_name?: unknown;
  related_risk_assessment_id?: unknown;
  confirmation_scope?: unknown;
  representative_name?: unknown;
  representative_department?: unknown;
  representative_role?: unknown;
  confirmed_at?: unknown;
  opinion?: unknown;
  has_objection?: unknown;
  objection_detail?: unknown;
  review_status?: unknown;
  submitted_at?: unknown;
};

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isReviewStatus(value: unknown): value is WorkerRepresentativeReviewStatus {
  return (
    typeof value === "string" &&
    WORKER_REPRESENTATIVE_REVIEW_STATUSES.includes(
      value as WorkerRepresentativeReviewStatus,
    )
  );
}

function mapRecord(
  record: SupabaseRecord,
): WorkerRepresentativeConfirmationRecord | null {
  const confirmationId = readNullableString(record.confirmation_id);
  const companyCode = readNullableString(record.related_company_code);
  const representativeName = readNullableString(record.representative_name);
  const representativeRole = readNullableString(record.representative_role);
  const confirmedAt = readNullableString(record.confirmed_at);
  const submittedAt = readNullableString(record.submitted_at);

  if (
    !confirmationId ||
    !companyCode ||
    !representativeName ||
    !representativeRole ||
    !confirmedAt ||
    !submittedAt ||
    typeof record.has_objection !== "boolean" ||
    !isReviewStatus(record.review_status)
  ) {
    return null;
  }

  return {
    confirmationId,
    companyCode,
    siteName: readNullableString(record.related_site_name),
    riskAssessmentId: readNullableString(record.related_risk_assessment_id),
    confirmationScope: readNullableString(record.confirmation_scope),
    representativeName,
    representativeDepartment: readNullableString(record.representative_department),
    representativeRole,
    confirmedAt,
    opinion: readNullableString(record.opinion),
    hasObjection: record.has_objection,
    objectionDetail: readNullableString(record.objection_detail),
    reviewStatus: record.review_status,
    submittedAt,
  };
}

export async function fetchWorkerRepresentativeConfirmationRecords(
  companyCode: string,
  limit = DEFAULT_LIMIT,
): Promise<FetchWorkerRepresentativeConfirmationRecordsResult> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return { status: "not_configured", records: [] };
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), DEFAULT_LIMIT);
  const query = new URLSearchParams({
    select: [
      "confirmation_id",
      "related_company_code",
      "related_site_name",
      "related_risk_assessment_id",
      "confirmation_scope",
      "representative_name",
      "representative_department",
      "representative_role",
      "confirmed_at",
      "opinion",
      "has_objection",
      "objection_detail",
      "review_status",
      "submitted_at",
    ].join(","),
    related_company_code: `eq.${companyCode}`,
    order: "submitted_at.desc",
    limit: String(safeLimit),
  });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${TABLE_NAME}?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    return { status: "failed", records: [] };
  }

  const data = await response.json().catch(() => null);

  if (!Array.isArray(data)) {
    return { status: "failed", records: [] };
  }

  return {
    status: "ok",
    records: data
      .map((record) => mapRecord(record as SupabaseRecord))
      .filter(
        (record): record is WorkerRepresentativeConfirmationRecord =>
          record !== null,
      ),
  };
}
