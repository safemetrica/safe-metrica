import Link from "next/link";
import { redirect } from "next/navigation";

import { getCompanyConfig, getCompanyConfigByCode } from "@/lib/company";
import PrintButton from "./PrintButton";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import {
  fetchWorkerRepresentativeConfirmationRecords,
  type WorkerRepresentativeConfirmationRecord,
} from "@/lib/workerRepresentativeConfirmationRecords";

export const dynamic = "force-dynamic";

const FIELD_PARTICIPATION_LIMIT = 500;
const EVIDENCE_ITEM_LIMIT = 1000;

type SearchParams = {
  month?: string | string[];
  company?: string | string[];
};

type MonthPeriod = {
  monthKey: string;
  startDate: string;
  endDate: string;
  dayAfterEnd: string;
};

type FieldParticipationRow = {
  tenant_code?: unknown;
  submission_type?: unknown;
  legacy_type?: unknown;
  title?: unknown;
  status?: unknown;
  reported_date?: unknown;
  created_at?: unknown;
};

type FieldParticipationSummary = {
  status: "ok" | "not_configured" | "failed";
  shareConfirmationCount: number;
  workerReportCount: number;
  reviewNeededCount: number;
};

type EvidenceItemRow = {
  company_code?: unknown;
  source_type?: unknown;
  submission_type?: unknown;
  evidence_type_code?: unknown;
  evidence_role?: unknown;
  submitted_at?: unknown;
  created_at?: unknown;
};

type EvidenceSummary = {
  status: "ok" | "not_configured" | "failed";
  totalCount: number;
  shareConfirmationAttachmentCount: number;
  workerReportAttachmentCount: number;
  nearMissAttachmentCount: number;
  improvementSuggestionAttachmentCount: number;
  fieldParticipationAttachmentCount: number;
  tbmAttachmentCount: number;
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getRiskShareMonthlyCompany(searchParams?: SearchParams) {
  const rawCompanyQuery = getSingleSearchParam(searchParams?.company);

  if (rawCompanyQuery === "richi") {
    return getCompanyConfigByCode("richi").catch(() => null);
  }

  return getCompanyConfig().catch(() => null);
}

type TbmVoiceMonthlyCountRow = {
  id?: unknown;
};

async function fetchRichiMonthlyTbmCount(period: MonthPeriod) {
  const query = new URLSearchParams({
    select: "id",
    company_code: "eq.richi",
    date_value: `gte.${period.startDate}`,
    order: "date_value.desc,created_at.desc",
  });

  query.append("date_value", `lte.${period.endDate}`);

  const rows = await selectSupabaseExportRows<TbmVoiceMonthlyCountRow>(
    "tbm_voice_submissions",
    query,
  );

  return rows.length;
}

function getKstDateString(date: Date) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 10);
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function getDayAfter(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeMonthParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const text = typeof rawValue === "string" ? rawValue.trim() : "";

  if (/^\d{4}-\d{2}$/.test(text)) {
    return text;
  }

  return getKstDateString(new Date()).slice(0, 7);
}

function getMonthPeriod(monthKey: string): MonthPeriod {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startDate = `${monthKey}-01`;
  const endDate = getLastDayOfMonth(year, month);

  return {
    monthKey,
    startDate,
    endDate,
    dayAfterEnd: getDayAfter(endDate),
  };
}

