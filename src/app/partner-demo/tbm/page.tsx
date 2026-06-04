import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "음성 TBM 샘플 | SafeMetrica Partner Demo",
  description: "파트너 교육용 정적 음성 TBM 샘플 화면입니다.",
};

const badges = ["샘플 화면", "실제 저장 없음", "고객 데이터 미사용"];

const riskFactors = [
  "지게차 후진 중 보행자 충돌",
  "적재물 낙하",
  "창고 통로 장애물",
  "폭염 시 온열질환",
];

const evidenceCards = [
  "참석·서명 사진",
  "작업 전 현장 사진",
  "작업 중 사진",
  "특이사항·조치 사진",
];

const tbmContent =
  "오늘 작업은 창고 입출고 및 지게차 상하차 작업입니다. 지게차 후진 시 보행자 충돌 위험이 있으므로 후진 전 주변 확인, 경광등 작동 확인, 작업반경 내 보행자 접근 통제를 실시합니다. 적재물 낙하 방지를 위해 파렛트 적재상태를 확인하고, 작업 중 이상 상황은 즉시 현장관리자에게 공유합니다.";

export default function PartnerDemoTbmPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/partner-demo" className="text-sm font-black text-blue-300 hover:text-blue-200">
          ← Partner Demo로 돌아가기
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-blue-500/30 bg-slate-900 shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600/25 via-slate-900 to-cyan-500/10 p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-cyan-400/30 bg-cyan-950/30 px-3 py-1 text-xs font-black text-cyan-200"
                >
                  {badge}
                </span>
              ))}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">음성 TBM 샘플</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base md:leading-7">
              말로 작업 내용을 남기고, 수정 후 저장하는 TBM 흐름을 샘플로 확인합니다.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-400">샘플 사업장</p>
            <p className="mt-2 text-2xl font-black text-white">SafeMetrica 샘플 현장</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-400">샘플 작업유형</p>
            <p className="mt-2 text-2xl font-black text-white">지게차 상하차 / 창고 입출고</p>
          </article>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-blue-300">Sample Draft</p>
              <h2 className="mt-1 text-2xl font-black text-white">샘플 TBM 내용</h2>
            </div>
            <span className="rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-xs font-black text-slate-300">
              녹음 기능 없음
            </span>
          </div>
          <div className="mt-5 rounded-2xl border border-blue-500/20 bg-slate-950/70 p-5">
            <p className="text-sm leading-7 text-slate-200 md:text-base md:leading-8">{tbmContent}</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm font-black text-rose-300">핵심 위험요인</p>
            <div className="mt-4 grid gap-3">
              {riskFactors.map((risk, index) => (
                <div key={risk} className="flex gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-xs font-black text-rose-200">
                    {index + 1}
                  </span>
                  <p className="text-sm font-bold leading-6 text-slate-100">{risk}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm font-black text-emerald-300">사진증빙 4종 샘플</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {evidenceCards.map((evidence) => (
                <div key={evidence} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 text-xs font-black text-slate-400">
                    SAMPLE PHOTO
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-100">{evidence}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <p className="text-sm leading-6 text-amber-100">
            이 화면은 파트너 교육용 샘플입니다. 실제 저장, 실제 고객 DB 연결, 실제 근로자 정보는 포함하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
