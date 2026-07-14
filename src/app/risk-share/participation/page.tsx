import {
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import {
  resolveActiveRiskSharePublicVersion,
  type RiskSharePublicVersion,
} from "@/lib/risk-share/riskSharePublicVersion";
import RiskSharePublicShell from "@/components/risk-share/public/RiskSharePublicShell";
import RiskSharePublicHeader, {
  type RiskSharePublicHeaderVariant,
} from "@/components/risk-share/public/RiskSharePublicHeader";
import RiskShareStatusBanner from "@/components/risk-share/public/RiskShareStatusBanner";
import RiskSharePrimaryButton from "@/components/risk-share/public/RiskSharePrimaryButton";
import RiskShareRepresentativeSignaturePad from "../representative/RiskShareRepresentativeSignaturePad";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PATHNAME = "/risk-share/participation";

type ParticipationMode = "monthly" | "prework";

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    mode?: string | string[];
    lang?: string | string[];
    submitted?: string | string[];
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

function normalizeMode(value: string): ParticipationMode {
  return value === "prework" ? "prework" : "monthly";
}

const MODE_VARIANT: Record<ParticipationMode, RiskSharePublicHeaderVariant> = {
  monthly: "monthly",
  prework: "prework",
};

export default async function RiskShareParticipationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const companyCode = normalizeCompanyCode(rawCompanyCode);
  const mode = normalizeMode(readSearchParam(params.mode));
  const locale = getRiskShareLocale(readSearchParam(params.lang));
  const submitted = readSearchParam(params.submitted);
  const copy = getRiskShareCopy(locale).participation;
  const common = getRiskShareCopy(locale).common;
  const modeCopy = copy[mode];

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const returnHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, locale);
  const query = { company: companyCode, mode };

  if (!tenantResolution.ok) {
    return (
      <RiskSharePublicShell className={`rsx-pub-flow rsx-pub-flow--${mode}`}>
        <main className="rsx-pub-page rsx-pub-flow-page px-3 py-4">
          <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
            <div className="rsx-pub-card rsx-pub-flow-card overflow-hidden rounded-[1.75rem]">
              <RiskSharePublicHeader
                variant={MODE_VARIANT[mode]}
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
                <RiskShareStatusBanner variant="warning" className="rounded-2xl px-4 py-4">
                  {copy.notAllowedBody}
                </RiskShareStatusBanner>
                {companyCode ? (
                  <a
                    href={returnHref}
                    className="rsx-pub-cta mt-3 block rounded-2xl px-5 py-3 text-center text-sm font-black"
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

  let monthlyVersion: RiskSharePublicVersion | null = null;
  let monthlyVersionUnavailableReason: "no_share" | "invalid_share" | "lookup_failed" | null = null;

  if (mode === "monthly") {
    const versionResult = await resolveActiveRiskSharePublicVersion(tenantResolution.tenant.code);

    if (versionResult.ok) {
      monthlyVersion = versionResult.version;
    } else {
      monthlyVersionUnavailableReason = versionResult.reason;
    }
  }

  const monthlyVersionUnavailableBody =
    monthlyVersionUnavailableReason === "lookup_failed"
      ? copy.versionShareLookupFailedBody
      : monthlyVersionUnavailableReason === "invalid_share"
        ? copy.versionShareInvalidBody
        : copy.versionShareEmptyBody;

  if (mode === "monthly" && monthlyVersionUnavailableReason) {
    return (
      <RiskSharePublicShell className={`rsx-pub-flow rsx-pub-flow--${mode}`}>
        <main className="rsx-pub-page rsx-pub-flow-page px-3 py-4">
          <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
            <div className="rsx-pub-card rsx-pub-flow-card overflow-hidden rounded-[1.75rem]">
              <RiskSharePublicHeader
                variant={MODE_VARIANT[mode]}
                companyLabel={companyLabel}
                pathname={PATHNAME}
                query={query}
                activeLocale={locale}
                languageLabel={common.languageLabel}
                languageSoonBadgeLabel={common.languageSoonBadge}
                themeToggleLabel={common.themeToggleLabel}
                title={modeCopy.title}
                description={modeCopy.description}
                badge={
                  <span className="rsx-pub-chip rsx-pub-flow-badge inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-black">
                    {modeCopy.badge}
                  </span>
                }
              />
              <div className="rsx-pub-flow-body p-3">
                <RiskShareStatusBanner
                  variant={monthlyVersionUnavailableReason === "no_share" ? "warning" : "error"}
                  className="rounded-2xl px-4 py-4"
                >
                  {monthlyVersionUnavailableBody}
                </RiskShareStatusBanner>
                <a
                  href={returnHref}
                  className="rsx-pub-cta mt-3 block rounded-2xl px-5 py-3 text-center text-sm font-black"
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

  return (
    <RiskSharePublicShell className={`rsx-pub-flow rsx-pub-flow--${mode}`}>
      <main className="rsx-pub-page rsx-pub-flow-page px-3 py-4">
        <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
          <div className="rsx-pub-card rsx-pub-flow-card overflow-hidden rounded-[1.75rem]">
            <RiskSharePublicHeader
              variant={MODE_VARIANT[mode]}
              companyLabel={companyLabel}
              pathname={PATHNAME}
              query={query}
              activeLocale={locale}
              languageLabel={common.languageLabel}
              languageSoonBadgeLabel={common.languageSoonBadge}
              themeToggleLabel={common.themeToggleLabel}
              title={modeCopy.title}
              description={modeCopy.description}
              badge={
                <span className="rsx-pub-chip rsx-pub-flow-badge inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-black">
                  {modeCopy.badge}
                </span>
              }
            />

            <div className="rsx-pub-flow-body space-y-3 p-3">
              {submitted === "1" ? <RiskShareStatusBanner variant="success">{copy.submittedBanner}</RiskShareStatusBanner> : null}
              {submitted === "error" ? <RiskShareStatusBanner variant="error">{copy.errorBanner}</RiskShareStatusBanner> : null}
              {submitted === "missing_identifier" ? (
                <RiskShareStatusBanner variant="error">{copy.missingIdentifierBanner}</RiskShareStatusBanner>
              ) : null}
              {submitted === "version_unavailable" ? (
                <RiskShareStatusBanner variant="warning">{copy.versionShareEmptyBody}</RiskShareStatusBanner>
              ) : null}
              {submitted === "version_changed" ? (
                <RiskShareStatusBanner variant="warning">{copy.versionShareChangedBanner}</RiskShareStatusBanner>
              ) : null}
              {submitted === "incomplete_confirmation" ? (
                <RiskShareStatusBanner variant="error">{copy.versionShareIncompleteBanner}</RiskShareStatusBanner>
              ) : null}

              <form action="/api/risk-share/participation/submit" method="post" encType="multipart/form-data">
                <input type="hidden" name="companyCode" value={companyCode} readOnly />
                <input type="hidden" name="mode" value={mode} readOnly />
                <input type="hidden" name="lang" value={locale} readOnly />

                <div className="rsx-pub-field-card rsx-pub-form-section space-y-3 rounded-2xl p-3">
                  <label className="rsx-pub-label block text-sm font-black">
                    {copy.workerNameLabel}
                    <input
                      name="workerName"
                      required
                      placeholder={copy.workerNamePlaceholder}
                      className="rsx-pub-input mt-2 w-full rounded-2xl border px-4 py-3 text-base outline-none"
                    />
                  </label>
                  <label className="rsx-pub-label block text-sm font-black">
                    {copy.workerAffiliationLabel}
                    <input
                      name="workerAffiliation"
                      placeholder={copy.workerAffiliationPlaceholder}
                      className="rsx-pub-input mt-2 w-full rounded-2xl border px-4 py-3 text-base outline-none"
                    />
                  </label>
                  <label className="rsx-pub-label block text-sm font-black">
                    {copy.workerIdentifierLabel}
                    <input
                      name="workerIdentifier"
                      required
                      maxLength={20}
                      placeholder={copy.workerIdentifierPlaceholder}
                      className="rsx-pub-input mt-2 w-full rounded-2xl border px-4 py-3 text-base outline-none"
                    />
                    <span className="rsx-pub-muted mt-1.5 block text-xs font-semibold leading-4">
                      {copy.workerIdentifierHelp}
                    </span>
                  </label>
                </div>

                {mode === "monthly" && monthlyVersion ? (
                  <fieldset className="mt-3 space-y-3">
                    <legend className="sr-only">{copy.versionShareTitleLabel}</legend>
                    <input type="hidden" name="versionLockId" value={monthlyVersion.lock.id} readOnly />

                    <div className="rsx-pub-field-card rsx-pub-version-summary space-y-1 rounded-2xl p-3">
                      <p className="rsx-pub-muted text-[0.62rem] font-black uppercase tracking-wide">
                        {copy.versionShareTitleLabel}
                      </p>
                      <p className="rsx-pub-label text-sm font-black">
                        {monthlyVersion.lock.title || modeCopy.title}
                      </p>
                      <p className="rsx-pub-muted text-xs font-bold">
                        {copy.versionShareMonthLabel}: {monthlyVersion.lock.month}
                      </p>
                      <p className="rsx-pub-muted text-xs font-bold">
                        {copy.versionShareItemCountLabel(monthlyVersion.items.length)}
                      </p>
                    </div>

                    {monthlyVersion.items.map((item) => {
                      const safetyMeasure =
                        item.workerShareSummary || item.improvementPlan || item.currentControls;

                      return (
                      <div key={item.id} className="rsx-pub-card rsx-pub-item-card space-y-2 rounded-2xl p-3">
                        <input type="hidden" name="shareItemId" value={item.id} readOnly />
                        <p className="rsx-pub-muted text-[0.62rem] font-black uppercase tracking-wide">
                          {copy.versionItemTaskLabel}
                        </p>
                        <p className="rsx-pub-label text-sm font-black">{item.taskName}</p>
                        <p className="rsx-pub-muted text-[0.62rem] font-black uppercase tracking-wide">
                          {copy.versionItemHazardLabel}
                        </p>
                        <p className="rsx-pub-label text-sm font-bold leading-5">{item.hazard}</p>
                        {safetyMeasure ? (
                          <>
                            <p className="rsx-pub-muted text-[0.62rem] font-black uppercase tracking-wide">
                              {copy.versionItemMeasureLabel}
                            </p>
                            <p className="rsx-pub-label text-sm font-bold leading-5">
                              {safetyMeasure}
                            </p>
                          </>
                        ) : null}
                        {item.riskLevel ? (
                          <span className="rsx-pub-chip inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-black">
                            {copy.versionItemRiskLevelLabel}: {item.riskLevel}
                          </span>
                        ) : null}
                        <label className="rsx-pub-checkbox-row flex items-start gap-2 rounded-xl p-2.5 text-sm font-bold leading-5">
                          <input
                            type="checkbox"
                            name={`shareItemConfirmed-${item.id}`}
                            required
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                          />
                          {copy.versionItemConfirmLabel}
                        </label>
                      </div>
                      );
                    })}
                  </fieldset>
                ) : (
                  <fieldset className="rsx-pub-card rsx-pub-form-section mt-3 space-y-2 rounded-2xl p-3">
                    <legend className="rsx-pub-label px-1 text-sm font-black">{copy.checklistLegend}</legend>
                    {modeCopy.checklist.map((item, index) => (
                      <label
                        key={item}
                        className="rsx-pub-checkbox-row flex items-start gap-2 rounded-xl p-2.5 text-sm font-bold leading-5"
                      >
                        <input
                          type="checkbox"
                          name={`checklist-${mode}-${index}`}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                        />
                        {item}
                      </label>
                    ))}
                  </fieldset>
                )}

                <div className="mt-3">
                  <RiskShareRepresentativeSignaturePad
                    title={common.signatureTitle}
                    optionalTag={common.signatureOptionalTag}
                    hint={common.signatureHint}
                    clearLabel={common.signatureClear}
                  />
                </div>

                <div className="rsx-pub-chip rsx-pub-after-note mt-3 rounded-2xl p-4">
                  <p className="rsx-pub-muted text-[0.62rem] font-black uppercase tracking-wide">
                    {copy.afterSubmitLabel}
                  </p>
                  <p className="rsx-pub-label mt-1.5 text-xs font-bold leading-5">{copy.afterSubmitBody}</p>
                </div>

                <div className="rsx-pub-field-card rsx-pub-submit-zone mt-3 rounded-2xl p-3">
                  <RiskSharePrimaryButton label={modeCopy.cta} submittingLabel={common.submittingLabel} />
                </div>
              </form>

              <a
                href={returnHref}
                className="rsx-pub-card-flat rsx-pub-return-link block rounded-2xl px-5 py-3 text-center text-sm font-black"
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
