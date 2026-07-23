import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { readRiskShareSourcePrivateDescriptorForTenant } from "@/lib/risk-share/riskShareSourcePrivateRead";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import {
  readRiskShareSourceColumnMappingSourceState,
  readLatestRiskShareSourceColumnMappingVersion,
  reconcileRiskShareSourceColumnMappingRecord,
  suggestCanonicalFieldForHeader,
  type RiskShareSourceColumnMappingSourceReadFailureReason,
} from "@/lib/risk-share/riskShareSourceColumnMapping";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import RiskShareSourceColumnMappingForm, {
  type RiskShareSourceColumnMappingFormColumn,
} from "@/components/risk-share/source/RiskShareSourceColumnMappingForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "위험성평가 원본 열 매핑 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseNonNegativeInt(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

const DESCRIPTOR_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "원본 요청을 확인할 수 없습니다.",
  source_not_found: "등록된 원본을 찾을 수 없습니다.",
  preview_unavailable: "이 원본은 열 매핑을 지원하지 않습니다.",
  unsupported_file_type: "이번 단계에서는 XLSX와 CSV만 매핑할 수 있습니다.",
  file_too_large: "파일이 미리보기 크기 제한을 초과합니다.",
  lookup_failed: "원본 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

const SOURCE_STATE_ERROR_MESSAGES: Record<RiskShareSourceColumnMappingSourceReadFailureReason, string> = {
  invalid_request: "원본 요청을 확인할 수 없습니다.",
  source_not_found: "등록된 원본을 찾을 수 없습니다.",
  preview_unavailable: "이 원본은 열 매핑을 지원하지 않습니다.",
  unsupported_file_type: "이번 단계에서는 XLSX와 CSV만 매핑할 수 있습니다.",
  file_too_large: "파일이 미리보기 크기 제한을 초과합니다.",
  lookup_failed: "원본 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  storage_not_configured: "원본 저장소 설정을 확인할 수 없습니다.",
  blob_not_found: "원본 파일을 찾을 수 없습니다.",
  blob_read_failed: "원본 파일을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.",
  parse_failed: "파일 내용을 해석하지 못했습니다. 인코딩 또는 형식을 확인해 주세요.",
  invalid_header_row: "선택한 헤더 행을 찾을 수 없습니다.",
};

const SAVE_ACTION_ERROR_MESSAGES: Record<string, string> = {
  header_changed: "원본 헤더 변경 확인이 필요합니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  header_mismatch: "원본 헤더 변경 확인이 필요합니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  column_count_mismatch: "원본 헤더 변경 확인이 필요합니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  duplicate_index: "원본 헤더 변경 확인이 필요합니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  index_out_of_range: "원본 헤더 변경 확인이 필요합니다. 화면을 새로고침한 뒤 다시 시도해 주세요.",
  empty_columns: "매핑할 열이 없습니다.",
  too_many_columns: "열 개수가 매핑 지원 범위를 초과합니다.",
  invalid_standard_field: "표준 필드 값을 확인할 수 없습니다.",
  missing_required_field: "필수 위험요인 열이 지정되지 않았습니다.",
  duplicate_standard_field: "같은 표준 필드가 두 열에 중복 지정되었습니다.",
  invalid_intent: "저장 방식을 확인할 수 없습니다.",
  access_denied: "접근 권한이 없습니다.",
  save_failed: "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

function AccessDeniedScreen() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          이 회사의 원본 관리 권한이 확인되지 않았습니다.
        </h1>
        <p className="mt-3 text-sm leading-6 text-amber-900">운영 담당자에게 문의해 주세요.</p>
      </section>
    </main>
  );
}

function ErrorScreen({ message, sourcesHref }: { message: string; sourcesHref: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm leading-6 text-rose-100">
          <p className="text-lg font-black">열 매핑을 열 수 없습니다.</p>
          <p className="mt-3">{message}</p>
        </div>
        <a
          href={sourcesHref}
          className="mt-6 inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
        >
          관리자 원본 목록으로 돌아가기
        </a>
      </section>
    </main>
  );
}

