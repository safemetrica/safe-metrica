// src/lib/riskCompletionCandidateView.ts

import {
  evaluateRiskEvidenceCompletion,
  type BuildRiskCompletionInputParams,
} from "./riskEvidenceCompletionAdapter";

import type { CompletionLevel } from "./riskCompletionRules";

export type RiskCompletionCandidateTone =
  | "green"
  | "amber"
  | "blue"
  | "slate"
  | "red";

export interface RiskCompletionCandidateView {
  level: CompletionLevel;
  label: string;
  shortLabel: string;
  tone: RiskCompletionCandidateTone;
  description: string;
  managerNote: string;
  missingEvidence: string[];
  recommendedNextAction: string;
  matchedRuleId: string;
  isCompletionCandidate: boolean;
  riskDbUpdateAllowed: false;
}

export function getRiskCompletionCandidateView(
  params: BuildRiskCompletionInputParams
): RiskCompletionCandidateView {
  const { result } = evaluateRiskEvidenceCompletion(params);

  if (result.level === "completionCandidate") {
    return {
      level: result.level,
      label: "개선대책 완료 후보",
      shortLabel: "완료 후보",
      tone: "green",
      description:
        "조치상태와 증빙이 위험요인별 완료조건에 부합하여 완료 반영 후보로 볼 수 있습니다.",
      managerNote:
        "완료 후보는 관리자 검토 전 단계입니다. Risk DB 상태는 자동 변경되지 않습니다.",
      missingEvidence: result.missingEvidence,
      recommendedNextAction: result.recommendedNextAction,
      matchedRuleId: result.matchedRuleId,
      isCompletionCandidate: result.isCompletionCandidate,
      riskDbUpdateAllowed: false,
    };
  }

  if (result.level === "inProgress") {
    return {
      level: result.level,
      label: "조치 진행중",
      shortLabel: "진행중",
      tone: "amber",
      description:
        "일부 증빙은 있으나 위험요인별 완료조건을 모두 충족하지 않았습니다.",
      managerNote:
        "조치사진 또는 작업대상사진만으로는 개선대책 완료로 확정하지 않습니다.",
      missingEvidence: result.missingEvidence,
      recommendedNextAction: result.recommendedNextAction,
      matchedRuleId: result.matchedRuleId,
      isCompletionCandidate: result.isCompletionCandidate,
      riskDbUpdateAllowed: false,
    };
  }

  if (result.level === "evidenceOnly") {
    return {
      level: result.level,
      label: "증빙 확인 · 완료조건 확인 필요",
      shortLabel: "확인 필요",
      tone: "blue",
      description:
        "TBM 또는 사진 증빙은 있으나 해당 위험요인의 완료조건 판단이 필요합니다.",
      managerNote:
        "일반 증빙만으로 Risk DB 완료 처리는 하지 않습니다. 위험유형별 완료조건을 확인하세요.",
      missingEvidence: result.missingEvidence,
      recommendedNextAction: result.recommendedNextAction,
      matchedRuleId: result.matchedRuleId,
      isCompletionCandidate: result.isCompletionCandidate,
      riskDbUpdateAllowed: false,
    };
  }

  if (result.level === "approvedCompleted") {
    return {
      level: result.level,
      label: "관리자 승인 완료",
      shortLabel: "승인 완료",
      tone: "green",
      description:
        "관리자 승인으로 완료 처리된 상태입니다.",
      managerNote:
        "이 상태는 승인 플로우에서만 사용합니다. 본 view model은 Risk DB를 직접 변경하지 않습니다.",
      missingEvidence: result.missingEvidence,
      recommendedNextAction: result.recommendedNextAction,
      matchedRuleId: result.matchedRuleId,
      isCompletionCandidate: result.isCompletionCandidate,
      riskDbUpdateAllowed: false,
    };
  }

  return {
    level: result.level,
    label: "조치 증빙 미확인",
    shortLabel: "미확인",
    tone: "slate",
    description:
      "확인 가능한 TBM 또는 조치 증빙이 부족합니다.",
    managerNote:
      "위험요인별 완료조건을 판단할 증빙이 부족합니다. Risk DB 상태는 변경되지 않습니다.",
    missingEvidence: result.missingEvidence,
    recommendedNextAction: result.recommendedNextAction,
    matchedRuleId: result.matchedRuleId,
    isCompletionCandidate: result.isCompletionCandidate,
    riskDbUpdateAllowed: false,
  };
}
