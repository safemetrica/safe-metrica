import Link from "next/link";
import { redirect } from "next/navigation";

import { getCompanyConfig } from "@/lib/company";
import RiskSharePackExportPanel from "./RiskSharePackExportPanel";
import RiskSharePackMonthlySummary from "./RiskSharePackMonthlySummary";
import RiskSharePackLinkPanel from "./RiskSharePackLinkPanel";
import RiskSharePackCustomerLinksPanel from "./RiskSharePackCustomerLinksPanel";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";
import {
  fetchWorkerRepresentativeConfirmationLinks,
  type WorkerRepresentativeConfirmationLink,
} from "@/lib/workerRepresentativeConfirmationLinks";
import {
  fetchWorkerRepresentativeConfirmationRecords,
  type WorkerRepresentativeConfirmationRecord,
} from "@/lib/workerRepresentativeConfirmationRecords";

export const dynamic = "force-dynamic";

const FIELD_PARTICIPATION_SUMMARY_LIMIT = 500;

type FieldParticipationSummaryRow = {
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
  fieldReviewNeededCount: number;
};

type RiskShareVersionLockSummaryRow = {
  id?: unknown;
  created_at?: unknown;
  lock_month?: unknown;
  item_count?: unknown;
  customer_confirmed_count?: unknown;
  worker_visible_count?: unknown;
  lock_status?: unknown;
};

type VersionLockMonthlySummary = {
  status: "ok" | "not_configured" | "failed";
  lockCount: number;
  lockedItemCount: number;
  customerConfirmedCount: number;
  workerVisibleCount: number;
  latestLockDate: string;
};

type SummaryPeriod = {
  startDate: string;
  endDate: string;
  dayAfterEnd: string;
};

function getKstDateString(date: Date) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 10);
}

