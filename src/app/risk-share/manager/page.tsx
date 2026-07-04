import type { ReactNode } from "react";

import { getTenantRegistryConfigByCode, selectSupabaseExportRows } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { fetchRiskShareRepresentativeSubmissionSummary } from "@/lib/riskShareRepresentativeSubmissionRecords";
import { verifyRiskShareManagerAccessToken } from "@/lib/risk-share/riskShareManagerAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    lang?: string | string[];
    access?: string | string[];
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

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / total) * 100));
}

type NavItemProps = {
  href: string;
  label: string;
  active?: boolean;
  icon: string;
};

function NavItem({ href, label, active = false, icon }: NavItemProps) {
  return (
    <a
      href={href}
      className={
        active
          ? "flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-extrabold text-white"
          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
      }
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

type MetricPillProps = {
  label: string;
  value: number;
};

function MetricPill({ label, value }: MetricPillProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white">
      <span className="text-xs font-semibold text-white/75">{label}</span>
      <span className="text-lg font-black tracking-tight">
        {value}
        <span className="ml-0.5 text-xs font-bold text-white/65">건</span>
      </span>
    </div>
  );
}

type StackSegment = {
  value: number;
  colorClass: string;
};

function StackBar({ segments, total }: { segments: StackSegment[]; total: number }) {
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
      {segments.map((segment, index) => (
        <span
          key={`${segment.colorClass}-${index}`}
          className={segment.colorClass}
          style={{ width: `${percent(segment.value, total)}%` }}
        />
      ))}
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: number;
  children: ReactNode;
};

function KpiCard({ label, value, children }: KpiCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-extrabold text-slate-500">{label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tight text-slate-950">{value}</span>
        <span className="text-sm font-black text-slate-400">건</span>
      </p>
      <div className="mt-4">{children}</div>
    </article>
  );
}

type StatusRowProps = {
  icon: string;
  title: string;
  count: number;
  total: number;
  children?: ReactNode;
};

function StatusRow({ icon, title, count, total, children }: StatusRowProps) {
  return (
    <div className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 md:grid-cols-[minmax(170px,230px)_1fr_56px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-600">
          {icon}
        </span>
        <p className="truncate text-sm font-black text-slate-900">{title}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-blue-600"
          style={{ width: `${percent(count, total)}%` }}
        />
      </div>
      <p className="text-right text-base font-black text-slate-950">
        {count}
        <span className="ml-0.5 text-xs font-black text-slate-400">건</span>
      </p>
      {children ? (
        <div className="flex flex-wrap gap-2 md:col-span-3 md:pl-12">
          {children}
        </div>
      ) : null}
    </div>
  );
}

type QuickActionProps = {
  href: string;
  title: string;
  description: string;
  icon: string;
};

function QuickAction({ href, title, description, icon }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-blue-600">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <span className="ml-auto text-sm font-black text-slate-400">→</span>
    </a>
  );
}

