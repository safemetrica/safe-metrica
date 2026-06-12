import "server-only";

import { randomUUID } from "node:crypto";

import {
  WORKER_REPRESENTATIVE_REVIEW_STATUS,
  type WorkerRepresentativeConfirmationAuditEventCandidate,
  type WorkerRepresentativeConfirmationInput,
} from "@/lib/workerRepresentativeConfirmation";

const TABLE_NAME = "worker_representative_confirmations";

type StoreWorkerRepresentativeConfirmationParams = {
  input: WorkerRepresentativeConfirmationInput;
  auditEventCandidate: WorkerRepresentativeConfirmationAuditEventCandidate;
  submittedAt: string;
};

export type StoreWorkerRepresentativeConfirmationResult =
  | { status: "stored"; confirmationId: string }
  | { status: "duplicate" }
  | { status: "not_configured" }
  | { status: "failed" };

function getStorageConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
  };
}

function createHeaders(serviceRoleKey: string, prefer?: string) {
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

async function readErrorCode(response: Response) {
  const data = await response.json().catch(() => null);
  return typeof data?.code === "string" ? data.code : null;
}

function isMissingStorage(response: Response, errorCode: string | null) {
  return (
    response.status === 404 ||
    errorCode === "42P01" ||
    errorCode === "PGRST204" ||
    errorCode === "PGRST205"
  );
}

async function hasExistingSubmission(params: {
  url: string;
  serviceRoleKey: string;
  companyCode: string;
  clientSubmissionId: string;
}): Promise<"found" | "not_found" | "not_configured" | "failed"> {
  const query = new URLSearchParams({
    select: "confirmation_id",
    related_company_code: `eq.${params.companyCode}`,
    client_submission_id: `eq.${params.clientSubmissionId}`,
    limit: "1",
  });
  const response = await fetch(`${params.url}/rest/v1/${TABLE_NAME}?${query.toString()}`, {
    method: "GET",
    headers: createHeaders(params.serviceRoleKey),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    return isMissingStorage(response, errorCode) ? "not_configured" : "failed";
  }

  const rows = await response.json().catch(() => null);
  return Array.isArray(rows) && rows.length > 0 ? "found" : "not_found";
}

export async function storeWorkerRepresentativeConfirmation(
  params: StoreWorkerRepresentativeConfirmationParams
): Promise<StoreWorkerRepresentativeConfirmationResult> {
  const config = getStorageConfig();

  if (!config) {
    return { status: "not_configured" };
  }

  if (params.input.clientSubmissionId) {
    const existingSubmission = await hasExistingSubmission({
      ...config,
      companyCode: params.input.companyCode,
      clientSubmissionId: params.input.clientSubmissionId,
    });

    if (existingSubmission === "found") {
      return { status: "duplicate" };
    }

    if (existingSubmission !== "not_found") {
      return { status: existingSubmission };
    }
  }

  const confirmationId = randomUUID();
  const record = {
    confirmation_id: confirmationId,
    related_company_code: params.input.companyCode,
    related_site_name: params.input.siteName,
    related_risk_assessment_id: params.input.riskAssessmentId,
    confirmation_scope: params.input.confirmationScope,
    representative_name: params.input.representativeName,
    representative_department: params.input.representativeDepartment,
    representative_role: params.input.representativeRole,
    confirmed_at: params.input.confirmedAt,
    opinion: params.input.opinion,
    has_objection: params.input.hasObjection,
    objection_detail: params.input.objectionDetail,
    consent_checked: params.input.consentChecked,
    consent_recorded_at: params.submittedAt,
    client_submission_id: params.input.clientSubmissionId,
    review_status: WORKER_REPRESENTATIVE_REVIEW_STATUS,
    submitted_at: params.submittedAt,
    audit_event_candidate: params.auditEventCandidate,
  };
  const response = await fetch(`${config.url}/rest/v1/${TABLE_NAME}`, {
    method: "POST",
    headers: createHeaders(config.serviceRoleKey, "return=minimal"),
    body: JSON.stringify(record),
    cache: "no-store",
  });

  if (response.ok) {
    return { status: "stored", confirmationId };
  }

  const errorCode = await readErrorCode(response);

  if (isMissingStorage(response, errorCode)) {
    return { status: "not_configured" };
  }

  if (response.status === 409 && errorCode === "23505" && params.input.clientSubmissionId) {
    return { status: "duplicate" };
  }

  return { status: "failed" };
}
