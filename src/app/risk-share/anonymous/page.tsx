import type { Metadata } from "next";
import Link from "next/link";
import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  RISK_SHARE_LANGUAGES_SOON,
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

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
  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const companyMark = companyLabel.trim().charAt(0) || "현";
  const returnHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, locale);

  if (!tenantResolution.ok) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[#EEF1F4] px-5 py-8 text-[#0B2742]">
        <section className="w-full max-w-[430px] rounded-[28px] bg-white p-6 shadow-[0_18px_50px_rgba(11,39,66,0.14)]">
          <p className="text-[13px] font-black text-[#16A085]">SafeMetrica</p>
          <h1 className="mt-3 text-[22px] font-black tracking-[-0.04em]">
            {copy.qrCheckingTitle}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            {copy.notAllowedBody}
          </p>
          {companyCode ? (
            <a
              href={returnHref}
              className="mt-5 block rounded-full bg-[#0B2742] px-5 py-3 text-center text-sm font-black text-white"
            >
              {copy.returnToField}
            </a>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white px-0 py-0 text-[#0B2742] sm:bg-[#EEF1F4] sm:px-3 sm:py-5">
      <form
        action="/api/risk-share/anonymous/submit"
        method="post"
        encType="multipart/form-data"
        className="mx-auto flex min-h-[100dvh] w-full max-w-none flex-col bg-white sm:min-h-[calc(100dvh-40px)] sm:max-w-[430px] sm:rounded-[28px] sm:shadow-[0_18px_50px_rgba(11,39,66,0.14)]"
      >
        <input type="hidden" name="companyCode" value={companyCode} readOnly />
        <input type="hidden" name="lang" value={locale} readOnly />
        <input type="hidden" name="identityMode" value="anonymous" readOnly />
        <input type="hidden" name="anonymous" value="true" readOnly />

        <header className="border-b border-[#E3E7EC] px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E7EC] bg-[#F3F6F8] px-2.5 py-1 text-[0.7rem] font-black text-[#0B2742]">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#0B2742] text-[0.58rem] font-black text-white">
                {companyMark}
              </span>
              {companyLabel}
            </span>
            <span className="text-[0.7rem] font-black text-[#64748B]">SafeMetrica</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span aria-hidden="true" className="text-sm">🌐</span>
            {RISK_SHARE_LANGUAGE_OPTIONS.map((language) => (
              <Link
                key={language.code}
                href={buildRiskShareLangHref("/risk-share/anonymous", { company: companyCode }, language.code)}
                className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
                  language.code === locale
                    ? "bg-[#0B2742] text-white"
                    : "border border-[#E3E7EC] text-[#64748B]"
                }`}
              >
                {language.label}
              </Link>
            ))}
            {RISK_SHARE_LANGUAGES_SOON.map((language) => (
              <span
                key={language}
                className="rounded-full border border-[#E3E7EC] px-2 py-1 text-[0.58rem] font-bold text-[#B7C0CA]"
              >
                {language}
              </span>
            ))}
          </div>

          <h1 className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[#0B2742]">
            {copy.heroTitle}
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-[#64748B]">
            {copy.heroSub}
          </p>
        </header>

        <section className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
          {submitted === "1" ? (
            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-950">
              익명 의견이 접수되었습니다. 확인해 주셔서 감사합니다.
            </div>
          ) : null}

          {submissionError === "1" ? (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-950">
              저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-[20px] border border-[#BCE3D6] bg-[#EAF8F3] p-4">
            <span aria-hidden="true" className="text-lg leading-none">🔒</span>
            <p className="text-sm leading-6 text-[#1C3A57]">{copy.bannerBody}</p>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-black text-[#0B2742]">{copy.typeLegend} *</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {copy.typeChoices.map((choice, index) => (
                <label
                  key={choice.value}
                  className="flex items-center gap-2 rounded-2xl border border-[#E3E7EC] px-3 py-3 text-sm font-bold text-[#0B2742] has-[:checked]:border-[#16A085] has-[:checked]:bg-[#EAF8F3]"
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

          <label className="mt-4 block text-sm font-black text-[#0B2742]">
            {copy.locationLabel}
            <input
              name="location"
              placeholder={copy.locationPlaceholder}
              className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
            />
          </label>

          <label className="mt-4 block text-sm font-black text-[#0B2742]">
            {copy.contentLabel} *
            <textarea
              name="content"
              required
              minLength={2}
              placeholder={copy.contentPlaceholder}
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base leading-7 text-[#0B2742] outline-none focus:border-[#16A085]"
            />
          </label>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-900">{copy.preSubmitTitle}</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">{copy.preSubmitBody}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-blue-700">
              {copy.afterSubmitLabel}
            </p>
            <p className="mt-1.5 text-sm font-bold leading-6 text-blue-950">{copy.afterSubmitBody}</p>
          </div>
        </section>

        <footer className="sticky bottom-0 border-t border-[#E3E7EC] bg-white/95 px-5 py-4 backdrop-blur">
          <button
            type="submit"
            className="w-full rounded-full bg-[#0B2742] px-5 py-4 text-base font-black text-white"
          >
            {copy.submitCta}
          </button>
          <a
            href={returnHref}
            className="mt-3 block w-full rounded-full px-5 py-3 text-center text-sm font-black text-[#64748B]"
          >
            {copy.returnToField}
          </a>
        </footer>
      </form>
    </main>
  );
}
