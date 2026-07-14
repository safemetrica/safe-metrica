import Link from "next/link";
import {
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import RiskSharePublicShell from "@/components/risk-share/public/RiskSharePublicShell";
import RiskSharePublicHeader from "@/components/risk-share/public/RiskSharePublicHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PATHNAME = "/risk-share/field";

type PageProps = {
  searchParams?: Promise<{
    company?: string;
    lang?: string;
  }>;
};

function normalizeCompanyCode(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function buildHref(path: string, companyCode: string, lang: RiskShareLocale) {
  return buildRiskShareLangHref(path, { company: companyCode }, lang);
}

function getCurrentMonthKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCMonth() + 1;
}

function NoticeShell({
  title,
  companyLabel,
  pathname,
  query,
  locale,
  languageLabel,
  languageSoonBadgeLabel,
  themeToggleLabel,
  children,
}: {
  title: string;
  companyLabel: string;
  pathname: string;
  query: Record<string, string | undefined>;
  locale: RiskShareLocale;
  languageLabel: string;
  languageSoonBadgeLabel: string;
  themeToggleLabel: string;
  children: React.ReactNode;
}) {
  return (
    <RiskSharePublicShell>
      <main className="rsx-pub-page px-4 py-5">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <div className="rsx-pub-card overflow-hidden rounded-[2rem]">
            <RiskSharePublicHeader
              variant="brand"
              companyLabel={companyLabel}
              pathname={pathname}
              query={query}
              activeLocale={locale}
              languageLabel={languageLabel}
              languageSoonBadgeLabel={languageSoonBadgeLabel}
              themeToggleLabel={themeToggleLabel}
              title={title}
            />
            <div className="p-4">
              <div className="rsx-pub-banner rsx-pub-banner--warning rounded-3xl px-5 py-5 leading-7">
                {children}
              </div>
            </div>
          </div>
        </section>
      </main>
    </RiskSharePublicShell>
  );
}

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9" />
    </svg>
  ),
  prework: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <path d="M9 2h6v4H9zM8 12l2.5 2.5L16 9" />
    </svg>
  ),
  anonymous: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  ),
};

const ACTIVITY_ICON_CLASS: Record<string, string> = {
  share: "bg-blue-100 text-blue-600",
  prework: "bg-emerald-100 text-emerald-600",
  anonymous: "bg-amber-100 text-amber-600",
};

const ACTIVITY_BADGE_CLASS: Record<string, string> = {
  share: "bg-blue-50 text-blue-700",
  prework: "bg-emerald-50 text-emerald-700",
  anonymous: "bg-amber-50 text-amber-700",
};

/**
 * Designer field.html's step trail merges "공유" + "확인·지금 단계" into a
 * single active step; kept locally (not in riskShareI18n.ts -- this was
 * already a page-local constant, not a shared i18n key) so the 4-segment
 * Trail semantics survive as 3 dot-steps matching the designer structure.
 */
const FIELD_TRAIL_STEPS: Record<RiskShareLocale, [string, string][]> = {
  ko: [
    ["공유확인", "지금 단계"],
    ["관리자", "검토"],
    ["월간 안전", "운영 요약"],
  ],
  en: [
    ["Confirm", "you are here"],
    ["Manager", "review"],
    ["Monthly safety", "summary"],
  ],
  vi: [
    ["Xác nhận", "bước hiện tại"],
    ["Quản lý", "xem xét"],
    ["Hồ sơ an toàn", "hằng tháng"],
  ],
};

export default async function RiskSharePublicFieldEntryPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(params.company);
  const locale = getRiskShareLocale(params.lang);
  const copy = getRiskShareCopy(locale).field;
  const common = getRiskShareCopy(locale).common;
  const tenantResolution = await resolveActiveRiskSharePublicTenant(params.company ?? "");
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const query = { company: companyCode };
  const noticeShellProps = {
    companyLabel,
    pathname: PATHNAME,
    query,
    locale,
    languageLabel: common.languageLabel,
    languageSoonBadgeLabel: common.languageSoonBadge,
    themeToggleLabel: common.themeToggleLabel,
  };

  if (!companyCode) {
    return (
      <NoticeShell title={copy.qrCheckingTitle} {...noticeShellProps}>
        {copy.noCodeBody}
      </NoticeShell>
    );
  }

  if (!tenantResolution.ok) {
    return (
      <NoticeShell title={copy.qrCheckingTitle} {...noticeShellProps}>
        {copy.notRegisteredBody}
      </NoticeShell>
    );
  }

  const currentMonth = getCurrentMonthKst();
  const trailSteps = FIELD_TRAIL_STEPS[locale] ?? FIELD_TRAIL_STEPS.ko;

  const activities = [
    {
      kind: "share",
      title: copy.shareTitle,
      badge: copy.shareBadge,
      description: copy.shareDescription,
      followUp: copy.shareFollowUp,
      href: `${buildHref("/risk-share/participation", companyCode, locale)}&mode=monthly`,
      cta: copy.shareCta,
    },
    {
      kind: "prework",
      title: copy.preworkTitle,
      badge: copy.preworkBadge,
      description: copy.preworkDescription,
      followUp: copy.preworkFollowUp,
      href: `${buildHref("/risk-share/participation", companyCode, locale)}&mode=prework`,
      cta: copy.preworkCta,
    },
    {
      kind: "anonymous",
      title: copy.anonTitle,
      badge: copy.anonBadge,
      description: copy.anonDescription,
      followUp: copy.anonFollowUp,
      href: buildHref("/risk-share/anonymous", companyCode, locale),
      cta: copy.anonCta,
    },
  ];

  return (
    <RiskSharePublicShell>
      <main className="rsx-pub-page px-3 py-4">
        <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
          <div className="rsx-pub-card overflow-hidden rounded-[1.75rem]">
            <RiskSharePublicHeader
              variant="brand"
              companyLabel={companyLabel}
              pathname={PATHNAME}
              query={query}
              activeLocale={locale}
              languageLabel={common.languageLabel}
              languageSoonBadgeLabel={common.languageSoonBadge}
              themeToggleLabel={common.themeToggleLabel}
              title={copy.heroTitle}
              description={copy.heroSub}
              badge={
                <span className="rsx-pub-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-black">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  {copy.periodLabel(currentMonth)}
                </span>
              }
            />

            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between px-1">
                {trailSteps.map((step, index) => (
                  <div key={step.join("-")} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                          index === 0 ? "rsx-pub-trail-dot--active" : "rsx-pub-trail-dot"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="rsx-pub-subtle text-[0.62rem] font-bold leading-tight">
                        {step[0]}
                        <br />
                        {step[1]}
                      </div>
                    </div>
                    {index < trailSteps.length - 1 ? (
                      <div className="rsx-pub-trail-line mx-1.5 h-px flex-1" aria-hidden="true" />
                    ) : null}
                  </div>
                ))}
              </div>

              {activities.map((activity) => (
                <Link
                  key={activity.kind}
                  href={activity.href}
                  className="rsx-pub-qcard block rounded-2xl p-3 transition-opacity active:opacity-80"
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ACTIVITY_ICON_CLASS[activity.kind]}`}>
                      {ACTIVITY_ICON[activity.kind]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="rsx-pub-label text-sm font-black">{activity.title}</b>
                      <p className="rsx-pub-muted mt-0.5 text-xs font-semibold leading-5">{activity.description}</p>
                      <p className="rsx-pub-subtle mt-0.5 text-[0.7rem] leading-5">{activity.followUp}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-black ${ACTIVITY_BADGE_CLASS[activity.kind]}`}>
                      {activity.badge}
                    </span>
                    <span className="rsx-pub-label inline-flex items-center gap-1 text-xs font-black">
                      {activity.cta}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}

              <div className="rsx-pub-chip flex items-start gap-2 rounded-2xl p-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span className="rsx-pub-muted text-xs font-semibold leading-5">
                  <b className="rsx-pub-label font-black">{copy.recordNoteLabel}</b> · {copy.recordNoteBody}
                </span>
              </div>

              <p className="rsx-pub-subtle text-center text-xs">{copy.helpline}</p>
            </div>

            <p className="rsx-pub-subtle border-t border-[color:var(--pub-card-border)] px-4 py-3 text-center text-[0.65rem] leading-5">
              {copy.fieldWorkerDisclaimer}
            </p>
          </div>
        </section>
      </main>
    </RiskSharePublicShell>
  );
}
