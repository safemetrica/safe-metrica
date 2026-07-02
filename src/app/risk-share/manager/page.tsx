import { getTenantRegistryConfigByCode, selectSupabaseExportRows } from "@/lib/supabaseServer";

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

function getTodayLabelKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 (${weekday})`;
}

const TODAY_PRIORITY_EXAMPLES = [
  { tag: "긴급 제보", tone: "bg-rose-50 text-rose-700 ring-rose-100", text: "프레스 2라인 뒤편 통로 — 바닥 미끄러움 제보" },
  { tag: "미확인", tone: "bg-amber-50 text-amber-700 ring-amber-100", text: "이번 달 공유확인 미완료 인원 안내" },
  { tag: "외부인", tone: "bg-purple-50 text-purple-700 ring-purple-100", text: "협력업체 출입 전 안전확인 대기" },
];

const PENDING_STATUS_CARDS = [
  { title: "익명 의견 접수함", accent: "border-amber-100 bg-amber-50/60" },
  { title: "외부인 확인 현황", accent: "border-purple-100 bg-purple-50/60" },
];

const RISK_SHARE_PARTICIPATION_SOURCE = "risk_share_participation_submit_v1";
const RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT = 500;

const PARTICIPATION_SUMMARY_CARDS = [
  { key: "monthly" as const, title: "위험성평가 공유확인 현황", accent: "border-blue-100 bg-blue-50/60" },
  { key: "prework" as const, title: "작업 전 안전확인 현황", accent: "border-emerald-100 bg-emerald-50/60" },
];

type RiskShareParticipationSummaryRow = {
  raw_payload: { mode?: string } | null;
};

type RiskShareParticipationSummary = {
  status: "ok" | "not_configured" | "failed";
  counts: { monthly: number; prework: number };
};

async function fetchRiskShareParticipationSummary(
  companyCode: string
): Promise<RiskShareParticipationSummary> {
  const query = new URLSearchParams({
    select: "raw_payload",
    tenant_code: `eq.${companyCode}`,
    "raw_payload->>source": `eq.${RISK_SHARE_PARTICIPATION_SOURCE}`,
    limit: String(RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT),
  });

  try {
    const rows = await selectSupabaseExportRows<RiskShareParticipationSummaryRow>(
      "field_participation_submissions",
      query
    );

    return {
      status: "ok",
      counts: {
        monthly: rows.filter((row) => row.raw_payload?.mode === "monthly").length,
        prework: rows.filter((row) => row.raw_payload?.mode === "prework").length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      counts: { monthly: 0, prework: 0 },
    };
  }
}

export default async function RiskShareManagerHomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            관리자 홈을 열 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            등록된 고객사 코드가 필요합니다. 링크팩에서 발급된 관리자 홈 주소로 다시 접속해
            주세요.
          </p>
        </section>
      </main>
    );
  }

  const participationSummary = await fetchRiskShareParticipationSummary(companyCode);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            SafeMetrica · 안전운영
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              {companyLabel} — 위험성평가 공유확인
            </h1>
            <span className="text-sm font-bold text-slate-500">{getTodayLabelKst()}</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            현장 QR로 들어온 공유확인, 작업 전 확인, 익명 의견, 외부인 확인 흐름을 한 화면에서
            확인합니다.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-slate-900">오늘 확인할 항목</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-black text-slate-500">
              예시 화면
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {TODAY_PRIORITY_EXAMPLES.map((item) => (
              <li
                key={item.text}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
              >
                <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black ring-1 ${item.tone}`}>
                  {item.tag}
                </span>
                <span className="text-sm font-bold text-slate-800">{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-bold leading-5 text-slate-400">
            위 항목은 화면 구성을 보여주는 예시입니다. 실제 접수 집계는 아직 연결되지 않았습니다.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {PARTICIPATION_SUMMARY_CARDS.map((card) => (
            <div key={card.title} className={`rounded-3xl border p-4 shadow-sm ${card.accent}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900">{card.title}</h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                  {participationSummary.status === "ok"
                    ? `${participationSummary.counts[card.key]}건`
                    : "준비 중"}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                {participationSummary.status === "ok"
                  ? `현장 QR로 접수된 확인 ${participationSummary.counts[card.key]}건입니다.`
                  : "집계 연결 전입니다. 현장 QR 접수가 쌓이면 이 카드에 현황이 표시됩니다."}
              </p>
            </div>
          ))}

          {PENDING_STATUS_CARDS.map((card) => (
            <div key={card.title} className={`rounded-3xl border p-4 shadow-sm ${card.accent}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900">{card.title}</h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                  준비 중
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                집계 연결 전입니다. 현장 QR 접수가 쌓이면 이 카드에 현황이 표시됩니다.
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">월간 안전운영 요약</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            이번 달 확인·의견·검토 기록을 한 장의 안전운영 요약으로 정리합니다.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-sm font-black text-slate-600 md:w-auto"
          >
            월간 안전운영 요약 미리보기 · 준비 중
          </button>
        </section>

        <p className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-6 text-slate-500 shadow-sm">
          접수된 내용은 관리자 검토 후 월간 안전운영 요약에 반영됩니다.
        </p>
      </section>
    </main>
  );
}
