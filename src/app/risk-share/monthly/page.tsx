import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
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

function getCurrentPeriodKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    label: `${year}년 ${month}월`,
    rangeLabel: `${year}.${pad(month)}.01 – ${year}.${pad(month)}.${pad(lastDay)}`,
  };
}

const STATUS_CARDS = [
  { title: "위험성평가 공유확인 현황", accent: "border-blue-100 bg-blue-50/60" },
  { title: "작업 전 안전확인 현황", accent: "border-emerald-100 bg-emerald-50/60" },
  { title: "익명 의견 · 아차사고 · 개선제안", accent: "border-amber-100 bg-amber-50/60" },
  { title: "외부인 출입 전 안전확인", accent: "border-purple-100 bg-purple-50/60" },
  { title: "관리자 검토 · 조치메모", accent: "border-slate-200 bg-slate-50" },
  { title: "다음 위험성평가 보완 후보", accent: "border-rose-100 bg-rose-50/60" },
];

const DOC_ACTIONS = ["부록 · 원문 기록 보기", "부록 · 세부 기록 보기", "PDF로 저장"];

export default async function RiskShareMonthlySummaryPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const period = getCurrentPeriodKst();

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            월간 안전운영 요약을 열 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            등록된 고객사 코드가 필요합니다. 링크팩에서 발급된 주소로 다시 접속해 주세요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-3xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            SafeMetrica · 월간 안전운영 요약
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {period.label} 안전운영 요약
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            {companyLabel} · 기간 {period.rangeLabel}
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-slate-900">이번 달 한눈에 보기</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-black text-slate-500">
              집계 연결 예정
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            공유확인, 작업 전 확인, 익명 의견, 외부인 확인, 관리자 검토 흐름이 정리되면 이 영역에
            이번 달 요약 문장이 표시됩니다. 실제 집계 연결 전까지는 화면 구성만 안내해 드립니다.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {STATUS_CARDS.map((card) => (
            <div key={card.title} className={`rounded-3xl border p-4 shadow-sm ${card.accent}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900">{card.title}</h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                  준비 중
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                집계 연결 전입니다. 현장 QR 접수와 관리자 검토 기록이 쌓이면 이 카드에 이번 달
                현황이 표시됩니다.
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">문서 작업</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {DOC_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                disabled
                className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-500"
              >
                {action} · 준비 중
              </button>
            ))}
          </div>
        </section>

        <p className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-6 text-slate-500 shadow-sm">
          본 화면은 운영기록을 정리하는 요약 화면이며, 최종 판단과 조치는 관리자와 사업주가
          검토합니다.
        </p>
      </section>
    </main>
  );
}
