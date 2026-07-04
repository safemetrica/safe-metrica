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

function getTodayLabelKst() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 (${weekday})`;
}

function getCurrentKstMonthRange() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;

  const startOfMonthUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
  const startOfNextMonthUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  return {
    createdAtGte: startOfMonthUtc.toISOString(),
    createdAtLt: startOfNextMonthUtc.toISOString(),
  };
}

function getCurrentKstMonthDatePeriod() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
    dayAfterEnd: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
  };
}

const RISK_SHARE_PARTICIPATION_SOURCE = "risk_share_participation_submit_v1";
const RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT = 500;

const PARTICIPATION_SUMMARY_CARDS = [
  { key: "monthly" as const, title: "이번 달 위험성평가 공유확인", accent: "border-blue-100 bg-blue-50/60" },
  { key: "prework" as const, title: "이번 달 작업 전 안전확인", accent: "border-emerald-100 bg-emerald-50/60" },
];

type RiskShareParticipationSummaryRow = {
  raw_payload: { mode?: string } | null;
};

type RiskShareParticipationSummary = {
  status: "ok" | "not_configured" | "failed";
  counts: { monthly: number; prework: number };
};

async function fetchRiskShareParticipationSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string }
): Promise<RiskShareParticipationSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${RISK_SHARE_PARTICIPATION_SOURCE}`);
  query.append("created_at", `gte.${period.createdAtGte}`);
  query.append("created_at", `lt.${period.createdAtLt}`);
  query.set("limit", String(RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT));

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
const ANONYMOUS_FEEDBACK_CARD = { title: "익명 의견 접수함", accent: "border-amber-100 bg-amber-50/60" };

type AnonymousFeedbackSummaryRow = {
  raw_payload: unknown;
};

type AnonymousFeedbackSummary = {
  status: "ok" | "not_configured" | "failed";
  count: number;
};

async function fetchRiskShareAnonymousFeedbackSummary(
  companyCode: string
): Promise<AnonymousFeedbackSummary> {
  const monthRange = getCurrentKstMonthRange();
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `in.(${ANONYMOUS_FEEDBACK_SOURCES.join(",")})`);
  query.append("created_at", `gte.${monthRange.createdAtGte}`);
  query.append("created_at", `lt.${monthRange.createdAtLt}`);
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
const VISITOR_CONFIRMATION_CARD = { title: "외부인 확인 현황", accent: "border-purple-100 bg-purple-50/60" };

type VisitorConfirmationSummaryRow = {
  raw_payload: unknown;
};

type VisitorConfirmationSummary = {
  status: "ok" | "not_configured" | "failed";
  count: number;
};

async function fetchRiskShareVisitorConfirmationSummary(
  companyCode: string
): Promise<VisitorConfirmationSummary> {
  const monthRange = getCurrentKstMonthRange();
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${VISITOR_CONFIRMATION_SOURCE}`);
  query.append("created_at", `gte.${monthRange.createdAtGte}`);
  query.append("created_at", `lt.${monthRange.createdAtLt}`);
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

const REPRESENTATIVE_CONFIRMATION_CARD = { title: "근로자대표 확인", accent: "border-sky-100 bg-sky-50/60" };

export default async function RiskShareManagerHomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: companyCode }, lang);
  const fieldHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);

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

  const participationSummary = await fetchRiskShareParticipationSummary(
    companyCode,
    getCurrentKstMonthRange(),
  );
  const anonymousFeedbackSummary = await fetchRiskShareAnonymousFeedbackSummary(companyCode);
  const visitorConfirmationSummary = await fetchRiskShareVisitorConfirmationSummary(companyCode);
  const representativeSubmissionSummary = await fetchRiskShareRepresentativeSubmissionSummary(
    companyCode,
    getCurrentKstMonthDatePeriod(),
  );

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
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={fieldHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
            >
              현장 QR 입구로 이동
            </a>
          </div>
        </header>

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
                  ? `이번 달 현장 QR로 접수된 확인 ${participationSummary.counts[card.key]}건입니다.`
                  : "집계 연결 전입니다. 현장 QR 접수가 쌓이면 이 카드에 현황이 표시됩니다."}
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
                : "집계 연결 전입니다. 현장 QR 접수가 쌓이면 이 카드에 현황이 표시됩니다."}
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
                : "집계 연결 전입니다. 현장 QR 접수가 쌓이면 이 카드에 현황이 표시됩니다."}
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
                  ? `이번 달 접수된 근로자대표 확인 ${representativeSubmissionSummary.totalCount}건입니다.`
                  : "이번 달 접수 없음"
                : "집계 연결 전입니다. 현장 QR 접수가 쌓이면 이 카드에 현황이 표시됩니다."}
            </p>
            {representativeSubmissionSummary.status === "ok" ? (
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                서명 확인 {representativeSubmissionSummary.signatureConfirmedCount}건 · 선택 서명 미제출{" "}
                {representativeSubmissionSummary.signatureNotSubmittedCount}건
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">월간 안전운영 요약</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            이번 달 확인·의견·검토 기록을 한 장의 안전운영 요약으로 정리합니다.
          </p>
          <a
            href={monthlyHref}
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white md:w-auto"
          >
            월간 안전운영 요약 보기
          </a>
        </section>

        <p className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-xs font-bold leading-6 text-slate-500 shadow-sm">
          접수된 내용은 관리자 검토 후 월간 안전운영 요약에 반영됩니다.
        </p>
      </section>
    </main>
  );
}
