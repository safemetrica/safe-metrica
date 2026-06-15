import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CandidateRow = {
  id?: string;
  created_at?: string;
  source_id?: string;
  company_code?: string;
  company_name?: string;
  site_name?: string;
  task_name?: string;
  hazard?: string;
  accident_type?: string;
  risk_level?: string;
  current_controls?: string;
  improvement_plan?: string;
  worker_share_summary?: string;
  category?: string;
  source_page?: number;
  source_row?: string;
  confidence?: number;
  ai_generated?: boolean;
  reviewer_status?: string;
  reviewer_note?: string;
  worker_visible?: boolean;
  customer_confirmed?: boolean;
};

const REVIEWER_STATUS_LABELS: Record<string, string> = {
  pending: "검토 대기",
  accepted: "Owner 승인",
  edited: "수정 후 승인",
  excluded: "제외",
  needs_customer_check: "고객 확인 필요",
};

const CATEGORY_LABELS: Record<string, string> = {
  common: "공통 위험",
  non_common: "비공통 위험",
  site_specific: "현장 특이",
  worker_signal: "근로자 신호",
  other: "기타",
};

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function cleanText(value: unknown, fallback = "확인 필요") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDate(value?: string) {
  if (!value) return "일시 확인 필요";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16).replace("T", " ");
}

function getStatusClass(status: string) {
  if (status === "accepted") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  if (status === "edited") return "border-blue-400/40 bg-blue-400/10 text-blue-100";
  if (status === "excluded") return "border-slate-500/40 bg-slate-500/10 text-slate-200";
  if (status === "needs_customer_check") return "border-amber-400/40 bg-amber-400/10 text-amber-100";
  return "border-cyan-400/40 bg-cyan-400/10 text-cyan-100";
}

function getRiskLevelClass(level: string) {
  if (level.includes("상") || level.toLowerCase().includes("high")) {
    return "border-red-400/40 bg-red-500/10 text-red-100";
  }

  if (level.includes("중") || level.toLowerCase().includes("medium")) {
    return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  }

  if (level.includes("하") || level.toLowerCase().includes("low")) {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  }

  return "border-slate-600 bg-slate-950/60 text-slate-300";
}

function formatConfidence(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "신뢰도 미표시";
  }

  return `${Math.round(value * 100)}%`;
}

async function fetchCandidates(companyCode: string, status: string) {
  if (!companyCode) return [];

  const query = new URLSearchParams({
    select:
      "id,created_at,source_id,company_code,company_name,site_name,task_name,hazard,accident_type,risk_level,current_controls,improvement_plan,worker_share_summary,category,source_page,source_row,confidence,ai_generated,reviewer_status,reviewer_note,worker_visible,customer_confirmed",
    company_code: `eq.${companyCode}`,
    order: "created_at.desc",
    limit: "100",
  });

  if (status && status !== "all") {
    query.set("reviewer_status", `eq.${status}`);
  }

  return selectSupabaseExportRows<CandidateRow>("risk_share_item_candidates", query);
}

function buildStatusHref(companyCode: string, status: string) {
  const query = new URLSearchParams();
  if (companyCode) query.set("companyCode", companyCode);
  query.set("status", status);
  return `/owner/risk-share-activation/candidates?${query.toString()}`;
}

