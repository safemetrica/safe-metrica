import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getDefaultTenantSiteConfigByTenantCode,
  listTenantSitesByTenantCode,
  selectSupabaseExportRows,
  type TenantSiteConfig,
} from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { fetchRiskShareRepresentativeSubmissionSummary } from "@/lib/riskShareRepresentativeSubmissionRecords";
import { listManagerConfirmationReviews, updateManagerConfirmationReview, type ConfirmationReviewStatus } from "@/lib/risk-share/riskShareManagerConfirmationReview";
import { formatSeoulCustomerDateTime } from "@/lib/risk-share/riskShareCustomerDateTime.mjs";
import { canAccessRiskShareManagerTenant } from "@/lib/risk-share/riskShareManagerTenantAccess";
import { observeInternalTestRiskShareEntitlementShadow } from "@/lib/risk-share/riskShareEntitlementRuntimeShadow";
import { resolveRiskShareManagerTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { isTenantSiteProfileComplete } from "@/lib/tenant-onboarding/tenantSiteProfileValidation";
import {
  applyRiskShareDefaultSiteScope,
  resolveRiskShareSingleSiteScope,
} from "@/lib/risk-share/riskShareDefaultSiteScope";
import ManagerDesignerView from "@/components/risk-share/manager/ManagerDesignerView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    lang?: string | string[];
    reviewResult?: string | string[];
  }>;
};

