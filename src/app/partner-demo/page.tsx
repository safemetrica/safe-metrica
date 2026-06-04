import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SafeMetrica Partner Demo",
  description: "모바일 우선 역할 선택형 산업안전 운영 흐름 샘플 체험판입니다.",
};

const roleCards = [
  {
    title: "근로자 체험",
    time: "1분",
    description: "현장에서 매일 하는 안전활동",
    flow: "TBM 참여 → 공유확인 완료 → 위험제보",
    href: "/partner-demo/worker",
    accent: "from-emerald-500/25 to-teal-500/10",
    border: "border-emerald-400/40",
    text: "text-emerald-200",
  },
  {
    title: "현장관리자 체험",
    time: "1분 30초",
    description: "현장 운영기록을 한눈에 관리",
    flow: "TBM 개시 → 참여확인 → 조치사진 → 현장비서",
    href: "/partner-demo/manager",
    accent: "from-blue-500/25 to-cyan-500/10",
    border: "border-blue-400/40",
    text: "text-blue-200",
  },
  {
    title: "대표 체험",
    time: "1분",
    description: "전체 현장 운영현황 한눈에",
    flow: "대시보드 → 위험성평가표 → 월간보고서",
    href: "/partner-demo/ceo",
    accent: "from-amber-500/25 to-orange-500/10",
    border: "border-amber-400/40",
    text: "text-amber-200",
  },
];

const featureMenus = [
  { title: "음성 TBM", href: "/partner-demo/tbm", badge: "TBM" },
  { title: "현장참여 4단계", href: "/partner-demo/field-participation", badge: "참여" },
  { title: "현장비서", href: "/partner-demo/manager", badge: "관리" },
  { title: "대표 대시보드", href: "/partner-demo/ceo", badge: "요약" },
  { title: "위험성평가표 샘플", href: "/partner-demo/ceo", badge: "평가" },
  { title: "월간보고서 샘플", href: "/partner-demo/ceo", badge: "보고" },
];

export default function PartnerDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px]">
        <section className="overflow-hidden rounded-[2rem] border border-blue-500/30 bg-slate-900 shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600/25 via-slate-900 to-cyan-500/10 p-5">
            <p className="text-sm font-black text-blue-300">SafeMetrica</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">산업안전 운영기록 SaaS</h1>
            <div className="mt-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 text-xs font-black text-cyan-200">
              파트너 체험판
            </div>
            <p className="mt-4 text-base font-bold leading-7 text-slate-100">
              역할별로 SafeMetrica의 핵심 기능을 직접 체험해보세요.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">3분이면 충분합니다.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-bold text-slate-400">총 체험시간</p>
                <p className="mt-1 text-xl font-black text-white">약 3분</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-bold text-slate-400">데이터</p>
                <p className="mt-1 text-xl font-black text-white">샘플 데이터</p>
              </div>
            </div>
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
                  <span className={`rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black ${role.text}`}>
                    {role.time}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-white">{role.title}</h2>
                <p className="mt-2 text-base font-bold leading-7 text-slate-100">{role.description}</p>
                <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm font-bold leading-6 text-slate-200">
                  {role.flow}
                </p>
              </div>
              <Link
                href={role.href}
                className="mt-4 flex min-h-14 items-center justify-center rounded-2xl border border-blue-400/40 bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                체험 시작하기
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5">
          <div>
            <p className="text-sm font-black text-blue-300">SafeMetrica 기능 구성</p>
            <h2 className="mt-1 text-xl font-black text-white">보조 기능 샘플</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">기존 기능 샘플은 역할 체험 이후에도 확인할 수 있습니다.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {featureMenus.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4 transition hover:-translate-y-0.5 hover:border-cyan-400/60"
              >
                <span className="rounded-full border border-cyan-400/20 bg-cyan-950/30 px-2.5 py-1 text-[11px] font-black text-cyan-200">
                  {feature.badge}
                </span>
                <p className="mt-3 text-sm font-black leading-5 text-white">{feature.title}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-center">
          <p className="text-xs font-black text-amber-100">체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결</p>
        </section>
      </div>
    </main>
  );
}
