import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "현장참여 4단계 샘플 | SafeMetrica Partner Demo",
  description: "파트너 교육용 정적 현장참여 4단계 샘플 화면입니다.",
};

const steps = [
  {
    title: "위험 확인",
    description: "오늘 작업 전 핵심 위험요인 확인",
  },
  {
    title: "주지 확인",
    description: "안전조치와 보호구 착용 기준 확인",
  },
  {
    title: "의견 제출",
    description: "위험제보, 아차사고, 개선제안 입력",
  },
  {
    title: "완료",
    description: "공유확인 기록이 운영기록으로 남는 구조",
  },
];

const submissionTypes = [
  { label: "위험제보", value: "지게차 통로에 적재물 방치" },
  { label: "아차사고", value: "후진 지게차와 보행자 근접" },
  { label: "개선제안", value: "충전구역 표시 필요" },
  { label: "칭찬", value: "작업 전 안전확인 우수" },
];

export default function PartnerDemoFieldParticipationPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/partner-demo" className="text-sm font-black text-blue-300 hover:text-blue-200">
          ← Partner Demo로 돌아가기
        </Link>

        <section className="mt-5 overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-900 shadow-2xl">
          <div className="bg-gradient-to-br from-emerald-600/25 via-slate-900 to-teal-500/10 p-6 md:p-8">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-950/30 px-3 py-1 text-xs font-black text-emerald-200">
              정적 샘플 화면
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
              현장참여 4단계 샘플
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base md:leading-7">
              근로자가 오늘 위험요인과 안전조치를 확인하고 의견을 남기는 흐름을 샘플로 확인합니다.
            </p>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-300">Participation Flow</p>
              <h2 className="mt-1 text-2xl font-black text-white">4단계 카드</h2>
            </div>
            <p className="text-xs leading-5 text-slate-400">실제 제출 없이 흐름만 설명하는 샘플입니다.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-sm font-black text-emerald-200">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-xl font-black text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <p className="text-sm font-black text-blue-300">샘플 제출유형</p>
          <h2 className="mt-1 text-2xl font-black text-white">현장 의견 카드</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {submissionTypes.map((type) => (
              <article key={type.label} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
                <p className="text-xs font-black text-slate-400">{type.label}</p>
                <p className="mt-2 text-lg font-black leading-7 text-white">{type.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <p className="text-sm leading-6 text-amber-100">
            이 화면은 정적 샘플입니다. 실제 제출, 실제 고객 DB 저장, 실제 근로자 정보 입력은 발생하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
