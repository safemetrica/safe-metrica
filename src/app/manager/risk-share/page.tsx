import Link from "next/link";
import { redirect } from "next/navigation";

import { getCompanyConfig } from "@/lib/company";

export const dynamic = "force-dynamic";

const summaryCards = [
  {
    label: "이번 달 공유·참여 제출",
    value: "연동 준비",
    description: "근로자 공유확인, 의견 없음 제출, 위험제보 흐름을 이 화면에서 요약할 예정입니다.",
  },
  {
    label: "관리자 검토 필요",
    value: "연동 준비",
    description: "위험제보, 아차사고, 개선제안 중 검토가 필요한 항목을 분리해 표시할 예정입니다.",
  },
  {
    label: "근로자대표 참여확인",
    value: "연동 준비",
    description: "근로자대표 참여확인 제출과 보완 의견을 확인할 예정입니다.",
  },
  {
    label: "고객 전달 준비",
    value: "연동 준비",
    description: "월간 요약과 고객용 Export 준비 상태를 확인하는 영역입니다.",
  },
];

const actionCards = [
  {
    title: "근로자대표 참여확인 관리",
    description: "근로자대표 확인 링크 생성, 제출 현황, 폐기·만료 상태를 관리합니다.",
    href: "/manager/representative-confirmations",
    cta: "관리 화면 열기",
  },
  {
    title: "월간보고서 확인",
    description: "공유확인, 위험제보, 근로자대표 참여확인 기록을 월간 단위로 확인합니다.",
    href: "/monthly-report",
    cta: "월간보고서 보기",
  },
  {
    title: "현장 의견 접수함",
    description: "위험제보, 아차사고, 개선제안 등 검토가 필요한 현장 의견을 확인합니다.",
    href: "/field/voice",
    cta: "접수함 보기",
  },
];

function getCompanyDisplayName(company: { name?: string; companyName?: string; code: string }) {
  return company.name || company.companyName || company.code;
}

export default async function RiskSharePackManagerHomePage() {
  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  if (company.code === "mons") {
    redirect("/login?error=risk_share_pack_not_available");
  }

  const companyName = getCompanyDisplayName(company);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-300">SafeMetrica Risk Share Pack</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                Risk Share Pack 관리자 홈
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                위험성평가 공유 이후의 확인, 의견 제출, 근로자대표 참여확인,
                관리자 검토, 월간 요약, 고객 전달용 Export 흐름을 확인하는 전용 홈입니다.
              </p>
            </div>

            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
            >
              전체 홈으로 이동
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100">
              현재 업체: {companyName}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300">
              업체 코드: {company.code}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            이 화면은 운영기록 확인을 위한 관리자 화면입니다. 법적 판단, 조치완료 확정,
            면책 또는 처벌 회피를 보장하는 화면이 아닙니다. 최종 검토와 조치 판단은
            관리자와 사업주가 수행합니다.
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30"
            >
              <p className="text-sm font-semibold text-slate-400">{card.label}</p>
              <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {actionCards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30"
            >
              <div>
                <h2 className="text-lg font-bold text-white">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
              </div>

              <Link
                href={card.href}
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
