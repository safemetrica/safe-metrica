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
          SafeMetrica 위공팩
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

function LanguageAvailabilityRow() {
  const languages = [
    { label: "한국어", active: true },
    { label: "English", active: false },
    { label: "Tiếng Việt", active: false },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[0.65rem] font-black text-white/70">언어</span>
      {languages.map((language) => (
        <span
          key={language.label}
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
            language.active
              ? "bg-white text-[#0B5EA8]"
              : "border border-white/25 bg-white/5 text-white/60"
          }`}
        >
          {language.label}
          {!language.active ? " · 지원 예정" : ""}
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

  const activities = [
    {
      kind: "share" as const,
      title: "이번 달 위험성평가 공유확인",
      badge: "공유확인",
      description: "공유된 위험요인과 안전조치를 확인하고 근로자 확인 기록을 남깁니다.",
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
      description: "보호구, 동선, 적재·하역, 설비 주변 주의사항을 짧게 확인합니다.",
      followUp: "확인 기록은 관리자 검토를 거쳐 월간 운영요약에 반영됩니다.",
      href: `${buildHref("/risk-share/participation", companyCode)}&mode=prework`,
      cta: "작업 전 확인 시작",
      accent: "from-emerald-600 to-emerald-500",
      ring: "ring-emerald-100",
    },
    {
      kind: "anonymous" as const,
      title: "익명 의견·아차사고·개선제안",
      badge: "익명 제출",
      description: "이름과 확인서명 없이 현장 불편, 아차사고, 개선제안을 남깁니다.",
      followUp: "접수된 의견은 관리자 검토를 거쳐 안전운영 자료로 남습니다.",
      href: buildHref("/risk-share/anonymous", companyCode),
      cta: "익명 의견 제출",
      accent: "from-amber-500 to-amber-400",
      ring: "ring-amber-100",
    },
  ];

  return (
    <PageShell>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
            SafeMetrica 위공팩
          </div>

          <p className="mt-4 text-[0.68rem] font-black uppercase tracking-wide text-white/60">
            현장
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight">
            {companyLabel}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/85">
            로그인 없이 QR로 바로 참여합니다. 오늘 확인과 의견이 이번 달 안전운영 기록으로 쌓입니다.
          </p>

          <div className="mt-5 border-t border-white/15 pt-4">
            <LanguageAvailabilityRow />
          </div>
        </div>

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

          <div className="relative flex gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <circle cx="9" cy="8" r="2.6" stroke="currentColor" strokeWidth="2" />
                <path d="M4 19c0-2.9 2.3-5 5-5s5 2.1 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16.5 6.5v4M14.5 8.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-black leading-6 text-slate-700">
                  외부인 출입 안전확인
                </h2>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                  준비 중
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-600">
                방문자·납품·협력업체 확인은 별도 QR로 운영 예정입니다.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-[0.68rem] font-black uppercase tracking-wide text-white/50">
              접수 이후
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-white/90">
              관리자 검토
              <span className="mx-2 text-white/30">→</span>
              월간 운영요약
            </p>
            <p className="mt-2 text-xs font-semibold leading-6 text-white/60">
              현장 확인과 의견은 위험성평가가 서류로 끝나지 않고, 매달 갱신되는 안전운영 기록으로
              이어지도록 관리자 검토를 거쳐 정리됩니다.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-6 text-slate-500 shadow-sm">
        근로자와 외부인은 로그인 없이 QR로 참여합니다. 확인과 의견은 관리자 검토를 거쳐 월간
        안전운영 기록으로 남습니다.
      </p>
    </PageShell>
  );
}