export default async function RiskShareCandidateReviewPage({ searchParams }: PageProps) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readParam(params, "companyCode"));
  const selectedStatus = readParam(params, "status") || "pending";

  let candidates: CandidateRow[] = [];
  let loadFailed = false;

  try {
    candidates = await fetchCandidates(companyCode, selectedStatus);
  } catch {
    loadFailed = true;
  }

  const statusCounts = candidates.reduce<Record<string, number>>((acc, candidate) => {
    const status = candidate.reviewer_status || "pending";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href="/owner/risk-share-activation"
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          >
            ← 신규 고객 공유팩 활성화
          </Link>
          <Link href="/owner" className="text-sm font-bold text-slate-400 hover:text-slate-200">
            Owner Console
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
              <h1 className="mt-2 text-3xl font-black">추출 후보 검토함 v1</h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
                고객 source 문서에서 추출된 위험요인 후보를 Owner가 검토하는 화면입니다.
                이 화면의 항목은 위험성평가 최종본이나 근로자 공유 확정본이 아니라, 검토 전 후보입니다.
              </p>
            </div>

            <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100">
              Owner only
            </span>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm font-black text-slate-300">고객사 코드</span>
              <input
                name="companyCode"
                defaultValue={companyCode}
                placeholder="예: woogwang"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 md:w-auto"
              >
                후보 조회
              </button>
              <Link
                href={`/owner/risk-share-activation/candidates/new?companyCode=${encodeURIComponent(companyCode)}`}
                className="w-full rounded-xl border border-cyan-400/40 px-5 py-3 text-center text-sm font-black text-cyan-100 hover:bg-cyan-500/10 md:w-auto"
              >
                수동 후보 추가
              </Link>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5">
          <p className="text-sm font-black text-amber-100">검토 원칙</p>
          <p className="mt-2 text-sm leading-6 text-amber-50">
            AI 또는 문서 추출 결과는 후보 제안입니다. Owner 검토, 고객 확인, Version Lock 전에는
            근로자 공유화면이나 고객 전달자료에 확정값으로 사용하지 않습니다.
          </p>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-5">
          {["pending", "needs_customer_check", "accepted", "edited", "excluded"].map((status) => (
            <Link
              key={status}
              href={buildStatusHref(companyCode, status)}
              className={`rounded-2xl border p-4 ${selectedStatus === status ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 bg-slate-900 hover:border-cyan-500/50"}`}
            >
              <p className="text-xs font-bold text-slate-400">{REVIEWER_STATUS_LABELS[status]}</p>
              <p className="mt-2 text-2xl font-black text-white">
                {selectedStatus === status ? candidates.length : statusCounts[status] ?? "-"}
              </p>
            </Link>
          ))}
        </section>

        {!companyCode ? (
          <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-black text-white">고객사 코드를 입력하세요</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              후보 검토는 고객사별로 분리합니다. 고객사 코드 입력 후 조회하면 Supabase 후보 원장에서
              검토 대기 항목을 확인합니다.
            </p>
          </section>
        ) : loadFailed ? (
          <section className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-400/10 p-6">
            <h2 className="text-xl font-black text-rose-100">후보 원장 조회 실패</h2>
            <p className="mt-3 text-sm leading-6 text-rose-50">
              Supabase 설정, Owner 권한, risk_share_item_candidates 테이블 상태를 확인해야 합니다.
            </p>
          </section>
        ) : candidates.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-black text-white">표시할 후보가 없습니다</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              현재 조건에 맞는 추출 후보가 없습니다. Source Intake 또는 수동 후보 생성 흐름을 먼저 확인하세요.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-4">
            {candidates.map((candidate) => {
              const status = candidate.reviewer_status || "pending";
              const category = candidate.category || "other";
              const riskLevel = cleanText(candidate.risk_level, "등급 확인 필요");

              return (
                <article
                  key={candidate.id}
                  className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClass(status)}`}>
                          {REVIEWER_STATUS_LABELS[status] ?? status}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskLevelClass(riskLevel)}`}>
                          위험등급 {riskLevel}
                        </span>
                        <span className="rounded-full border border-slate-600 bg-slate-950/70 px-3 py-1 text-xs font-black text-slate-300">
                          {CATEGORY_LABELS[category] ?? category}
                        </span>
                      </div>

                      <h2 className="mt-4 text-2xl font-black text-white">
                        {cleanText(candidate.task_name, "작업명 확인 필요")}
                      </h2>
                      <p className="mt-2 text-base font-bold text-cyan-100">
                        {cleanText(candidate.hazard, "위험요인 확인 필요")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs leading-5 text-slate-300 lg:min-w-64">
                      <p>생성일: {formatDate(candidate.created_at)}</p>
                      <p>신뢰도: {formatConfidence(candidate.confidence)}</p>
                      <p>Source: {candidate.source_page ? `${candidate.source_page}p` : "위치 미표시"} {candidate.source_row ? `/ ${candidate.source_row}` : ""}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                      <p className="text-xs font-black text-slate-400">사고유형</p>
                      <p className="mt-2 text-sm leading-6 text-white">
                        {cleanText(candidate.accident_type)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                      <p className="text-xs font-black text-slate-400">현재 관리대책</p>
                      <p className="mt-2 text-sm leading-6 text-white">
                        {cleanText(candidate.current_controls)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                      <p className="text-xs font-black text-slate-400">개선대책 후보</p>
                      <p className="mt-2 text-sm leading-6 text-white">
                        {cleanText(candidate.improvement_plan)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <p className="text-xs font-black text-cyan-100">근로자 공유 문구 후보</p>
                    <p className="mt-2 text-sm leading-6 text-cyan-50">
                      {cleanText(candidate.worker_share_summary, "근로자 공유 문구는 Owner 검토 후 작성합니다.")}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      승인 예정
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-blue-400/40 px-4 py-3 text-sm font-black text-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      수정 후 승인 예정
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-black text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      고객 확인 필요 예정
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-slate-500/40 px-4 py-3 text-sm font-black text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      제외 예정
                    </button>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    v1에서는 검토 UI만 제공합니다. 실제 상태 변경은 별도 status update API와 audit log 연결 후 활성화합니다.
                  </p>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
