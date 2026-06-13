export const dynamic = "force-dynamic";

import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import AiDiagnosisCard from "@/components/AiDiagnosisCard";
import TodayTasksCard from "@/components/TodayTasksCard";
import EvidenceScoreCard from "@/components/EvidenceScoreCard";
import { getCompanyConfig } from "@/lib/company";
import { fetchContractorSubmissionRecords, getContractorSubmissionRecordSummary } from "@/lib/contractorSubmissionRecords";
import { hasTbmSpecialIssue, needsTbmEvidenceBook, hasLinkedEvidenceBook } from "@/lib/tbmStatus";
import { buildDailySafetyBriefing } from "@/lib/dailySafetyBriefing";

const DASHBOARD_SAFE_DATA_CONNECTION_MESSAGE =
  "일부 데이터 연결을 확인할 수 없어 현재 확인 가능한 항목만 요약합니다.";

function sanitizeDashboardMessage(value: unknown): string {
  const text = String(value ?? "");

  if (
    text.includes("dashboard_notion_query_failed") ||
    text.includes(["object", "not", "found"].join("_")) ||
    text.includes("Could not find database") ||
    text.includes("notion.com") ||
    text.includes("request_id")
  ) {
    return DASHBOARD_SAFE_DATA_CONNECTION_MESSAGE;
  }

  return text || DASHBOARD_SAFE_DATA_CONNECTION_MESSAGE;
}

const TAG_RISK_MAP: Record<string, { factor: string; S: number; L: number }> = {
  고소작업: { factor: "추락", S: 5, L: 3 },
  밀폐공간: { factor: "산소결핍", S: 5, L: 2 },
  "차량/이동장비": { factor: "협착·충돌", S: 4, L: 3 },
  "양중/중량물": { factor: "낙하·충돌", S: 4, L: 3 },
  전기: { factor: "감전", S: 4, L: 2 },
  "화학/MSDS": { factor: "중독·화재", S: 4, L: 2 },
  "용접/용단": { factor: "화재·폭발", S: 3, L: 3 },
  "상·하차": { factor: "요통·충돌", S: 3, L: 3 },
  "정비/청소": { factor: "절단·말림", S: 3, L: 2 },
  기타: { factor: "일반위험", S: 2, L: 2 },
};

const PTW_REQUIRED_TAGS = ["고소작업", "밀폐공간", "화학/MSDS", "용접/용단", "전기"];

type NotionProperty = {
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  date?: { start?: string | null };
  checkbox?: boolean;
  select?: { name?: string | null };
  multi_select?: Array<{ name?: string }>;
  people?: Array<{ name?: string }>;
  relation?: unknown[];
  number?: number | null;
};

type NotionPage = {
  id: string;
  properties: Record<string, NotionProperty>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
};

type TbmRow = {
  id: string;
  작업명: string;
  날짜: string;
  rawProps?: Record<string, any>;
  특이사항: boolean;
  조치상태: string;
  연결EB: number;
  실시자: string;
  작업태그: string[];
};

type PtwRow = {
  id: string;
  제목: string;
  작업일: string;
  작업유형: string;
  승인상태: string;
  허용여부: string;
};

type RiskItem = {
  id: string;
  title: string;
  no: string;
  processName: string;
  hazard: string;
  riskLevel: string;
  improvementPlan: string;
  status: string;
  budgetRequired: boolean;
  reassessmentDate: string;
  approvalStatus: string;
  riskDbReflectionStatus: string;
};

type RiskSummary = {
  hasDb: boolean;
  total: number;
  highRiskCount: number;
  actionNeededCount: number;
  budgetNeededCount: number;
  reassessmentDueCount: number;
  approvalReadyCount: number;
  approvalCompletedCount: number;
  riskDbReflectedCount: number;
  riskDbPendingCount: number;
  highRiskItems: RiskItem[];
};

function getTitlePropPlainText(prop: NotionProperty | undefined): string {
  return prop?.title?.[0]?.plain_text?.trim() ?? "";
}

