// src/lib/dashboardRiskExecutionKpi.ts

export type DashboardKpiTone =
  | "green"
  | "amber"
  | "blue"
  | "red"
  | "slate";

export interface RiskExecutionKpiSourceItem {
  riskItemId?: string;
  riskLevel?: string;
  riskDbStatus?: string;

  tbmShareStatus?: string;
  tbmEducationStatus?: string;
  tbmReviewNeeded?: boolean;

  completionLevel?: string;
  isCompletionCandidate?: boolean;
  missingEvidence?: string[];

  approvalStatus?: string;
  canApprove?: boolean;
  canCreateRiskDbUpdatePayload?: boolean;

  budgetRequired?: boolean;
  estimatedCost?: number | null;
}

export interface DashboardRiskExecutionKpi {
  totalRiskItems: number;

  tbmShareRequiredCount: number;
  tbmShareCompletedCount: number;
  tbmShareReviewNeededCount: number;
  tbmShareCompletionRate: number;

  completionCandidateCount: number;
  actionInProgressCount: number;
  evidenceOnlyCount: number;
  evidenceMissingCount: number;

  approvalReadyCount: number;
  approvedCount: number;
  moreEvidenceRequiredCount: number;
  rejectedCount: number;

  highRiskCount: number;
  budgetRequiredCount: number;
  estimatedBudgetTotal: number;

  executiveSummaryLabel: string;
  executiveSummaryTone: DashboardKpiTone;
  executiveSummaryMessage: string;

  integrityNote: string;
  riskDbUpdateAllowed: false;
}