function getDayAfter(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getCurrentKstMonthPeriod(): SummaryPeriod {
  const today = getKstDateString(new Date());

  return {
    startDate: `${today.slice(0, 8)}01`,
    endDate: today,
    dayAfterEnd: getDayAfter(today),
  };
}

function buildPeriodFilter(
  createdAtColumn: string,
  eventDateColumn: string,
  period: SummaryPeriod,
) {
  return `(${[
    `and(${createdAtColumn}.gte.${period.startDate}T00:00:00.000Z,${createdAtColumn}.lt.${period.dayAfterEnd}T00:00:00.000Z)`,
    `and(${eventDateColumn}.gte.${period.startDate},${eventDateColumn}.lte.${period.endDate})`,
  ].join(",")})`;
}

function isDateValueInPeriod(value: string | null, period: SummaryPeriod) {
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
  period: SummaryPeriod,
) {
  return (
    isDateValueInPeriod(record.submittedAt, period) ||
    isDateValueInPeriod(record.confirmedAt, period)
  );
}

const actionCards = [
  {
    title: "근로자대표 참여확인 관리",
    description: "근로자대표 확인 링크 생성, 제출 현황, 폐기·만료 상태를 관리합니다.",
    href: "/manager/representative-confirmations",
    cta: "관리 화면 열기",
  },
  {
    title: "월간보고서 확인",
    description: "공유확인, 위험제보, 근로자대표 참여확인 기록만 월간 단위로 확인합니다.",
    href: "/monthly-report/risk-share",
    cta: "공유팩 월간요약 보기",
  },
  {
    title: "현장 의견 접수함",
    description: "위험제보, 아차사고, 개선제안 등 검토가 필요한 현장 의견을 확인합니다.",
    href: "/field/voice",
    cta: "접수함 보기",
  },
];

function getCompanyDisplayName(company: { name?: string; companyName?: string; code: string }) {
  return company.name || company.companyName || company.code;
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeSubmissionType(value: unknown) {
  const text = readText(value).toLowerCase();
  const compactText = text.replace(/[\s_-]+/g, "");

  if (
    compactText.includes("위생안전확인") ||
    compactText.includes("위생안전") ||
    text.includes("hygiene") ||
    text.includes("food")
  ) {
    return "위생·안전 확인";
  }

  if (compactText.includes("불편사항") || compactText.includes("불편") || text.includes("discomfort")) {
    return "불편사항";
  }

  if (compactText.includes("개선의견")) {
    return "개선의견";
  }

  if (text.includes("공유확인") || text.includes("share")) {
    return "공유확인";
  }

  if (text.includes("위험제보") || text.includes("위험") || text.includes("risk")) {
    return "위험제보";
  }

  if (text.includes("아차사고") || text.includes("near")) {
    return "아차사고";
  }

  if (text.includes("개선제안") || text.includes("개선 제안") || text.includes("improvement")) {
    return "개선제안";
  }

  return text ? "기타" : "확인 필요";
}

function normalizeFieldStatus(value: unknown) {
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

  return text ? "확인 필요" : "확인 필요";
}

function getFieldSubmissionType(row: FieldParticipationSummaryRow) {
  return normalizeSubmissionType(row.submission_type || row.legacy_type);
}

function isShareConfirmation(row: FieldParticipationSummaryRow) {
  const submissionType = getFieldSubmissionType(row);
  return submissionType === "공유확인" || submissionType === "위생·안전 확인";
}

function isFieldReviewNeeded(row: FieldParticipationSummaryRow) {
  if (isShareConfirmation(row)) {
    return false;
  }

  const status = normalizeFieldStatus(row.status);

  return status !== "조치완료" && status !== "반려";
}

async function fetchVersionLockMonthlySummary(
  companyCode: string,
  period: SummaryPeriod,
): Promise<VersionLockMonthlySummary> {
  const lockMonth = period.startDate.slice(0, 7);
  const query = new URLSearchParams({
    select: "id,created_at,lock_month,item_count,customer_confirmed_count,worker_visible_count,lock_status",
    company_code: `eq.${companyCode}`,
    lock_month: `eq.${lockMonth}`,
    lock_status: "eq.active",
    order: "created_at.desc",
    limit: "100",
  });

  try {
    const rows = await selectSupabaseExportRows<RiskShareVersionLockSummaryRow>(
      "risk_share_version_locks",
      query,
    );

    return {
      status: "ok",
      lockCount: rows.length,
      lockedItemCount: rows.reduce((sum, row) => sum + readNumber(row.item_count), 0),
      customerConfirmedCount: rows.reduce(
        (sum, row) => sum + readNumber(row.customer_confirmed_count),
        0,
      ),
      workerVisibleCount: rows.reduce(
        (sum, row) => sum + readNumber(row.worker_visible_count),
        0,
      ),
      latestLockDate: readText(rows[0]?.created_at),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      lockCount: 0,
      lockedItemCount: 0,
      customerConfirmedCount: 0,
      workerVisibleCount: 0,
      latestLockDate: "",
    };
  }
}

async function fetchFieldParticipationSummary(
  companyCode: string,
  period: SummaryPeriod,
): Promise<FieldParticipationSummary> {
  const query = new URLSearchParams({
    select: "tenant_code,submission_type,legacy_type,title,status,reported_date,created_at",
    tenant_code: `eq.${companyCode}`,
    or: buildPeriodFilter("created_at", "reported_date", period),
    order: "reported_date.desc",
    limit: String(FIELD_PARTICIPATION_SUMMARY_LIMIT),
  });

  try {
    const rows = await selectSupabaseExportRows<FieldParticipationSummaryRow>(
      "field_participation_submissions",
      query,
    );

    const shareConfirmationCount = rows.filter(isShareConfirmation).length;
    const workerReportRows = rows.filter((row) => !isShareConfirmation(row));
    const fieldReviewNeededCount = workerReportRows.filter(isFieldReviewNeeded).length;

    return {
      status: "ok",
      shareConfirmationCount,
      workerReportCount: workerReportRows.length,
      fieldReviewNeededCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      shareConfirmationCount: 0,
      workerReportCount: 0,
      fieldReviewNeededCount: 0,
    };
  }
}

function getLinkStatus(link: WorkerRepresentativeConfirmationLink) {
  if (link.status === "revoked") {
    return "revoked";
  }

  const expiresAt = link.expiresAt ? Date.parse(link.expiresAt) : null;

  if (
    expiresAt !== null &&
    (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
  ) {
    return "expired";
  }

  return "active";
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

function buildSummaryCards(params: {
  fieldSummary: FieldParticipationSummary;
  representativeRecords: WorkerRepresentativeConfirmationRecord[];
  representativeLinks: WorkerRepresentativeConfirmationLink[];
  linkLoadFailed: boolean;
  versionLockSummary: VersionLockMonthlySummary;
}) {
  const {
    fieldSummary,
    representativeRecords,
    representativeLinks,
    linkLoadFailed,
    versionLockSummary,
  } = params;

  const objectionCount = representativeRecords.filter((record) => record.hasObjection).length;
  const representativeReviewNeededCount = representativeRecords.filter(isRepresentativeReviewNeeded).length;
  const activeLinkCount = representativeLinks.filter((link) => getLinkStatus(link) === "active").length;
  const fieldLoadFailed = fieldSummary.status !== "ok";
  const totalReviewNeededCount =
    fieldSummary.fieldReviewNeededCount + representativeReviewNeededCount;

  return [
    {
      label: "근로자 공유확인",
      value: fieldLoadFailed ? "확인 필요" : `${fieldSummary.shareConfirmationCount}건`,
      description: fieldLoadFailed
        ? "현장참여 원장 조회가 실패했습니다. 접수함에서 다시 확인하세요."
        : "공유확인 제출 건수입니다. 조치 KPI에는 섞지 않습니다.",
    },
    {
      label: "위험제보·개선의견",
      value: fieldLoadFailed ? "확인 필요" : `${fieldSummary.workerReportCount}건`,
      description: fieldLoadFailed
        ? "현장참여 원장 조회가 실패했습니다. 접수함에서 다시 확인하세요."
        : "위험제보, 아차사고, 개선제안 등 관리자 검토대상 제출 건수입니다.",
    },
    {
      label: "관리자 검토 필요",
      value: fieldLoadFailed ? "확인 필요" : `${totalReviewNeededCount}건`,
      description: fieldLoadFailed
        ? "현장참여 원장 조회가 실패해 검토 필요 건수를 확정하지 않았습니다."
        : "공유확인을 제외한 현장 의견과 근로자대표 보완 의견 중 검토가 필요한 기록입니다.",
    },
    {
      label: "근로자대표 참여확인",
      value: `${representativeRecords.length}건`,
      description: "현재 선택된 업체 기준 근로자대표 참여확인 제출 건수입니다.",
    },
    {
      label: "보완 의견 있음",
      value: `${objectionCount}건`,
      description: "별도 의견 또는 보완 의견이 포함된 근로자대표 참여확인 기록입니다.",
    },
    {
      label: "사용 가능 링크",
      value: linkLoadFailed ? "확인 필요" : `${activeLinkCount}개`,
      description: linkLoadFailed
        ? "근로자대표 확인 링크 원장 조회가 실패했습니다. 접수함에서 다시 확인하세요."
        : "폐기 또는 만료되지 않은 근로자대표 확인 링크 수입니다.",
    },
    {
      label: "최종 공유본 확정",
      value:
        versionLockSummary.status !== "ok"
          ? "확인 필요"
          : `${versionLockSummary.lockCount}회 / ${versionLockSummary.lockedItemCount}건`,
      description:
        versionLockSummary.status !== "ok"
          ? "최종 공유본 원장 조회가 실패했습니다. Supabase migration 적용 상태를 확인하세요."
          : "이번 달 월별 보관함에 반영할 확정 공유 항목 기준입니다.",
    },
  ];
}

export default async function RiskSharePackManagerHomePage() {
  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  if (company.code === "mons") {
    redirect("/login?error=risk_share_pack_not_available");
  }

  const currentPeriod = getCurrentKstMonthPeriod();

  const [fieldSummary, versionLockSummary, recordResult, linkResult] = await Promise.all([
    fetchFieldParticipationSummary(company.code, currentPeriod),
    fetchVersionLockMonthlySummary(company.code, currentPeriod),
    fetchWorkerRepresentativeConfirmationRecords(company.code).catch(() => ({
      status: "failed" as const,
      records: [] as WorkerRepresentativeConfirmationRecord[],
    })),
    fetchWorkerRepresentativeConfirmationLinks(company.code).catch(() => ({
      status: "failed" as const,
      links: [] as WorkerRepresentativeConfirmationLink[],
    })),
  ]);

  const representativeRecords = recordResult.records.filter((record) =>
    isRepresentativeRecordInPeriod(record, currentPeriod),
  );
  const representativeLinks = linkResult.status === "ok" ? linkResult.links : [];
  const isFoodFactoryTrial = company.code === "richi";
  const summaryCards = buildSummaryCards({
    fieldSummary,
    representativeRecords,
    representativeLinks,
    linkLoadFailed: linkResult.status !== "ok",
    versionLockSummary,
  });


  const fieldLoadFailed = fieldSummary.status !== "ok";
  const representativeReviewNeededCount = representativeRecords.filter(
    isRepresentativeReviewNeeded,
  ).length;
  const objectionCount = representativeRecords.filter(
    (record) => record.hasObjection,
  ).length;
  const totalReviewNeededCount =
    fieldSummary.fieldReviewNeededCount + representativeReviewNeededCount;
  const versionLockLoadFailed = versionLockSummary.status !== "ok";
  const hasMonthlySummaryWarning = fieldLoadFailed || linkResult.status !== "ok" || versionLockLoadFailed;

  const companyName = getCompanyDisplayName(company);

  const displaySummaryCards = isFoodFactoryTrial
    ? summaryCards.map((card) => {
        if (card.label === "근로자 공유확인") {
          return {
            ...card,
            label: "전자확인 기록",
            description: "작업 전 위생·안전 확인 제출 건수입니다. 의견 접수와 분리해 봅니다.",
          };
        }

        if (card.label === "위험제보·개선의견") {
          return {
            ...card,
            label: "의견·불편사항",
            description: "불편사항, 개선의견, 기타 의견 등 관리자 확인자료로 볼 제출 건수입니다.",
          };
        }

        if (card.label === "관리자 검토 필요") {
          return {
            ...card,
            label: "관리자 확인 필요",
            description: "의견·불편사항과 보완 의견 중 관리자가 확인할 필요가 있는 기록입니다.",
          };
        }

        return card;
      })
    : summaryCards;

  const displayActionCards = isFoodFactoryTrial
    ? [
        {
          title: "전자확인·의견 접수함",
          description: "작업 전 위생·안전 전자확인과 불편사항·개선의견 제출 내용을 확인합니다.",
          href: "/field/voice",
          cta: "접수함 보기",
        },
        {
          title: "주간·월간 요약 후보",
          description: "전자확인, 의견, 사진 첨부 기록을 주간 체험 요약 후보로 확인합니다.",
          href: "/monthly-report/risk-share",
          cta: "요약 화면 열기",
        },
        {
          title: "근로자 전자확인 화면",
          description: "리치코리아 근로자 QR 전자확인 화면을 새 창으로 열어 체험 흐름을 확인합니다.",
          href: `/field/participation?company=${encodeURIComponent(company.code)}`,
          cta: "근로자 화면 열기",
        },
      ]
    : actionCards;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-300">{isFoodFactoryTrial ? "SafeMetrica Trial Manager" : "SafeMetrica Risk Share Pack"}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                {isFoodFactoryTrial ? "리치코리아 전자확인 관리자 홈" : "Risk Share Pack 관리자 홈"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                위험성평가 공유 이후의 확인, 의견 제출, 근로자대표 참여확인,
                관리자 검토, 월간 요약, 고객 전달 자료 흐름을 확인하는 전용 홈입니다.
                TBM은 현장관리자의 기본 운영 기능이며, 이 화면에서는 위험성평가 공유 이후의 확인·의견·제보·관리자 검토 흐름을 중심으로 표시합니다.
              </p>
            </div>

            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
            >
              전체 홈으로 이동
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100">
              현재 업체: {companyName}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-300">
              업체 코드: {company.code}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            이 화면은 운영기록 확인을 위한 관리자 화면입니다. 법적 판단이나 조치완료
            확정을 대신하지 않습니다. 최종 검토와 조치 판단은 관리자와 사업주가
            수행합니다.
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displaySummaryCards.map((card) => (
            <article
              key={card.label}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30"
            >
              <p className="text-sm font-semibold text-slate-400">{card.label}</p>
              <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
            </article>
          ))}
        </section>




        <section className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5 shadow-xl shadow-slate-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-300">월별 보관함</p>
              <h2 className="mt-1 text-xl font-black text-white">
                이번 달 운영기록 파일 준비
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                공유확인, 위험제보, 근로자대표 참여확인, 증빙목록을 월별 파일로 정리해
                감독관, 구청, 발주처, 대표 보고 시 확인자료로 활용할 수 있게 준비합니다.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Link
                href="/monthly-report/risk-share"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-200"
              >
                월간보고서 보기
              </Link>
              <Link
                href="#risk-share-export-panel"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/50 px-4 py-3 text-sm font-black text-emerald-100 hover:border-emerald-200 hover:text-emerald-50"
              >
                고객 전달용 CSV 준비
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {[
              {
                label: "확정 공유 항목",
                status:
                  versionLockSummary.status !== "ok"
                    ? "확인 필요"
                    : `${versionLockSummary.lockedItemCount}건`,
                description:
                  versionLockSummary.status !== "ok"
                    ? "최종 공유본 원장 조회 실패 상태입니다. Supabase migration 적용 여부를 확인하세요."
                    : `이번 달 확정 공유본 ${versionLockSummary.lockCount}회, 근로자 QR 노출 항목 ${versionLockSummary.workerVisibleCount}건입니다.`,
              },
              {
                label: "월간 운영보고서 PDF",
                status: "연결됨",
                description: "공유팩 월간요약 화면에서 인쇄 또는 PDF 저장 흐름으로 확인합니다.",
              },
              {
                label: "공유확인·위험제보 CSV",
                status: "CSV 제공 중",
                description: "내부 운영자가 고객 전달 가능한 컬럼만 정리해 다운로드합니다.",
              },
              {
                label: "증빙목록·사진 ZIP",
                status: "준비 중",
                description: "첨부사진과 증빙목록은 Manifest와 ZIP 패키지 기준을 분리해 후속 설계합니다.",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-emerald-300/20 bg-slate-950/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-black text-white">{item.label}</h3>
                  <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            월별 보관함은 운영기록을 고객이 확인 가능한 파일 단위로 정리하는 UX입니다.
            최종 공유본 확정 전 초안, 고객 확인 전 항목, Owner 내부 메모, raw_payload, 토큰·환경변수 유사 문자열은 고객 전달 자료에 포함하지 않습니다.
            법적 판단, 면책, 조치완료 확정을 대신하지 않습니다.
          </p>
        </section>

        <RiskSharePackCustomerLinksPanel
          companyName={companyName}
          companyCode={company.code}
        />

        <RiskSharePackLinkPanel
          companyName={companyName}
          companyCode={company.code}
        />

        <RiskSharePackMonthlySummary
          periodLabel={`${currentPeriod.startDate} ~ ${currentPeriod.endDate}`}
          shareConfirmationCount={fieldSummary.shareConfirmationCount}
          workerReportCount={fieldSummary.workerReportCount}
          reviewNeededCount={fieldLoadFailed ? 0 : totalReviewNeededCount}
          representativeConfirmationCount={representativeRecords.length}
          objectionCount={objectionCount}
          exportReadyStatus={hasMonthlySummaryWarning ? "확인 필요" : "준비 가능"}
          hasLoadWarning={hasMonthlySummaryWarning}
        />

        <RiskSharePackExportPanel companyCode={company.code} />

        <section className="grid gap-4 lg:grid-cols-3">
          {displayActionCards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/30"
            >
              <div>
                <h2 className="text-lg font-bold text-white">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
              </div>

              <Link
                href={card.href}
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