function ManagerHomeBlocked({
  code,
  title,
  description,
}: {
  code: "manager_site_scope_ambiguous" | "manager_site_scope_unavailable";
  title: string;
  description: string;
}) {
  return (
    <main
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950"
      data-error-code={code}
    >
      <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-amber-900">{description}</p>
        <p className="mt-4 font-mono text-xs text-amber-800">{code}</p>
      </section>
    </main>
  );
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function updateConfirmationReview(formData: FormData) {
  "use server";
  const companyCode = normalizeCompanyCode(String(formData.get("companyCode") ?? ""));
  const submissionId = String(formData.get("submissionId") ?? "");
  const expectedStatus = String(formData.get("expectedStatus") ?? "") as ConfirmationReviewStatus;
  const nextStatus = String(formData.get("nextStatus") ?? "") as "in_review" | "completed";
  const actionNote = String(formData.get("actionNote") ?? "").trim();
  const validTransition =
    (expectedStatus === "unreviewed" && nextStatus === "in_review")
    || (expectedStatus === "in_review" && nextStatus === "completed");

  if (!companyCode || !UUID_PATTERN.test(submissionId) || actionNote.length > 500 || !validTransition) {
    redirect(`/risk-share/manager?company=${encodeURIComponent(companyCode)}&reviewResult=validation_failed#confirmation-review`);
  }

  const access = await requireTenantManagerAccessForCurrentSession({ tenantCode: companyCode });
  if (!access.ok) redirect("/login");
  const result = await updateManagerConfirmationReview({
    companyCode,
    actorMembershipId: access.context.membership.membershipId,
    submissionId,
    expectedStatus,
    nextStatus,
    actionNote,
  });
  revalidatePath("/risk-share/manager");
  revalidatePath("/risk-share/monthly");
  redirect(`/risk-share/manager?company=${encodeURIComponent(companyCode)}&reviewResult=${result.ok ? "updated" : encodeURIComponent(result.code)}#confirmation-review`);
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

function getMonthLabelFromPeriod(period: { startDate: string }) {
  const [year = "", month = "1"] = period.startDate.split("-");
  return `${year}년 ${Number(month)}월`;
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

/** Pure calendar math — no query. Real calendar dates for the day-label axis of the
 * "최근 7일 접수 흐름" empty-state chart when no day-by-day aggregation exists yet. */
function getLastSevenDayLabels() {
  const labels: string[] = [];

  for (let i = 6; i >= 0; i -= 1) {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000 - i * 24 * 60 * 60 * 1000);
    if (i === 0) {
      labels.push("오늘");
      continue;
    }
    const month = kst.getUTCMonth() + 1;
    const day = kst.getUTCDate();
    labels.push(`${month}.${day}`);
  }

  return labels;
}

const RISK_SHARE_PARTICIPATION_SOURCE = "risk_share_participation_submit_v1";
const RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT = 500;

type RiskShareParticipationRawPayload = {
  mode?: string;
  signature_present?: boolean | string | null;
  signature_url?: string | null;
};

type RiskShareParticipationSummaryRow = {
  raw_payload: RiskShareParticipationRawPayload | null;
};

type RiskShareParticipationSummary = {
  status: "ok" | "not_configured" | "failed";
  counts: {
    monthly: number;
    prework: number;
    monthlySignatureConfirmed: number;
    preworkSignatureConfirmed: number;
  };
};

function hasParticipationSignature(rawPayload: RiskShareParticipationRawPayload | null) {
  return rawPayload?.signature_present === true || rawPayload?.signature_present === "true" || Boolean(rawPayload?.signature_url);
}

async function fetchRiskShareParticipationSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string },
  siteId: string | null,
): Promise<RiskShareParticipationSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${RISK_SHARE_PARTICIPATION_SOURCE}`);
  query.append("created_at", `gte.${period.createdAtGte}`);
  query.append("created_at", `lt.${period.createdAtLt}`);
  query.set("limit", String(RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT));
  applyRiskShareDefaultSiteScope(query, siteId);

  try {
    const rows = await selectSupabaseExportRows<RiskShareParticipationSummaryRow>(
      "field_participation_submissions",
      query
    );
    const monthlyRows = rows.filter((row) => row.raw_payload?.mode === "monthly");
    const preworkRows = rows.filter((row) => row.raw_payload?.mode === "prework");

    return {
      status: "ok",
      counts: {
        monthly: monthlyRows.length,
        prework: preworkRows.length,
        monthlySignatureConfirmed: monthlyRows.filter((row) => hasParticipationSignature(row.raw_payload)).length,
        preworkSignatureConfirmed: preworkRows.filter((row) => hasParticipationSignature(row.raw_payload)).length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      counts: { monthly: 0, prework: 0, monthlySignatureConfirmed: 0, preworkSignatureConfirmed: 0 },
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

async function fetchRiskShareAnonymousFeedbackSummary(
  companyCode: string,
  siteId: string | null,
): Promise<AnonymousFeedbackSummary> {
  const monthRange = getCurrentKstMonthRange();
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `in.(${ANONYMOUS_FEEDBACK_SOURCES.join(",")})`);
  query.append("created_at", `gte.${monthRange.createdAtGte}`);
  query.append("created_at", `lt.${monthRange.createdAtLt}`);
  query.set("limit", String(ANONYMOUS_FEEDBACK_SUMMARY_LIMIT));
  applyRiskShareDefaultSiteScope(query, siteId);

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

async function fetchRiskShareVisitorConfirmationSummary(
  companyCode: string,
  siteId: string | null,
): Promise<VisitorConfirmationSummary> {
  const monthRange = getCurrentKstMonthRange();
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${VISITOR_CONFIRMATION_SOURCE}`);
  query.append("created_at", `gte.${monthRange.createdAtGte}`);
  query.append("created_at", `lt.${monthRange.createdAtLt}`);
  query.set("limit", String(VISITOR_CONFIRMATION_SUMMARY_LIMIT));
  applyRiskShareDefaultSiteScope(query, siteId);

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

type TenantSiteProfileSummary = {
  /** "not_configured" means the query itself succeeded but no active
   * default site exists yet -- distinct from "failed" (a real query error),
   * per the zero-state-vs-failure principle used across this page. */
  status: "ok" | "not_configured" | "failed";
  siteName: string | null;
  siteId: string | null;
  /** True only when every required operational profile field is valid:
   * site name, industry, processes, equipment, worker count, external
   * workforce flag, and worker representative flag. Never inferred from an
   * absent site or a failed lookup. */
  profileComplete: boolean;
};

function buildTenantSiteProfileSummary(site: TenantSiteConfig | null): TenantSiteProfileSummary {
  try {
    if (!site) {
      return { status: "not_configured", siteName: null, siteId: null, profileComplete: false };
    }

    return { status: "ok", siteName: site.siteName, siteId: site.id, profileComplete: isTenantSiteProfileComplete(site) };
  } catch {
    return {
      status: "failed",
      siteName: null,
      siteId: null,
      profileComplete: false,
    };
  }
}

