import Link from "next/link";
import { redirect } from "next/navigation";

import { getCompanyConfig } from "@/lib/company";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import {
  fetchWorkerRepresentativeConfirmationRecords,
  type WorkerRepresentativeConfirmationRecord,
} from "@/lib/workerRepresentativeConfirmationRecords";

export const dynamic = "force-dynamic";

const FIELD_PARTICIPATION_LIMIT = 500;

type SearchParams = {
  month?: string | string[];
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

  if (text.includes("위험제보") || text.includes("위험 제보") || text.includes("risk")) {
    return "위험제보";
  }

  if (text.includes("아차") || text.includes("near")) {
    return "아차사고";
  }

  if (text.includes("개선제안") || text.includes("개선 제안") || text.includes("improvement")) {
    return "개선제안";
  }

  return text ? "기타" : "확인 필요";
}

function normalizeStatus(value: unknown) {
  const text = readText(value).toLowerCase();

  if (text.includes("조치완료") || text.includes("완료") || text.includes("done") || text.includes("completed")) {
    return "조치완료";
  }

  if (text.includes("반려") || text.includes("reject")) {
    return "반려";
  }

  if (text.includes("조치필요") || text.includes("필요") || text.includes("action_required")) {
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

function isRepresentativeReviewNeeded(record: WorkerRepresentativeConfirmationRecord) {
  return (
    record.hasObjection ||
    record.reviewStatus === "미확인" ||
    record.reviewStatus === "검토 필요" ||
    record.reviewStatus === "이견 검토 중" ||
    record.reviewStatus === "보완 요청"
  );
}

async function fetchFieldParticipationSummary(
  companyCode: string,
  period: MonthPeriod,
): Promise<FieldParticipationSummary> {
  const query = new URLSearchParams({
    select: "tenant_code,submission_type,legacy_type,title,status,reported_date,created_at",
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
    const reviewNeededCount = workerReportRows.filter(isFieldReviewNeeded).length;

    return {
      status: "ok",
      shareConfirmationCount,
      workerReportCount: workerReportRows.length,
      reviewNeededCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
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
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{hint}</p>
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

  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  if (company.code === "mons") {
    redirect("/login?error=risk_share_pack_not_available");
  }

  const [fieldSummary, representativeStore] = await Promise.all([
    fetchFieldParticipationSummary(company.code, period),
    fetchWorkerRepresentativeConfirmationRecords(company.code).catch(() => ({
      status: "failed" as const,
      records: [] as WorkerRepresentativeConfirmationRecord[],
    })),
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
  const hasLoadWarning = fieldSummary.status !== "ok" || representativeStore.status !== "ok";
  const reportReadyStatus = hasLoadWarning ? "확인 필요" : "준비 가능";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 print:bg-white print:text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30 print:border-slate-300 print:bg-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-300 print:text-cyan-700">
                Risk Share Pack Monthly Report
              </p>
              <h1 className="mt-2 text-3xl font-black text-white print:text-slate-950">
                공유팩 월간 운영요약
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 print:text-slate-700">
                {company.name} · {monthKey} 기준 · 공유확인, 현장 의견, 근로자대표 참여확인 중심
              </p>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                href="/manager/risk-share"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
              >
                공유팩 홈
              </Link>
              <Link
                href="/monthly-report"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-blue-400 hover:text-blue-200"
              >
                전체 월간보고서
              </Link>
              <button
                type="button"
                onClick={() => globalThis.print()}
                className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300"
              >
                인쇄 / PDF 저장
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100 print:border-amber-300 print:bg-amber-50 print:text-amber-900">
            이 보고서는 공유팩 운영기록을 월간 단위로 정리하는 자료입니다.
            법적 판단이나 조치완료 확정을 대신하지 않습니다.
          </div>
        </section>

        {hasLoadWarning ? (
          <section className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm font-bold leading-6 text-amber-100 print:border-amber-300 print:bg-amber-50 print:text-amber-900">
            일부 원장 조회가 실패했거나 설정 확인이 필요합니다. 고객 전달 전 접수함과 Export를 다시 확인하세요.
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="근로자 공유확인"
            value={fieldSummary.status === "ok" ? `${fieldSummary.shareConfirmationCount}건` : "확인 필요"}
            hint="위험성평가 공유확인 제출 기록입니다. 조치 KPI에는 섞지 않습니다."
          />
          <StatCard
            label="위험제보·개선의견"
            value={fieldSummary.status === "ok" ? `${fieldSummary.workerReportCount}건` : "확인 필요"}
            hint="위험제보, 아차사고, 개선제안 등 관리자 검토대상 기록입니다."
          />
          <StatCard
            label="관리자 검토 필요"
            value={fieldSummary.status === "ok" ? `${totalReviewNeeded}건` : "확인 필요"}
            hint="공유확인을 제외한 현장 의견과 근로자대표 보완 의견 중 검토 후보입니다."
          />
          <StatCard
            label="근로자대표 참여확인"
            value={`${representativeRecords.length}건`}
            hint="근로자대표가 제출한 참여확인 기록입니다."
          />
          <StatCard
            label="보완 의견 있음"
            value={`${representativeObjectionCount}건`}
            hint="근로자대표 참여확인 중 별도 의견 또는 보완 의견이 포함된 기록입니다."
          />
          <StatCard
            label="고객 전달자료"
            value={reportReadyStatus}
            hint="내부 운영자가 확인 후 월간 요약 또는 CSV 전달자료로 정리합니다."
          />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30 print:border-slate-300 print:bg-white">
          <h2 className="text-xl font-black text-white print:text-slate-950">
            월간 운영 판단 후보
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 print:border-emerald-300 print:bg-emerald-50">
              <p className="text-sm font-black text-emerald-200 print:text-emerald-900">
                유지할 흐름
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-50 print:text-emerald-900">
                공유확인과 근로자대표 참여확인이 꾸준히 쌓이면 다음 정기 위험성평가 검토에 활용할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 print:border-amber-300 print:bg-amber-50">
              <p className="text-sm font-black text-amber-200 print:text-amber-900">
                확인할 항목
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-50 print:text-amber-900">
                검토 필요 항목은 관리자 검토 메모, 조치 경과, 다음 달 재확인 대상으로 분리해 관리합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 print:border-cyan-300 print:bg-cyan-50">
              <p className="text-sm font-black text-cyan-200 print:text-cyan-900">
                고객 전달자료
              </p>
              <p className="mt-2 text-sm leading-6 text-cyan-50 print:text-cyan-900">
                월간 요약은 내부 운영자가 확인한 뒤 고객 전달자료 또는 CSV Export와 함께 정리합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm leading-6 text-slate-300 shadow-xl shadow-slate-950/30 print:border-slate-300 print:bg-white print:text-slate-700">
          <h2 className="text-xl font-black text-white print:text-slate-950">
            포함 범위
          </h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            <li>• 근로자 공유확인 기록</li>
            <li>• 위험제보·아차사고·개선제안 기록</li>
            <li>• 관리자 검토 필요 후보</li>
            <li>• 근로자대표 참여확인 기록</li>
            <li>• 보완 의견 또는 별도 의견</li>
            <li>• 고객 전달자료 준비 상태</li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-500 print:text-slate-600">
            TBM, PTW, Evidence Book, Full SafeMetrica 대표 대시보드 항목은 공유팩 전용 월간요약에서 제외합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
