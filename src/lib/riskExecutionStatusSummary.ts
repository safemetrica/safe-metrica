// src/lib/riskExecutionStatusSummary.ts

import {
  getRiskTbmShareStatusView,
} from "./riskTbmShareStatusView";

import {
  getRiskCompletionCandidateView,
} from "./riskCompletionCandidateView";

import {
  evaluateRiskStatusApproval,
  type RiskApprovalDecision,
  type RiskApprovalActorRole,
} from "./riskStatusApprovalFlow";

import type {
  RiskItemForTbmShare,
} from "./tbmShareTracking";

import type {
  BuildRiskCompletionInputParams,
  RiskItemLike,
  TbmLike,
  EvidencePhotoLike,
} from "./riskEvidenceCompletionAdapter";

import type {
  RiskExecutionKpiSourceItem,
} from "./dashboardRiskExecutionKpi";

export type RiskExecutionOverallStatus =
  | "tbmShareRequired"
  | "tbmShared"
  | "reviewNeeded"
  | "completionCandidate"
  | "approvalReady"
  | "approved"
  | "evidenceMissing"
  | "stable";

export type RiskExecutionOverallTone =
  | "green"
  | "amber"
  | "blue"
  | "red"
  | "slate";

export interface RiskExecutionApprovalContext {
  actorName?: string;
  actorRole?: RiskApprovalActorRole | string;
  decision?: RiskApprovalDecision;
  memo?: string;
  approvedAt?: string;
}

export interface RiskExecutionStatusSummaryInput {
  riskItem: RiskItemLike & RiskItemForTbmShare & {
    riskLevel?: string;
    budgetRequired?: boolean;
    estimatedCost?: number | null;
    approvalStatus?: string;
    approvalBy?: string;
    approvalDate?: string;
    approvalMemo?: string;
    riskDbReflectionStatus?: string;
  };
  tbm?: TbmLike;
  photos?: EvidencePhotoLike[];
  fallbackVisionObjects?: BuildRiskCompletionInputParams["fallbackVisionObjects"];
  approval?: RiskExecutionApprovalContext;
}

export interface RiskExecutionStatusSummary {
  riskItemId?: string;

  overallStatus: RiskExecutionOverallStatus;
  overallTone: RiskExecutionOverallTone;
  overallLabel: string;
  overallMessage: string;

  tbmShare: ReturnType<typeof getRiskTbmShareStatusView>;
  completionCandidate: ReturnType<typeof getRiskCompletionCandidateView>;
  approval: ReturnType<typeof evaluateRiskStatusApproval>;

  dashboardKpiSourceItem: RiskExecutionKpiSourceItem;

  riskDbReflectionStatus: string | null;
  riskDbReflectionLabel: string;
  riskDbReflectionTone: RiskExecutionOverallTone;

  integrityNote: string;
  riskDbUpdateAllowed: false;
}

