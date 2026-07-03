import Link from "next/link";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";
import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  RISK_SHARE_LANGUAGES_SOON,
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#EEF4F8] px-2.5 py-3 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-md flex-col justify-center">
        {children}
      </section>
    </main>
  );
}

function NoticeCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-5 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.68rem] font-black tracking-tight text-white/90">
          SafeMetrica
        </div>
        <h1 className="mt-4 text-xl font-black leading-tight tracking-tight">{title}</h1>
      </div>
      <div className="p-3">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm font-bold leading-6 text-amber-950">
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

function LangBar({ companyCode, activeLocale }: { companyCode: string; activeLocale: RiskShareLocale }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span aria-hidden="true" className="text-sm">🌐</span>
      {RISK_SHARE_LANGUAGE_OPTIONS.map((language) => (
        <Link
          key={language.code}
          href={buildHref("/risk-share/field", companyCode, language.code)}
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
            language.code === activeLocale
              ? "bg-white text-[#0B5EA8]"
              : "border border-white/25 bg-white/5 text-white/70"
          }`}
        >
          {language.label}
        </Link>
      ))}
      {RISK_SHARE_LANGUAGES_SOON.map((language) => (
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

function Trail({ steps }: { steps: string[] }) {
  return (
    <div aria-label="기록 흐름" className="flex items-stretch gap-1 px-3 pt-3">
      {steps.map((step, index) => (
        <span
          key={step}
          className={`flex flex-1 items-center justify-center rounded-lg px-1.5 py-1.5 text-center text-[0.62rem] font-black leading-4 ${
            index === 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {step}
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
  const locale = getRiskShareLocale(params.lang);
  const copy = getRiskShareCopy(locale).field;
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
        <NoticeCard title={copy.qrCheckingTitle}>{copy.noCodeBody}</NoticeCard>
      </PageShell>
    );
  }

  if (!isRiskShareCustomer) {
    return (
      <PageShell>
        <NoticeCard title={copy.qrCheckingTitle}>{copy.notRegisteredBody}</NoticeCard>
      </PageShell>
    );
  }

  const currentMonth = getCurrentMonthKst();

  const activities = [
    {
      kind: "share" as const,
      title: copy.shareTitle,
      badge: copy.shareBadge,
      description: copy.shareDescription,
      followUp: copy.shareFollowUp,
      href: `${buildHref("/risk-share/participation", companyCode, locale)}&mode=monthly`,
      cta: copy.shareCta,
      accent: "from-blue-600 to-blue-500",
      ring: "ring-blue-100",
    },
    {
      kind: "prework" as const,
      title: copy.preworkTitle,
      badge: copy.preworkBadge,
      description: copy.preworkDescription,
      followUp: copy.preworkFollowUp,
      href: `${buildHref("/risk-share/participation", companyCode, locale)}&mode=prework`,
      cta: copy.preworkCta,
      accent: "from-emerald-600 to-emerald-500",
      ring: "ring-emerald-100",
    },
    {
      kind: "anonymous" as const,
      title: copy.anonTitle,
      badge: copy.anonBadge,
      description: copy.anonDescription,
      followUp: copy.anonFollowUp,
      href: buildHref("/risk-share/anonymous", companyCode, locale),
      cta: copy.anonCta,
      accent: "from-amber-500 to-amber-400",
      ring: "ring-amber-100",
    },
  ];

  return (
    <PageShell>
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
        <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[0.66rem] font-black tracking-tight text-white/90">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[0.6rem] font-black text-[#0B5EA8]">
                {companyMark}
              </span>
              {companyLabel}
            </span>
            <span className="text-[0.66rem] font-black tracking-tight text-white/70">
              SafeMetrica
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight">
            {copy.heroTitle}
          </h1>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-white/85">
            {copy.heroSub}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.64rem] font-black text-white/90">
            <i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {copy.periodLabel(currentMonth)}
          </span>

          <div className="mt-3 border-t border-white/15 pt-3">
            <LangBar companyCode={companyCode} activeLocale={locale} />
          </div>
        </div>

        <Trail steps={copy.trail} />

        <div className="space-y-2 p-3">
          <div className="relative space-y-2">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-6 left-[1.65rem] w-px bg-slate-200"
            />

            {activities.map((activity) => (
              <Link
                key={activity.title}
                href={activity.href}
                className="group relative flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${activity.accent}`}
                >
                  <ActivityIcon kind={activity.kind} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-black leading-5 text-slate-950">
                      {activity.title}
                    </h2>
                    <span className={`shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[0.62rem] font-black text-slate-600 ring-1 ${activity.ring}`}>
                      {activity.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                    {activity.description}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] font-bold leading-4 text-slate-400">
                    {activity.followUp}
                  </p>

                  <div className="mt-2 inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition group-hover:bg-slate-800">
                    {activity.cta}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-[0.62rem] font-black uppercase tracking-wide text-blue-700">
              {copy.recordNoteLabel}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-blue-950">
              {copy.recordNoteBody}
            </p>
          </div>

          <p className="text-center text-[0.68rem] font-bold leading-5 text-slate-500">
            {copy.helpline}
          </p>

          <Link
            href={buildHref("/risk-share/visitor", companyCode, locale)}
            className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xs font-black leading-5 text-slate-700">
                {copy.visitorTitle}
              </h2>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-black text-slate-500 ring-1 ring-slate-200">
                {copy.visitorBadge}
              </span>
            </div>
            <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-slate-600">
              {copy.visitorDescription}
            </p>
          </Link>

          <Link
            href={buildHref("/risk-share/representative", companyCode, locale)}
            className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xs font-black leading-5 text-slate-700">
                {copy.repTitle}
              </h2>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.62rem] font-black text-slate-500 ring-1 ring-slate-200">
                {copy.repBadge}
              </span>
            </div>
            <p className="mt-1 text-[0.68rem] font-semibold leading-4 text-slate-600">
              {copy.repDescription}
            </p>
          </Link>
        </div>
      </div>

      <p className="mt-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[0.68rem] font-bold leading-4 text-slate-500 shadow-sm">
        {copy.footerDisclaimer}
      </p>
    </PageShell>
  );
}
