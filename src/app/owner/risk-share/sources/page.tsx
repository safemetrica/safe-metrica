import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import {
  listRiskShareSourcesForOwner,
  type RiskShareSourceRegistryEntry,
} from "@/lib/risk-share/riskShareSourceRegistry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "위험성평가 원본 등록 | SafeMetrica",
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

const actionErrorMessages: Record<string, string> = {
  invalid_company: "고객사 코드 형식을 확인해 주세요.",
  tenant_not_found: "등록된 고객사 코드를 찾을 수 없습니다.",
  tenant_not_eligible: "이 고객사는 현재 상태에서 원본 등록을 진행할 수 없습니다.",
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

export default async function RiskShareSourceIntakePage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const companyCode = getSingleSearchParam(params.companyCode) ?? "";
  const uploadStatus = getSingleSearchParam(params.upload) ?? "";
  const actionErrorCode = getSingleSearchParam(params.actionError) ?? "";

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  let registrySources: RiskShareSourceRegistryEntry[] = [];
  let registryLookupFailed = false;

  if (companyCode) {
    try {
      registrySources = await listRiskShareSourcesForOwner(companyCode);
    } catch {
      registryLookupFailed = true;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 내부 운영자 전용 화면입니다. 고객용 화면이 아니며, 원본 다운로드 기능은 이번
          단계에서 제공하지 않습니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              내부 운영 · 위험성평가 원본
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              위험성평가 원본 등록
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              고객사가 작성한 기존 위험성평가 원본을 안전하게 보관하고, 검토·열 매핑·공유항목 후보
              생성의 시작자료로 등록합니다.
            </p>
          </div>

          <Link
            href="/owner/tenant-onboarding/draft"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            고객코드 생성 준비로
          </Link>
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
                ? actionErrorMessages[actionErrorCode] ?? "요청을 처리하지 못했습니다."
                : uploadStatus === "duplicate"
                  ? "동일 파일이 이미 등록되어 있습니다."
                  : "원본이 등록되었습니다."}
            </p>
          </section>
        ) : null}

        <form
          action="/api/owner/risk-share/sources/upload"
          method="post"
          encType="multipart/form-data"
          className="mt-6 rounded-3xl border border-slate-800 bg-white p-6 text-slate-950"
        >
          <h2 className="text-xl font-black">원본 등록</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-800">고객사 코드</span>
              <input
                name="company_code"
                defaultValue={companyCode}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
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
            <p>
              AI는 추출·분류 후보를 제안할 수 있으나 관리자가 검토·확정하기 전에는 공유본에
              반영되지 않습니다.
            </p>
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

          <form
            method="get"
            action="/owner/risk-share/sources"
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="block flex-1">
              <span className="text-sm font-black text-slate-200">고객사 코드</span>
              <input
                name="companyCode"
                defaultValue={companyCode}
                placeholder="예: test-risk-pack-01"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
              />
            </label>

            <button
              type="submit"
              className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-500/20"
            >
              등록 원본 조회
            </button>
          </form>

          {!companyCode ? (
            <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              고객사 코드를 입력하거나 companyCode를 지정한 링크로 접속하면 등록된 원본 목록을 확인할 수 있습니다.
            </p>
          ) : registryLookupFailed ? (
            <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-100">
              원본 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          ) : registrySources.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-100">
              이 고객사로 등록된 원본이 없습니다.
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
                        {source.uploadedBy || "확인 필요"}
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

                  <div className="mt-3">
                    <a
                      href={`/owner/risk-share-activation/candidates/new?companyCode=${encodeURIComponent(companyCode)}&sourceId=${encodeURIComponent(source.id)}`}
                      className="inline-flex rounded-xl border border-cyan-400/40 px-4 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-500/10"
                    >
                      수동 후보 만들기
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