export default async function RiskShareManagerHomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawCompanyCode = readSearchParam(params.company);
  const companyCode = normalizeCompanyCode(rawCompanyCode);
  const reviewResult = readSearchParam(params.reviewResult);
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenantResolution = await resolveRiskShareManagerTenant(rawCompanyCode);
  const companyLabel = (tenantResolution.ok ? tenantResolution.tenant.name : "") || companyCode || "현장";
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: companyCode }, lang);
  const confirmationReviewHref = `${buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang)}#confirmation-review`;
  const fieldHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);
  const currentPeriod = getCurrentKstMonthDatePeriod();
  const monthLabel = getMonthLabelFromPeriod(currentPeriod);

  if (!tenantResolution.ok) {
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

  const tenantCode = tenantResolution.tenant.code;

  const tenantAccessResult = await requireTenantManagerAccessForCurrentSession({
    tenantCode,
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(managerHref)}`);
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

  if (!canAccessRiskShareManagerTenant(tenantResolution.tenant.status, tenantAccessResult.context.role)) {
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

  await observeInternalTestRiskShareEntitlementShadow({
    boundaryId: "saas.manager.page",
    legacyDecision: "allow",
    tenantId: tenantAccessResult.context.selectedTenantId,
    tenantCode,
  });

  const userEmail = tenantAccessResult.context.membership.userEmail;
  const userDisplayName = tenantAccessResult.context.membership.displayName || userEmail || "관리자";
  const avatarInitial = userDisplayName.trim().slice(0, 1) || "관";
  const role = tenantAccessResult.context.role;
  const sourceRegistryHref =
    role === "tenant_admin" || role === "tenant_manager"
      ? buildRiskShareLangHref("/risk-share/manager/sources", { company: tenantCode }, lang)
      : undefined;
  const shareReviewHref =
    role === "tenant_admin" || role === "tenant_manager"
      ? buildRiskShareLangHref("/risk-share/manager/share-review", { company: tenantCode }, lang)
      : undefined;
  const inboxHref =
    role === "tenant_admin" || role === "tenant_manager"
      ? buildRiskShareLangHref("/risk-share/manager/inbox", { company: tenantCode }, lang)
      : undefined;
  const siteProfileHref =
    role === "tenant_admin" || role === "tenant_manager"
      ? buildRiskShareLangHref("/risk-share/manager/settings/site-profile", { company: tenantCode }, lang)
      : undefined;

  const siteScope = await Promise.all([
    getDefaultTenantSiteConfigByTenantCode(tenantCode),
    listTenantSitesByTenantCode(tenantCode),
  ]).catch(() => null);

  if (!siteScope) {
    return (
      <ManagerHomeBlocked
        code="manager_site_scope_unavailable"
        title="관리자 자료의 사업장 범위를 확인할 수 없습니다."
        description="불완전한 운영자료를 표시하지 않았습니다. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  const [defaultSite, tenantSites] = siteScope;
  const singleSiteScope = resolveRiskShareSingleSiteScope(defaultSite, tenantSites);

  if (!singleSiteScope.ok) {
    return (
      <ManagerHomeBlocked
        code="manager_site_scope_ambiguous"
        title="관리자 자료의 사업장 범위가 명확하지 않습니다."
        description="사업장 귀속이 잘못된 자료가 섞이지 않도록 관리자 자료 조회를 중단했습니다."
      />
    );
  }

  const siteProfileSummary = buildTenantSiteProfileSummary(defaultSite);
  const participationSummary = await fetchRiskShareParticipationSummary(
    tenantCode,
    getCurrentKstMonthRange(),
    siteProfileSummary.siteId,
  );
  const anonymousFeedbackSummary = await fetchRiskShareAnonymousFeedbackSummary(tenantCode, siteProfileSummary.siteId);
  const visitorConfirmationSummary = await fetchRiskShareVisitorConfirmationSummary(tenantCode, siteProfileSummary.siteId);
  const representativeSubmissionSummary = await fetchRiskShareRepresentativeSubmissionSummary(
    tenantCode,
    currentPeriod,
    siteProfileSummary.siteId,
  );
  const confirmationReviews = await listManagerConfirmationReviews(tenantCode, siteProfileSummary.siteId).catch(() => []);
  const reviewStatus = [
    { label: "확인 필요", value: confirmationReviews.filter((row) => row.reviewStatus === "unreviewed").length, colorVar: "--c3" },
    { label: "확인 중", value: confirmationReviews.filter((row) => row.reviewStatus === "in_review").length, colorVar: "--c1" },
    { label: "처리 완료", value: confirmationReviews.filter((row) => row.reviewStatus === "completed").length, colorVar: "--c2" },
  ];

  const monthlyConfirmationCount = participationSummary.counts.monthly;
  const preworkConfirmationCount = participationSummary.counts.prework;
  const anonymousFeedbackCount = anonymousFeedbackSummary.count;
  const visitorConfirmationCount = visitorConfirmationSummary.count;
  const representativeTotalCount = representativeSubmissionSummary.totalCount;
  const signatureConfirmedCount = representativeSubmissionSummary.signatureConfirmedCount;
  const signatureNotSubmittedCount = representativeSubmissionSummary.signatureNotSubmittedCount;
  const totalSubmissionCount =
    monthlyConfirmationCount +
    preworkConfirmationCount +
    anonymousFeedbackCount +
    visitorConfirmationCount +
    representativeTotalCount;
  const totalSubmissionIsComplete =
    participationSummary.status === "ok" &&
    anonymousFeedbackSummary.status === "ok" &&
    visitorConfirmationSummary.status === "ok" &&
    representativeSubmissionSummary.status === "ok";

  return (
    <ManagerDesignerView
      companyLabel={companyLabel}
      companyCode={tenantCode}
      managerHref={managerHref}
      monthlyHref={monthlyHref}
      confirmationReviewHref={confirmationReviewHref}
      fieldHref={fieldHref}
      monthLabel={monthLabel}
      todayLabel={getTodayKstLabel()}
      siteProfile={siteProfileSummary}
      siteProfileHref={siteProfileHref}
      counts={{
        monthly: monthlyConfirmationCount,
        prework: preworkConfirmationCount,
        anonymous: anonymousFeedbackCount,
        visitor: visitorConfirmationCount,
        representative: representativeTotalCount,
      }}
      statuses={{
        monthly: participationSummary.status,
        prework: participationSummary.status,
        anonymous: anonymousFeedbackSummary.status,
        visitor: visitorConfirmationSummary.status,
        representative: representativeSubmissionSummary.status,
      }}
      totalSubmissionCount={totalSubmissionCount}
      totalSubmissionIsComplete={totalSubmissionIsComplete}
      representative={{
        totalCount: representativeTotalCount,
        signatureConfirmedCount,
        signatureNotSubmittedCount,
        status: representativeSubmissionSummary.status,
      }}
      reviewStatus={reviewStatus}
      reviewResult={reviewResult}
      confirmationReviewAction={updateConfirmationReview}
      recentSubmissions={confirmationReviews.slice(0, 10).map((row) => ({
        id: row.id,
        reviewStatus: row.reviewStatus,
        actionNote: row.actionNote,
        category: "공유확인",
        categoryBadgeClass: "b-blue",
        submitterLabel: "근로자 확인",
        detail: row.title,
        submittedAtLabel: formatSeoulCustomerDateTime(row.createdAt),
        statusLabel: row.reviewStatus === "completed" ? "처리 완료" : row.reviewStatus === "in_review" ? "확인 중" : "확인 필요",
        statusBadgeClass: row.reviewStatus === "completed" ? "b-green" : row.reviewStatus === "in_review" ? "b-blue" : "b-orange",
      }))}
      userDisplayName={userDisplayName}
      userEmail={userEmail}
      avatarInitial={avatarInitial}
      weeklyTrendFallbackLabels={getLastSevenDayLabels()}
      sourceRegistryHref={sourceRegistryHref}
      shareReviewHref={shareReviewHref}
      inboxHref={inboxHref}
    />
  );
}
