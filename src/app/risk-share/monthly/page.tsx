import { redirect } from "next/navigation";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { fetchRiskShareRepresentativeSubmissionSummary } from "@/lib/riskShareRepresentativeSubmissionRecords";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import MonthlyDesignerView from "@/components/risk-share/monthly/MonthlyDesignerView";

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
    monthLabel: `${month}월`,
    rangeLabel: `${year}.${pad(month)}.01 – ${year}.${pad(month)}.${pad(lastDay)}`,
    createdAtGte: startOfMonthUtc.toISOString(),
    createdAtLt: startOfNextMonthUtc.toISOString(),
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
    dayAfterEnd: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
  };
}

function getTodayKstLabel() {
  const now = new Date();
  const datePart = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/\s/g, "")
    .replace(/\.$/, "");
  const weekdayPart = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(now);

  return `${datePart} ${weekdayPart}`;
}

/** Pure calendar math — no query. Real calendar month labels for the axis of the
 * "월별 안전운영 접수 추이" empty-state chart when no month-over-month history exists yet. */
function getLastFiveMonthLabels() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const currentMonth = kst.getUTCMonth() + 1;
  const labels: string[] = [];

  for (let i = 4; i >= 0; i -= 1) {
    let month = currentMonth - i;
    while (month <= 0) {
      month += 12;
    }
    labels.push(`${month}월`);
  }

  return labels;
}

const RISK_SHARE_PARTICIPATION_SOURCE = "risk_share_participation_submit_v1";
const RISK_SHARE_MONTHLY_SUMMARY_LIMIT = 500;

type RiskShareParticipationRawPayload = {
  mode?: string;
  version_lock_id?: string | null;
  signature_present?: boolean | string | null;
  signature_url?: string | null;
};

type RiskShareParticipationSummaryRow = {
  version_lock_id?: string | null;
  manager_review_status?: string | null;
  raw_payload: RiskShareParticipationRawPayload | null;
};

type RiskShareParticipationSummary = {
  status: "ok" | "not_configured" | "failed";
  counts: {
    monthly: number;
    prework: number;
    monthlySignatureConfirmed: number;
    preworkSignatureConfirmed: number;
    versionLinkedMonthly: number;
    versionUnlinkedMonthly: number;
    confirmedVersionCount: number;
    reviewUnreviewed: number;
    reviewInProgress: number;
    reviewCompleted: number;
  };
};

function hasParticipationSignature(rawPayload: RiskShareParticipationRawPayload | null) {
  return rawPayload?.signature_present === true || rawPayload?.signature_present === "true" || Boolean(rawPayload?.signature_url);
}

async function fetchRiskShareMonthlyParticipationSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string }
): Promise<RiskShareParticipationSummary> {
  const query = new URLSearchParams();
  query.set("select", "version_lock_id,manager_review_status,raw_payload");
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
    const monthlyRows = rows.filter((row) => row.raw_payload?.mode === "monthly");
    const preworkRows = rows.filter((row) => row.raw_payload?.mode === "prework");
    const linkedVersionIds = monthlyRows
      .map((row) => row.version_lock_id || "")
      .filter((versionId) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          versionId,
        ),
      );
    const versionLinkedRows = monthlyRows.filter((row) =>
      linkedVersionIds.includes(row.version_lock_id || ""),
    );

    return {
      status: "ok",
      counts: {
        monthly: monthlyRows.length,
        prework: preworkRows.length,
        monthlySignatureConfirmed: monthlyRows.filter((row) => hasParticipationSignature(row.raw_payload)).length,
        preworkSignatureConfirmed: preworkRows.filter((row) => hasParticipationSignature(row.raw_payload)).length,
        versionLinkedMonthly: linkedVersionIds.length,
        versionUnlinkedMonthly: monthlyRows.length - linkedVersionIds.length,
        confirmedVersionCount: new Set(linkedVersionIds.map((id) => id.toLowerCase())).size,
        reviewUnreviewed: versionLinkedRows.filter(
          (row) => !row.manager_review_status || row.manager_review_status === "unreviewed",
        ).length,
        reviewInProgress: versionLinkedRows.filter(
          (row) => row.manager_review_status === "in_review",
        ).length,
        reviewCompleted: versionLinkedRows.filter(
          (row) => row.manager_review_status === "completed",
        ).length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      counts: {
        monthly: 0,
        prework: 0,
        monthlySignatureConfirmed: 0,
        preworkSignatureConfirmed: 0,
        versionLinkedMonthly: 0,
        versionUnlinkedMonthly: 0,
        confirmedVersionCount: 0,
        reviewUnreviewed: 0,
        reviewInProgress: 0,
        reviewCompleted: 0,
      },
    };
  }
}

