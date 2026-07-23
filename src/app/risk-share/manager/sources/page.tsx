import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  listRiskShareSourcesForTenant,
  type RiskShareSourceRegistryEntry,
} from "@/lib/risk-share/riskShareSourceRegistry";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "위험성평가 원본 관리 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const uploadActionErrorMessages: Record<string, string> = {
  invalid_company: "고객사 코드 확인이 필요합니다.",
  tenant_not_found: "등록된 고객사 코드를 찾을 수 없습니다.",
  tenant_not_eligible: "현재 상태에서는 원본 등록을 진행할 수 없습니다.",
  invalid_input: "입력값을 다시 확인해 주세요.",
  site_required: "사업장명이 필요합니다.",
  file_required: "파일을 선택해 주세요.",
  file_empty: "빈 파일은 등록할 수 없습니다.",
  file_too_large: "파일은 4MB 이하만 등록할 수 있습니다.",
  unsupported_file_type: "이번 단계에서는 XLSX와 CSV만 등록할 수 있습니다.",
  invalid_file_content: "파일 내용을 확인할 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.",
  storage_not_configured: "원본 저장소 설정을 확인할 수 없습니다.",
  upload_failed: "파일 저장 중 오류가 발생했습니다.",
  source_insert_failed: "원본 메타데이터 저장에 실패했습니다.",
  access_denied: "이 회사의 원본 등록 권한이 확인되지 않았습니다.",
  site_scope_unavailable: "기본 사업장 설정이 일치하지 않아 원본 등록을 중단했습니다.",
};

const REGISTRY_STATUS_LABELS: Record<string, string> = {
  pending: "대기",
  processing: "처리 중",
  completed: "완료",
  failed: "확인 필요",
  unknown: "상태 확인 필요",
};

function formatRegistryStatusLabel(status: string) {
  return REGISTRY_STATUS_LABELS[status] ?? REGISTRY_STATUS_LABELS.unknown;
}

const REGISTRY_UPLOADED_BY_LABELS: Record<string, string> = {
  owner_console: "SafeMetrica 운영지원",
  tenant_admin: "고객사 관리자",
  tenant_manager: "현장 관리자",
};

function formatRegistryUploadedByLabel(uploadedBy: string | null) {
  if (!uploadedBy) return "등록 주체 확인 필요";
  return REGISTRY_UPLOADED_BY_LABELS[uploadedBy] ?? "등록 주체 확인 필요";
}

function formatRegistryFileSize(bytes: number | null) {
  if (bytes === null || bytes <= 0) return "크기 확인 필요";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRegistrySourceType(sourceType: string | null) {
  if (sourceType === "risk_assessment_xlsx") return "XLSX";
  if (sourceType === "risk_assessment_csv") return "CSV";
  return sourceType || "형식 확인 필요";
}

function formatRegistryUploadedAt(value: string | null) {
  if (!value) return "일시 확인 필요";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16).replace("T", " ");
}

export default async function RiskShareManagerSourcesPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const uploadStatus = readSearchParam(params.upload);
  const actionErrorCode = readSearchParam(params.actionError);

  const sourcesHref = buildRiskShareLangHref(
    "/risk-share/manager/sources",
    { company: rawCompanyCode },
    lang,
  );

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            원본 관리 화면을 열 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            등록된 고객사 코드가 필요합니다. 관리자 홈에서 다시 접속해 주세요.
          </p>
        </section>
      </main>
    );
  }

  const tenantCode = tenantResolution.tenant.code;
  const companyLabel = tenantResolution.tenant.name || tenantCode;
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: tenantCode }, lang);

  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(sourcesHref)}`);
    }

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            이 회사의 원본 관리 권한이 확인되지 않았습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            운영 담당자에게 문의해 주세요.
          </p>
        </section>
      </main>
    );
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            이 회사의 원본 관리 권한이 확인되지 않았습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            운영 담당자에게 문의해 주세요.
          </p>
        </section>
      </main>
    );
  }

  const siteScope = await resolveRiskShareCanonicalSiteScopeForTenant(
    selectedTenantCode,
    tenantResolution.tenant.defaultSiteId,
  ).catch(() => ({ ok: false as const }));

  if (!siteScope.ok) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            기본 사업장 설정을 확인할 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            원본 자료가 다른 사업장과 섞이지 않도록 조회와 등록을 중단했습니다. 운영 담당자에게 문의해 주세요.
          </p>
        </section>
      </main>
    );
  }

  let registrySources: RiskShareSourceRegistryEntry[] = [];
  let registryLookupFailed = false;

  try {
    registrySources = await listRiskShareSourcesForTenant(selectedTenantCode);
  } catch {
    registryLookupFailed = true;
  }

  const uploadActionUrl = buildRiskShareLangHref(
    "/api/risk-share/manager/sources/upload",
    { company: selectedTenantCode },
    lang,
  );

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          관리자 검토 전에는 근로자 공유화면에 반영되지 않습니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              {companyLabel}
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              위험성평가 원본 관리
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              우리 회사가 작성한 위험성평가 원본을 등록하고, 등록된 원본의 상태를 확인합니다.
            </p>
          </div>

          <a
            href={managerHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            관리자 홈으로
          </a>
        </div>

        {uploadStatus || actionErrorCode ? (
          <section
            className={[
              "mt-6 rounded-3xl border p-5",
              actionErrorCode
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
            ].join(" ")}
          >
            <p className="text-sm font-black">
              {actionErrorCode
                ? uploadActionErrorMessages[actionErrorCode] ?? "요청을 처리하지 못했습니다."
                : uploadStatus === "duplicate"
                  ? "동일 파일이 이미 등록되어 있습니다."
                  : "원본이 등록되었습니다."}
            </p>
          </section>
        ) : null}

        <form
          action={uploadActionUrl}
          method="post"
          encType="multipart/form-data"
          className="mt-6 rounded-3xl border border-slate-800 bg-white p-6 text-slate-950"
        >
          <h2 className="text-xl font-black">원본 등록</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-800">회사명</span>
              <input
                value={companyLabel}
                readOnly
                disabled
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-800">원본 제목</span>
              <input
                name="source_title"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-800">사업장명</span>
              <input
                name="site_name"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-800">기준일</span>
              <input
                name="source_document_date"
                type="date"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-black text-slate-800">파일 선택</span>
            <input
              name="source_file"
              type="file"
              accept=".xlsx,.csv"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
            />
          </label>

          <div className="mt-5 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p>이번 단계에서는 XLSX와 CSV만 등록할 수 있습니다.</p>
            <p>원본은 비공개 저장소에 보관합니다.</p>
            <p>등록만으로 근로자 화면에 공개되지 않습니다.</p>
            <p>파일에 주민등록번호, 건강정보, 계좌정보 등 불필요한 개인정보를 포함하지 마세요.</p>
          </div>

          <button
            type="submit"
            className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-emerald-300"
          >
            원본 등록
          </button>
        </form>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
          <h2 className="text-xl font-black text-white">등록 원본</h2>

          {registryLookupFailed ? (
            <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-100">
              원본 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          ) : registrySources.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-100">
              등록된 원본이 없습니다.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {registrySources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">
                        {source.sourceTitle || "제목 없는 원본"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {source.siteName || "사업장 미입력"} ·{" "}
                        {formatRegistrySourceType(source.sourceType)} ·{" "}
                        {source.fileName || "파일명 미표시"} · {formatRegistryFileSize(source.fileSize)}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        기준일 {source.sourceDocumentDate || "미입력"} · 등록{" "}
                        {formatRegistryUploadedAt(source.uploadedAt)} · 등록주체{" "}
                        {formatRegistryUploadedByLabel(source.uploadedBy)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-300">
                      <span className="rounded-full border border-slate-600 px-2.5 py-1">
                        원문 {formatRegistryStatusLabel(source.rawTextStatus)}
                      </span>
                      <span className="rounded-full border border-slate-600 px-2.5 py-1">
                        추출 {formatRegistryStatusLabel(source.extractionStatus)}
                      </span>
                      <span className="rounded-full border border-slate-600 px-2.5 py-1">
                        검토 {formatRegistryStatusLabel(source.reviewStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={buildRiskShareLangHref(
                        "/risk-share/manager/sources/preview",
                        { company: selectedTenantCode, sourceId: source.id, sheet: "0" },
                        lang,
                      )}
                      className="inline-flex rounded-xl border border-slate-600 px-4 py-2 text-xs font-black text-slate-200 hover:bg-slate-800"
                    >
                      열 미리보기
                    </a>
                    <a
                      href={buildRiskShareLangHref(
                        "/risk-share/manager/sources/preparation",
                        { company: selectedTenantCode, sourceId: source.id },
                        lang,
                      )}
                      className="inline-flex rounded-xl border border-slate-600 px-4 py-2 text-xs font-black text-slate-200 hover:bg-slate-800"
                    >
                      항목 준비 상태
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
