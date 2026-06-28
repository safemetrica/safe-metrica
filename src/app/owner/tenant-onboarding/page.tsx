import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner Tenant Setup Checklist | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

const setupSteps = [
  {
    title: "1. 신규업체 기본정보 확인",
    description: "회사명, 고객사 코드, 기본 현장, 담당자 표시명, 서비스 범위를 확인합니다.",
    items: ["company_code", "company_name", "default_site_name", "contact_label", "service_mode"],
  },
  {
    title: "2. 사용 모듈 선택",
    description: "초기 계약 범위와 현장 운영 목적에 맞는 모듈만 먼저 엽니다.",
    items: ["worker_qr", "quick_feedback", "manager_inbox", "monthly_report", "owner_export"],
  },
  {
    title: "3. 역할 후보 정리",
    description: "고객사 내부 사용자에게 필요한 역할을 정리합니다. 실제 계정 연결은 후속 단계에서 진행합니다.",
    items: ["tenant_admin", "tenant_manager", "tenant_representative", "tenant_viewer"],
  },
  {
    title: "4. Field QR 발급 전 확인",
    description: "근로자·외부인 QR은 로그인 없이 사용할 수 있어야 하며, 익명 의견 flow는 실명 확인 flow와 분리합니다.",
    items: ["monthly_risk_share_confirmation", "daily_prework_safety_check", "anonymous_feedback", "visitor_safety_confirmation"],
  },
];

const guardrails = [
  "기존 고객 route와 Field QR 링크를 강제로 바꾸지 않습니다.",
  "신규업체 사용은 Owner 승인 후 고객사 단위로 엽니다.",
  "근로자·외부인 QR flow에는 로그인을 강제하지 않습니다.",
  "토큰, 비밀번호, 실제 인증키, 고객 민감정보는 입력하지 않습니다.",
  "법적 판단이나 조치 확정을 대신하는 화면으로 설명하지 않습니다.",
];

const nextCandidates = [
  {
    title: "신규업체 기본정보 입력 준비",
    description: "Owner가 신규업체 후보값을 검토하는 내부 입력 준비화면",
  },
  {
    title: "사용자 역할 연결 구조 후보",
    description: "사용자와 고객사 역할을 연결하기 위한 구조 후보 문서화",
  },
  {
    title: "신규 tenant pilot",
    description: "Richi 또는 Hyundai Hoist 중 하나를 신규 tenant 기준으로 시범 적용",
  },
];

export default function OwnerTenantOnboardingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 SafeMetrica Owner 내부 확인용 preview입니다. 검색 노출을 막기 위한
          noindex 기준을 적용했으며, 실제 고객자료·인증정보·비밀번호·토큰은 입력하지 않습니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              Owner Preview · Tenant Setup
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              신규업체 개설 준비화면
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Owner 승인형 신규업체 개설을 위한 내부 확인 화면입니다. 현재 화면은
              개설 전 체크리스트이며, 실제 인증·DB 쓰기·가입 자동화는 연결하지 않습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/owner/tenant-onboarding/draft"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              기본정보 입력 준비로
            </Link>
            <Link
              href="/owner"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
            >
              Owner 홈으로
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <p className="text-xs font-black text-blue-200">현재 단계</p>
            <p className="mt-2 text-2xl font-black">개설 준비</p>
            <p className="mt-2 text-sm leading-6 text-blue-100/75">
              내부 확인용 화면입니다. 실제 고객사 생성은 후속 작업입니다.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <p className="text-xs font-black text-emerald-200">QR 원칙</p>
            <p className="mt-2 text-2xl font-black">무로그인 유지</p>
            <p className="mt-2 text-sm leading-6 text-emerald-100/75">
              근로자·외부인 확인 flow는 고객사 기준 정보로 분리합니다.
            </p>
          </div>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-xs font-black text-amber-200">기존 고객</p>
            <p className="mt-2 text-2xl font-black">강제 전환 금지</p>
            <p className="mt-2 text-sm leading-6 text-amber-100/75">
              기존 route, 저장 흐름, QR 링크는 필요한 범위에서만 수정합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Owner Setup Flow
              </p>
              <h2 className="mt-2 text-xl font-black">체크리스트 확인 후 기본정보 입력 준비로 이동합니다.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                현재 단계는 저장 없는 preview입니다. 실제 tenant 생성과 DB 쓰기는 후속 작업에서 별도 검증 후 연결합니다.
              </p>
            </div>
            <Link
              href="/owner/tenant-onboarding/draft"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
            >
              신규업체 기본정보 입력 준비
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
          <section className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Owner 확인 단계</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  신규업체를 고객사 단위로 열기 전에 아래 순서로 확인합니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                1차 확인
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {setupSteps.map((step) => (
                <article key={step.title} className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="text-base font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {step.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-black">운영 가드레일</h2>
              <div className="mt-4 space-y-3">
                {guardrails.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-black">다음 구현 후보</h2>
              <div className="mt-4 space-y-3">
                {nextCandidates.map((candidate) => (
                  <div key={candidate.title} className="rounded-2xl bg-slate-800/70 p-4">
                    <p className="text-sm font-black text-white">{candidate.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{candidate.description}</p>
                    {candidate.title === "신규업체 기본정보 입력 준비" ? (
                      <Link
                        href="/owner/tenant-onboarding/draft"
                        className="mt-3 inline-flex text-xs font-black text-emerald-300 hover:text-emerald-200"
                      >
                        입력 준비화면 열기 →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 text-xs leading-6 text-slate-400">
          이 화면은 Owner 내부 운영용 preview입니다. 실제 고객자료, 토큰, 인증키, 비밀번호, 근로자 개인정보를 입력하지 않습니다.
        </div>
      </section>
    </main>
  );
}
