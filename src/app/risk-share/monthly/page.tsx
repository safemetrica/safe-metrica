import { getTenantRegistryConfigByCode, selectSupabaseExportRows } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { fetchRiskShareRepresentativeSubmissionSummary } from "@/lib/riskShareRepresentativeSubmissionRecords";

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

function getCurrentPeriodKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");

  const startOfMonthUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
  const startOfNextMonthUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  return {
    label: `${year}년 ${month}월`,
    rangeLabel: `${year}.${pad(month)}.01 – ${year}.${pad(month)}.${pad(lastDay)}`,
    createdAtGte: startOfMonthUtc.toISOString(),
    createdAtLt: startOfNextMonthUtc.toISOString(),
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
    dayAfterEnd: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
  };
}

const RISK_SHARE_PARTICIPATION_SOURCE = "risk_share_participation_submit_v1";
const RISK_SHARE_MONTHLY_SUMMARY_LIMIT = 500;

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

async function fetchRiskShareMonthlyParticipationSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string }
): Promise<RiskShareParticipationSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${RISK_SHARE_PARTICIPATION_SOURCE}`);
  query.append("created_at", `gte.${period.createdAtGte}`);
  query.append("created_at", `lt.${period.createdAtLt}`);
  query.set("limit", String(RISK_SHARE_MONTHLY_SUMMARY_LIMIT));

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

const ANONYMOUS_FEEDBACK_SOURCES = ["anonymous_worker_feedback_v1", "risk_share_anonymous_feedback_v1"] as const;
const ANONYMOUS_FEEDBACK_SUMMARY_LIMIT = 500;
const ANONYMOUS_FEEDBACK_CARD = { title: "익명 의견 · 아차사고 · 개선제안", accent: "border-amber-100 bg-amber-50/60" };

type AnonymousFeedbackSummaryRow = {
  raw_payload: unknown;
};

type AnonymousFeedbackSummary = {
  status: "ok" | "not_configured" | "failed";
  count: number;
};

async function fetchRiskShareMonthlyAnonymousFeedbackSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string }
): Promise<AnonymousFeedbackSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `in.(${ANONYMOUS_FEEDBACK_SOURCES.join(",")})`);
  query.append("created_at", `gte.${period.createdAtGte}`);
  query.append("created_at", `lt.${period.createdAtLt}`);
  query.set("limit", String(ANONYMOUS_FEEDBACK_SUMMARY_LIMIT));

  try {
    const rows = await selectSupabaseExportRows<AnonymousFeedbackSummaryRow>(
      "field_participation_submissions",
      query
    );

    return { status: "ok", count: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      count: 0,
    };
  }
}

const VISITOR_CONFIRMATION_SOURCE = "risk_share_visitor_confirmation_v1";
const VISITOR_CONFIRMATION_SUMMARY_LIMIT = 500;
const VISITOR_CONFIRMATION_CARD = { title: "외부인 출입 전 안전확인", accent: "border-purple-100 bg-purple-50/60" };

type VisitorConfirmationSummaryRow = {
  raw_payload: unknown;
};

type VisitorConfirmationSummary = {
  status: "ok" | "not_configured" | "failed";
  count: number;
};

async function fetchRiskShareMonthlyVisitorConfirmationSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string }
): Promise<VisitorConfirmationSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${VISITOR_CONFIRMATION_SOURCE}`);
  query.append("created_at", `gte.${period.createdAtGte}`);
  query.append("created_at", `lt.${period.createdAtLt}`);
  query.set("limit", String(VISITOR_CONFIRMATION_SUMMARY_LIMIT));

  try {
    const rows = await selectSupabaseExportRows<VisitorConfirmationSummaryRow>(
      "field_participation_submissions",
      query
    );

    return { status: "ok", count: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      count: 0,
    };
  }
}

const REPRESENTATIVE_CONFIRMATION_CARD = { title: "근로자대표 확인·의견 기록", accent: "border-sky-100 bg-sky-50/60" };

export default async function RiskShareMonthlySummaryPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const period = getCurrentPeriodKst();
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang);
  const fieldHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);

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

  const participationSummary = await fetchRiskShareMonthlyParticipationSummary(companyCode, period);
  const anonymousFeedbackSummary = await fetchRiskShareMonthlyAnonymousFeedbackSummary(companyCode, period);
  const visitorConfirmationSummary = await fetchRiskShareMonthlyVisitorConfirmationSummary(companyCode, period);
  const representativeSubmissionSummary = await fetchRiskShareRepresentativeSubmissionSummary(companyCode, period);

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
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={managerHref}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white"
            >
              관리자 홈으로 돌아가기
            </a>
            <a
              href={fieldHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
            >
              현장 QR 입구로 이동
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">이번 달 한눈에 보기</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            이번 달 접수된 공유확인, 작업 전 안전확인, 익명 의견, 외부인 확인, 근로자대표 확인
            현황을 아래 카드에서 확인합니다.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
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
                  ? `이번 달 현장 QR로 접수된 확인 ${participationSummary.counts[card.key]}건입니다.`
                  : "집계 연결 전입니다. 현장 QR 접수와 관리자 검토 기록이 쌓이면 이 카드에 이번 달 현황이 표시됩니다."}
              </p>
            </div>
          ))}

          <div className={`rounded-3xl border p-4 shadow-sm ${ANONYMOUS_FEEDBACK_CARD.accent}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">{ANONYMOUS_FEEDBACK_CARD.title}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                {anonymousFeedbackSummary.status === "ok" ? `${anonymousFeedbackSummary.count}건` : "준비 중"}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {anonymousFeedbackSummary.status === "ok"
                ? anonymousFeedbackSummary.count > 0
                  ? `이번 달 접수된 익명 의견 ${anonymousFeedbackSummary.count}건입니다.`
                  : "이번 달 접수된 익명 의견이 없습니다."
                : "집계 연결 전입니다. 현장 QR 접수와 관리자 검토 기록이 쌓이면 이 카드에 이번 달 현황이 표시됩니다."}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 shadow-sm ${VISITOR_CONFIRMATION_CARD.accent}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">{VISITOR_CONFIRMATION_CARD.title}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                {visitorConfirmationSummary.status === "ok" ? `${visitorConfirmationSummary.count}건` : "준비 중"}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {visitorConfirmationSummary.status === "ok"
                ? visitorConfirmationSummary.count > 0
                  ? `이번 달 접수된 외부인 확인 ${visitorConfirmationSummary.count}건입니다.`
                  : "이번 달 접수된 외부인 확인이 없습니다."
                : "집계 연결 전입니다. 현장 QR 접수와 관리자 검토 기록이 쌓이면 이 카드에 이번 달 현황이 표시됩니다."}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 shadow-sm ${REPRESENTATIVE_CONFIRMATION_CARD.accent}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">{REPRESENTATIVE_CONFIRMATION_CARD.title}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-slate-500 ring-1 ring-slate-200">
                {representativeSubmissionSummary.status === "ok" ? `${representativeSubmissionSummary.totalCount}건` : "준비 중"}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {representativeSubmissionSummary.status === "ok"
                ? representativeSubmissionSummary.totalCount > 0
                  ? `이번 달 접수된 근로자대표 확인·의견 ${representativeSubmissionSummary.totalCount}건입니다.`
                  : "이번 달 접수 없음"
                : "집계 연결 전입니다. 현장 QR 접수와 관리자 검토 기록이 쌓이면 이 카드에 이번 달 현황이 표시됩니다."}
            </p>
            {representativeSubmissionSummary.status === "ok" ? (
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                서명 확인 {representativeSubmissionSummary.signatureConfirmedCount}건 · 선택 서명 미제출{" "}
                {representativeSubmissionSummary.signatureNotSubmittedCount}건
              </p>
            ) : null}
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
