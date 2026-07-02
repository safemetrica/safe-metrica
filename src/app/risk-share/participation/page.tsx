import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ParticipationMode = "monthly" | "prework";

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    mode?: string | string[];
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

const MODE_COPY: Record<
  ParticipationMode,
  {
    badge: string;
    title: string;
    description: string;
    cta: string;
    accent: string;
    checklist: string[];
    flow: string[];
  }
> = {
  monthly: {
    badge: "공유확인",
    title: "위험성평가 공유확인",
    description: "이번 달 공유된 위험요인과 안전조치를 확인합니다.",
    cta: "공유확인 제출",
    accent: "from-blue-600 to-blue-500",
    checklist: [
      "공유된 위험요인을 확인했습니다.",
      "현장 주의사항을 확인했습니다.",
      "의견이 있으면 익명 의견함에 남길 수 있습니다.",
    ],
    flow: ["확인 내용", "운영기록 후보", "관리자 검토", "월간 안전운영 요약", "다음 위험성평가 보완 후보"],
  },
  prework: {
    badge: "작업 전 확인",
    title: "작업 전 안전확인",
    description: "오늘 작업 전 보호구, 동선, 적재·하역, 설비 주변 주의사항을 확인합니다.",
    cta: "작업 전 확인 제출",
    accent: "from-emerald-600 to-emerald-500",
    checklist: [
      "오늘 작업 전 주의사항을 확인했습니다.",
      "보호구와 작업 동선을 확인했습니다.",
      "이상이 있으면 관리자에게 알리거나 익명 의견함에 남길 수 있습니다.",
    ],
    flow: ["작업 전 확인", "운영기록 후보", "관리자 검토", "월간 안전운영 요약"],
  },
};

export default async function RiskShareParticipationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const mode = normalizeMode(readSearchParam(params.mode));
  const copy = MODE_COPY[mode];

  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const returnHref = `/risk-share/field?company=${encodeURIComponent(companyCode)}`;

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
                현장 QR 확인 중
              </h1>
            </div>
            <div className="p-3">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-sm font-bold leading-6 text-amber-950">
                이 확인 화면은 지정된 현장 QR에서만 열립니다. 현장 담당자에게 최신 QR 링크를
                요청해 주세요.
              </div>
              {companyCode ? (
                <a
                  href={returnHref}
                  className="mt-3 block rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
                >
                  현장 QR 입구로 돌아가기
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
          <div className={`bg-gradient-to-br ${copy.accent} p-5 text-white`}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[0.68rem] font-black tracking-tight text-white/90">
                {companyLabel}
              </span>
            </div>
            <span className="mt-4 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[0.65rem] font-black text-white/90">
              {copy.badge}
            </span>
            <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
              {copy.description}
            </p>
          </div>

          <div
            aria-label="기록 흐름"
            className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-3 py-2.5"
          >
            {copy.flow.map((step, index) => (
              <span key={step} className="flex items-center gap-1">
                <span
                  className={`rounded-full px-2 py-1 text-[0.6rem] font-black leading-4 ${
                    index === 0 ? "bg-slate-950 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {step}
                </span>
                {index < copy.flow.length - 1 ? (
                  <span className="text-[0.6rem] text-slate-300">→</span>
                ) : null}
              </span>
            ))}
          </div>

          <div className="space-y-3 p-3">
            <fieldset className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
              <legend className="px-1 text-sm font-black text-slate-800">확인 항목</legend>
              {copy.checklist.map((item, index) => (
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
                제출 이후
              </p>
              <p className="mt-1.5 text-xs font-bold leading-5 text-white/90">
                확인 내용은 운영기록 후보로 남아 관리자 검토를 거쳐 월간 안전운영 요약에
                반영됩니다.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <button
                type="button"
                disabled
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-base font-black text-slate-600"
              >
                {copy.cta}
              </button>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                제출 기능은 준비 중입니다. 곧 이 화면에서 바로 확인을 제출할 수 있습니다.
              </p>
            </div>

            <a
              href={returnHref}
              className="block rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-600"
            >
              현장 QR 입구로 돌아가기
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