export default async function RiskShareManagerHomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: companyCode }, lang);
  const fieldHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);
  const currentPeriod = getCurrentKstMonthDatePeriod();
  const monthLabel = getMonthLabelFromPeriod(currentPeriod);

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

  const hasManagerAccess = verifyRiskShareManagerAccessToken(
    companyCode,
    readSearchParam(params.access),
  );

  if (!hasManagerAccess) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            관리자 전용 링크가 필요합니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            링크팩에서 발급된 관리자 홈 또는 월간 요약 주소로 다시 접속해 주세요.
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
    currentPeriod,
  );

  const monthlyConfirmationCount = participationSummary.counts.monthly;
  const preworkConfirmationCount = participationSummary.counts.prework;
  const monthlyWorkerSignatureCount = participationSummary.counts.monthlySignatureConfirmed;
  const preworkWorkerSignatureCount = participationSummary.counts.preworkSignatureConfirmed;
  const workerSignatureConfirmedCount = monthlyWorkerSignatureCount + preworkWorkerSignatureCount;
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
  const fieldConfirmationCount = monthlyConfirmationCount + preworkConfirmationCount;
  const workerSignatureNotSubmittedCount = Math.max(0, fieldConfirmationCount - workerSignatureConfirmedCount);

  return (
    <main className="min-h-screen bg-[#F3F5F8] text-slate-950 lg:flex">
      <aside className="hidden w-[228px] shrink-0 flex-col bg-[#0E1F3D] px-3.5 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 text-sm font-black">
            S
          </span>
          <span className="text-base font-black tracking-tight">SafeMetrica</span>
        </div>

        <section className="mt-5 rounded-2xl bg-white/10 px-3 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">사업장</p>
          <p className="mt-1 text-sm font-black text-white">{companyLabel}</p>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-300">
            위험성평가 공유확인 운영팩
          </p>
        </section>

        <nav className="mt-5 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            운영
          </p>
          <NavItem href={managerHref} label="대시보드" icon="대" active />
          <NavItem href={fieldHref} label="현장 QR 입구" icon="QR" />
          <NavItem href={monthlyHref} label="월간 안전운영 요약" icon="월" />
        </nav>

        <p className="mt-auto border-t border-white/10 px-3 pt-4 text-xs font-semibold leading-5 text-slate-500">
          SafeMetrica 안전운영 기록
        </p>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-7">
          <div>
            <p className="text-sm font-black text-slate-950">대시보드</p>
            <p className="text-xs font-semibold text-slate-500 lg:hidden">{companyLabel}</p>
          </div>
          <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
            <span>{monthLabel}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{companyLabel}</span>
          </div>
          <div className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
            관리자
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-5 px-4 py-5 lg:px-7">
          <section className="grid gap-5 rounded-[1.25rem] bg-gradient-to-br from-[#123B8F] via-blue-700 to-blue-600 p-6 text-white shadow-[0_8px_24px_rgba(18,59,143,0.20)] lg:grid-cols-[1fr_230px] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/70">
                위험성평가 공유확인 운영팩
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                위험성평가 공유확인 관리자 홈
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/80">
                현장 QR로 접수된 확인과 의견 흐름을 한 화면에서 확인합니다.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={fieldHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15"
                >
                  현장 QR 입구
                </a>
                <a
                  href={monthlyHref}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-blue-900 transition hover:bg-blue-50"
                >
                  월간 안전운영 요약
                </a>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <MetricPill label="이번 달 총 접수" value={totalSubmissionCount} />
              <MetricPill label="현장 확인" value={fieldConfirmationCount} />
              <MetricPill label="근로자 서명 포함" value={workerSignatureConfirmedCount} />
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_316px]">
            <div className="flex min-w-0 flex-col gap-5">
              <section className="grid gap-4 md:grid-cols-3">
                <KpiCard label="이번 달 총 접수" value={totalSubmissionCount}>
                  <StackBar
                    total={totalSubmissionCount}
                    segments={[
                      { value: monthlyConfirmationCount, colorClass: "bg-blue-600" },
                      { value: preworkConfirmationCount, colorClass: "bg-blue-400" },
                      { value: anonymousFeedbackCount, colorClass: "bg-blue-200" },
                      { value: visitorConfirmationCount, colorClass: "bg-teal-500" },
                      { value: representativeTotalCount, colorClass: "bg-slate-800" },
                    ]}
                  />
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
                    <span>공유확인 {monthlyConfirmationCount}</span>
                    <span>작업 전 {preworkConfirmationCount}</span>
                    <span>익명 {anonymousFeedbackCount}</span>
                    <span>외부인 {visitorConfirmationCount}</span>
                    <span>대표 {representativeTotalCount}</span>
                  </div>
                </KpiCard>

                <KpiCard label="현장 확인" value={fieldConfirmationCount}>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-blue-600"
                      style={{ width: `${percent(fieldConfirmationCount, totalSubmissionCount)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">
                      근로자 서명 포함 {workerSignatureConfirmedCount}건
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">
                      선택 서명 미제출 {workerSignatureNotSubmittedCount}건
                    </span>
                  </div>
                </KpiCard>

                <KpiCard label="근로자대표 확인" value={representativeTotalCount}>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full bg-teal-500"
                      style={{ width: `${percent(signatureConfirmedCount, representativeTotalCount)}%` }}
                    />
                    <span
                      className="block h-full bg-slate-300"
                      style={{
                        width: `${percent(signatureNotSubmittedCount, representativeTotalCount)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">
                      서명 포함 {signatureConfirmedCount}건
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">
                      선택 서명 미제출 {signatureNotSubmittedCount}건
                    </span>
                  </div>
                </KpiCard>
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5">
                  <h2 className="text-base font-black text-slate-950">이번 달 접수 현황</h2>
                  <p className="text-xs font-bold text-slate-400">
                    {currentPeriod.startDate} – {currentPeriod.endDate} · 현장 QR 접수 기준
                  </p>
                </div>

                <div className="pt-2">
                  <StatusRow
                    icon="공"
                    title="위험성평가 공유확인"
                    count={monthlyConfirmationCount}
                    total={totalSubmissionCount}
                  >
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                      근로자 서명 포함 {monthlyWorkerSignatureCount}건
                    </span>
                  </StatusRow>
                  <StatusRow
                    icon="작"
                    title="작업 전 안전확인"
                    count={preworkConfirmationCount}
                    total={totalSubmissionCount}
                  >
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                      근로자 서명 포함 {preworkWorkerSignatureCount}건
                    </span>
                  </StatusRow>
                  <StatusRow
                    icon="익"
                    title="익명 의견 · 아차사고 · 개선제안"
                    count={anonymousFeedbackCount}
                    total={totalSubmissionCount}
                  />
                  <StatusRow
                    icon="외"
                    title="외부인 출입 전 안전확인"
                    count={visitorConfirmationCount}
                    total={totalSubmissionCount}
                  />
                  <StatusRow
                    icon="대"
                    title="근로자대표 확인"
                    count={representativeTotalCount}
                    total={totalSubmissionCount}
                  >
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                      총 제출 {representativeTotalCount}건
                    </span>
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-700">
                      서명 포함 {signatureConfirmedCount}건
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                      선택 서명 미제출 {signatureNotSubmittedCount}건 · 확인 기록으로 집계
                    </span>
                  </StatusRow>
                </div>

                <p className="border-t border-slate-100 px-5 py-3 text-xs font-semibold leading-5 text-slate-400">
                  막대는 이번 달 총 접수 {totalSubmissionCount}건 대비 비중입니다.
                </p>
              </section>
            </div>

            <aside className="flex flex-col gap-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <h2 className="text-sm font-black text-slate-950">빠른 실행</h2>
                <div className="mt-3 space-y-2">
                  <QuickAction
                    href={fieldHref}
                    title="현장 QR 입구"
                    description="근로자·외부인 확인 화면으로 이동"
                    icon="QR"
                  />
                  <QuickAction
                    href={monthlyHref}
                    title="월간 안전운영 요약"
                    description="이번 달 기록 요약 화면으로 이동"
                    icon="월"
                  />
                </div>
              </section>

              <section className="rounded-3xl bg-gradient-to-br from-[#123B8F] to-blue-700 p-5 text-white shadow-[0_8px_24px_rgba(18,59,143,0.18)]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-white/75">
                  운영 인사이트
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/90">
                  이번 달 현장 확인 {fieldConfirmationCount}건, 익명 의견 {anonymousFeedbackCount}
                  건, 근로자대표 확인 {representativeTotalCount}건이 접수되었습니다.
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/90">
                  근로자 확인 서명은 {workerSignatureConfirmedCount}건 포함되었고, 근로자대표 서명 포함 확인은 {signatureConfirmedCount}건입니다.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-4">
                  <div>
                    <p className="text-lg font-black">{fieldConfirmationCount}건</p>
                    <p className="text-[11px] font-semibold text-white/65">현장 확인</p>
                  </div>
                  <div>
                    <p className="text-lg font-black">{workerSignatureConfirmedCount}건</p>
                    <p className="text-[11px] font-semibold text-white/65">근로자 서명</p>
                  </div>
                  <div>
                    <p className="text-lg font-black">{representativeTotalCount}건</p>
                    <p className="text-[11px] font-semibold text-white/65">근로자대표 확인</p>
                  </div>
                  <div>
                    <p className="text-lg font-black">{signatureConfirmedCount}건</p>
                    <p className="text-[11px] font-semibold text-white/65">대표 서명</p>
                  </div>
                </div>
              </section>

              <p className="px-1 text-xs font-semibold leading-6 text-slate-400">
                접수된 내용은 관리자 검토 후 월간 안전운영 요약에 반영됩니다. 최종 판단과 조치는
                관리자와 사업주가 검토합니다.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
