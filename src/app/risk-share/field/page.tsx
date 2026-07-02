import Link from "next/link";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string;
  }>;
};

function normalizeCompanyCode(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function buildHref(path: string, companyCode: string) {
  return `${path}?company=${encodeURIComponent(companyCode)}`;
}

function getCurrentMonthKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
        {children}
      </section>
    </main>
  );
}

function NoticeCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
          SafeMetrica
        </div>
        <h1 className="mt-5 text-2xl font-black leading-tight tracking-tight">
          현장 QR 확인 중
        </h1>
      </div>
      <div className="p-4">
        <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-sm font-bold leading-7 text-amber-950">
          {children}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: "share" | "prework" | "anonymous" }) {
  if (kind === "share") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M9 11.5 11 13.5 15.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12a8 8 0 1 1 3.2 6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "prework") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect x="6" y="4" width="12" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M9 9h6M9 12.5h6M9 16h3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function LangBar() {
  const primaryLanguages = ["한국어", "English", "Tiếng Việt"];
  const soonLanguages = ["中文", "ไทย", "Bahasa", "Русский"];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span aria-hidden="true" className="text-sm">🌐</span>
      {primaryLanguages.map((language, index) => (
        <span
          key={language}
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
            index === 0
              ? "bg-white text-[#0B5EA8]"
              : "border border-white/25 bg-white/5 text-white/70"
          }`}
        >
          {language}
        </span>
      ))}
      {soonLanguages.map((language) => (
        <span
          key={language}
          className="rounded-full border border-white/10 px-2 py-1 text-[0.6rem] font-bold text-white/35"
        >
          {language}
        </span>
      ))}
    </div>
  );
}

function Trail() {
  const steps = [
    { label: "공유", now: false },
    { label: "확인 — 지금 단계", now: true },
    { label: "관리자 검토", now: false },
    { label: "월간 안전운영 요약", now: false },
  ];

  return (
    <div aria-label="기록 흐름" className="flex items-stretch gap-1.5 px-4 pt-4">
      {steps.map((step) => (
        <span
          key={step.label}
          className={`flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-center text-[0.65rem] font-black leading-4 ${
            step.now ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {step.label}
        </span>
      ))}
    </div>
  );
}

export default async function RiskSharePublicFieldEntryPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(params.company);
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const companyMark = companyLabel.trim().charAt(0) || "현";
  const isRiskShareCustomer =
    tenant?.serviceMode === "risk_share_pack" ||
    tenant?.serviceMode === "full_safemetrica";

  if (!companyCode) {
    return (
      <PageShell>
        <NoticeCard>
          회사코드가 포함된 QR 링크가 필요합니다. 현장 담당자에게 새 QR 링크를 요청해 주세요.
        </NoticeCard>
      </PageShell>
    );
  }

  if (!isRiskShareCustomer) {
    return (
      <PageShell>
        <NoticeCard>
          이 QR 링크는 아직 사용할 수 없습니다. 현장 담당자에게 최신 QR 링크를 요청해 주세요.
        </NoticeCard>
      </PageShell>
    );
  }

  const currentMonth = getCurrentMonthKst();

  const activities = [
    {
      kind: "share" as const,
      title: "위험성평가 공유확인",
      badge: "공유확인",
      description: "이번 달 공유된 위험요인을 확인합니다. 약 3분.",
      followUp: "관리자 검토를 거쳐 다음 위험성평가 재검토 후보로 이어집니다.",
      href: `${buildHref("/risk-share/participation", companyCode)}&mode=monthly`,
      cta: "공유확인 시작",
      accent: "from-blue-600 to-blue-500",
      ring: "ring-blue-100",
    },
    {
      kind: "prework" as const,
      title: "작업 전 안전확인",
      badge: "작업 전 확인",
      description: "작업 전 주의사항을 확인합니다. 매일 1회.",
      followUp: "확인 기록은 관리자 검토를 거쳐 월간 안전운영 요약에 반영됩니다.",
      href: `${buildHref("/risk-share/participation", companyCode)}&mode=prework`,
      cta: "작업 전 확인 시작",
      accent: "from-emerald-600 to-emerald-500",
      ring: "ring-emerald-100",
    },
    {
      kind: "anonymous" as const,
      title: "익명 의견 · 아차사고 · 개선제안",
      badge: "이름 없이",
      description: "이름 없이 의견이나 위험신호를 남깁니다.",
      followUp: "접수된 의견은 관리자 검토를 거쳐 안전운영 자료로 남습니다.",
      href: buildHref("/risk-share/anonymous", companyCode),
      cta: "익명 의견함 열기",
      accent: "from-amber-500 to-amber-400",
      ring: "ring-amber-100",
    },
  ];

  return (
    <PageShell>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[0.6rem] font-black text-[#0B5EA8]">
                {companyMark}
              </span>
              {companyLabel}
            </span>
            <span className="text-[0.68rem] font-black tracking-tight text-white/70">
              SafeMetrica
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight">
            우리 작업장
            <br />
            안전 확인
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/85">
            QR로 들어오셨네요. 아래에서 할 일을 선택해 주세요.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[0.68rem] font-black text-white/90">
            <i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {currentMonth}월 위험성평가 공유확인 진행 중
          </span>

          <div className="mt-5 border-t border-white/15 pt-4">
            <LangBar />
          </div>
        </div>

        <Trail />

        <div className="space-y-3 p-4">
          <div className="relative space-y-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-8 left-[2.15rem] w-px bg-slate-200"
            />

            {activities.map((activity) => (
              <Link
                key={activity.title}
                href={activity.href}
                className="group relative flex gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${activity.accent}`}
                >
                  <ActivityIcon kind={activity.kind} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-black leading-6 text-slate-950">
                      {activity.title}
                    </h2>
                    <span className={`shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-[0.65rem] font-black text-slate-600 ring-1 ${activity.ring}`}>
                      {activity.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-600">
                    {activity.description}
                  </p>
                  <p className="mt-1.5 text-xs font-bold leading-5 text-slate-400">
                    {activity.followUp}
                  </p>

                  <div className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition group-hover:bg-slate-800">
                    {activity.cta}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-blue-700">
              기록
            </p>
            <p className="mt-1.5 text-sm font-bold leading-6 text-blue-950">
              여기서 남긴 확인과 의견은 우리 회사의 안전운영기록으로 정리되고, 관리자가 검토한
              뒤 월간 안전운영 요약에 반영됩니다.
            </p>
          </div>

          <details className="group rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-black leading-6 text-slate-700 marker:content-none">
              공유확인 화면 미리보기 — &ldquo;위험성평가 공유확인&rdquo;을 누르면
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs font-bold leading-5 text-slate-500">
                실제 위험요인 내용은 현장에 맞게 관리자가 등록한 항목으로 표시됩니다.
              </p>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <span className="text-[0.65rem] font-black text-blue-700">프레스 2라인</span>
                <h4 className="mt-1 text-sm font-black text-slate-950">금형 교체 중 끼임 위험</h4>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  금형 교체 작업 시 프레스 슬라이드 하강 구간에 손이 들어갈 수 있습니다.
                </p>
                <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-900">
                  안전수칙 · 전원 차단과 안전블록 설치 후 작업, 2인 1조 확인
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <span className="text-[0.65rem] font-black text-blue-700">자재 창고</span>
                <h4 className="mt-1 text-sm font-black text-slate-950">지게차·보행자 교차 구간</h4>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                  오전 입고 시간대 지게차 동선과 보행 통로가 겹칩니다.
                </p>
                <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-900">
                  안전수칙 · 보행 통로 준수, 지게차 접근 시 정지 후 눈맞춤 확인
                </p>
              </div>

              <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold leading-5 text-slate-700">
                <input type="checkbox" checked readOnly className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                위 위험요인과 안전수칙을 확인했습니다. (확인기록이 남습니다)
              </label>

              <div className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-sm font-black text-slate-600">
                확인하고 서명하기
              </div>
            </div>
          </details>

          <p className="text-center text-xs font-bold leading-6 text-slate-500">
            확인이 어려우면 현장 담당자에게 문의해 주세요.
          </p>

          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-black leading-6 text-slate-700">
                외부인 출입 전 안전 안내
              </h2>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                준비 중
              </span>
            </div>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600">
              방문·납품·협력업체 확인은 출입구의 별도 QR로 준비 중입니다. 지금은 현장 담당자에게
              안내를 요청해 주세요.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-6 text-slate-500 shadow-sm">
        근로자와 외부인은 로그인 없이 QR로 참여합니다. 확인과 의견은 관리자 검토를 거쳐 월간
        안전운영 요약으로 남습니다.
      </p>
    </PageShell>
  );
}