function normalizeText(value?: string | null): string {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

function resolveRiskDbReflectionStatus(value?: string | null): {
  status: string | null;
  label: string;
  tone: RiskExecutionOverallTone;
} {
  const normalized = normalizeText(value);

  if (normalized.includes("반영완료")) {
    return {
      status: value ?? "반영 완료",
      label: "Risk DB 반영 완료",
      tone: "green",
    };
  }

  return {
    status: value || null,
    label: "Risk DB 미반영",
    tone: "amber",
  };
}


function resolveOverallStatus(params: {
  tbmShare: ReturnType<typeof getRiskTbmShareStatusView>;
  completionCandidate: ReturnType<typeof getRiskCompletionCandidateView>;
  approval: ReturnType<typeof evaluateRiskStatusApproval>;
}): {
  status: RiskExecutionOverallStatus;
  tone: RiskExecutionOverallTone;
  label: string;
  message: string;
} {
  const { tbmShare, completionCandidate, approval } = params;

  if (approval.approvalStatus === "approved") {
    return {
      status: "approved",
      tone: "green",
      label: "승인 완료",
      message:
        "관리자 승인으로 Risk DB 반영 payload가 생성된 상태입니다. 실제 DB 저장은 별도 단계에서 수행합니다.",
    };
  }

  if (approval.approvalStatus === "approvalReady" && approval.canApprove) {
    return {
      status: "approvalReady",
      tone: "blue",
      label: "승인 대기",
      message:
        "개선대책 완료 후보이며 관리자 승인 대기 상태입니다.",
    };
  }

  if (completionCandidate.isCompletionCandidate) {
    return {
      status: "completionCandidate",
      tone: "blue",
      label: "완료 후보",
      message:
        "증빙과 완료조건이 충족되어 개선대책 완료 후보로 볼 수 있습니다.",
    };
  }

  if (completionCandidate.level === "notStarted") {
    return {
      status: "evidenceMissing",
      tone: "amber",
      label: "증빙 부족",
      message:
        "위험요인별 완료조건을 판단할 TBM 또는 조치 증빙이 부족합니다.",
    };
  }

  if (tbmShare.status === "reviewNeeded" || completionCandidate.level === "evidenceOnly") {
    return {
      status: "reviewNeeded",
      tone: "amber",
      label: "확인 필요",
      message:
        "TBM 연결 또는 증빙은 있으나 공유 내용과 완료조건 확인이 필요합니다.",
    };
  }

  if (tbmShare.status === "required") {
    return {
      status: "tbmShareRequired",
      tone: "amber",
      label: "TBM 공유 필요",
      message:
        "위험성평가 관리 항목으로 보이며 TBM 공유 기록 연결이 필요합니다.",
    };
  }

  if (tbmShare.status === "shared") {
    return {
      status: "tbmShared",
      tone: "green",
      label: "TBM 공유 완료",
      message:
        "TBM 공유 또는 교육 기록은 확인되었습니다. 개선대책 완료 여부는 별도 판단합니다.",
    };
  }

  return {
    status: "stable",
    tone: "slate",
    label: "관리 상태 확인",
    message:
      "현재 통합 실행상태에서 즉시 조치할 주요 항목은 낮은 수준으로 집계되었습니다.",
  };
}

export function buildRiskExecutionStatusSummary(
  input: RiskExecutionStatusSummaryInput
): RiskExecutionStatusSummary {
  const riskItem = input.riskItem;

  const tbmShare = getRiskTbmShareStatusView(riskItem);
  const linkedTbmForCompletion =
    input.tbm ??
    (Array.isArray(riskItem.linkedTbms) && riskItem.linkedTbms.length > 0
      ? riskItem.linkedTbms[0]
      : undefined);

  const completionCandidate = getRiskCompletionCandidateView({
    riskItem,
    tbm: linkedTbmForCompletion,
    photos: input.photos ?? [],
    fallbackVisionObjects: input.fallbackVisionObjects ?? [],
  });

  const approval = evaluateRiskStatusApproval({
    riskItemId: riskItem.riskItemId ?? riskItem.id,
    currentRiskDbStatus:
      riskItem.status ?? riskItem.improvementStatus ?? riskItem.actionStatus,
    completionLevel: completionCandidate.level,
    isCompletionCandidate: completionCandidate.isCompletionCandidate,
    matchedRuleId: completionCandidate.matchedRuleId,
    missingEvidence: completionCandidate.missingEvidence,
    actorName: input.approval?.actorName,
    actorRole: input.approval?.actorRole,
    decision: input.approval?.decision,
    memo: input.approval?.memo,
    approvedAt: input.approval?.approvedAt,
    existingApprovalStatus: riskItem.approvalStatus,
    existingApprovalBy: riskItem.approvalBy,
    existingApprovalDate: riskItem.approvalDate,
    existingApprovalMemo: riskItem.approvalMemo,
    riskDbReflectionStatus: riskItem.riskDbReflectionStatus,
  });

  const overall = resolveOverallStatus({
    tbmShare,
    completionCandidate,
    approval,
  });

  const reflection = resolveRiskDbReflectionStatus(riskItem.riskDbReflectionStatus);

  const dashboardKpiSourceItem: RiskExecutionKpiSourceItem = {
    riskItemId: riskItem.riskItemId ?? riskItem.id,
    riskLevel: riskItem.riskLevel,
    riskDbStatus:
      riskItem.status ?? riskItem.improvementStatus ?? riskItem.actionStatus,

    tbmShareStatus: tbmShare.status,
    tbmEducationStatus: tbmShare.educationStatus,
    tbmReviewNeeded: tbmShare.reviewNeeded,

    completionLevel: completionCandidate.level,
    isCompletionCandidate: completionCandidate.isCompletionCandidate,
    missingEvidence: completionCandidate.missingEvidence,

    approvalStatus: approval.approvalStatus,
    canApprove: approval.canApprove,
    canCreateRiskDbUpdatePayload: approval.canCreateRiskDbUpdatePayload,

    budgetRequired: riskItem.budgetRequired,
    estimatedCost: riskItem.estimatedCost,
  };

  return {
    riskItemId: riskItem.riskItemId ?? riskItem.id,

    overallStatus: overall.status,
    overallTone: overall.tone,
    overallLabel: overall.label,
    overallMessage: overall.message,

    tbmShare,
    completionCandidate,
    approval,

    dashboardKpiSourceItem,

    riskDbReflectionStatus: reflection.status,
    riskDbReflectionLabel: reflection.label,
    riskDbReflectionTone: reflection.tone,

    integrityNote:
      "통합 실행상태는 TBM 공유, 증빙, 완료 후보, 승인상태를 함께 보여주지만 Risk DB를 직접 변경하지 않습니다.",
    riskDbUpdateAllowed: false,
  };
}