function normalize(value?: string | number | boolean | null): string {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

function includesAny(value: string | undefined, keywords: string[]): boolean {
  const target = normalize(value);
  return keywords.some((keyword) => target.includes(normalize(keyword)));
}

function isHighRisk(item: RiskExecutionKpiSourceItem): boolean {
  return includesAny(item.riskLevel, ["상", "고위험", "high"]);
}

function isTbmShareRequired(item: RiskExecutionKpiSourceItem): boolean {
  return item.tbmShareStatus === "required";
}

function isTbmShareCompleted(item: RiskExecutionKpiSourceItem): boolean {
  return item.tbmShareStatus === "shared";
}

function isTbmShareReviewNeeded(item: RiskExecutionKpiSourceItem): boolean {
  return item.tbmShareStatus === "reviewNeeded" || Boolean(item.tbmReviewNeeded);
}

function isCompletionCandidate(item: RiskExecutionKpiSourceItem): boolean {
  return (
    item.completionLevel === "completionCandidate" ||
    Boolean(item.isCompletionCandidate)
  );
}

function isActionInProgress(item: RiskExecutionKpiSourceItem): boolean {
  return item.completionLevel === "inProgress";
}

function isEvidenceOnly(item: RiskExecutionKpiSourceItem): boolean {
  return item.completionLevel === "evidenceOnly";
}

function isEvidenceMissing(item: RiskExecutionKpiSourceItem): boolean {
  return item.completionLevel === "notStarted";
}

function hasMissingEvidence(item: RiskExecutionKpiSourceItem): boolean {
  return Boolean(item.missingEvidence?.length);
}

function sumEstimatedBudget(items: RiskExecutionKpiSourceItem[]): number {
  return items.reduce((sum, item) => {
    const value = Number(item.estimatedCost ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function getRate(done: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((done / target) * 100);
}

function getExecutiveSummary(params: {
  tbmShareRequiredCount: number;
  tbmShareReviewNeededCount: number;
  completionCandidateCount: number;
  approvalReadyCount: number;
  moreEvidenceRequiredCount: number;
  highRiskCount: number;
}): {
  label: string;
  tone: DashboardKpiTone;
  message: string;
} {
  if (params.moreEvidenceRequiredCount > 0 || params.tbmShareReviewNeededCount > 0) {
    return {
      label: "확인 필요",
      tone: "amber",
      message:
        "TBM 공유 내용 또는 증빙 보완이 필요한 항목이 있습니다. Risk DB 완료 반영 전 관리자 확인이 필요합니다.",
    };
  }

  if (params.approvalReadyCount > 0) {
    return {
      label: "승인 대기",
      tone: "blue",
      message:
        "개선대책 완료 후보 중 승인 대기 항목이 있습니다. 승인 전까지 Risk DB 상태는 변경되지 않습니다.",
    };
  }

  if (params.completionCandidateCount > 0) {
    return {
      label: "완료 후보 있음",
      tone: "blue",
      message:
        "증빙과 완료조건을 충족한 완료 후보가 있습니다. 관리자 승인 절차를 통해 반영 여부를 확인하세요.",
    };
  }

  if (params.tbmShareRequiredCount > 0 || params.highRiskCount > 0) {
    return {
      label: "관리 필요",
      tone: "amber",
      message:
        "TBM 공유 또는 고위험 관리가 필요한 항목이 있습니다. 현장 공유와 후속 증빙을 확인하세요.",
    };
  }

  return {
    label: "안정",
    tone: "green",
    message:
      "현재 대표 확인이 필요한 주요 실행 항목이 낮은 수준으로 집계되었습니다.",
  };
}

export function buildDashboardRiskExecutionKpi(
  items: RiskExecutionKpiSourceItem[]
): DashboardRiskExecutionKpi {
  const totalRiskItems = items.length;

  const tbmShareRequiredCount = items.filter(isTbmShareRequired).length;
  const tbmShareCompletedCount = items.filter(isTbmShareCompleted).length;
  const tbmShareReviewNeededCount = items.filter(isTbmShareReviewNeeded).length;

  const tbmShareTargetCount =
    tbmShareRequiredCount + tbmShareCompletedCount + tbmShareReviewNeededCount;

  const completionCandidateCount = items.filter(isCompletionCandidate).length;
  const actionInProgressCount = items.filter(isActionInProgress).length;
  const evidenceOnlyCount = items.filter(isEvidenceOnly).length;

  const evidenceMissingCount = items.filter((item) => {
    return isEvidenceMissing(item) || hasMissingEvidence(item);
  }).length;

  const approvalReadyCount = items.filter((item) => {
    return item.approvalStatus === "approvalReady" || Boolean(item.canApprove);
  }).length;

  const approvedCount = items.filter((item) => {
    return (
      item.approvalStatus === "approved" ||
      Boolean(item.canCreateRiskDbUpdatePayload)
    );
  }).length;

  const moreEvidenceRequiredCount = items.filter((item) => {
    return item.approvalStatus === "moreEvidenceRequired";
  }).length;

  const rejectedCount = items.filter((item) => {
    return item.approvalStatus === "rejected";
  }).length;

  const highRiskCount = items.filter(isHighRisk).length;
  const budgetRequiredCount = items.filter((item) => item.budgetRequired).length;
  const estimatedBudgetTotal = sumEstimatedBudget(items);

  const executiveSummary = getExecutiveSummary({
    tbmShareRequiredCount,
    tbmShareReviewNeededCount,
    completionCandidateCount,
    approvalReadyCount,
    moreEvidenceRequiredCount,
    highRiskCount,
  });

  return {
    totalRiskItems,

    tbmShareRequiredCount,
    tbmShareCompletedCount,
    tbmShareReviewNeededCount,
    tbmShareCompletionRate: getRate(tbmShareCompletedCount, tbmShareTargetCount),

    completionCandidateCount,
    actionInProgressCount,
    evidenceOnlyCount,
    evidenceMissingCount,

    approvalReadyCount,
    approvedCount,
    moreEvidenceRequiredCount,
    rejectedCount,

    highRiskCount,
    budgetRequiredCount,
    estimatedBudgetTotal,

    executiveSummaryLabel: executiveSummary.label,
    executiveSummaryTone: executiveSummary.tone,
    executiveSummaryMessage: executiveSummary.message,

    integrityNote:
      "대표 대시보드 KPI는 실행·공유·승인 상태를 요약합니다. TBM 공유, 증빙 등록, 완료 후보는 Risk DB 완료와 분리됩니다.",
    riskDbUpdateAllowed: false,
  };
}
