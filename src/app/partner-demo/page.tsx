import type { Metadata } from "next";
import Link from "next/link";
import PartnerDemoResetButton from "./PartnerDemoResetButton";

export const metadata: Metadata = {
  title: "SafeMetrica Partner Demo",
  description: "모바일 우선 역할 선택형 산업안전 운영 흐름 샘플 체험판입니다.",
};

const roleCards = [
  {
    title: "근로자",
    subtitle: "TBM 확인과 위험제보",
    description: "현장에서 오늘의 공유사항을 확인하고 샘플 위험제보를 남깁니다.",
    href: "/partner-demo/worker",
    icon: "01",
    time: "약 1분",
    iconClass: "border-teal-300/30 bg-teal-400/15 text-teal-100 shadow-teal-950/40",
    titleClass: "text-teal-100",
    ctaClass: "bg-teal-400/15 text-teal-100 ring-teal-300/20",
  },
  {
    title: "현장관리자",
    subtitle: "참여확인과 조치기록",
    description: "근로자 기록을 이어받아 조치사진과 현장 브리핑을 확인합니다.",
    href: "/partner-demo/manager",
    icon: "02",
    time: "약 1분",
    iconClass: "border-blue-300/30 bg-blue-400/15 text-blue-100 shadow-blue-950/40",
    titleClass: "text-blue-100",
    ctaClass: "bg-blue-400/15 text-blue-100 ring-blue-300/20",
  },
  {
    title: "대표",
    subtitle: "대시보드와 월간보고서",
    description: "현장 운영기록이 의사결정 화면과 보고서로 이어지는 흐름을 봅니다.",
    href: "/partner-demo/ceo",
    icon: "03",
    time: "약 1분",
    iconClass: "border-amber-300/30 bg-amber-400/15 text-amber-100 shadow-amber-950/40",
    titleClass: "text-amber-100",
    ctaClass: "bg-amber-400/15 text-amber-100 ring-amber-300/20",
  },
];

export default function PartnerDemoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#12345f_0%,#071323_42%,#020617_100%)] px-4 py-6 text-white">
      <div className="mx-auto flex w-full max-w-[430px] flex-col pb-8">
        <header className="pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-lg font-black text-cyan-100 shadow-lg shadow-cyan-950/30">
              S
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-white">SafeMetrica</p>
              <p className="text-xs font-bold text-slate-400">산업안전 운영기록 SaaS</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-black text-cyan-200">파트너 체험판</p>
            <h1 className="mt-3 text-[2rem] font-black leading-tight tracking-[-0.04em] text-white">
              역할별로 SafeMetrica의 핵심 기능을 직접 체험해보세요.
            </h1>
            <p className="mt-3 text-lg font-extrabold text-slate-200">3분이면 충분합니다.</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
              총 체험시간 약 3분
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
              샘플 데이터
            </span>
          </div>
        </header>

        <section className="mt-7 space-y-3" aria-label="파트너 체험 역할 선택">
          {roleCards.map((role) => (
            <Link
              key={role.title}
              href={role.href}
              className="group block rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-3 shadow-xl shadow-slate-950/30 outline-none backdrop-blur transition-all duration-150 hover:border-white/20 hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-cyan-200/70 active:scale-[0.985] active:translate-y-0.5"
            >
              <article className="flex items-center gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] border text-sm font-black shadow-lg ${role.iconClass}`}
                  aria-hidden="true"
                >
                  {role.icon}
                </div>

                <div className="min-w-0 flex-1 py-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`text-lg font-black tracking-tight ${role.titleClass}`}>{role.title}</h2>
                    <span className="rounded-full bg-slate-950/50 px-2 py-0.5 text-[0.68rem] font-black text-slate-300 ring-1 ring-white/10">
                      {role.time}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold text-white">{role.subtitle}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{role.description}</p>
                  <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-black ring-1 ${role.ctaClass}`}>
                    체험 시작
                  </span>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950/50 text-xl font-black text-slate-300 ring-1 ring-white/10 transition-transform group-hover:translate-x-0.5">
                  ›
                </div>
              </article>
            </Link>
          ))}
        </section>

        <PartnerDemoResetButton />

        <section className="mt-5 rounded-[1.5rem] border border-slate-700/80 bg-slate-950/40 p-4">
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
