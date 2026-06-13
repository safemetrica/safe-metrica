import { NextResponse } from "next/server";

import { getCompanyConfig } from "@/lib/company";
import { createWorkerRepresentativeConfirmationLink } from "@/lib/workerRepresentativeConfirmationLinks";

const TEXT_LIMITS = {
  siteName: 200,
  confirmationScope: 2_000,
} as const;

function readRequiredText(
  payload: Record<string, unknown>,
  key: keyof typeof TEXT_LIMITS,
) {
  const value = payload[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.length > TEXT_LIMITS[key]) {
    return null;
  }

  return normalized;
}


function readOptionalExpiresAt(payload: Record<string, unknown>) {
  const value = payload.expiresAt;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
  const candidate = dateOnlyMatch
    ? `${trimmed}T14:59:59.999Z`
    : trimmed;
  const parsed = new Date(candidate);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_representative_confirmation_link",
          message: "현장명과 오늘 확인할 내용을 확인해주세요.",
        },
      },
      { status: 400 },
    );
  }

  const siteName = readRequiredText(
    payload as Record<string, unknown>,
    "siteName",
  );
  const confirmationScope = readRequiredText(
    payload as Record<string, unknown>,
    "confirmationScope",
  );

  if (!siteName || !confirmationScope) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_representative_confirmation_link",
          message: "현장명과 오늘 확인할 내용을 확인해주세요.",
        },
      },
      { status: 400 },
    );
  }

  const expiresAt = readOptionalExpiresAt(payload as Record<string, unknown>);

  if (expiresAt === undefined) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_representative_confirmation_link_expiry",
          message: "링크 만료일 형식을 확인해주세요.",
        },
      },
      { status: 400 },
    );
  }

  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "representative_confirmation_link_tenant_invalid",
          message: "링크를 생성할 사업장을 확인할 수 없습니다.",
        },
      },
      { status: 403 },
    );
  }

  const result = await createWorkerRepresentativeConfirmationLink({
    companyCode: company.code,
    siteName,
    confirmationScope,
    expiresAt,
  }).catch(() => ({ status: "failed" as const }));

  if (result.status === "not_configured") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "representative_confirmation_link_storage_not_configured",
          message: "링크 저장소 설정이 필요합니다.",
        },
      },
      { status: 503 },
    );
  }

  if (result.status === "failed") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "representative_confirmation_link_storage_failed",
          message: "링크를 저장하지 못했습니다.",
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      linkId: result.linkId,
      link: `/field/representative-confirmation?linkId=${result.linkId}`,
    },
    { status: 201 },
  );
}