export default async function RiskShareManagerSourceColumnMappingPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const sourceId = readSearchParam(params.sourceId);
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const requestedSheetIndex = parseNonNegativeInt(readSearchParam(params.sheet)) ?? 0;
  const requestedHeaderRowIndex = parseNonNegativeInt(readSearchParam(params.headerRow));
  const savedStatus = readSearchParam(params.saved);
  const savedVersion = parseNonNegativeInt(readSearchParam(params.version));
  const actionErrorCode = readSearchParam(params.actionError);

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return <AccessDeniedScreen />;
  }

  const tenantCode = tenantResolution.tenant.code;
  const sourcesHref = buildRiskShareLangHref("/risk-share/manager/sources", { company: tenantCode }, lang);

  const mappingHref = buildRiskShareLangHref(
    "/risk-share/manager/sources/mapping",
    { company: tenantCode, sourceId },
    lang,
  );

  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(mappingHref)}`);
    }

    return <AccessDeniedScreen />;
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return <AccessDeniedScreen />;
  }

  const siteScope = await resolveRiskShareCanonicalSiteScopeForTenant(
    selectedTenantCode,
    tenantResolution.tenant.defaultSiteId,
  ).catch(() => ({ ok: false as const }));

  if (!siteScope.ok) {
    return (
      <ErrorScreen
        sourcesHref={sourcesHref}
        message="기본 사업장 설정이 일치하지 않아 열 매핑을 중단했습니다."
      />
    );
  }

  const descriptorResult = await readRiskShareSourcePrivateDescriptorForTenant(
    selectedTenantCode,
    sourceId,
    siteScope.siteId,
  );

  if (!descriptorResult.ok) {
    return (
      <ErrorScreen
        sourcesHref={sourcesHref}
        message={DESCRIPTOR_ERROR_MESSAGES[descriptorResult.reason] ?? "요청을 처리하지 못했습니다."}
      />
    );
  }

  const descriptor = descriptorResult.descriptor;

  const h = await headers();
  const oidcToken = h.get("x-vercel-oidc-token")?.trim() ?? "";

  const sourceStateResult = await readRiskShareSourceColumnMappingSourceState({
    descriptor,
    oidcToken,
    sheetIndex: requestedSheetIndex,
    requestedHeaderRowIndex,
  });

  if (!sourceStateResult.ok) {
    return (
      <ErrorScreen
        sourcesHref={sourcesHref}
        message={SOURCE_STATE_ERROR_MESSAGES[sourceStateResult.reason] ?? "요청을 처리하지 못했습니다."}
      />
    );
  }

  const { preview, selectedSheetIndex, headerRowIndex, headerCells } = sourceStateResult;

  const latestMappingResult = await readLatestRiskShareSourceColumnMappingVersion({
    companyCode: selectedTenantCode,
    sourceId,
    sheetIndex: selectedSheetIndex,
  });
  const latestRecord = latestMappingResult.ok ? latestMappingResult.record : null;

  const reconciliation = reconcileRiskShareSourceColumnMappingRecord({
    record: latestRecord,
    selectedSheetIndex,
    headerRowIndex,
    headerSignature: sourceStateResult.headerSignature,
    headerCells,
  });

  const staleSavedMapping = latestRecord !== null && reconciliation === null;

  const columns: RiskShareSourceColumnMappingFormColumn[] = headerCells.map((header, index) => {
    const samples: string[] = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex < preview.rows.length && samples.length < 3; rowIndex += 1) {
      const value = preview.rows[rowIndex]?.[index]?.trim();
      if (value) samples.push(value);
    }

    const suggestedField = suggestCanonicalFieldForHeader(header);

    return {
      index,
      header,
      samples,
      suggestedField,
      initialField: reconciliation ? (reconciliation.initialFieldByIndex.get(index) ?? null) : suggestedField,
    };
  });

  const sheetOptions = preview.sheets.map((sheet) => ({
    index: sheet.index,
    name: sheet.name,
    href: buildRiskShareLangHref(
      "/risk-share/manager/sources/mapping",
      { company: selectedTenantCode, sourceId, sheet: String(sheet.index) },
      lang,
    ),
    selected: sheet.index === selectedSheetIndex,
  }));

  const headerRowOptions = preview.rows.slice(0, 10).map((row, index) => ({
    index,
    label: `${index + 1}행${index === preview.suggestedHeaderRowIndex ? " · 추천" : ""}`,
    href: buildRiskShareLangHref(
      "/risk-share/manager/sources/mapping",
      { company: selectedTenantCode, sourceId, sheet: String(selectedSheetIndex), headerRow: String(index) },
      lang,
    ),
    selected: index === headerRowIndex,
  }));

  const errorMessage = actionErrorCode
    ? (SAVE_ACTION_ERROR_MESSAGES[actionErrorCode] ?? "요청을 처리하지 못했습니다.")
    : null;

  const appliedStatus: { status: "draft" | "confirmed"; version: number } | null = reconciliation
    ? { status: reconciliation.status, version: reconciliation.version }
    : null;

  const savedNotice: { status: "draft" | "confirmed"; version: number } | null =
    appliedStatus !== null &&
    savedVersion !== null &&
    (savedStatus === "draft" || savedStatus === "confirmed") &&
    appliedStatus.status === savedStatus &&
    appliedStatus.version === savedVersion
      ? appliedStatus
      : null;

  const companyLabel = tenantResolution.tenant.name || tenantCode;

  const formAction = `/api/risk-share/manager/sources/mapping?${new URLSearchParams({
    company: selectedTenantCode,
    lang,
  }).toString()}`;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">{companyLabel}</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">위험성평가 원본 열 매핑</h1>
          </div>

          <a
            href={buildRiskShareLangHref(
              "/risk-share/manager/sources/preview",
              { company: selectedTenantCode, sourceId, sheet: String(selectedSheetIndex) },
              lang,
            )}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            열 미리보기로 돌아가기
          </a>
        </div>

        <RiskShareSourceColumnMappingForm
          formAction={formAction}
          hiddenFields={{
            sourceId,
            sheetIndex: String(selectedSheetIndex),
            headerRowIndex: String(headerRowIndex),
            expectedHeaderSignature: sourceStateResult.headerSignature,
          }}
          sourceTitle={preview.source.title}
          siteName={preview.source.siteName}
          fileName={preview.source.fileName}
          sheetOptions={sheetOptions}
          headerRowOptions={headerRowOptions}
          columns={columns}
          errorMessage={errorMessage}
          savedNotice={savedNotice}
          appliedStatus={appliedStatus}
          staleSavedMapping={staleSavedMapping}
        />
      </section>
    </main>
  );
}