function getTextPropPlainText(prop: NotionProperty | undefined): string {
  return prop?.rich_text?.[0]?.plain_text?.trim() ?? "";
}

function getDatePropStart(prop: NotionProperty | undefined): string {
  return prop?.date?.start ?? "";
}

function getCheckboxPropValue(prop: NotionProperty | undefined): boolean {
  return prop?.checkbox ?? false;
}

function getSelectPropName(prop: NotionProperty | undefined): string {
  return prop?.select?.name?.trim() ?? "";
}

function getRelationPropCount(prop: NotionProperty | undefined): number {
  return prop?.relation?.length ?? 0;
}

function getMultiSelectNames(prop: NotionProperty | undefined): string[] {
  return prop?.multi_select?.map((item) => item.name ?? "").filter(Boolean) ?? [];
}

function getPeopleFirstName(prop: NotionProperty | undefined): string {
  return prop?.people?.[0]?.name ?? "";
}

function getKstDateKey(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function queryNotionDatabase(
  databaseId: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<NotionQueryResponse> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    console.error("[SafeMetrica] dashboard_notion_query_failed", {
      status: response.status,
      databaseId,
      response: text,
    });

    return {
      results: [],
      has_more: false,
      next_cursor: null,
    } as NotionQueryResponse;
  }

  return (await response.json()) as NotionQueryResponse;
}

async function getRiskSummary(
  riskAssessmentDbId: string | undefined,
  headers: Record<string, string>
): Promise<RiskSummary> {
  if (!riskAssessmentDbId) {
    return {
      hasDb: false,
      total: 0,
      highRiskCount: 0,
      actionNeededCount: 0,
      budgetNeededCount: 0,
      reassessmentDueCount: 0,
      approvalReadyCount: 0,
      approvalCompletedCount: 0,
      riskDbReflectedCount: 0,
      riskDbPendingCount: 0,
      highRiskItems: [],
    };
  }

  const riskData = await queryNotionDatabase(riskAssessmentDbId, headers, {
    page_size: 100,
  });

  const items: RiskItem[] = (riskData.results ?? []).map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      title: getTitlePropPlainText(props["Risk Item"]),
      no: getTextPropPlainText(props["No"]),
      processName: getTextPropPlainText(props["processName"]),
      hazard: getTextPropPlainText(props["hazard"]),
      riskLevel: getSelectPropName(props["riskLevel"]),
      improvementPlan: getTextPropPlainText(props["improvementPlan"]),
      status: getSelectPropName(props["status"]),
      budgetRequired: getCheckboxPropValue(props["budgetRequired"]),
      reassessmentDate: getDatePropStart(props["reassessmentDate"]),
      approvalStatus: getSelectPropName(props["반영 승인상태"]),
      riskDbReflectionStatus: getSelectPropName(props["Risk DB 반영상태"]),
    };
  });

  const todayPlus30 = getKstDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const highRiskItems = items.filter(
    (item) => item.riskLevel === "상" && item.status !== "완료"
  );

  const actionNeededItems = items.filter(
    (item) => item.improvementPlan.trim().length > 0 && item.status !== "완료"
  );

  const budgetNeededItems = items.filter(
    (item) => item.budgetRequired && item.status !== "완료"
  );

  const reassessmentDueItems = items.filter(
    (item) =>
      item.reassessmentDate &&
      item.reassessmentDate <= todayPlus30 &&
      item.status !== "완료"
  );

  const approvalReadyItems = items.filter(
    (item) => item.approvalStatus === "승인 대기"
  );

  const approvalCompletedItems = items.filter(
    (item) => item.approvalStatus === "승인 완료"
  );

  const riskDbReflectedItems = items.filter(
    (item) => item.riskDbReflectionStatus === "반영 완료"
  );

  const riskDbPendingItems = items.filter(
    (item) => item.riskDbReflectionStatus !== "반영 완료"
  );

  return {
    hasDb: true,
    total: items.length,
    highRiskCount: highRiskItems.length,
    actionNeededCount: actionNeededItems.length,
    budgetNeededCount: budgetNeededItems.length,
    reassessmentDueCount: reassessmentDueItems.length,
    approvalReadyCount: approvalReadyItems.length,
    approvalCompletedCount: approvalCompletedItems.length,
    riskDbReflectedCount: riskDbReflectedItems.length,
    riskDbPendingCount: riskDbPendingItems.length,
    highRiskItems: highRiskItems.slice(0, 3),
  };
}

