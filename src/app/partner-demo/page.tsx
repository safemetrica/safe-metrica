import type { Metadata } from "next";
import Link from "next/link";
import PartnerDemoResetButton from "./PartnerDemoResetButton";

export const metadata: Metadata = {
  title: "SafeMetrica Partner Demo",
  description: "모바일 우선 역할 선택형 산업안전 운영 흐름 샘플 체험판입니다.",
};

const roleCards = [
  {
    title: "근로자 체험",
    time: "1분",
    description: "현장에서 TBM을 확인하고 위험제보를 남깁니다.",
    flow: "TBM 참여 → 공유확인 완료 → 위험제보",
    href: "/partner-demo/worker",
    accent: "from-emerald-500/25 to-teal-500/10",
    border: "border-emerald-400/40",
    text: "text-emerald-200",
    button: "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 shadow-emerald-950/40",
  },
  {
    title: "현장관리자 체험",
    time: "1분 30초",
    description: "근로자 체험 기록을 받아 조치 흐름까지 확인합니다.",
    flow: "TBM 개시 → 참여확인 → 조치사진 → 현장비서",
    href: "/partner-demo/manager",
    accent: "from-blue-500/25 to-cyan-500/10",
    border: "border-blue-400/40",
    text: "text-blue-200",
    button: "bg-blue-500 hover:bg-blue-400 active:bg-blue-600 shadow-blue-950/40",
  },
  {
    title: "대표 체험",
    time: "1분",
    description: "현장 기록이 대시보드와 월간보고서로 이어지는 모습을 봅니다.",
    flow: "대시보드 → 위험성평가표 → 월간보고서",
    href: "/partner-demo/ceo",
    accent: "from-amber-500/25 to-orange-500/10",
    border: "border-amber-400/40",
    text: "text-amber-200",
    button: "bg-amber-500 text-slate-950 hover:bg-amber-400 active:bg-amber-600 shadow-amber-950/40",
  },
];

export default function PartnerDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-8">
        <section className="overflow-hidden rounded-[2rem] border border-blue-500/30 bg-slate-900 shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600/25 via-slate-900 to-cyan-500/10 p-5">
            <p className="text-sm font-black text-blue-300">SafeMetrica</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">산업안전 운영 흐름 시뮬레이터</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 text-xs font-black text-cyan-200">파트너 체험판</span>
              <span className="rounded-full border border-amber-400/30 bg-amber-950/40 px-3 py-1 text-xs font-black text-amber-100">샘플 데이터</span>
            </div>
            <p className="mt-4 text-base font-bold leading-7 text-slate-100">
              근로자 → 현장관리자 → 대표 → 월간보고서까지 이어지는 운영 흐름을 브라우저 상태 안에서 체험합니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-bold text-slate-400">총 체험시간</p>
                <p className="mt-1 text-xl font-black text-white">약 3분</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-bold text-slate-400">저장 방식</p>
                <p className="mt-1 text-xl font-black text-white">샘플 데이터</p>
              </div>
            </div>
            <PartnerDemoResetButton />
          </div>
        </section>

        <section className="mt-5 space-y-4">
          {roleCards.map((role, index) => (
            <article key={role.title} className={`rounded-[1.75rem] border ${role.border} bg-slate-900 p-4 shadow-lg`}>
              <div className={`rounded-[1.4rem] bg-gradient-to-br ${role.accent} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950/80 text-base font-black text-white">
                    {index + 1}
                  </span>
                  <span className={`rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black ${role.text}`}>{role.time}</span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">{role.title}</h2>
                <p className="mt-2 text-base font-bold leading-7 text-slate-100">{role.description}</p>
                <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm font-bold leading-6 text-slate-200">{role.flow}</p>
              </div>
              <Link href={role.href} className={`mt-4 flex min-h-14 items-center justify-center rounded-2xl px-5 py-4 text-base font-black shadow-lg transition-all duration-150 active:scale-[0.98] active:translate-y-0.5 ${role.button}`}>
                체험 시작하기
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900/80 p-4">
          <details>
            <summary className="cursor-pointer text-sm font-black text-slate-200">보조 샘플 화면 보기</summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link href="/partner-demo/tbm" className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm font-black text-blue-200 transition-all active:scale-95">음성 TBM</Link>
              <Link href="/partner-demo/field-participation" className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm font-black text-emerald-200 transition-all active:scale-95">현장참여 4단계</Link>
            </div>
          </details>
        </section>

        <p className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
          체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
        </p>
      </div>
    </main>
  );
}
