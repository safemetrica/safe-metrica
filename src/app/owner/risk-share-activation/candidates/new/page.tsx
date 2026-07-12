import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listRiskShareSourcesForOwner } from "@/lib/risk-share/riskShareSourceRegistry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const RECENT_SOURCE_DISPLAY_LIMIT = 6;

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

function cleanText(value: string, max = 160) {
  return value.trim().slice(0, max);
}

function formatDate(value?: string) {
  if (!value) return "일시 확인 필요";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16).replace("T", " ");
}

export default async function ManualRiskShareCandidateCreatePage({ searchParams }: PageProps) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readParam(params, "companyCode"));
  const companyName = cleanText(readParam(params, "companyName"), 120);
  const sourceId = cleanText(readParam(params, "sourceId"), 80);

  let recentSources: Awaited<ReturnType<typeof listRiskShareSourcesForOwner>> = [];
  let sourceLookupFailed = false;

  if (companyCode) {
    try {
      recentSources = (await listRiskShareSourcesForOwner(companyCode)).slice(
        0,
        RECENT_SOURCE_DISPLAY_LIMIT,
      );
    } catch {
      sourceLookupFailed = true;
    }
  }

  const error = readParam(params, "error");
  const errorMessage =
    error === "required_fields"
      ? "고객사 코드, sourceId, 작업명, 위험요인은 필수입니다. sourceId는 UUID 형식이어야 합니다."
      : error === "source_lookup_failed"
        ? "sourceId 확인 중 오류가 발생했습니다. Supabase 설정과 source 원장을 확인하세요."
        : error === "source_not_found"
          ? "해당 고객사 코드와 sourceId가 연결된 원본 source를 찾지 못했습니다."
          : error === "insert_failed"
            ? "후보 저장에 실패했습니다. 후보 원장 상태와 필수값을 확인하세요."
            : "";
  const created = readParam(params, "created") === "1";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href={`/owner/risk-share-activation/candidates?companyCode=${encodeURIComponent(companyCode)}&status=pending`}
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          >
            ← 추출 후보 검토함
          </Link>
          <Link href="/owner/risk-share-activation" className="text-sm font-bold text-slate-400 hover:text-slate-200">
            신규 고객 공유팩 활성화
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
          <h1 className="mt-2 text-3xl font-black">수동 후보 생성 v1</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            AI 추출 없이 Owner가 직접 위험요인 후보를 정리하는 입력 화면입니다.
            이번 v1은 UI 확인용이며, 실제 저장은 Supabase insert API와 audit 기준을 붙인 다음 활성화합니다.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50">
          <p className="font-black text-amber-100">무결성 기준</p>
          <p className="mt-1">
            sourceId가 없는 후보는 저장하지 않습니다. 저장 시 ai_generated=false,
            reviewer_status=pending, customer_confirmed=false로 기록하며, 고객 확인과 Version Lock 전에는
            근로자 공유 확정값으로 사용하지 않습니다.
          </p>
        </section>

        <section className="mt-5 rounded-3xl border border-cyan-500/25 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-300">최근 접수 source 선택</p>
              <h2 className="mt-1 text-xl font-black text-white">원본 파일에서 후보 만들기</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                UUID를 직접 입력하기보다, 최근 접수된 source를 선택해 후보를 만드는 흐름을 권장합니다.
              </p>
            </div>
            <Link
              href="/owner/risk-share-activation/source-intake"
              className="w-fit rounded-xl border border-cyan-400/40 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-500/10"
            >
              Source Intake
            </Link>
          </div>

          {!companyCode ? (
            <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
              고객사 코드를 입력하면 최근 source 목록을 확인할 수 있습니다.
            </p>
          ) : sourceLookupFailed ? (
            <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm font-bold text-rose-100">
              source 목록 조회에 실패했습니다. Supabase 설정과 risk_share_sources 원장을 확인하세요.
            </p>
          ) : recentSources.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">
              최근 접수된 source가 없습니다. 먼저 Source Intake에서 고객 원본 파일을 접수하세요.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recentSources.map((source) => (
                <Link
                  key={source.id}
                  href={`/owner/risk-share-activation/candidates/new?companyCode=${encodeURIComponent(companyCode)}&companyName=${encodeURIComponent(companyName)}&sourceId=${encodeURIComponent(source.id)}`}
                  className={`rounded-2xl border p-4 hover:border-cyan-400/60 ${
                    sourceId && source.id === sourceId
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-slate-700 bg-slate-950/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">
                        {source.sourceTitle || source.fileName || "제목 없는 source"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {source.fileName || "파일명 미표시"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                      선택
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                    <span>접수 {formatDate(source.uploadedAt ?? undefined)}</span>
                    <span>검토 {source.reviewStatus || "상태 없음"}</span>
                    <span>추출 {source.extractionStatus || "상태 없음"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {errorMessage ? (
          <section className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm font-bold text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        {created ? (
          <section className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
            pending 후보로 저장되었습니다. 후보 검토함에서 Owner 검토를 이어가세요.
          </section>
        ) : null}

        <form
          action="/api/owner/risk-share-candidates/create"
          method="post"
          className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-300">고객사 코드 *</span>
              <input
                name="companyCode"
                defaultValue={companyCode}
                placeholder="예: woogwang"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-300">고객명</span>
              <input
                name="companyName"
                defaultValue={companyName}
                placeholder="예: ㈜우광개발"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-black text-slate-300">sourceId *</span>
              <input
                name="sourceId"
                defaultValue={sourceId}
                placeholder="risk_share_sources.id UUID"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                위 최근 source 선택을 권장합니다. 필요한 경우에만 UUID를 직접 확인해 입력하세요.
              </span>
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-300">작업명 *</span>
              <input
                name="taskName"
                placeholder="예: 폐기물 상차 작업"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-300">사고유형</span>
              <input
                name="accidentType"
                placeholder="예: 협착·충돌"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-black text-slate-300">위험요인 *</span>
              <textarea
                name="hazard"
                rows={3}
                placeholder="예: 차량 후진, 적재함 주변 협착 위험"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-300">위험등급</span>
              <select
                name="riskLevel"
                defaultValue=""
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              >
                <option value="">확인 필요</option>
                <option value="상">상</option>
                <option value="중">중</option>
                <option value="하">하</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-300">분류</span>
              <select
                name="category"
                defaultValue="other"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              >
                <option value="common">공통 위험</option>
                <option value="non_common">비공통 위험</option>
                <option value="site_specific">현장 특이</option>
                <option value="worker_signal">근로자 신호</option>
                <option value="other">기타</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-black text-slate-300">근로자 공유 문구 후보</span>
              <textarea
                name="workerShareSummary"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
            >
              pending 후보 저장
            </button>
            <Link
              href={`/owner/risk-share-activation/candidates?companyCode=${encodeURIComponent(companyCode)}&status=pending`}
              className="rounded-xl border border-slate-600 px-5 py-3 text-sm font-black text-slate-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