async function getDashboardData() {
  const company = await getCompanyConfig();

  const headers = {
    Authorization: `Bearer ${company.notionApiKey}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  const [tbmData, ebData, ptwData, risk, contractorSubmissionStore] = await Promise.all([
    queryNotionDatabase(company.tbmDbId, headers, {
      page_size: 100,
      sorts: [{ property: "날짜", direction: "descending" }],
    }),
    queryNotionDatabase(company.ebmDbId, headers, {
  page_size: 50,
  }),
    queryNotionDatabase(company.ptwDbId, headers, {
      page_size: 100,
    }),
    getRiskSummary(company.riskAssessmentDbId, headers),
    company.code === "bubblemon"
      ? fetchContractorSubmissionRecords()
      : Promise.resolve({ configured: false, records: [], errorMessage: "" }),
  ]);

  const contractorSubmissionSummary = getContractorSubmissionRecordSummary(contractorSubmissionStore.records);

  const today = getKstDateKey();
  const thisMonth = today.slice(0, 7);

  const rows: TbmRow[] = (tbmData.results ?? []).map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      작업명: getTitlePropPlainText(props["작업명"]),
      날짜: getDatePropStart(props["날짜"]),
      rawProps: props,
      특이사항: hasTbmSpecialIssue(props),
      조치상태: getSelectPropName(props["조치 상태"]),
      연결EB: getRelationPropCount(props["연결 EB"]),
      실시자: getPeopleFirstName(props["실시자(현장총괄)"]),
      작업태그: getMultiSelectNames(props["작업 태그"]),
    };
  });

  const ptwRows: PtwRow[] = (ptwData.results ?? []).map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      제목: getTitlePropPlainText(props["허가서 제목/번호 (예W-대도-20260324-고소-001)"]),
      작업일: getDatePropStart(props["작업일"]),
      작업유형: getSelectPropName(props["작업유형"]),
      승인상태: getSelectPropName(props["승인상태"]),
      허용여부: getSelectPropName(props["작업 허용 여부"]),
    };
  });

  const EB누락목록 = rows.filter((row) => needsTbmEvidenceBook(row.rawProps ?? {}) && row.연결EB === 0);
  const 조치필요목록 = rows.filter((row) => row.조치상태 === "조치 필요");
  const 오늘TBM = rows.filter((row) => row.날짜 === today).length;
  const PTW위험목록 = ptwRows.filter(
    (row) => row.허용여부 === "금지" || row.승인상태 === "반려"
  );
  const PTW미승인목록 = ptwRows.filter((row) => row.승인상태 === "요청");

  const PTW필요미제출 = rows.filter(
    (row) =>
      row.작업태그.some((tag) => PTW_REQUIRED_TAGS.includes(tag)) &&
      ptwRows.filter((ptw) => ptw.작업일 === row.날짜).length === 0
  );

  const dailySafetyBriefing = buildDailySafetyBriefing({
    companyName: company.name,
    todayTbmCount: 오늘TBM,
    ebMissingCount: EB누락목록.length,
    actionNeededCount: 조치필요목록.length,
    ptwPendingCount: PTW미승인목록.length,
    ptwBlockedCount: PTW위험목록.length,
    ptwRequiredMissingCount: PTW필요미제출.length,
    highRiskCount: risk.highRiskCount,
    riskActionNeededCount: risk.actionNeededCount,
    budgetNeededCount: risk.budgetNeededCount,
    partnerFollowUpCount: contractorSubmissionSummary.followUpCount,
    partnerPendingCount: contractorSubmissionSummary.principalPendingCount,
  });

  const todayTasks: { icon: string; text: string; href: string; urgent: boolean }[] = [];

  if (오늘TBM === 0) {
    todayTasks.push({ icon: "📋", text: "오늘 TBM 미작성 — 입력 필요", href: "/tbm", urgent: true });
  }

  if (EB누락목록.length > 0) {
    todayTasks.push({ icon: "🔴", text: `증빙 누락 ${EB누락목록.length}건 — 등록 필요`, href: "/ebm", urgent: true });
  }

  if (조치필요목록.length > 0) {
    todayTasks.push({ icon: "🟡", text: `조치 필요 ${조치필요목록.length}건 — 상태 업데이트`, href: "/tbm", urgent: false });
  }

  if (PTW미승인목록.length > 0) {
    todayTasks.push({ icon: "🧾", text: `PTW 승인 대기 ${PTW미승인목록.length}건 — 검토 필요`, href: "/ptw", urgent: false });
  }

  if (PTW필요미제출.length > 0) {
    todayTasks.push({ icon: "🚨", text: `고위험 작업 PTW 확인 필요 ${PTW필요미제출.length}건`, href: "/ptw", urgent: true });
  }

  if (contractorSubmissionSummary.followUpCount > 0) {
    todayTasks.push({
      icon: "🤝",
      text: `제출자료 보완 안내 ${contractorSubmissionSummary.followUpCount}건 — 확인 필요`,
      href: "/contractor-status",
      urgent: true,
    });
  } else if (contractorSubmissionSummary.principalPendingCount > 0) {
    todayTasks.push({
      icon: "🤝",
      text: `미확인 제출자료 ${contractorSubmissionSummary.principalPendingCount}건 — 확인 필요`,
      href: "/contractor-status",
      urgent: false,
    });
  }

  const tbm전체 = rows.length;
  const 특이사항건 = rows.filter((row) => row.특이사항).length;
  const EB연결건 = rows.filter((row) => needsTbmEvidenceBook(row.rawProps ?? {}) && row.연결EB > 0).length;
  const PTW승인건 = ptwRows.filter(
    (row) => row.승인상태 === "승인" || row.승인상태 === "완료"
  ).length;
  const PTW전체 = ptwRows.length;

  const tbm점수 = tbm전체 > 0 ? 40 : 0;
  const eb점수 = 특이사항건 > 0 ? Math.round((EB연결건 / 특이사항건) * 30) : 30;
  const ptw점수 = PTW전체 > 0 ? Math.round((PTW승인건 / PTW전체) * 30) : 30;
  const 증거점수 = Math.min(100, tbm점수 + eb점수 + ptw점수);

  const 증거분석 = [
    { label: "TBM 기록", ok: tbm전체 > 0, count: tbm전체 },
    { label: "EB 연결 (특이사항 건)", ok: EB누락목록.length === 0, count: EB연결건 },
    { label: "PTW 승인", ok: PTW전체 === 0 || PTW승인건 === PTW전체, count: PTW승인건 },
  ];

  let 최악건:
    | (TbmRow & { 위험요인: string; S: number; L: number; R: number })
    | null = null;
  let 최악R = 0;

  for (const row of rows) {
    for (const tag of row.작업태그) {
      const mappedRisk = TAG_RISK_MAP[tag];

      if (mappedRisk) {
        const R = mappedRisk.S * mappedRisk.L;

        if (R > 최악R) {
          최악R = R;
          최악건 = {
            ...row,
            위험요인: mappedRisk.factor,
            S: mappedRisk.S,
            L: mappedRisk.L,
            R,
          };
        }
      }
    }
  }

  const 에스컬레이션 = Boolean(최악건 && (최악R >= 16 || (최악R >= 8 && 최악건.S === 5)));

  return {
    전체: tbm전체,
    이번달: rows.filter((row) => row.날짜?.startsWith(thisMonth)).length,
    특이사항: 특이사항건,
    EB누락: EB누락목록.length,
    조치필요: 조치필요목록.length,
    리스크점수: Math.min(100, EB누락목록.length * 20 + 조치필요목록.length * 10),
    EB누락목록: EB누락목록.slice(0, 3),
    조치필요목록: 조치필요목록.slice(0, 3),
    최악건,
    최악R,
    에스컬레이션,
    오늘TBM,
    PTW위험: PTW위험목록.length,
    PTW미승인: PTW미승인목록.length,
    PTW위험목록: PTW위험목록.slice(0, 3),
    PTW미승인목록: PTW미승인목록.slice(0, 3),
    todayTasks,
    dailySafetyBriefing,
    증거점수,
    증거분석,
    risk,
  };
}

function RiskIntelligenceSection({ risk }: { risk: RiskSummary }) {
  const executiveSignals = [
    {
      label: "고위험 항목",
      value: risk.highRiskCount,
      hint: "즉시 위험 수준 확인",
      accent: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    },
    {
      label: "조치 필요",
      value: risk.actionNeededCount,
      hint: "지연 또는 미조치 확인",
      accent: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    },
    {
      label: "비용 검토",
      value: risk.budgetNeededCount,
      hint: "대표 의사결정 가능 항목",
      accent: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    },
  ].filter((signal) => signal.value > 0);

  return (
    <section className="rounded-2xl border border-blue-500/25 bg-slate-900/80 p-4 shadow-xl md:rounded-3xl md:p-5">
      <div className="flex items-start justify-between gap-3 md:gap-4">
        <div>
          <p className="text-xs font-bold text-blue-300">대표 의사결정</p>
          <h2 className="mt-0.5 text-base font-bold text-white md:mt-1 md:text-lg">
            대표 Risk 확인 신호
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-400 md:mt-1">
            오늘 대표가 우선 확인할 Risk만 요약합니다.
          </p>
        </div>
        <Link
          href="/risk"
          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-blue-400/40 bg-blue-600/90 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-500 md:px-3 md:py-1.5 md:text-xs"
        >
          Risk 상세 보기 →
        </Link>
      </div>

      {executiveSignals.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-3 md:gap-3">
          {executiveSignals.slice(0, 3).map((signal, index) => (
            <div
              key={signal.label}
              className={`${index >= 2 ? "hidden md:block" : "block"} rounded-xl border p-3 md:rounded-2xl md:p-4 ${signal.accent}`}
            >
              <div className="flex items-end justify-between gap-3">
                <span className="text-xs font-bold text-white md:text-sm">
                  {signal.label}
                </span>
                <span className="text-2xl font-black leading-none md:text-3xl">
                  {signal.value}
                </span>
              </div>
              <p className="mt-2 hidden text-xs text-slate-300 md:block">{signal.hint}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-200 md:mt-4 md:rounded-2xl md:p-4">
          대표 확인이 필요한 Risk 신호가 없습니다.
        </div>
      )}

      {risk.highRiskItems.length > 0 && (
        <div className="mt-4 hidden space-y-2 md:block">
          {risk.highRiskItems.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href="/risk"
              className="block rounded-xl border border-slate-700 bg-slate-950/50 p-3 transition hover:border-blue-500/50 hover:bg-slate-900"
            >
              <div className="text-sm font-semibold leading-snug text-white [word-break:keep-all]">
                {item.no ? `${item.no}. ` : ""}
                {item.title || item.processName || "위험성평가 항목"}
              </div>
              {(item.processName || item.hazard) && (
                <div className="mt-1 text-xs leading-relaxed text-slate-400">
                  {item.processName}
                  {item.hazard ? ` · ${item.hazard}` : ""}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export default async function DashboardPage() {
  const s = await getDashboardData();
  const hasItemsToReview = s.todayTasks.length > 0;
  const hasPtwExceptions =
    s.PTW위험목록.length > 0 || s.PTW미승인목록.length > 0;

  const detailMenus = [
    {
      href: "/risk",
      icon: "⚠️",
      label: "Risk",
      description: "위험성평가 상세",
    },
    { href: "/ptw", icon: "🧾", label: "PTW", description: "허가·승인 상세" },
    { href: "/tbm", icon: "📋", label: "TBM", description: "작업 전 기록" },
    { href: "/ebm", icon: "📚", label: "EB", description: "증빙 상세" },
    {
      href: "/manager/representative-confirmations",
      icon: "🤝",
      label: "근로자대표 참여확인",
      description: "확인·보완 의견 접수함",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 pb-8 text-slate-100 md:pb-10">
      <SafeNav />

      <div className="mx-auto max-w-6xl px-4 py-4 md:px-5 md:py-6">
        <div className="mb-3 flex items-center justify-between gap-3 md:mb-5 md:gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              📊 대표 대시보드
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 [word-break:keep-all] md:mt-1 md:text-sm">
              오늘 대표 확인이 필요한 신호부터 보여드립니다.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
            {new Date()
              .toLocaleDateString("ko-KR")
              .replace(/\.\s*/g, ".")
              .replace(/\.$/, "")}
          </span>
        </div>

        {/* 1. 오늘 확인 필요 */}
        <section className="mb-3 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-4 shadow-2xl md:mb-5 md:rounded-3xl md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="max-w-3xl">
              <div className="mb-1.5 flex items-center gap-2 md:mb-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    hasItemsToReview
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  오늘 확인 필요
                </span>
                <span className="text-xs text-slate-400">대표 우선 확인</span>
              </div>
              <h2 className="text-xl font-bold leading-tight text-white [word-break:keep-all] md:text-2xl">
                {hasItemsToReview
                  ? `오늘 확인할 항목이 ${s.todayTasks.length}건 있습니다.`
                  : "현재 주요 관리 항목은 안정적입니다."}
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-300 [word-break:keep-all] md:mt-2 md:text-sm md:leading-6">
                조치 필요 {s.조치필요}건 · 증빙 누락 {s.EB누락}건 · PTW 승인
                대기 {s.PTW미승인}건
              </p>
            </div>
            <div
              className={`hidden w-full shrink-0 items-center justify-between rounded-2xl border px-4 py-3 lg:block lg:w-44 ${
                hasItemsToReview
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <div className="text-xs font-medium text-slate-300">
                확인 필요
              </div>
              <div
                className={`text-4xl font-black leading-none lg:mt-2 ${
                  hasItemsToReview ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {s.todayTasks.length}
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-700/80 pt-3 md:mt-4 md:pt-4">
            <TodayTasksCard tasks={s.todayTasks} />
          </div>
        </section>

        <section className="mb-3 grid gap-3 md:mb-5 md:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
          {/* 2. AI 운영브리핑: 문구·생성 로직·표시 조건 유지 */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-xl md:rounded-3xl md:p-4">
            <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
              <h2 className="text-base font-bold text-white">
                오늘 운영 브리핑
              </h2>
              <span className="rounded-full border border-cyan-400/40 px-2 py-0.5 text-[11px] font-black text-cyan-200">
                {s.dailySafetyBriefing.statusLabel}
              </span>
              <span className="text-xs text-slate-500">
                TBM · 증빙 · PTW 기준
              </span>
            </div>
            <div className="mb-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-2.5 md:mb-3 md:px-4 md:py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black text-cyan-200">
                    오늘 먼저 볼 신호
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-cyan-50">
                    {s.dailySafetyBriefing.executiveHeadline}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-cyan-400/40 px-2 py-0.5 text-[11px] font-black text-cyan-200">
                  {s.dailySafetyBriefing.statusLabel}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 md:gap-2">
                {s.dailySafetyBriefing.executiveMessages
                  .slice(0, 3)
                  .map((message: string) => (
                    <span
                      key={message}
                      className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-200 md:px-3 md:text-xs"
                    >
                      {message}
                    </span>
                  ))}
                {s.dailySafetyBriefing.partnerMessages
                  .filter((message: string) => !message.includes("신호 없음"))
                  .slice(0, 1)
                  .map((message: string) => (
                    <span
                      key={message}
                      className="rounded-full border border-rose-400/40 bg-rose-950/30 px-2.5 py-1 text-[11px] font-bold text-rose-200 md:px-3 md:text-xs"
                    >
                      {message}
                    </span>
                  ))}
              </div>
            </div>

            <AiDiagnosisCard />
          </div>

          {/* 3. 대표 Risk 확인 신호 */}
          <RiskIntelligenceSection risk={s.risk} />
        </section>

        {/* 4. 상세 메뉴 진입 */}
        <section className="mb-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 md:mb-5 md:rounded-3xl md:p-5">
          <div className="mb-2 md:mb-4">
            <h2 className="text-base font-bold text-white">상세 메뉴</h2>
            <p className="mt-1 hidden text-xs text-slate-400 md:block">
              세부 처리 현황과 전체 목록은 각 메뉴에서 확인하세요.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            {detailMenus.map((menu) => (
              <Link
                key={menu.href}
                href={menu.href}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2.5 transition hover:border-blue-500/60 hover:bg-slate-800 md:block md:rounded-2xl md:p-4"
              >
                <div className="flex items-center justify-between gap-2 md:gap-3">
                  <span className="text-base md:text-xl" aria-hidden="true">
                    {menu.icon}
                  </span>
                  <span className="hidden text-xs font-bold text-slate-500 md:inline">
                    열기 →
                  </span>
                </div>
                <div className="text-sm font-bold text-white md:mt-3">
                  {menu.label}
                </div>
                <div className="mt-1 hidden text-xs text-slate-400 md:block">
                  {menu.description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 기본 비노출 운영 정보 */}
        <details className="group rounded-2xl border border-slate-800 bg-slate-900/50 md:rounded-3xl">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-300 marker:content-none md:gap-4 md:px-5 md:py-4">
            <span>운영 상세 펼쳐보기</span>
            <span className="text-xs font-medium text-slate-500 group-open:hidden">
              KPI · 증거 완결성 · PTW
            </span>
            <span className="hidden text-xs font-medium text-slate-500 group-open:inline">
              접기 ↑
            </span>
          </summary>

          <div className="grid gap-5 border-t border-slate-800 p-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">증거 완결성</h2>
                <span className="text-xs text-slate-500">
                  기록 · 증빙 · 승인
                </span>
              </div>
              <EvidenceScoreCard score={s.증거점수} breakdown={s.증거분석} />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">운영 KPI</h2>
                <span className="text-xs text-slate-500">TBM · EB · PTW</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <div className="text-2xl font-black text-white">{s.전체}</div>
                  <div className="mt-1 text-xs text-slate-400">전체 TBM</div>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <div className="text-2xl font-black text-white">
                    {s.이번달}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">이번 달 TBM</div>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <div className="text-2xl font-black text-white">
                    {s.특이사항}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    이번 달 특이사항
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/80 p-3">
                  <div className="text-2xl font-black text-white">
                    {s.EB누락}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">증빙 누락</div>
                </div>
              </div>
            </div>

            {hasPtwExceptions && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 xl:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">
                    PTW 확인 필요
                  </h2>
                  <Link
                    href="/ptw"
                    className="text-xs font-bold text-amber-300 hover:text-amber-200"
                  >
                    PTW 상세 보기 →
                  </Link>
                </div>
                <div className="space-y-2">
                  {[...s.PTW위험목록, ...s.PTW미승인목록]
                    .slice(0, 3)
                    .map((row) => (
                      <Link
                        key={row.id}
                        href={`/ptw/${row.id}`}
                        className="block rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-white hover:bg-slate-800"
                      >
                        {row.제목 || "제목 없음"}
                        <div className="mt-1 text-xs text-slate-400">
                          {row.작업일} · {row.작업유형} ·{" "}
                          {row.승인상태 || row.허용여부}
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </main>
  );
}
