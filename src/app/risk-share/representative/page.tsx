import Link from "next/link";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";
import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  RISK_SHARE_LANGUAGES_SOON,
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import RiskShareRepresentativeSignaturePad from "./RiskShareRepresentativeSignaturePad";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function isRiskSharePackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

export default async function RiskShareRepresentativePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const locale = getRiskShareLocale(readSearchParam(params.lang));
  const submitted = readSearchParam(params.submitted);
  const submissionError = readSearchParam(params.error);
  const copy = getRiskShareCopy(locale).representative;
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const companyMark = companyLabel.trim().charAt(0) || "현";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const returnHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, locale);

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica
              </div>
              <h1 className="mt-5 text-2xl font-black leading-tight tracking-tight">
                {copy.qrCheckingTitle}
              </h1>
            </div>
            <div className="p-4">
              <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-sm font-bold leading-7 text-amber-950">
                {copy.notAllowedBody}
              </div>
              {companyCode ? (
                <a
                  href={returnHref}
                  className="mt-4 block rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
                >
                  {copy.returnToField}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
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

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span aria-hidden="true" className="text-sm">🌐</span>
              {RISK_SHARE_LANGUAGE_OPTIONS.map((language) => (
                <Link
                  key={language.code}
                  href={buildRiskShareLangHref("/risk-share/representative", { company: companyCode }, language.code)}
                  className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
                    language.code === locale
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

            <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight">
              {copy.heroTitle}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
              {copy.heroSub}
            </p>
          </div>

          <div className="space-y-4 p-4">
            {submitted === "1" ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-950">
                확인이 접수되었습니다. 감사합니다.
              </div>
            ) : null}

            {submissionError === "1" ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-950">
                저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
              </div>
            ) : null}

            <form
              action="/api/risk-share/representative/submit"
              method="post"
              encType="multipart/form-data"
              className="space-y-4"
            >
              <input type="hidden" name="companyCode" value={companyCode} readOnly />
              <input type="hidden" name="lang" value={locale} readOnly />

              <label className="block text-sm font-black text-slate-800">
                {copy.nameLabel}
                <input
                  name="representativeName"
                  placeholder={copy.namePlaceholder}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
                />
              </label>

              <label className="block text-sm font-black text-slate-800">
                {copy.affiliationLabel}
                <input
                  name="affiliation"
                  placeholder={copy.affiliationPlaceholder}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
                />
              </label>

              <label className="block text-sm font-black text-slate-800">
                {copy.opinionLabel}
                <textarea
                  name="opinion"
                  placeholder={copy.opinionPlaceholder}
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-base leading-7 text-slate-900 outline-none focus:border-blue-400"
                />
              </label>

              <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold leading-5 text-slate-700">
                <input type="checkbox" name="confirmed" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                {copy.confirmLabel}
              </label>

              <RiskShareRepresentativeSignaturePad />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
                >
                  {copy.submitCta}
                </button>
              </div>
            </form>

            <p className="text-center text-xs font-bold leading-5 text-slate-500">
              {copy.smallprint}
            </p>

            <a
              href={returnHref}
              className="block rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-600"
            >
              {copy.returnToField}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
