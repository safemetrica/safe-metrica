import type { Metadata } from "next";
import Link from "next/link";
import PartnerDemoResetButton from "./PartnerDemoResetButton";

export const metadata: Metadata = {
  title: "SafeMetrica Partner Demo",
  description: "모바일 우선 역할 선택형 산업안전 운영 흐름 샘플 체험판입니다.",
};

const roleCards = [
  {
    icon: "👷",
    title: "근로자 체험",
    time: "1분",
    description: "현장에서 매일 하는 안전활동",
    flow: "TBM 참여 → 공유확인 완료 → 위험제보",
    href: "/partner-demo/worker",
    accent: "from-teal-400/25 via-emerald-500/10 to-slate-900",
    border: "border-teal-400/40",
    text: "text-teal-100",
    iconBg: "bg-teal-400 text-slate-950",
    cta: "text-teal-100",
  },
  {
    icon: "🛡️",
    title: "현장관리자 체험",
    time: "1분 30초",
    description: "현장 운영기록을 한눈에 관리",
    flow: "TBM 개시 → 참여확인 → 조치사진 → 현장비서",
    href: "/partner-demo/manager",
    accent: "from-blue-400/25 via-blue-500/10 to-slate-900",
    border: "border-blue-400/40",
    text: "text-blue-100",
    iconBg: "bg-blue-500 text-white",
    cta: "text-blue-100",
  },
  {
    icon: "📊",
    title: "대표 체험",
    time: "1분",
    description: "전체 현장 운영현황 한눈에",
    flow: "대시보드 → 위험성평가표 → 월간보고서",
    href: "/partner-demo/ceo",
    accent: "from-amber-300/30 via-amber-500/10 to-slate-900",
    border: "border-amber-400/40",
    text: "text-amber-100",
    iconBg: "bg-amber-400 text-slate-950",
    cta: "text-amber-100",
  },
];

export default function PartnerDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-8">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-teal-400 text-lg font-black text-white shadow-lg shadow-blue-950/50">S</span>
              <div>
                <p className="text-lg font-black leading-5 text-white">SafeMetrica</p>
                <p className="mt-1 text-xs font-bold text-slate-400">산업안전 운영기록 SaaS</p>
              </div>
            </div>
            <span className="rounded-full border border-teal-400/30 bg-teal-950/40 px-3 py-1 text-xs font-black text-teal-100">3분 체험</span>
          </div>

          <div className="mt-6">
            <h1 className="text-[2.35rem] font-black leading-none tracking-tight">파트너 체험판</h1>
            <p className="mt-4 text-base font-bold leading-7 text-slate-200">역할별로 SafeMetrica의 핵심 기능을 직접 체험해보세요.</p>
            <p className="mt-2 text-sm font-black text-teal-200">3분이면 충분합니다.</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs font-bold text-slate-400">총 체험시간</p>
              <p className="mt-1 text-lg font-black text-white">약 3분</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs font-bold text-slate-400">데이터</p>
              <p className="mt-1 text-lg font-black text-white">샘플 데이터</p>
            </div>
          </div>
          <PartnerDemoResetButton />
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-black text-teal-300">ROLE EXPERIENCE</p>
              <h2 className="mt-1 text-xl font-black text-white">역할을 선택하세요</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-black text-slate-400">체험 중</span>
          </div>

          <div className="mt-4 space-y-3">
            {roleCards.map((role) => (
              <Link
                key={role.title}
                href={role.href}
                className={`group block rounded-[1.6rem] border ${role.border} bg-slate-900 p-3 shadow-xl shadow-slate-950/35 transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0.5`}
              >
                <div className={`rounded-[1.3rem] bg-gradient-to-br ${role.accent} p-4`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-lg ${role.iconBg}`}>{role.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-black text-white">{role.title}</h3>
                        <span className={`shrink-0 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-black ${role.text}`}>{role.time}</span>
                      </div>
                      <p className="mt-1 text-sm font-bold leading-5 text-slate-200">{role.description}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-lg text-slate-300 transition group-hover:translate-x-0.5">›</span>
                  </div>
                  <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs font-black leading-5 text-slate-200">{role.flow}</p>
                  <p className={`mt-3 text-right text-xs font-black ${role.cta}`}>체험 시작하기</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-[1.5rem] border border-slate-700/80 bg-slate-900/70 p-3">
          <details>
            <summary className="cursor-pointer px-1 text-xs font-black text-slate-400">보조 샘플 화면</summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/partner-demo/tbm" className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3 text-xs font-black text-blue-200 transition-all active:scale-95">음성 TBM</Link>
              <Link href="/partner-demo/field-participation" className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3 text-xs font-black text-emerald-200 transition-all active:scale-95">현장참여 4단계</Link>
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
