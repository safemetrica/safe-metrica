import { NextResponse } from "next/server";

import { getCompanyConfig } from "@/lib/company";
import { revokeWorkerRepresentativeConfirmationLink } from "@/lib/workerRepresentativeConfirmationLinks";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_representative_confirmation_link_revoke",
          message: "폐기할 링크를 확인해주세요.",
        },
      },
      { status: 400 },
    );
  }

  const rawLinkId = (payload as Record<string, unknown>).linkId;
  const linkId = typeof rawLinkId === "string" ? rawLinkId.trim() : "";

  if (!linkId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_representative_confirmation_link_revoke",
          message: "폐기할 링크를 확인해주세요.",
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
          message: "링크를 폐기할 사업장을 확인할 수 없습니다.",
        },
      },
      { status: 403 },
    );
  }

  const result = await revokeWorkerRepresentativeConfirmationLink({
    linkId,
    companyCode: company.code,
  }).catch(() => ({ status: "failed" as const }));

  if (result.status === "revoked") {
    return NextResponse.json({ ok: true, status: "revoked" });
  }

  if (result.status === "not_found") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "representative_confirmation_link_not_found",
          message: "폐기할 링크를 찾을 수 없습니다.",
        },
      },
      { status: 404 },
    );
  }

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

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "representative_confirmation_link_revoke_failed",
        message: "링크를 폐기하지 못했습니다.",
      },
    },
    { status: 502 },
  );
}