const ANONYMOUS_FEEDBACK_SOURCES = ["anonymous_worker_feedback_v1", "risk_share_anonymous_feedback_v1"] as const;
const ANONYMOUS_FEEDBACK_SUMMARY_LIMIT = 500;

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

export default async function RiskShareMonthlySummaryPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const companyCode = normalizeCompanyCode(rawCompanyCode);
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const period = getCurrentPeriodKst();
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: companyCode }, lang);

  if (!tenantResolution.ok) {
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

  const tenantCode = tenantResolution.tenant.code;

  const tenantAccessResult = await requireTenantManagerAccessForCurrentSession({
    tenantCode,
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(monthlyHref)}`);
    }

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            이 회사의 관리자 권한이 확인되지 않았습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            운영 담당자에게 문의해 주세요.
          </p>
        </section>
      </main>
    );
  }

  const userEmail = tenantAccessResult.context.membership.userEmail;
  const userDisplayName = tenantAccessResult.context.membership.displayName || userEmail || "관리자";
  const avatarInitial = userDisplayName.trim().slice(0, 1) || "관";

  const participationSummary = await fetchRiskShareMonthlyParticipationSummary(tenantCode, period);
  const anonymousFeedbackSummary = await fetchRiskShareMonthlyAnonymousFeedbackSummary(tenantCode, period);
  const visitorConfirmationSummary = await fetchRiskShareMonthlyVisitorConfirmationSummary(tenantCode, period);
  const representativeSubmissionSummary = await fetchRiskShareRepresentativeSubmissionSummary(tenantCode, period);

  return (
    <MonthlyDesignerView
      managerHref={managerHref}
      monthlyHref={monthlyHref}
      periodTitle={`${period.label} 안전운영 요약`}
      periodDescription={`${companyLabel} · 기간 ${period.rangeLabel} · 이번 달 확인·의견·검토 기록을 한 장으로 정리합니다.`}
      monthLabel={period.monthLabel}
      todayLabel={getTodayKstLabel()}
      userDisplayName={userDisplayName}
      userEmail={userEmail}
      avatarInitial={avatarInitial}
      counts={{
        monthly: participationSummary.counts.monthly,
        prework: participationSummary.counts.prework,
        anonymous: anonymousFeedbackSummary.count,
        visitor: visitorConfirmationSummary.count,
        representative: representativeSubmissionSummary.totalCount,
        signatureConfirmed: representativeSubmissionSummary.signatureConfirmedCount,
        signatureNotSubmitted: representativeSubmissionSummary.signatureNotSubmittedCount,
        versionLinkedMonthly: participationSummary.counts.versionLinkedMonthly,
        versionUnlinkedMonthly: participationSummary.counts.versionUnlinkedMonthly,
        confirmedVersionCount: participationSummary.counts.confirmedVersionCount,
        reviewUnreviewed: participationSummary.counts.reviewUnreviewed,
        reviewInProgress: participationSummary.counts.reviewInProgress,
        reviewCompleted: participationSummary.counts.reviewCompleted,
      }}
      monthlyTrendFallbackLabels={getLastFiveMonthLabels()}
    />
  );
}
