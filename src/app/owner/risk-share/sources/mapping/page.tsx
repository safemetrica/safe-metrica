import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { readRiskShareSourcePrivateDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";
import {
  readRiskShareSourceColumnMappingSourceState,
  readLatestRiskShareSourceColumnMappingVersion,
  reconcileRiskShareSourceColumnMappingRecord,
  suggestCanonicalFieldForHeader,
  type RiskShareSourceColumnMappingSourceReadFailureReason,
} from "@/lib/risk-share/riskShareSourceColumnMapping";
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

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function parseNonNegativeInt(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

const DESCRIPTOR_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "고객사 코드와 원본 식별자를 확인해 주세요.",
  source_not_found: "등록된 원본을 찾을 수 없습니다.",
  preview_unavailable: "이 원본은 열 매핑을 지원하지 않습니다.",
  unsupported_file_type: "이번 단계에서는 XLSX와 CSV만 매핑할 수 있습니다.",
  file_too_large: "파일이 미리보기 크기 제한을 초과합니다.",
  lookup_failed: "원본 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

const SOURCE_STATE_ERROR_MESSAGES: Record<RiskShareSourceColumnMappingSourceReadFailureReason, string> = {
  invalid_request: "고객사 코드와 원본 식별자를 확인해 주세요.",
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
  confirmed_mapping_required: "확정된 열 매핑이 필요합니다. 매핑을 확정한 뒤 다시 시도해 주세요.",
  source_not_found: "등록된 원본을 찾을 수 없습니다.",
  source_read_failed: "원본 파일을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.",
  unsupported_file: "이번 단계에서는 XLSX와 CSV만 지원합니다.",
  source_row_limit_exceeded: "원본 데이터 행이 처리 가능한 범위를 초과합니다.",
  no_candidate_rows: "검토 후보로 만들 수 있는 행이 없습니다. 위험요인 열의 값을 확인해 주세요.",
  candidate_import_failed: "검토 후보 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

function ErrorScreen({ companyCode, message }: { companyCode: string; message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm leading-6 text-rose-100">
          <p className="text-lg font-black">열 매핑을 열 수 없습니다.</p>
          <p className="mt-3">{message}</p>
        </div>
        <Link
          href={`/owner/risk-share/sources?companyCode=${encodeURIComponent(companyCode)}`}
          className="mt-6 inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
        >
          원본 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}

function buildMappingHref(params: {
  companyCode: string;
  sourceId: string;
  sheet: number;
  headerRow?: number;
}) {
  const url = new URLSearchParams({
    companyCode: params.companyCode,
    sourceId: params.sourceId,
    sheet: String(params.sheet),
  });

  if (params.headerRow !== undefined) {
    url.set("headerRow", String(params.headerRow));
  }

  return `/owner/risk-share/sources/mapping?${url.toString()}`;
}

export default async function OwnerRiskShareSourceColumnMappingPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const companyCode = getSingleSearchParam(params.companyCode) ?? "";
  const sourceId = getSingleSearchParam(params.sourceId) ?? "";
  const requestedSheetIndex = parseNonNegativeInt(getSingleSearchParam(params.sheet)) ?? 0;
  const requestedHeaderRowIndex = parseNonNegativeInt(getSingleSearchParam(params.headerRow));
  const savedStatus = getSingleSearchParam(params.saved) ?? "";
  const savedVersion = parseNonNegativeInt(getSingleSearchParam(params.version));
  const actionErrorCode = getSingleSearchParam(params.actionError) ?? "";
  const candidateImportStatus = getSingleSearchParam(params.candidateImport) ?? "";
  const candidateImportInserted = parseNonNegativeInt(getSingleSearchParam(params.inserted));
  const candidateImportDuplicate = parseNonNegativeInt(getSingleSearchParam(params.duplicate));
  const candidateImportInvalid = parseNonNegativeInt(getSingleSearchParam(params.invalid));

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const descriptorResult = await readRiskShareSourcePrivateDescriptor(companyCode, sourceId);

  if (!descriptorResult.ok) {
    return (
      <ErrorScreen
        companyCode={companyCode}
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
        companyCode={companyCode}
        message={SOURCE_STATE_ERROR_MESSAGES[sourceStateResult.reason] ?? "요청을 처리하지 못했습니다."}
      />
    );
  }

  const { preview, selectedSheetIndex, headerRowIndex, headerCells } = sourceStateResult;

  const latestMappingResult = await readLatestRiskShareSourceColumnMappingVersion({
    companyCode,
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
    href: buildMappingHref({ companyCode, sourceId, sheet: sheet.index }),
    selected: sheet.index === selectedSheetIndex,
  }));

  const headerRowOptions = preview.rows.slice(0, 10).map((row, index) => ({
    index,
    label: `${index + 1}행${index === preview.suggestedHeaderRowIndex ? " · 추천" : ""}`,
    href: buildMappingHref({ companyCode, sourceId, sheet: selectedSheetIndex, headerRow: index }),
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

  const candidateImportSummary =
    candidateImportStatus === "success"
      ? {
          inserted: candidateImportInserted ?? 0,
          duplicate: candidateImportDuplicate ?? 0,
          invalid: candidateImportInvalid ?? 0,
        }
      : null;

  const canCreateCandidates = appliedStatus !== null && appliedStatus.status === "confirmed";
  const candidatesReviewHref = `/owner/risk-share-activation/candidates?companyCode=${encodeURIComponent(companyCode)}&status=pending`;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              내부 운영 · 위험성평가 원본
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">열 매핑</h1>
          </div>

          <Link
            href={`/owner/risk-share/sources/preview?companyCode=${encodeURIComponent(companyCode)}&sourceId=${encodeURIComponent(sourceId)}&sheet=${selectedSheetIndex}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            열 미리보기로 돌아가기
          </Link>
        </div>

        <RiskShareSourceColumnMappingForm
          formAction="/api/owner/risk-share/sources/mapping"
          hiddenFields={{
            companyCode,
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

        {candidateImportSummary ? (
          <section className="mt-5 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-sm leading-6 text-emerald-100">
            <p className="font-black">원본 행을 검토 후보로 만들었습니다.</p>
            <p className="mt-2">관리자가 검토·수정한 뒤 다음 단계로 진행합니다.</p>
            <ul className="mt-3 space-y-1 text-emerald-50">
              <li>생성 건수: {candidateImportSummary.inserted}건</li>
              <li>기존 중복 건수: {candidateImportSummary.duplicate}건</li>
              <li>제외 건수(위험요인 누락): {candidateImportSummary.invalid}건</li>
            </ul>
            <Link
              href={candidatesReviewHref}
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              후보 검토함으로 이동
            </Link>
          </section>
        ) : null}

        {canCreateCandidates ? (
          <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="text-sm font-black text-white">검토 후보 만들기</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              확정된 열 매핑을 기준으로 원본 데이터 행을 읽어 기존 후보 검토함에 검토 대기 상태로
              추가합니다. 이 작업은 위험성평가를 확정하거나 공유본을 생성하지 않습니다.
            </p>
            <form action="/api/owner/risk-share/sources/candidates" method="post" className="mt-4">
              <input type="hidden" name="companyCode" value={companyCode} />
              <input type="hidden" name="sourceId" value={sourceId} />
              <input type="hidden" name="sheetIndex" value={String(selectedSheetIndex)} />
              <input type="hidden" name="headerRowIndex" value={String(headerRowIndex)} />
              <button
                type="submit"
                className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-500/20"
              >
                검토 후보 만들기
              </button>
            </form>
          </section>
        ) : null}
      </section>
    </main>
  );
}
