import type { LinkedRiskItem } from "@/lib/tbmRiskLink";

export type ImprovementStatus = "미조치" | "진행중" | "완료" | "재확인 필요";

export type ImprovementTrackingItem = {
  riskId: string;
  riskTitle: string;
  action: string;
  status: ImprovementStatus;
  completionScore: number;
  reason: string;
  nextAction: string;
};

export function evaluateImprovementTracking(input: {
  linkedRiskItems: LinkedRiskItem[];
  actionPhotoCount: number;
  workTargetPhotoCount: number;
  hasTbmEvidence: boolean;
}): ImprovementTrackingItem[] {
  return input.linkedRiskItems.map((item) => {
    const hasActionPhoto = input.actionPhotoCount > 0;
    const hasWorkTargetPhoto = input.workTargetPhotoCount > 0;
    const hasImprovementPlan = item.improvementPlan.trim().length > 0;

    let status: ImprovementStatus = "미조치";
    let completionScore = 20;
    let reason = "연결된 위험성평가 항목은 있으나 조치 기록이 아직 부족합니다.";
    let nextAction = "개선대책과 관련된 작업 위치 또는 조치 사진을 추가해 주세요.";

    if (input.hasTbmEvidence && !hasActionPhoto && !hasWorkTargetPhoto) {
      status = "진행중";
      completionScore = 40;
      reason = "TBM 공유는 확인되었지만 작업 대상 또는 조치 사진은 아직 부족합니다.";
      nextAction = "위험요인 위치, 작업 전 상태, 조치 후 상태 사진을 추가하면 좋습니다.";
    }

    if (hasWorkTargetPhoto && !hasActionPhoto) {
      status = "진행중";
      completionScore = 60;
      reason = "작업 대상 사진은 확인되었지만 조치 완료 사진은 아직 부족합니다.";
      nextAction = "조치 후 상태 사진을 추가하면 개선나중에 확인하기 쉬운 정도가 높아집니다.";
    }

    if (hasActionPhoto) {
      status = "완료";
      completionScore = 80;
      reason = "조치 사진이 확인되어 개선조치 이행 기록이 확보되었습니다.";
      nextAction = "필요 시 조치 전 사진과 재평가 결과를 함께 남기면 완료 신뢰도가 높아집니다.";
    }

    if (!hasImprovementPlan) {
      status = "재확인 필요";
      completionScore = Math.min(completionScore, 50);
      reason = "연결된 위험성평가 항목에 개선대책 내용이 부족합니다.";
      nextAction = "위험성평가 DB에 개선대책을 보완해 주세요.";
    }

    return {
      riskId: item.id,
      riskTitle: item.title || item.taskName || "위험성평가 항목",
      action: item.improvementPlan || "개선대책 미입력",
      status,
      completionScore,
      reason,
      nextAction,
    };
  });
}

export function summarizeImprovementTracking(items: ImprovementTrackingItem[]) {
  return {
    total: items.length,
    completed: items.filter((item) => item.status === "완료").length,
    inProgress: items.filter((item) => item.status === "진행중").length,
    notStarted: items.filter((item) => item.status === "미조치").length,
    needsReview: items.filter((item) => item.status === "재확인 필요").length,
  };
}
