import { randomUUID } from "node:crypto";
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
  const publicIdempotencyKey = randomUUID();
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
      <RiskSharePublicShell className="rsx-pub-flow rsx-pub-flow--anonymous">
        <main className="rsx-pub-page rsx-pub-flow-page px-4 py-5">
          <section className="rsx-pub-flow-wrap mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
            <div className="rsx-pub-card rsx-pub-flow-card">
              <RiskSharePublicHeader
                variant="anonymous"
                companyLabel={companyLabel}
                pathname={PATHNAME}
                query={query}
                activeLocale={locale}
                languageLabel={common.languageLabel}
                languageSoonBadgeLabel={common.languageSoonBadge}
                themeToggleLabel={common.themeToggleLabel}
                title={copy.qrCheckingTitle}
              />
              <div className="rsx-pub-flow-body p-3">
                <RiskShareStatusBanner variant="warning" className="rounded-[13px] px-4 py-4">
                  {copy.notAllowedBody}
                </RiskShareStatusBanner>
                {companyCode ? (
                  <a
                    href={returnHref}
                    className="rsx-pub-cta rsx-pub-return-link mt-3 block rounded-[11px] px-5 py-3 text-center text-sm font-black"
                  >
                    {copy.returnToField}
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        </main>
      </RiskSharePublicShell>
    );
  }

  return (
    <RiskSharePublicShell className="rsx-pub-flow rsx-pub-flow--anonymous">
      <main className="rsx-pub-page rsx-pub-flow-page px-4 py-5">
        <section className="rsx-pub-flow-wrap mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <div className="rsx-pub-card rsx-pub-flow-card">
            <RiskSharePublicHeader
              variant="anonymous"
              companyLabel={companyLabel}
              pathname={PATHNAME}
              query={query}
              activeLocale={locale}
              languageLabel={common.languageLabel}
              languageSoonBadgeLabel={common.languageSoonBadge}
              themeToggleLabel={common.themeToggleLabel}
              title={copy.heroTitle}
              description={copy.heroSub}
            />

            <div className="rsx-pub-flow-body space-y-3 p-3">
              {submitted === "1" ? <RiskShareStatusBanner variant="success">{copy.submittedBanner}</RiskShareStatusBanner> : null}
              {submissionError === "1" ? <RiskShareStatusBanner variant="error">{copy.errorBanner}</RiskShareStatusBanner> : null}

              <form
                action="/api/risk-share/anonymous/submit"
                method="post"
                encType="multipart/form-data"
                className="space-y-3"
              >
                <input type="hidden" name="companyCode" value={companyCode} readOnly />
                <input type="hidden" name="lang" value={locale} readOnly />
                <input type="hidden" name="publicIdempotencyKey" value={publicIdempotencyKey} readOnly />
                <input type="hidden" name="identityMode" value="anonymous" readOnly />
                <input type="hidden" name="anonymous" value="true" readOnly />

                <div className="rsx-pub-banner rsx-pub-banner--success rsx-pub-privacy-banner flex items-start gap-3 p-4">
                  <span aria-hidden="true" className="text-lg leading-none">🔒</span>
                  <p className="text-sm leading-6">{copy.bannerBody}</p>
                </div>

                <fieldset className="rsx-pub-form-section">
                  <legend className="rsx-pub-label px-1 text-sm font-black">{copy.typeLegend} *</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {copy.typeChoices.map((choice, index) => (
                      <label
                        key={choice.value}
                        className="rsx-pub-field-card rsx-pub-choice-card flex items-center gap-2 rounded-[13px] px-3 py-3 text-sm font-bold"
                      >
                        <input
                          type="radio"
                          name="feedbackType"
                          value={choice.value}
                          required
                          defaultChecked={index === 0}
                          className="h-4 w-4 shrink-0 border-slate-300"
                        />
                        <span>{choice.icon} {choice.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="rsx-pub-field-card rsx-pub-form-section space-y-3 rounded-[13px] p-3">
                  <label className="rsx-pub-label block text-sm font-black">
                    {copy.locationLabel}
                    <input
                      name="location"
                      placeholder={copy.locationPlaceholder}
                      className="rsx-pub-input mt-2 w-full rounded-[13px] border px-4 py-3 text-base outline-none"
                    />
                  </label>

                  <label className="rsx-pub-label block text-sm font-black">
                    {copy.contentLabel} *
                    <textarea
                      name="content"
                      required
                      minLength={2}
                      placeholder={copy.contentPlaceholder}
                      rows={6}
                      className="rsx-pub-input mt-2 w-full resize-none rounded-[13px] border px-4 py-3 text-base leading-7 outline-none"
                    />
                  </label>
                </div>

                <div className="rsx-pub-banner rsx-pub-banner--warning rounded-[13px] p-4">
                  <p className="text-sm font-black">{copy.preSubmitTitle}</p>
                  <p className="mt-2 text-sm leading-6">{copy.preSubmitBody}</p>
                </div>

                <div className="rsx-pub-chip rsx-pub-after-note rounded-[13px] p-4">
                  <p className="rsx-pub-muted text-[0.62rem] font-black uppercase tracking-wide">
                    {copy.afterSubmitLabel}
                  </p>
                  <p className="rsx-pub-label mt-1.5 text-xs font-bold leading-5">{copy.afterSubmitBody}</p>
                </div>

                <div className="rsx-pub-field-card rsx-pub-submit-zone rounded-[13px] p-3">
                  <RiskSharePrimaryButton label={copy.submitCta} submittingLabel={common.submittingLabel} />
                </div>
              </form>

              <a
                href={returnHref}
                className="rsx-pub-card-flat rsx-pub-return-link block rounded-[11px] px-5 py-3 text-center text-sm font-black"
              >
                {copy.returnToField}
              </a>
            </div>
          </div>
        </section>
      </main>
    </RiskSharePublicShell>
  );
}
