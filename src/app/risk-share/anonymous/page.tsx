import type { Metadata } from "next";

import { buildRiskShareLangHref, getRiskShareCopy, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import RiskSharePublicShell from "@/components/risk-share/public/RiskSharePublicShell";
import RiskSharePublicHeader from "@/components/risk-share/public/RiskSharePublicHeader";
import RiskShareStatusBanner from "@/components/risk-share/public/RiskShareStatusBanner";
import RiskSharePrimaryButton from "@/components/risk-share/public/RiskSharePrimaryButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const PATHNAME = "/risk-share/anonymous";

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    lang?: string | string[];
    submitted?: string | string[];
    error?: string | string[];
  }>;
};

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

export default async function RiskShareAnonymousFeedbackPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const companyCode = normalizeCompanyCode(rawCompanyCode);
  const locale = getRiskShareLocale(readSearchParam(params.lang));
  const submitted = readSearchParam(params.submitted);
  const submissionError = readSearchParam(params.error);
  const copy = getRiskShareCopy(locale).anonymous;
  const common = getRiskShareCopy(locale).common;
  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const returnHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, locale);
  const query = { company: companyCode };

  if (!tenantResolution.ok) {
    return (
      <RiskSharePublicShell>
        <main className="rsx-pub-page grid min-h-[100dvh] place-items-center px-5 py-8">
          <section className="rsx-pub-card w-full max-w-[430px] rounded-[28px] p-6">
            <RiskSharePublicHeader
              variant="minimal"
              companyLabel={companyLabel}
              pathname={PATHNAME}
              query={query}
              activeLocale={locale}
              languageLabel={common.languageLabel}
              languageSoonBadgeLabel={common.languageSoonBadge}
              themeToggleLabel={common.themeToggleLabel}
              title={copy.qrCheckingTitle}
              className="-m-6 mb-4 rounded-t-[28px] border-0"
            />
            <p className="rsx-pub-muted mt-3 text-sm leading-6">{copy.notAllowedBody}</p>
            {companyCode ? (
              <a
                href={returnHref}
                className="rsx-pub-cta mt-5 block rounded-full px-5 py-3 text-center text-sm font-black"
              >
                {copy.returnToField}
              </a>
            ) : null}
          </section>
        </main>
      </RiskSharePublicShell>
    );
  }

  return (
    <RiskSharePublicShell>
      <main className="rsx-pub-page min-h-[100dvh] px-0 py-0 sm:px-3 sm:py-5">
        <form
          action="/api/risk-share/anonymous/submit"
          method="post"
          encType="multipart/form-data"
          className="rsx-pub-card mx-auto flex min-h-[100dvh] w-full max-w-none flex-col sm:min-h-[calc(100dvh-40px)] sm:max-w-[430px] sm:rounded-[28px]"
        >
          <input type="hidden" name="companyCode" value={companyCode} readOnly />
          <input type="hidden" name="lang" value={locale} readOnly />
          <input type="hidden" name="identityMode" value="anonymous" readOnly />
          <input type="hidden" name="anonymous" value="true" readOnly />

          <RiskSharePublicHeader
            variant="minimal"
            companyLabel={companyLabel}
            pathname={PATHNAME}
            query={query}
            activeLocale={locale}
            languageLabel={common.languageLabel}
            languageSoonBadgeLabel={common.languageSoonBadge}
            themeToggleLabel={common.themeToggleLabel}
            title={copy.heroTitle}
            description={copy.heroSub}
            className="rounded-t-[28px] border-0 px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))]"
          />

          <section className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
            {submitted === "1" ? (
              <RiskShareStatusBanner variant="success" className="mb-4">
                {copy.submittedBanner}
              </RiskShareStatusBanner>
            ) : null}

            {submissionError === "1" ? (
              <RiskShareStatusBanner variant="error" className="mb-4">
                {copy.errorBanner}
              </RiskShareStatusBanner>
            ) : null}

            <div className="rsx-pub-banner rsx-pub-banner--success flex items-start gap-3 p-4">
              <span aria-hidden="true" className="text-lg leading-none">🔒</span>
              <p className="text-sm leading-6">{copy.bannerBody}</p>
            </div>

            <fieldset className="mt-5">
              <legend className="rsx-pub-label text-sm font-black">{copy.typeLegend} *</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {copy.typeChoices.map((choice, index) => (
                  <label
                    key={choice.value}
                    className="rsx-pub-field-card flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold has-[:checked]:border-[#16A085]"
                  >
                    <input
                      type="radio"
                      name="feedbackType"
                      value={choice.value}
                      required
                      defaultChecked={index === 0}
                      className="h-4 w-4 shrink-0 border-slate-300 text-[#16A085]"
                    />
                    <span>{choice.icon} {choice.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="rsx-pub-label mt-4 block text-sm font-black">
              {copy.locationLabel}
              <input
                name="location"
                placeholder={copy.locationPlaceholder}
                className="rsx-pub-input mt-2 w-full rounded-2xl border px-4 py-3 text-base outline-none"
              />
            </label>

            <label className="rsx-pub-label mt-4 block text-sm font-black">
              {copy.contentLabel} *
              <textarea
                name="content"
                required
                minLength={2}
                placeholder={copy.contentPlaceholder}
                rows={6}
                className="rsx-pub-input mt-2 w-full resize-none rounded-2xl border px-4 py-3 text-base leading-7 outline-none"
              />
            </label>

            <div className="rsx-pub-banner rsx-pub-banner--warning mt-5 p-4">
              <p className="text-sm font-black">{copy.preSubmitTitle}</p>
              <p className="mt-2 text-sm leading-6">{copy.preSubmitBody}</p>
            </div>

            <div className="rsx-pub-chip mt-4 rounded-2xl p-4">
              <p className="rsx-pub-muted text-[0.65rem] font-black uppercase tracking-wide">
                {copy.afterSubmitLabel}
              </p>
              <p className="rsx-pub-label mt-1.5 text-sm font-bold leading-6">{copy.afterSubmitBody}</p>
            </div>
          </section>

          <footer className="rsx-pub-card sticky bottom-0 border-x-0 border-b-0 px-5 py-4 backdrop-blur">
            <RiskSharePrimaryButton
              label={copy.submitCta}
              submittingLabel={common.submittingLabel}
              className="rounded-full"
            />
            <a
              href={returnHref}
              className="rsx-pub-muted mt-3 block w-full rounded-full px-5 py-3 text-center text-sm font-black"
            >
              {copy.returnToField}
            </a>
          </footer>
        </form>
      </main>
    </RiskSharePublicShell>
  );
}
