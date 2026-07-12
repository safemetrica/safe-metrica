import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 내부 운영자 전용 화면입니다. 고객용 화면이 아니며, 등록된 원본 목록이나 다운로드
          기능은 이번 단계에서 제공하지 않습니다.
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
      </section>
    </main>
  );
}
