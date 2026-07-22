import { buildRiskShareLangHref, getRiskShareCopy, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import RiskSharePublicShell from "@/components/risk-share/public/RiskSharePublicShell";
import RiskSharePublicHeader from "@/components/risk-share/public/RiskSharePublicHeader";
import RiskShareStatusBanner from "@/components/risk-share/public/RiskShareStatusBanner";
import RiskSharePrimaryButton from "@/components/risk-share/public/RiskSharePrimaryButton";
import RiskShareRepresentativeSignaturePad from "./RiskShareRepresentativeSignaturePad";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PATHNAME = "/risk-share/representative";

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
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

export default async function RiskShareRepresentativePage({ searchParams }: PageProps) {
  const publicIdempotencyKey = randomUUID();
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const companyCode = normalizeCompanyCode(rawCompanyCode);
  const locale = getRiskShareLocale(readSearchParam(params.lang));
  const submitted = readSearchParam(params.submitted);
  const submissionError = readSearchParam(params.error);
  const copy = getRiskShareCopy(locale).representative;
  const common = getRiskShareCopy(locale).common;
  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const returnHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, locale);
  const query = { company: companyCode };

  if (!tenantResolution.ok) {
    return (
      <RiskSharePublicShell className="rsx-pub-flow">
        <main className="rsx-pub-page rsx-pub-flow-page px-4 py-5">
          <section className="rsx-pub-flow-wrap mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
            <div className="rsx-pub-card rsx-pub-flow-card">
              <RiskSharePublicHeader
                variant="brand"
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
                    className="rsx-pub-cta mt-3 block rounded-[11px] px-5 py-3 text-center text-sm font-black"
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
    <RiskSharePublicShell className="rsx-pub-flow">
      <main className="rsx-pub-page rsx-pub-flow-page px-4 py-5">
        <section className="rsx-pub-flow-wrap mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <div className="rsx-pub-card rsx-pub-flow-card">
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
            />

            <div className="rsx-pub-flow-body space-y-3 p-3">
              {submitted === "1" ? <RiskShareStatusBanner variant="success">{copy.submittedBanner}</RiskShareStatusBanner> : null}
              {submissionError === "1" ? (
                <RiskShareStatusBanner variant="error">{copy.errorBanner}</RiskShareStatusBanner>
              ) : null}

              <form
                action="/api/risk-share/representative/submit"
                method="post"
                encType="multipart/form-data"
                className="space-y-3"
              >
                <input type="hidden" name="companyCode" value={companyCode} readOnly />
                <input type="hidden" name="lang" value={locale} readOnly />
                <input type="hidden" name="publicIdempotencyKey" value={publicIdempotencyKey} readOnly />

                <label className="rsx-pub-label block text-sm font-black">
                  {copy.nameLabel}
                  <input
                    name="representativeName"
                    placeholder={copy.namePlaceholder}
                    className="rsx-pub-input mt-2 w-full rounded-[13px] border px-4 py-3 text-base outline-none"
                  />
                </label>

                <label className="rsx-pub-label block text-sm font-black">
                  {copy.affiliationLabel}
                  <input
                    name="affiliation"
                    placeholder={copy.affiliationPlaceholder}
                    className="rsx-pub-input mt-2 w-full rounded-[13px] border px-4 py-3 text-base outline-none"
                  />
                </label>

                <label className="rsx-pub-label block text-sm font-black">
                  {copy.opinionLabel}
                  <textarea
                    name="opinion"
                    placeholder={copy.opinionPlaceholder}
                    rows={5}
                    className="rsx-pub-input mt-2 w-full resize-none rounded-[13px] border px-4 py-3 text-base leading-7 outline-none"
                  />
                </label>

                <label className="rsx-pub-checkbox-row flex items-start gap-2 rounded-[13px] p-3 text-sm font-bold leading-5">
                  <input type="checkbox" name="confirmed" className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300" />
                  {copy.confirmLabel}
                </label>

                <RiskShareRepresentativeSignaturePad
                  title={common.signatureTitle}
                  optionalTag={common.signatureOptionalTag}
                  hint={common.signatureHint}
                  clearLabel={common.signatureClear}
                />

                <div className="rsx-pub-field-card rsx-pub-submit-zone rounded-[13px] p-3">
                  <RiskSharePrimaryButton label={copy.submitCta} submittingLabel={common.submittingLabel} />
                </div>
              </form>

              <p className="rsx-pub-muted text-center text-xs font-bold leading-5">{copy.smallprint}</p>

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
import { randomUUID } from "node:crypto";
