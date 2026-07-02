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
  { badge: string; title: string; description: string; cta: string; accent: string }
> = {
  monthly: {
    badge: "공유확인",
    title: "이번 달 위험성평가 공유확인",
    description:
      "이번 달 공유된 위험요인과 안전조치를 확인합니다. 확인 내용은 운영기록 후보로 남아 다음 위험성평가 재검토 후보로 이어집니다.",
    cta: "공유확인 시작",
    accent: "from-blue-600 to-blue-500",
  },
  prework: {
    badge: "작업 전 확인",
    title: "작업 전 안전확인",
    description:
      "오늘 작업 전 보호구, 동선, 적재·하역, 설비 주변 주의사항을 확인합니다. 확인 내용은 운영기록 후보로 남아 월간 운영요약에 반영됩니다.",
    cta: "작업 전 확인 시작",
    accent: "from-emerald-600 to-emerald-500",
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
      <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica 위공팩
              </div>
              <h1 className="mt-5 text-2xl font-black leading-tight tracking-tight">
                현장 QR 확인 중
              </h1>
            </div>
            <div className="p-4">
              <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-sm font-bold leading-7 text-amber-950">
                이 확인 화면은 지정된 위공팩 현장 QR에서만 열립니다. 현장 담당자에게 최신 QR
                링크를 요청해 주세요.
              </div>
              {companyCode ? (
                <a
                  href={returnHref}
                  className="mt-4 block rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
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
    <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className={`bg-gradient-to-br ${copy.accent} p-6 text-white`}>
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica 위공팩
              </div>
              <div className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
                {companyLabel}
              </div>
            </div>
            <div className="mt-5 inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[0.65rem] font-black text-white/90">
              {copy.badge}
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight">
              {copy.title}
            </h1>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/85">
              {copy.description}
            </p>
          </div>

          <div className="space-y-3 p-4">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-[0.68rem] font-black uppercase tracking-wide text-white/50">
                확인 이후
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-white/90">
                운영기록 후보
                <span className="mx-2 text-white/30">→</span>
                관리자 검토
                <span className="mx-2 text-white/30">→</span>
                월간 운영요약
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                disabled
                className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-sm font-black text-slate-600"
              >
                {copy.cta}
              </button>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                확인 제출 화면은 곧 이 자리에서 바로 열립니다. 지금은 화면 구성만 먼저 안내해
                드립니다.
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
