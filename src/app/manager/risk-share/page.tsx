import Link from "next/link";
import { redirect } from "next/navigation";

import { getCompanyConfig } from "@/lib/company";
import RiskSharePackExportPanel from "./RiskSharePackExportPanel";
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

const actionCards = [
  {
    title: "근로자대표 참여확인 관리",
    description: "근로자대표 확인 링크 생성, 제출 현황, 폐기·만료 상태를 관리합니다.",
    href: "/manager/representative-confirmations",
    cta: "관리 화면 열기",
  },
  {
    title: "월간보고서 확인",
    description: "공유확인, 위험제보, 근로자대표 참여확인 기록을 월간 단위로 확인합니다.",
    href: "/monthly-report",
    cta: "월간보고서 보기",
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
  return getFieldSubmissionType(row) === "공유확인";
}

function isFieldReviewNeeded(row: FieldParticipationSummaryRow) {
  if (isShareConfirmation(row)) {
    return false;
  }

  const status = normalizeFieldStatus(row.status);

  return status !== "조치완료" && status !== "반려";
}

async function fetchFieldParticipationSummary(
  companyCode: string,
): Promise<FieldParticipationSummary> {
  const query = new URLSearchParams({
    select: "tenant_code,submission_type,legacy_type,title,status,reported_date,created_at",
    tenant_code: `eq.${companyCode}`,
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
}) {
  const {
    fieldSummary,
    representativeRecords,
    representativeLinks,
    linkLoadFailed,
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

  const [fieldSummary, recordResult, linkResult] = await Promise.all([
    fetchFieldParticipationSummary(company.code),
    fetchWorkerRepresentativeConfirmationRecords(company.code).catch(() => ({
      status: "failed" as const,
      records: [] as WorkerRepresentativeConfirmationRecord[],
    })),
    fetchWorkerRepresentativeConfirmationLinks(company.code).catch(() => ({
      status: "failed" as const,
      links: [] as WorkerRepresentativeConfirmationLink[],
    })),
  ]);

  const representativeRecords = recordResult.records;
  const representativeLinks = linkResult.status === "ok" ? linkResult.links : [];
  const summaryCards = buildSummaryCards({
    fieldSummary,
    representativeRecords,
    representativeLinks,
    linkLoadFailed: linkResult.status !== "ok",
  });

  const companyName = getCompanyDisplayName(company);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-300">SafeMetrica Risk Share Pack</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                Risk Share Pack 관리자 홈
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                위험성평가 공유 이후의 확인, 의견 제출, 근로자대표 참여확인,
                관리자 검토, 월간 요약, 고객 전달용 Export 흐름을 확인하는 전용 홈입니다.
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
          {summaryCards.map((card) => (
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

        <RiskSharePackExportPanel companyCode={company.code} />

        <section className="grid gap-4 lg:grid-cols-3">
          {actionCards.map((card) => (
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
