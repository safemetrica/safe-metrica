import { NextResponse } from "next/server";

import {
  WORKER_REPRESENTATIVE_REVIEW_STATUS,
  createWorkerRepresentativeConfirmationAuditEventCandidate,
  validateWorkerRepresentativeConfirmation,
} from "@/lib/workerRepresentativeConfirmation";
import { fetchWorkerRepresentativeConfirmationLink } from "@/lib/workerRepresentativeConfirmationLinks";
import { storeWorkerRepresentativeConfirmation } from "@/lib/workerRepresentativeConfirmationStorage";
import { validateWorkerRepresentativeConfirmationTenant } from "@/lib/workerRepresentativeConfirmationTenant";

const INVALID_RESPONSE = {
  ok: false,
  error: {
    code: "invalid_representative_confirmation",
    message: "필수 확인 항목을 확인해주세요.",
  },
} as const;

const TENANT_INVALID_RESPONSE = {
  ok: false,
  error: {
    code: "representative_confirmation_tenant_invalid",
    message: "근로자대표 참여확인 대상 사업장을 확인할 수 없습니다.",
  },
} as const;

const TENANT_VALIDATION_FAILED_RESPONSE = {
  ok: false,
  error: {
    code: "representative_confirmation_tenant_validation_failed",
    message: "근로자대표 참여확인 대상 사업장 검증을 완료하지 못했습니다.",
  },
} as const;

const STORAGE_NOT_CONFIGURED_RESPONSE = {
  ok: false,
  error: {
    code: "representative_confirmation_storage_not_configured",
    message: "근로자대표 참여확인 저장소 설정이 필요합니다.",
  },
} as const;

const LINK_INVALID_RESPONSE = {
  ok: false,
  error: {
    code: "representative_confirmation_link_invalid",
    message: "근로자대표 참여확인 링크를 사용할 수 없습니다.",
  },
} as const;

const LINK_STORAGE_FAILED_RESPONSE = {
  ok: false,
  error: {
    code: "representative_confirmation_link_storage_failed",
    message: "근로자대표 참여확인 링크를 확인하지 못했습니다.",
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
      linkId: formData.get("linkId"),
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

  let authoritativePayload = payload;

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const rawLinkId = (payload as Record<string, unknown>).linkId;
    const linkId = typeof rawLinkId === "string" ? rawLinkId.trim() : "";

    if (linkId) {
      const linkResult =
        await fetchWorkerRepresentativeConfirmationLink(linkId).catch(
          () => ({ status: "failed" as const }),
        );

      if (
        linkResult.status === "not_found" ||
        linkResult.status === "inactive"
      ) {
        return NextResponse.json(LINK_INVALID_RESPONSE, { status: 403 });
      }

      if (
        linkResult.status === "not_configured" ||
        linkResult.status === "failed"
      ) {
        return NextResponse.json(LINK_STORAGE_FAILED_RESPONSE, { status: 503 });
      }

      authoritativePayload = {
        ...(payload as Record<string, unknown>),
        companyCode: linkResult.link.companyCode,
        siteName: linkResult.link.siteName,
        confirmationScope: linkResult.link.confirmationScope,
        riskAssessmentId: linkResult.link.riskAssessmentId,
      };
    }
  }

  const validation =
    validateWorkerRepresentativeConfirmation(authoritativePayload);

  if (!validation.ok) {
    return NextResponse.json(INVALID_RESPONSE, { status: 400 });
  }

  const tenantValidation = await validateWorkerRepresentativeConfirmationTenant(
    validation.value
  ).catch(() => null);

  if (!tenantValidation) {
    return NextResponse.json(TENANT_VALIDATION_FAILED_RESPONSE, { status: 503 });
  }

  if (!tenantValidation.ok) {
    return NextResponse.json(TENANT_INVALID_RESPONSE, { status: 403 });
  }

  const tenantValidatedInput = {
    ...validation.value,
    companyCode: tenantValidation.companyCode,
  };
  const submittedAt = new Date().toISOString();
  const result = await storeWorkerRepresentativeConfirmation({
    input: tenantValidatedInput,
    submittedAt,
    auditEventCandidate: createWorkerRepresentativeConfirmationAuditEventCandidate(
      tenantValidatedInput,
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
