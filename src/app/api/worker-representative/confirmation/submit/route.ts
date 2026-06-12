import { NextResponse } from "next/server";

import {
  WORKER_REPRESENTATIVE_REVIEW_STATUS,
  createWorkerRepresentativeConfirmationAuditEventCandidate,
  validateWorkerRepresentativeConfirmation,
} from "@/lib/workerRepresentativeConfirmation";
import { storeWorkerRepresentativeConfirmation } from "@/lib/workerRepresentativeConfirmationStorage";

const INVALID_RESPONSE = {
  ok: false,
  error: {
    code: "invalid_representative_confirmation",
    message: "필수 확인 항목을 확인해주세요.",
  },
} as const;

const STORAGE_NOT_CONFIGURED_RESPONSE = {
  ok: false,
  error: {
    code: "representative_confirmation_storage_not_configured",
    message: "근로자대표 참여확인 저장소 설정이 필요합니다.",
  },
} as const;

const SUBMITTED_RESPONSE = {
  ok: true,
  status: "submitted",
  reviewStatus: WORKER_REPRESENTATIVE_REVIEW_STATUS,
  message: "근로자대표 참여확인 기록이 접수되었습니다.",
} as const;

function readFormBoolean(formData: FormData, key: string) {
  const value = formData.get(key);

  if (value === "true" || value === "on") {
    return true;
  }

  if (value === "false" || value === "off") {
    return false;
  }

  return undefined;
}

async function readPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    return {
      companyCode: formData.get("companyCode"),
      siteName: formData.get("siteName"),
      riskAssessmentId: formData.get("riskAssessmentId"),
      confirmationScope: formData.get("confirmationScope"),
      representativeName: formData.get("representativeName"),
      representativeDepartment: formData.get("representativeDepartment"),
      representativeRole: formData.get("representativeRole"),
      confirmedAt: formData.get("confirmedAt"),
      opinion: formData.get("opinion"),
      hasObjection: readFormBoolean(formData, "hasObjection"),
      objectionDetail: formData.get("objectionDetail"),
      consentChecked: readFormBoolean(formData, "consentChecked"),
      clientSubmissionId: formData.get("clientSubmissionId"),
    };
  }

  throw new Error("unsupported_content_type");
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await readPayload(request);
  } catch {
    return NextResponse.json(INVALID_RESPONSE, { status: 400 });
  }

  const validation = validateWorkerRepresentativeConfirmation(payload);

  if (!validation.ok) {
    return NextResponse.json(INVALID_RESPONSE, { status: 400 });
  }

  const submittedAt = new Date().toISOString();
  const result = await storeWorkerRepresentativeConfirmation({
    input: validation.value,
    submittedAt,
    auditEventCandidate: createWorkerRepresentativeConfirmationAuditEventCandidate(
      validation.value,
      submittedAt
    ),
  }).catch(() => ({ status: "failed" as const }));

  if (result.status === "not_configured") {
    return NextResponse.json(STORAGE_NOT_CONFIGURED_RESPONSE, { status: 503 });
  }

  if (result.status === "failed") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "representative_confirmation_storage_failed",
          message: "근로자대표 참여확인 기록을 저장하지 못했습니다.",
        },
      },
      { status: 502 }
    );
  }

  return NextResponse.json(SUBMITTED_RESPONSE, { status: result.status === "stored" ? 201 : 200 });
}