function buildPeriodFilter(
  createdAtColumn: string,
  eventDateColumn: string,
  period: MonthPeriod,
) {
  return `(${[
    `and(${createdAtColumn}.gte.${period.startDate}T00:00:00.000Z,${createdAtColumn}.lt.${period.dayAfterEnd}T00:00:00.000Z)`,
    `and(${eventDateColumn}.gte.${period.startDate},${eventDateColumn}.lte.${period.endDate})`,
  ].join(",")})`;
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSubmissionType(value: unknown) {
  const text = readText(value).toLowerCase();

  if (text.includes("공유확인") || text.includes("share")) {
    return "공유확인";
  }

  if (
    text.includes("위험제보") ||
    text.includes("위험 제보") ||
    text.includes("risk")
  ) {
    return "위험제보";
  }

  if (text.includes("아차") || text.includes("near")) {
    return "아차사고";
  }

  if (
    text.includes("개선제안") ||
    text.includes("개선 제안") ||
    text.includes("improvement")
  ) {
    return "개선제안";
  }

  return text ? "기타" : "확인 필요";
}

function normalizeStatus(value: unknown) {
  const text = readText(value).toLowerCase();

  if (
    text.includes("조치완료") ||
    text.includes("완료") ||
    text.includes("done") ||
    text.includes("completed")
  ) {
    return "조치완료";
  }

  if (text.includes("반려") || text.includes("reject")) {
    return "반려";
  }

  if (
    text.includes("조치필요") ||
    text.includes("필요") ||
    text.includes("action_required")
  ) {
    return "조치필요";
  }

  if (text.includes("검토") || text.includes("review")) {
    return "검토중";
  }

  if (text.includes("접수") || text.includes("received")) {
    return "접수";
  }

  return "확인 필요";
}

function buildTimestampPeriodFilter(
  createdAtColumn: string,
  eventAtColumn: string,
  period: MonthPeriod,
) {
  return `(${[
    `and(${createdAtColumn}.gte.${period.startDate}T00:00:00.000Z,${createdAtColumn}.lt.${period.dayAfterEnd}T00:00:00.000Z)`,
    `and(${eventAtColumn}.gte.${period.startDate}T00:00:00.000Z,${eventAtColumn}.lt.${period.dayAfterEnd}T00:00:00.000Z)`,
  ].join(",")})`;
}

function getEvidenceRole(row: EvidenceItemRow) {
  return readText(row.evidence_role);
}

function isTbmEvidence(row: EvidenceItemRow) {
  return (
    readText(row.source_type) === "tbm_voice" ||
    getEvidenceRole(row).startsWith("tbm_")
  );
}

function getSubmissionType(row: FieldParticipationRow) {
  return normalizeSubmissionType(row.submission_type || row.legacy_type);
}

function isShareConfirmation(row: FieldParticipationRow) {
  return getSubmissionType(row) === "공유확인";
}

function isFieldReviewNeeded(row: FieldParticipationRow) {
  if (isShareConfirmation(row)) {
    return false;
  }

  const status = normalizeStatus(row.status);
  return status !== "조치완료" && status !== "반려";
}

function isDateValueInPeriod(value: string | null, period: MonthPeriod) {
  if (!value) {
    return false;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value >= period.startDate && value <= period.endDate;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const kstDate = getKstDateString(date);
  return kstDate >= period.startDate && kstDate <= period.endDate;
}

function isRepresentativeRecordInPeriod(
  record: WorkerRepresentativeConfirmationRecord,
  period: MonthPeriod,
) {
  return (
    isDateValueInPeriod(record.submittedAt, period) ||
    isDateValueInPeriod(record.confirmedAt, period)
  );
}

function isRepresentativeReviewNeeded(
  record: WorkerRepresentativeConfirmationRecord,
) {
  return (
    record.hasObjection ||
    record.reviewStatus === "미확인" ||
    record.reviewStatus === "검토 필요" ||
    record.reviewStatus === "이견 검토 중" ||
    record.reviewStatus === "보완 요청"
  );
}

async function fetchEvidenceSummary(
  companyCode: string,
  period: MonthPeriod,
): Promise<EvidenceSummary> {
  const query = new URLSearchParams({
    select:
      "company_code,source_type,submission_type,evidence_type_code,evidence_role,submitted_at,created_at",
    company_code: `eq.${companyCode}`,
    or: buildTimestampPeriodFilter("created_at", "submitted_at", period),
    order: "created_at.desc",
    limit: String(EVIDENCE_ITEM_LIMIT),
  });

  try {
    const rows = await selectSupabaseExportRows<EvidenceItemRow>(
      "evidence_items",
      query,
    );

    return {
      status: "ok",
      totalCount: rows.length,
      shareConfirmationAttachmentCount: rows.filter(
        (row) => getEvidenceRole(row) === "share_confirmation_attachment",
      ).length,
      workerReportAttachmentCount: rows.filter(
        (row) => getEvidenceRole(row) === "worker_report_attachment",
      ).length,
      nearMissAttachmentCount: rows.filter(
        (row) => getEvidenceRole(row) === "near_miss_attachment",
      ).length,
      improvementSuggestionAttachmentCount: rows.filter(
        (row) => getEvidenceRole(row) === "improvement_suggestion_attachment",
      ).length,
      fieldParticipationAttachmentCount: rows.filter(
        (row) => readText(row.source_type) === "field_participation",
      ).length,
      tbmAttachmentCount: rows.filter(isTbmEvidence).length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing")
        ? "not_configured"
        : "failed",
      totalCount: 0,
      shareConfirmationAttachmentCount: 0,
      workerReportAttachmentCount: 0,
      nearMissAttachmentCount: 0,
      improvementSuggestionAttachmentCount: 0,
      fieldParticipationAttachmentCount: 0,
      tbmAttachmentCount: 0,
    };
  }
}

async function fetchFieldParticipationSummary(
  companyCode: string,
  period: MonthPeriod,
): Promise<FieldParticipationSummary> {
  const query = new URLSearchParams({
    select:
      "tenant_code,submission_type,legacy_type,title,status,reported_date,created_at",
    tenant_code: `eq.${companyCode}`,
    or: buildPeriodFilter("created_at", "reported_date", period),
    order: "reported_date.desc",
    limit: String(FIELD_PARTICIPATION_LIMIT),
  });

  try {
    const rows = await selectSupabaseExportRows<FieldParticipationRow>(
      "field_participation_submissions",
      query,
    );

    const shareConfirmationCount = rows.filter(isShareConfirmation).length;
    const workerReportRows = rows.filter((row) => !isShareConfirmation(row));
    const reviewNeededCount =
      workerReportRows.filter(isFieldReviewNeeded).length;

    return {
      status: "ok",
      shareConfirmationCount,
      workerReportCount: workerReportRows.length,
      reviewNeededCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing")
        ? "not_configured"
        : "failed",
      shareConfirmationCount: 0,
      workerReportCount: 0,
      reviewNeededCount: 0,
    };
  }
}

function StatCard({
  label,
  value,
  hint,
  isRichiFullOperation = false,
}: {
  label: string;
  value: string;
  hint: string;
  isRichiFullOperation?: boolean;
}) {
  return (
    <article
      className={
        isRichiFullOperation
          ? "rounded-3xl border border-[#D6EDE6] bg-white p-5 shadow-sm"
          : "rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30"
      }
    >
      <p
        className={
          isRichiFullOperation
            ? "text-sm font-bold text-teal-700"
            : "text-sm font-bold text-slate-400"
        }
      >
        {label}
      </p>
      <p
        className={
          isRichiFullOperation
            ? "mt-3 text-3xl font-black text-[#102033]"
            : "mt-3 text-3xl font-black text-white"
        }
      >
        {value}
      </p>
      <p
        className={
          isRichiFullOperation
            ? "mt-3 text-sm leading-6 text-slate-600"
            : "mt-3 text-sm leading-6 text-slate-300"
        }
      >
        {hint}
      </p>
    </article>
  );
}

export default async function RiskSharePackMonthlyReportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const monthKey = normalizeMonthParam(params.month);
  const period = getMonthPeriod(monthKey);

  const company = await getRiskShareMonthlyCompany(params);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  if (company.code === "mons") {
    redirect("/login?error=risk_share_pack_not_available");
  }

  const isRichiFullOperation = company.code === "richi";

  const [
    fieldSummary,
    evidenceSummary,
    representativeStore,
    richiMonthlyTbmCount,
  ] = await Promise.all([
    fetchFieldParticipationSummary(company.code, period),
    fetchEvidenceSummary(company.code, period),
    fetchWorkerRepresentativeConfirmationRecords(company.code).catch(() => ({
      status: "failed" as const,
      records: [] as WorkerRepresentativeConfirmationRecord[],
    })),
    isRichiFullOperation
      ? fetchRichiMonthlyTbmCount(period).catch(() => null)
      : Promise.resolve(null),
  ]);

  const representativeRecords = representativeStore.records.filter((record) =>
    isRepresentativeRecordInPeriod(record, period),
  );
  const representativeObjectionCount = representativeRecords.filter(
    (record) => record.hasObjection || Boolean(record.objectionDetail),
  ).length;
  const representativeReviewNeededCount = representativeRecords.filter(
    isRepresentativeReviewNeeded,
  ).length;
  const totalReviewNeeded =
    fieldSummary.reviewNeededCount + representativeReviewNeededCount;
  const hasLoadWarning =
    fieldSummary.status !== "ok" ||
    evidenceSummary.status !== "ok" ||
    representativeStore.status !== "ok";
  const reportReadyStatus = hasLoadWarning ? "확인 필요" : "준비 가능";
  const mainClassName = isRichiFullOperation
    ? "min-h-screen bg-[#EAF6F1] px-4 py-6 text-[#102033] print:bg-white print:text-slate-950"
    : "min-h-screen bg-slate-950 px-4 py-6 text-slate-100 print:bg-white print:text-slate-950";
  const shellClassName = isRichiFullOperation
    ? "rounded-3xl border border-[#D6EDE6] bg-white p-6 shadow-sm print:border-slate-300 print:bg-white"
    : "rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30 print:border-slate-300 print:bg-white";
  const eyebrowClassName = isRichiFullOperation
    ? "text-sm font-bold text-teal-700 print:text-cyan-700"
    : "text-sm font-bold text-cyan-300 print:text-cyan-700";
  const headingClassName = isRichiFullOperation
    ? "text-xl font-black text-[#102033] print:text-slate-950"
    : "text-xl font-black text-white print:text-slate-950";
  const bodyClassName = isRichiFullOperation
    ? "text-sm leading-6 text-slate-600 print:text-slate-700"
    : "text-sm leading-6 text-slate-400 print:text-slate-700";
  const secondaryButtonClassName = isRichiFullOperation
    ? "rounded-2xl border border-[#D6EDE6] bg-white px-4 py-2 text-sm font-bold text-[#102033] hover:border-[#16A085] hover:text-[#12806A]"
    : "rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-200";
  const evidenceCardClassName = isRichiFullOperation
    ? "rounded-2xl border border-[#D6EDE6] bg-white p-4 shadow-sm print:border-slate-300 print:bg-slate-50"
    : "rounded-2xl border border-slate-700 bg-slate-950/60 p-4 print:border-slate-300 print:bg-slate-50";
  const evidenceLabelClassName = isRichiFullOperation
    ? "text-sm font-bold text-teal-700 print:text-slate-700"
    : "text-sm font-bold text-slate-400 print:text-slate-700";
  const evidenceValueClassName = isRichiFullOperation
    ? "mt-2 text-2xl font-black text-[#102033] print:text-slate-950"
    : "mt-2 text-2xl font-black text-white print:text-slate-950";

  const evidenceTotalCount =
    evidenceSummary.status === "ok" ? evidenceSummary.totalCount : 0;
  const displayRichiMonthlyTbmCount = richiMonthlyTbmCount ?? 0;
  const richiPrioritySignals = [
    totalReviewNeeded > 0 ? `관리자 검토 필요 ${totalReviewNeeded}건` : null,
    displayRichiMonthlyTbmCount > 0
      ? `TBM 운영기록 ${displayRichiMonthlyTbmCount}건`
      : null,
    evidenceTotalCount > 0 ? `증빙 파일 ${evidenceTotalCount}건` : null,
  ]
    .filter((signal): signal is string => Boolean(signal))
    .slice(0, 3);

  return (
    <main className={mainClassName}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className={shellClassName}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className={eyebrowClassName}>
                {isRichiFullOperation
                  ? "SafeMetrica Monthly Operation Report"
                  : "Risk Share Pack Monthly Report"}
              </p>
              <h1
                className={
                  isRichiFullOperation
                    ? "mt-2 text-3xl font-black text-[#102033] print:text-slate-950"
                    : "mt-2 text-3xl font-black text-white print:text-slate-950"
                }
              >
                {isRichiFullOperation
                  ? "월간 운영기록 요약"
                  : "공유팩 월간 운영요약"}
              </h1>
              <p
                className={
                  isRichiFullOperation
                    ? "mt-3 text-sm leading-6 text-slate-600 print:text-slate-700"
                    : "mt-3 text-sm leading-6 text-slate-300 print:text-slate-700"
                }
              >
                {company.name} · {monthKey} 기준 ·{" "}
                {isRichiFullOperation
                  ? "작업 전 확인·서명, 익명 의견, TBM 운영기록, 근로자대표 확인 중심"
                  : "공유확인, 현장 의견, 근로자대표 참여확인 중심"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                href={
                  isRichiFullOperation
                    ? "/manager/risk-share?company=richi"
                    : "/manager/risk-share"
                }
                className={secondaryButtonClassName}
              >
                {isRichiFullOperation ? "관리자 홈" : "공유팩 홈"}
              </Link>
              {isRichiFullOperation ? null : (
                <Link
                  href="/monthly-report"
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-blue-400 hover:text-blue-200"
                >
                  전체 월간보고서
                </Link>
              )}
              <PrintButton />
            </div>
          </div>

          <div
            className={
              isRichiFullOperation
                ? "mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 print:border-amber-300 print:bg-amber-50 print:text-amber-900"
                : "mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100 print:border-amber-300 print:bg-amber-50 print:text-amber-900"
            }
          >
            {isRichiFullOperation
              ? "이 화면은 작업 전 확인·서명, 익명 의견, TBM 운영기록, 근로자대표 확인 자료를 월간 단위로 정리하는 운영 확인 화면입니다. 법적 판단이나 조치완료 확정을 대신하지 않습니다."
              : "이 보고서는 공유팩 운영기록을 월간 단위로 정리하는 자료입니다. 법적 판단이나 조치완료 확정을 대신하지 않습니다."}
          </div>
        </section>

        {hasLoadWarning ? (
          <section
            className={
              isRichiFullOperation
                ? "rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800 print:border-amber-300 print:bg-amber-50 print:text-amber-900"
                : "rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm font-bold leading-6 text-amber-100 print:border-amber-300 print:bg-amber-50 print:text-amber-900"
            }
          >
            {isRichiFullOperation
              ? "일부 운영기록 조회가 실패했거나 설정 확인이 필요합니다. 고객 전달 전 관리자 화면의 접수 내용을 다시 확인하세요."
              : "일부 원장 조회가 실패했거나 설정 확인이 필요합니다. 고객 전달 전 접수함과 Export를 다시 확인하세요."}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={
              isRichiFullOperation ? "작업 전 확인·서명" : "근로자 공유확인"
            }
            value={
              fieldSummary.status === "ok"
                ? `${fieldSummary.shareConfirmationCount}건`
                : "확인 필요"
            }
            hint={
              isRichiFullOperation
                ? "작업 전 확인·서명 제출 기록입니다. 조치 KPI에는 섞지 않습니다."
                : "위험성평가 공유확인 제출 기록입니다. 조치 KPI에는 섞지 않습니다."
            }
            isRichiFullOperation={isRichiFullOperation}
          />
          <StatCard
            label={isRichiFullOperation ? "의견·불편사항" : "위험제보·개선의견"}
            value={
              fieldSummary.status === "ok"
                ? `${fieldSummary.workerReportCount}건`
                : "확인 필요"
            }
            hint={
              isRichiFullOperation
                ? "익명 의견, 불편사항, 개선제안 등 관리자 검토대상 기록입니다."
                : "위험제보, 아차사고, 개선제안 등 관리자 검토대상 기록입니다."
            }
            isRichiFullOperation={isRichiFullOperation}
          />
          <StatCard
            label="관리자 검토 필요"
            value={
              fieldSummary.status === "ok"
                ? `${totalReviewNeeded}건`
                : "확인 필요"
            }
            hint={
              isRichiFullOperation
                ? "작업 전 확인·서명을 제외한 현장 의견과 근로자대표 보완 의견 중 검토 후보입니다."
                : "공유확인을 제외한 현장 의견과 근로자대표 보완 의견 중 검토 후보입니다."
            }
            isRichiFullOperation={isRichiFullOperation}
          />
          <StatCard
            label="근로자대표 참여확인"
            value={`${representativeRecords.length}건`}
            hint="근로자대표가 제출한 참여확인 기록입니다."
            isRichiFullOperation={isRichiFullOperation}
          />
          <StatCard
            label="보완 의견 있음"
            value={`${representativeObjectionCount}건`}
            hint="근로자대표 참여확인 중 별도 의견 또는 보완 의견이 포함된 기록입니다."
            isRichiFullOperation={isRichiFullOperation}
          />
          <StatCard
            label="증빙 파일"
            value={
              evidenceSummary.status === "ok"
                ? `${evidenceSummary.totalCount}건`
                : "확인 필요"
            }
            hint={
              isRichiFullOperation
                ? "월간 운영 확인을 위해 모인 사진·파일 증빙 수입니다. 조치완료를 자동 확정하지 않습니다."
                : "evidence_items 원장 기준 사진·파일 증빙 수입니다. 조치완료를 자동 확정하지 않습니다."
            }
            isRichiFullOperation={isRichiFullOperation}
          />
          <StatCard
            label="고객 전달자료"
            value={reportReadyStatus}
            hint={
              isRichiFullOperation
                ? "내부 운영자가 확인 후 월간 운영기록 전달자료로 정리합니다."
                : "내부 운영자가 확인 후 월간 요약 또는 CSV 전달자료로 정리합니다."
            }
            isRichiFullOperation={isRichiFullOperation}
          />
        </section>

        {!isRichiFullOperation ? (
          <section className={shellClassName}>
            <div className="flex flex-col gap-2">
              <p className={eyebrowClassName}>월간 안전운영 브리핑 후보</p>
              <h2 className={headingClassName}>
                공유·확인·의견·검토 흐름 요약
              </h2>
              <p className={`mt-2 ${bodyClassName}`}>
                이번 달 공유확인{" "}
                {fieldSummary.status === "ok"
                  ? `${fieldSummary.shareConfirmationCount}건`
                  : "확인 필요"}
                , 현장 의견·위험제보{" "}
                {fieldSummary.status === "ok"
                  ? `${fieldSummary.workerReportCount}건`
                  : "확인 필요"}
                , 근로자대표 참여확인 {representativeRecords.length}건이 월간
                운영기록 후보로 정리되었습니다. 관리자 검토가 필요한 항목은{" "}
                {fieldSummary.status === "ok" ? `${totalReviewNeeded}건` : "확인 필요"}
                이며, 사진·파일 증빙은{" "}
                {evidenceSummary.status === "ok"
                  ? `${evidenceSummary.totalCount}건`
                  : "확인 필요"}
                연결되어 있습니다.
              </p>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <article className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 print:border-emerald-300 print:bg-emerald-50">
                <p className="text-sm font-black text-emerald-200 print:text-emerald-900">
                  공유·확인
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-50 print:text-emerald-900">
                  위험요인 공유본과 근로자 확인기록을 월간 단위로 구분합니다.
                  외부 인력 확인은 운영상 분류가 적용된 경우 별도 확인자료
                  후보로 정리합니다.
                </p>
              </article>

              <article className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 print:border-blue-300 print:bg-blue-50">
                <p className="text-sm font-black text-blue-200 print:text-blue-900">
                  의견·제보
                </p>
                <p className="mt-2 text-sm leading-6 text-blue-50 print:text-blue-900">
                  위험제보, 아차사고, 개선제안은 공유확인과 분리해 관리자
                  검토대상으로 정리합니다. 접수만으로 조치 완료로 보지
                  않습니다.
                </p>
              </article>

              <article className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 print:border-amber-300 print:bg-amber-50">
                <p className="text-sm font-black text-amber-200 print:text-amber-900">
                  관리자 검토·추적 필요
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-50 print:text-amber-900">
                  검토 필요 항목은 조치메모, 후속 확인, 다음 달 추적 필요
                  후보로 분리합니다. 최종 판단과 조치 확정은 관리자 또는
                  사업주가 수행합니다.
                </p>
              </article>
            </div>

            <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-xs leading-5 text-slate-400 print:border-slate-300 print:bg-slate-50 print:text-slate-700">
              본 브리핑은 월간 운영기록을 이해하기 위한 요약 후보입니다.
              법적 판단, 위험성평가 완료, 조치완료 또는 과태료 관련 결과를
              확정하지 않습니다.
            </p>
          </section>
        ) : null}

        {!isRichiFullOperation ? (
          <section className={shellClassName}>
            <div className="flex flex-col gap-2">
              <p className={eyebrowClassName}>외부 인력 확인 현황 샘플</p>
              <h2 className={headingClassName}>
                운영상 분류별 위험요인 공유확인 기록
              </h2>
              <p className={`mt-2 ${bodyClassName}`}>
                외부 인력 확인은 법적 지위 판단이 아니라, 현장에서 어떤
                외부 인력이 어떤 위험요인을 공유받고 확인했는지 월간 운영기록
                후보로 정리하기 위한 흐름입니다.
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 print:border-slate-300">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-300 print:bg-slate-100 print:text-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-black">운영상 분류</th>
                    <th className="px-4 py-3 font-black">확인 건수</th>
                    <th className="px-4 py-3 font-black">주요 작업</th>
                    <th className="px-4 py-3 font-black">확인 포인트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200 print:divide-slate-200 print:text-slate-800">
                  <tr>
                    <td className="px-4 py-3 font-bold">납품</td>
                    <td className="px-4 py-3">8건</td>
                    <td className="px-4 py-3">원자재 입고</td>
                    <td className="px-4 py-3">입고 동선·하역 위치 확인</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">상하차</td>
                    <td className="px-4 py-3">6건</td>
                    <td className="px-4 py-3">제품 출고</td>
                    <td className="px-4 py-3">지게차 동선·보행자 접근 확인</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">정비업체</td>
                    <td className="px-4 py-3">2건</td>
                    <td className="px-4 py-3">설비 점검</td>
                    <td className="px-4 py-3">작업구역 출입 전 위험요인 확인</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold">방문자</td>
                    <td className="px-4 py-3">3건</td>
                    <td className="px-4 py-3">현장 방문</td>
                    <td className="px-4 py-3">안내자 동행·출입 동선 확인</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <article className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 print:border-cyan-300 print:bg-cyan-50">
                <p className="text-sm font-black text-cyan-200 print:text-cyan-900">
                  월간 결과물 반영 기준
                </p>
                <p className="mt-2 text-sm leading-6 text-cyan-50 print:text-cyan-900">
                  외부 인력 확인기록은 근로자 확인 현황과 구분해 표시합니다.
                  반복 방문, 상하차, 정비 작업처럼 위험요인 공유가 필요한
                  흐름은 다음 달 추적 필요 후보로 연결할 수 있습니다.
                </p>
              </article>

              <article className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 print:border-amber-300 print:bg-amber-50">
                <p className="text-sm font-black text-amber-200 print:text-amber-900">
                  표현 제한
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-50 print:text-amber-900">
                  이 분류는 도급관계, 근로자성, 원청 책임 범위를 판단하지
                  않습니다. 외부 인력 안전관리 완료나 법적 책임 면제 표현도
                  사용하지 않습니다.
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {isRichiFullOperation ? (
          <section className="rounded-3xl border border-[#D6EDE6] bg-white p-5 shadow-sm print:border-slate-300 print:bg-white">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-bold text-teal-700 print:text-teal-800">
                  월간 운영브리핑
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 print:text-slate-800">
                  이번 달에는 작업 전 확인·서명 {
                    fieldSummary.shareConfirmationCount
                  }
                  건, 의견·불편사항 {fieldSummary.workerReportCount}건, TBM
                  운영기록 {displayRichiMonthlyTbmCount}건이 저장되었습니다.
                  관리자 검토가 필요한 항목은 {totalReviewNeeded}건이며,
                  증빙 파일은 {evidenceTotalCount}건 연결되어 있습니다.
                  월간 운영기록은 고객 전달 전 내부 운영자가 확인합니다.
                </p>
              </div>

              {richiPrioritySignals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {richiPrioritySignals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className={shellClassName}>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className={headingClassName}>증빙 요약</h2>
              <p className={`mt-2 ${bodyClassName}`}>
                {isRichiFullOperation
                  ? "월간 운영 확인을 위한 사진·파일 증빙 집계입니다."
                  : "evidence_items 원장 기준의 월간 사진·파일 증빙 집계입니다."}
              </p>
            </div>
            <p className="text-sm font-bold text-cyan-200 print:text-cyan-800">
              총{" "}
              {evidenceSummary.status === "ok"
                ? `${evidenceSummary.totalCount}건`
                : "확인 필요"}
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className={evidenceCardClassName}>
              <p className={evidenceLabelClassName}>
                {isRichiFullOperation ? "확인기록 첨부" : "공유확인 첨부"}
              </p>
              <p className={evidenceValueClassName}>
                {evidenceSummary.status === "ok"
                  ? `${evidenceSummary.shareConfirmationAttachmentCount}건`
                  : "확인 필요"}
              </p>
            </div>
            <div className={evidenceCardClassName}>
              <p className={evidenceLabelClassName}>
                {isRichiFullOperation ? "의견 첨부" : "위험제보 첨부"}
              </p>
              <p className={evidenceValueClassName}>
                {evidenceSummary.status === "ok"
                  ? `${evidenceSummary.workerReportAttachmentCount}건`
                  : "확인 필요"}
              </p>
            </div>
            <div className={evidenceCardClassName}>
              <p className={evidenceLabelClassName}>
                {isRichiFullOperation ? "현장 의견 첨부" : "아차사고 첨부"}
              </p>
              <p className={evidenceValueClassName}>
                {evidenceSummary.status === "ok"
                  ? `${evidenceSummary.nearMissAttachmentCount}건`
                  : "확인 필요"}
              </p>
            </div>
            <div className={evidenceCardClassName}>
              <p className={evidenceLabelClassName}>
                {isRichiFullOperation ? "개선 의견 첨부" : "개선제안 첨부"}
              </p>
              <p className={evidenceValueClassName}>
                {evidenceSummary.status === "ok"
                  ? `${evidenceSummary.improvementSuggestionAttachmentCount}건`
                  : "확인 필요"}
              </p>
            </div>
            <div className={evidenceCardClassName}>
              <p className={evidenceLabelClassName}>
                {isRichiFullOperation
                  ? "현장 의견 첨부 전체"
                  : "현장참여 첨부 전체"}
              </p>
              <p className={evidenceValueClassName}>
                {evidenceSummary.status === "ok"
                  ? `${evidenceSummary.fieldParticipationAttachmentCount}건`
                  : "확인 필요"}
              </p>
            </div>
            <div className={evidenceCardClassName}>
              <p className={evidenceLabelClassName}>
                {isRichiFullOperation
                  ? "해당 월 작성된 TBM 운영기록"
                  : "TBM 보완 증빙"}
              </p>
              <p className={evidenceValueClassName}>
                {isRichiFullOperation
                  ? richiMonthlyTbmCount === null
                    ? "확인 필요"
                    : `${richiMonthlyTbmCount}건`
                  : evidenceSummary.status === "ok"
                    ? `${evidenceSummary.tbmAttachmentCount}건`
                    : "확인 필요"}
              </p>
            </div>
          </div>

          <p
            className={
              isRichiFullOperation
                ? "mt-4 rounded-2xl border border-[#D6EDE6] bg-white p-4 text-xs leading-5 text-slate-600 print:border-slate-300 print:bg-slate-50 print:text-slate-700"
                : "mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-xs leading-5 text-slate-400 print:border-slate-300 print:bg-slate-50 print:text-slate-700"
            }
          >
            사진·파일 증빙은 운영 확인을 위한 참고자료이며, 조치완료 또는 법적
            적합성을 자동 확정하지 않습니다.
          </p>
        </section>

        <section className={shellClassName}>
          <h2 className={headingClassName}>월간 운영 판단 후보</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div
              className={
                isRichiFullOperation
                  ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:border-emerald-300 print:bg-emerald-50"
                  : "rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 print:border-emerald-300 print:bg-emerald-50"
              }
            >
              <p
                className={
                  isRichiFullOperation
                    ? "text-sm font-black text-emerald-800 print:text-emerald-900"
                    : "text-sm font-black text-emerald-200 print:text-emerald-900"
                }
              >
                유지할 흐름
              </p>
              <p
                className={
                  isRichiFullOperation
                    ? "mt-2 text-sm leading-6 text-emerald-900 print:text-emerald-900"
                    : "mt-2 text-sm leading-6 text-emerald-50 print:text-emerald-900"
                }
              >
                {isRichiFullOperation
                  ? "작업 전 확인·서명과 근로자대표 확인이 꾸준히 쌓이면 다음 정기 운영 검토에 활용할 수 있습니다."
                  : "공유확인과 근로자대표 참여확인이 꾸준히 쌓이면 다음 정기 위험성평가 검토에 활용할 수 있습니다."}
              </p>
            </div>
            <div
              className={
                isRichiFullOperation
                  ? "rounded-2xl border border-amber-200 bg-amber-50 p-4 print:border-amber-300 print:bg-amber-50"
                  : "rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 print:border-amber-300 print:bg-amber-50"
              }
            >
              <p
                className={
                  isRichiFullOperation
                    ? "text-sm font-black text-amber-800 print:text-amber-900"
                    : "text-sm font-black text-amber-200 print:text-amber-900"
                }
              >
                확인할 항목
              </p>
              <p
                className={
                  isRichiFullOperation
                    ? "mt-2 text-sm leading-6 text-amber-900 print:text-amber-900"
                    : "mt-2 text-sm leading-6 text-amber-50 print:text-amber-900"
                }
              >
                검토 필요 항목은 관리자 검토 메모, 조치 경과, 다음 달 재확인
                대상으로 분리해 관리합니다.
              </p>
            </div>
            <div
              className={
                isRichiFullOperation
                  ? "rounded-2xl border border-teal-200 bg-teal-50 p-4 print:border-teal-300 print:bg-teal-50"
                  : "rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 print:border-cyan-300 print:bg-cyan-50"
              }
            >
              <p
                className={
                  isRichiFullOperation
                    ? "text-sm font-black text-teal-800 print:text-teal-900"
                    : "text-sm font-black text-cyan-200 print:text-cyan-900"
                }
              >
                고객 전달자료
              </p>
              <p
                className={
                  isRichiFullOperation
                    ? "mt-2 text-sm leading-6 text-teal-900 print:text-teal-900"
                    : "mt-2 text-sm leading-6 text-cyan-50 print:text-cyan-900"
                }
              >
                {isRichiFullOperation
                  ? "월간 운영기록은 내부 운영자가 확인한 뒤 고객 전달자료로 정리합니다."
                  : "월간 요약은 내부 운영자가 확인한 뒤 고객 전달자료 또는 CSV Export와 함께 정리합니다."}
              </p>
            </div>
          </div>
        </section>

        <section
          className={
            isRichiFullOperation
              ? "rounded-3xl border border-[#D6EDE6] bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm print:border-slate-300 print:bg-white print:text-slate-700"
              : "rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm leading-6 text-slate-300 shadow-xl shadow-slate-950/30 print:border-slate-300 print:bg-white print:text-slate-700"
          }
        >
          <h2 className={headingClassName}>포함 범위</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            <li>
              •{" "}
              {isRichiFullOperation
                ? "작업 전 확인·서명 기록"
                : "근로자 공유확인 기록"}
            </li>
            <li>
              •{" "}
              {isRichiFullOperation
                ? "익명 의견·불편사항·개선제안 기록"
                : "위험제보·아차사고·개선제안 기록"}
            </li>
            <li>• 관리자 검토 필요 후보</li>
            <li>• 근로자대표 참여확인 기록</li>
            <li>• 보완 의견 또는 별도 의견</li>
            <li>• 고객 전달자료 준비 상태</li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-500 print:text-slate-600">
            {isRichiFullOperation
              ? "이 화면은 월간 운영 확인에 필요한 주요 기록을 정리하며, 세부 운영 자료는 별도 관리 화면에서 확인합니다."
              : "TBM, PTW, Evidence Book, Full SafeMetrica 대표 대시보드 항목은 공유팩 전용 월간요약에서 제외합니다."}
          </p>
        </section>
      </div>
    </main>
  );
}
