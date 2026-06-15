import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

function cleanText(value: string, max = 160) {
  return value.trim().slice(0, max);
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
            sourceId가 없는 후보는 저장하지 않습니다. 저장 API 연결 전까지는 이 화면에서 DB 변경이 발생하지 않습니다.
            실제 저장 시 ai_generated=false, reviewer_status=pending, customer_confirmed=false로 기록해야 합니다.
          </p>
        </section>

        <form className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
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
                고객 source 파일과 연결되는 UUID입니다. source 연결 없이 후보를 만들지 않습니다.
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
              type="button"
              disabled
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-black text-slate-300 opacity-70"
            >
              저장 API 연결 후 활성화
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
