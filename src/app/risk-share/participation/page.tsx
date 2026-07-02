import Link from "next/link";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";
import {
  RISK_SHARE_LANGUAGE_OPTIONS,
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ParticipationMode = "monthly" | "prework";

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    mode?: string | string[];
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

function normalizeMode(value: string): ParticipationMode {
  return value === "prework" ? "prework" : "monthly";
}

function isRiskSharePackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

const MODE_ACCENT: Record<ParticipationMode, string> = {
  monthly: "from-blue-600 to-blue-500",
  prework: "from-emerald-600 to-emerald-500",
};

function LangBar({
  companyCode,
  mode,
  activeLocale,
}: {
  companyCode: string;
  mode: ParticipationMode;
  activeLocale: RiskShareLocale;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span aria-hidden="true" className="text-sm">🌐</span>
      {RISK_SHARE_LANGUAGE_OPTIONS.map((language) => (
        <Link
          key={language.code}
          href={buildRiskShareLangHref(
            "/risk-share/participation",
            { company: companyCode, mode },
            language.code,
          )}
          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${
            language.code === activeLocale
              ? "bg-white text-[#0B5EA8]"
              : "border border-white/25 bg-white/5 text-white/70"
          }`}
        >
          {language.label}
        </Link>
      ))}
    </div>
  );
}

export default async function RiskShareParticipationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const mode = normalizeMode(readSearchParam(params.mode));
  const locale = getRiskShareLocale(readSearchParam(params.lang));
  const copy = getRiskShareCopy(locale).participation;
  const modeCopy = copy[mode];
  const accent = MODE_ACCENT[mode];

  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const returnHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, locale);

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#EEF4F8] px-3 py-4 text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-5 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica
              </div>
              <h1 className="mt-4 text-xl font-black leading-tight tracking-tight">
                {copy.qrCheckingTitle}
              </h1>
            </div>
            <div className="p-3">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm font-bold leading-6 text-amber-950">
                {copy.notAllowedBody}
              </div>
              {companyCode ? (
                <a
                  href={returnHref}
                  className="mt-3 block rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
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
    <main className="min-h-screen bg-[#EEF4F8] px-3 py-4 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
          <div className={`bg-gradient-to-br ${accent} p-5 text-white`}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[0.68rem] font-black tracking-tight text-white/90">
                {companyLabel}
              </span>
            </div>
            <span className="mt-4 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[0.65rem] font-black text-white/90">
              {modeCopy.badge}
            </span>
            <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight">
              {modeCopy.title}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
              {modeCopy.description}
            </p>
            <div className="mt-3 border-t border-white/15 pt-3">
              <LangBar companyCode={companyCode} mode={mode} activeLocale={locale} />
            </div>
          </div>

          <div
            aria-label="기록 흐름"
            className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-3 py-2.5"
          >
            {modeCopy.flow.map((step, index) => (
              <span key={step} className="flex items-center gap-1">
                <span
                  className={`rounded-full px-2 py-1 text-[0.6rem] font-black leading-4 ${
                    index === 0 ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {step}
                </span>
                {index < modeCopy.flow.length - 1 ? (
                  <span className="text-[0.6rem] text-slate-300">→</span>
                ) : null}
              </span>
            ))}
          </div>

          <div className="space-y-3 p-3">
            <fieldset className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
              <legend className="px-1 text-sm font-black text-slate-800">{copy.checklistLegend}</legend>
              {modeCopy.checklist.map((item, index) => (
                <label
                  key={item}
                  className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-sm font-bold leading-5 text-slate-700"
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

            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-[0.62rem] font-black uppercase tracking-wide text-white/50">
                {copy.afterSubmitLabel}
              </p>
              <p className="mt-1.5 text-xs font-bold leading-5 text-white/90">
                {copy.afterSubmitBody}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <button
                type="button"
                disabled
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-base font-black text-slate-600"
              >
                {modeCopy.cta}
              </button>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                {copy.submitPendingNote}
              </p>
            </div>

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
