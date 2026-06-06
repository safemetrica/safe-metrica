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
    subtitle: "현장에서 매일 하는 안전활동",
    flow: "TBM 참여 → 공유확인 서명 → 위험제보",
    href: "/partner-demo/worker",
    icon: "worker",
    time: "1분",
    accentClass: "border-teal-300/20 bg-teal-400/10 text-teal-200",
  },
  {
    title: "현장관리자 체험",
    subtitle: "현장 운영기록을 한눈에 관리",
    flow: "TBM 개시 → 참여확인 → 조치사진 → 현장비서",
    href: "/partner-demo/manager",
    icon: "manager",
    time: "1분 30초",
    accentClass: "border-sky-300/20 bg-sky-400/10 text-sky-200",
  },
  {
    title: "대표 체험",
    subtitle: "전체 현장 운영현황 한눈에",
    flow: "대시보드 → 위험성평가표 → 월간보고서",
    href: "/partner-demo/ceo",
    icon: "ceo",
    time: "1분",
    accentClass: "border-violet-300/20 bg-violet-400/10 text-violet-200",
  },
] as const;

type RoleIconProps = {
  role: (typeof roleCards)[number]["icon"];
};

function RoleIcon({ role }: RoleIconProps) {
  if (role === "worker") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V8a5 5 0 0 1 10 0v2M5 10h14l-1 10H6L5 10Z" />
        <path strokeLinecap="round" d="M9 7h6" />
      </svg>
    );
  }

  if (role === "manager") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5.5h8M9 3h6v5H9V3Zm-3 3h12a2 2 0 0 1 2 2v12H4V8a2 2 0 0 1 2-2Z" />
        <path strokeLinecap="round" d="m8 13 2 2 5-5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 6 5-3 5 4 6-4" />
    </svg>
  );
}

export default function PartnerDemoPage() {
  return (
    <main className="min-h-screen bg-[#06111f] px-5 py-7 text-white sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[430px] flex-col">
        <header>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-teal-200 shadow-lg shadow-black/20">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-5" />
              </svg>
            </div>
            <div>
              <p className="text-base font-extrabold tracking-tight text-white">SafeMetrica</p>
              <p className="mt-0.5 text-[0.7rem] font-medium tracking-wide text-slate-400">산업안전 운영기록 SaaS</p>
            </div>
          </div>

          <div className="mt-10">
            <h1 className="text-[2.25rem] font-black leading-none tracking-[-0.045em] text-white">파트너 체험판</h1>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-300">
              역할별로 SafeMetrica의 핵심 기능을 직접 체험해보세요.
              <br />
              <strong className="font-extrabold text-teal-300">3분이면 충분합니다.</strong>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="체험판 정보">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-semibold text-slate-300">
              총 체험시간 약 3분
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-semibold text-slate-300">
              샘플 데이터
            </span>
          </div>
        </header>

        <section className="mt-9" aria-labelledby="role-selection-title">
          <p id="role-selection-title" className="mb-3 text-xs font-bold tracking-wide text-slate-400">
            역할을 선택하세요
          </p>

          <div className="space-y-3">
            {roleCards.map((role) => (
              <Link
                key={role.title}
                href={role.href}
                className="group flex items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.045] p-3.5 shadow-lg shadow-black/10 outline-none transition-all duration-300 hover:scale-[1.02] hover:border-white/15 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-teal-300/70 active:scale-[0.98]"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${role.accentClass}`}>
                  <RoleIcon role={role.icon} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[0.95rem] font-extrabold tracking-tight text-white">{role.title}</span>
                    <span className="rounded-full bg-slate-950/50 px-2 py-0.5 text-[0.62rem] font-bold text-slate-400 ring-1 ring-white/[0.08]">
                      {role.time}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-300">{role.subtitle}</span>
                  <span className="mt-1 block text-[0.68rem] leading-4 text-slate-500">{role.flow}</span>
                </span>

                <svg
                  viewBox="0 0 20 20"
                  className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 4 6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-auto pt-10 text-center">
          <p className="text-[0.68rem] font-medium leading-5 text-slate-500">
            본 체험판은 샘플 데이터로 구성되어 있으며,
            <br />
            실제 고객 데이터와 연결되지 않습니다.
          </p>
          <PartnerDemoResetButton />
        </footer>
      </div>
    </main>
  );
}
