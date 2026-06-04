import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SafeMetrica Partner Demo",
  description: "파트너 교육·영업 시연용 샘플 체험판입니다.",
};

const badges = ["샘플 데이터", "외부 공유 제한", "실제 고객정보 미사용"];

const demoMenus = [
  {
    title: "음성 TBM",
    description: "말로 TBM을 작성하고, 수정 후 저장하는 흐름을 확인합니다.",
    badge: "TBM",
    accent: "from-blue-500/25 to-cyan-500/10",
    href: "/partner-demo/tbm",
  },
  {
    title: "현장참여 4단계",
    description: "근로자가 오늘 위험요인과 안전조치를 확인하고 의견을 제출하는 흐름입니다.",
    badge: "참여",
    accent: "from-emerald-500/25 to-teal-500/10",
    href: "/partner-demo/field-participation",
  },
  {
    title: "현장비서",
    description: "현장관리자가 오늘 확인할 누락·주의사항을 보는 화면입니다.",
    badge: "관리",
    accent: "from-violet-500/25 to-blue-500/10",
  },
  {
    title: "대표 대시보드",
    description: "대표가 미조치·위험제보·운영현황을 요약 확인하는 화면입니다.",
    badge: "요약",
    accent: "from-amber-500/25 to-orange-500/10",
  },
  {
    title: "위험성평가표 출력지원 샘플",
    description: "위험요인, 개선대책, 조치상태를 출력용으로 확인하는 샘플입니다.",
    badge: "출력",
    accent: "from-rose-500/25 to-red-500/10",
  },
  {
    title: "월간보고서 샘플",
    description: "TBM, 현장참여, 증빙, 조치현황을 월간 운영기록으로 확인하는 샘플입니다.",
    badge: "보고",
    accent: "from-sky-500/25 to-indigo-500/10",
  },
];

const sampleStats = [
  { label: "시연 데이터", value: "Sample", detail: "정적 샘플 화면" },
  { label: "연결 범위", value: "0 DB", detail: "원본 DB 조회 없음" },
  { label: "공유 기준", value: "Limited", detail: "파트너 교육·영업 시연용" },
];

export default function PartnerDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl border border-blue-500/30 bg-slate-900 shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600/25 via-slate-900 to-cyan-500/10 p-6 md:p-8">
            <p className="text-sm font-black text-blue-300">Partner Demo v2</p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                  SafeMetrica Partner Demo
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base md:leading-7">
                  실제 고객 데이터가 아닌 샘플 데이터로 구성된 파트너 교육·영업 시연용 체험판입니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-cyan-400/30 bg-cyan-950/30 px-3 py-1 text-xs font-black text-cyan-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm font-black text-emerald-300">SafeMetrica 소개</p>
            <h2 className="mt-2 text-2xl font-black text-white">
              운영기록으로 연결되는 산업안전 SaaS
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
              SafeMetrica는 위험성평가, TBM, 현장참여, 조치사진, 월간보고서를 하나의 운영기록으로 연결하는 산업안전 운영기록 SaaS입니다.
            </p>
          </article>

          <aside className="grid gap-3 rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-3 lg:grid-cols-1">
            {sampleStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-bold text-slate-400">{stat.label}</p>
                <p className="mt-1 text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{stat.detail}</p>
              </div>
            ))}
          </aside>
        </section>

        <section className="mt-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-blue-300">Demo Flow</p>
              <h2 className="mt-1 text-2xl font-black text-white">체험판 메뉴</h2>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              v2에서는 실제 운영 경로와 실제 고객 company 파라미터를 연결하지 않습니다.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {demoMenus.map((menu, index) => (
              <article
                key={menu.title}
                className="group rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-blue-400/60"
              >
                <div className={`rounded-2xl bg-gradient-to-br ${menu.accent} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 text-sm font-black text-blue-200">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black text-slate-200">
                      {menu.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-black text-white">{menu.title}</h3>
                  <p className="mt-3 min-h-16 text-sm leading-6 text-slate-300">
                    {menu.description}
                  </p>
                </div>
                {menu.href ? (
                  <Link
                    href={menu.href}
                    className="mt-4 block w-full rounded-xl border border-blue-400/40 bg-blue-500 px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-400"
                  >
                    샘플 보기
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full cursor-not-allowed rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm font-black text-slate-400"
                  >
                    샘플 보기 준비중
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <p className="text-sm leading-6 text-amber-100">
            이 체험판은 파트너 교육 및 영업 시연 목적의 샘플 화면입니다. 실제 고객 데이터, 내부 관리자 화면, 원본 DB 구조는 포함하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
