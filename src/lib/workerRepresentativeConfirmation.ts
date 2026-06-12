export const WORKER_REPRESENTATIVE_REVIEW_STATUS = "미확인" as const;

export type WorkerRepresentativeConfirmationInput = {
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
  consentChecked: true;
  clientSubmissionId: string | null;
};

export type WorkerRepresentativeConfirmationAuditEventCandidate = {
  eventType: "worker_representative_confirmation_submitted";
  occurredAt: string;
  source: "worker_representative_confirmation_submit_route";
  reviewStatus: typeof WORKER_REPRESENTATIVE_REVIEW_STATUS;
  hasObjection: boolean;
  clientSubmissionIdPresent: boolean;
};

type ValidationResult =
  | { ok: true; value: WorkerRepresentativeConfirmationInput }
  | { ok: false };

const TEXT_LIMITS = {
  companyCode: 50,
  siteName: 200,
  riskAssessmentId: 200,
  confirmationScope: 2_000,
  representativeName: 100,
  representativeDepartment: 200,
  representativeRole: 200,
  opinion: 5_000,
  objectionDetail: 5_000,
  clientSubmissionId: 128,
} as const;

function readText(
  payload: Record<string, unknown>,
  key: keyof typeof TEXT_LIMITS
): string | null | undefined {
  const rawValue = payload[key];

  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  if (typeof rawValue !== "string") {
    return undefined;
  }

  const value = rawValue.trim();

  if (value.length > TEXT_LIMITS[key]) {
    return undefined;
  }

  return value || null;
}

function readRequiredText(
  payload: Record<string, unknown>,
  key: keyof typeof TEXT_LIMITS
): string | undefined {
  const value = readText(payload, key);
  return value || undefined;
}

function isValidCompanyCode(value: string) {
  return /^[a-z0-9_-]{2,50}$/.test(value);
}

function isValidClientSubmissionId(value: string | null) {
  return value === null || /^[a-zA-Z0-9._:-]{8,128}$/.test(value);
}

function normalizeConfirmedAt(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return null;
  }

  const value = rawValue.trim();

  if (!value || value.length > 50 || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

export function validateWorkerRepresentativeConfirmation(
  payload: unknown
): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false };
  }

  const input = payload as Record<string, unknown>;
  const companyCode = readRequiredText(input, "companyCode")?.toLowerCase();
  const siteName = readText(input, "siteName");
  const riskAssessmentId = readText(input, "riskAssessmentId");
  const confirmationScope = readText(input, "confirmationScope");
  const representativeName = readRequiredText(input, "representativeName");
  const representativeDepartment = readText(input, "representativeDepartment");
  const representativeRole = readRequiredText(input, "representativeRole");
  const confirmedAt = normalizeConfirmedAt(input.confirmedAt);
  const opinion = readText(input, "opinion");
  const objectionDetail = readText(input, "objectionDetail");
  const clientSubmissionId = readText(input, "clientSubmissionId");

  const hasInvalidText = [
    siteName,
    riskAssessmentId,
    confirmationScope,
    representativeDepartment,
    opinion,
    objectionDetail,
    clientSubmissionId,
  ].some((value) => value === undefined);

  if (
    !companyCode ||
    !isValidCompanyCode(companyCode) ||
    !representativeName ||
    !representativeRole ||
    !confirmedAt ||
    (!riskAssessmentId && !confirmationScope) ||
    hasInvalidText ||
    typeof input.hasObjection !== "boolean" ||
    (input.hasObjection && !objectionDetail) ||
    input.consentChecked !== true ||
    !isValidClientSubmissionId(clientSubmissionId ?? null)
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      companyCode,
      siteName: siteName ?? null,
      riskAssessmentId: riskAssessmentId ?? null,
      confirmationScope: confirmationScope ?? null,
      representativeName,
      representativeDepartment: representativeDepartment ?? null,
      representativeRole,
      confirmedAt,
      opinion: opinion ?? null,
      hasObjection: input.hasObjection,
      objectionDetail: objectionDetail ?? null,
      consentChecked: true,
      clientSubmissionId: clientSubmissionId ?? null,
    },
  };
}

export function createWorkerRepresentativeConfirmationAuditEventCandidate(
  input: WorkerRepresentativeConfirmationInput,
  occurredAt: string
): WorkerRepresentativeConfirmationAuditEventCandidate {
  return {
    eventType: "worker_representative_confirmation_submitted",
    occurredAt,
    source: "worker_representative_confirmation_submit_route",
    reviewStatus: WORKER_REPRESENTATIVE_REVIEW_STATUS,
    hasObjection: input.hasObjection,
    clientSubmissionIdPresent: Boolean(input.clientSubmissionId),
  };
}
