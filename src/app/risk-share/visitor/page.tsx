import Link from "next/link";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";
import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  RISK_SHARE_LANGUAGES_SOON,
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    lang?: string | string[];
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

export default async function RiskShareVisitorPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const locale = getRiskShareLocale(readSearchParam(params.lang));
  const copy = getRiskShareCopy(locale).visitor;
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
                  href={buildRiskShareLangHref("/risk-share/visitor", { company: companyCode }, language.code)}
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
              {copy.heroSubLine1} {copy.heroSubLine2}
            </p>
          </div>

          <div className="space-y-4 p-4">
            <fieldset>
              <legend className="text-sm font-black text-slate-800">{copy.purposeLegend}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {copy.purposes.map((purpose, index) => (
                  <label
                    key={purpose}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-800 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name="visitPurpose"
                      defaultChecked={index === 1}
                      className="h-4 w-4 shrink-0 border-slate-300 text-blue-600"
                    />
                    {purpose}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-black text-slate-800">
              {copy.companyLabel}
              <input
                name="visitorCompany"
                placeholder={copy.companyPlaceholder}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
              />
            </label>

            <label className="block text-sm font-black text-slate-800">
              {copy.nameLabel}
              <input
                name="visitorName"
                placeholder={copy.namePlaceholder}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
              />
            </label>

            <div>
              <p className="text-sm font-black text-slate-800">{copy.noticesLegend}</p>
              <div className="mt-2 space-y-2">
                {copy.notices.map((notice) => (
                  <div key={notice.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-sm font-black text-slate-900">
                      {notice.icon} {notice.title}
                    </h4>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{notice.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold leading-5 text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
              {copy.confirmLabel}
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                disabled
                className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-sm font-black text-slate-600"
              >
                {copy.submitCta}
              </button>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                {copy.submitPendingNote}
              </p>
            </div>

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
