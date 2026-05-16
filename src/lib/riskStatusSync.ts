import type { LinkedRiskItem } from "@/lib/tbmRiskLink";
import type { ImprovementTrackingItem } from "@/lib/improvementTracking";

export type RiskStatusSyncLevel =
  | "반영 가능"
  | "진행 반영 가능"
  | "확인 필요"
  | "반영 불가";

export type RiskStatusSyncItem = {
  riskId: string;
  riskTitle: string;
  currentRiskStatus: string;
  suggestedStatus: string;
  syncLevel: RiskStatusSyncLevel;
  reason: string;
};

export function evaluateRiskStatusSync(input: {
  linkedRiskItems: LinkedRiskItem[];
  improvementTrackingItems: ImprovementTrackingItem[];
}): RiskStatusSyncItem[] {
  return input.linkedRiskItems.map((risk) => {
    const tracking = input.improvementTrackingItems.find(
      (item) => item.riskId === risk.id
    );

    const currentRiskStatus = risk.status || "상태 미지정";

    if (!tracking) {
      return {
        riskId: risk.id,
        riskTitle: risk.title || risk.taskName || "위험요인",
        currentRiskStatus,
        suggestedStatus: currentRiskStatus,
        syncLevel: "반영 불가",
        reason: "TBM 기록과 연결된 개선조치 판단 결과가 없습니다.",
      };
    }

    if (tracking.status === "완료" && currentRiskStatus !== "완료") {
      return {
        riskId: risk.id,
        riskTitle: tracking.riskTitle,
        currentRiskStatus,
        suggestedStatus: "완료",
        syncLevel: "반영 가능",
        reason:
          "TBM 사진과 조치상태 기준으로 완료 근거가 있으나 위험관리표 상태는 아직 완료가 아닙니다.",
      };
    }

    if (tracking.status === "진행중" && currentRiskStatus === "미착수") {
      return {
        riskId: risk.id,
        riskTitle: tracking.riskTitle,
        currentRiskStatus,
        suggestedStatus: "진행중",
        syncLevel: "진행 반영 가능",
        reason:
          "TBM 또는 현장사진 근거가 있어 미착수보다는 진행중으로 보는 것이 적절합니다.",
      };
    }

    if (tracking.status === "재확인 필요") {
      return {
        riskId: risk.id,
        riskTitle: tracking.riskTitle,
        currentRiskStatus,
        suggestedStatus: currentRiskStatus,
        syncLevel: "확인 필요",
        reason:
          "개선대책 또는 사진 근거가 부족하여 위험관리표 상태 변경 전 확인이 필요합니다.",
      };
    }

    return {
      riskId: risk.id,
      riskTitle: tracking.riskTitle,
      currentRiskStatus,
      suggestedStatus: currentRiskStatus,
      syncLevel: "확인 필요",
      reason: "현재 위험관리표 상태와 TBM 판단 결과가 크게 충돌하지 않습니다.",
    };
  });
}

export function summarizeRiskStatusSync(items: RiskStatusSyncItem[]) {
  return {
    total: items.length,
    readyToSync: items.filter((item) => item.syncLevel === "반영 가능").length,
    progressSync: items.filter((item) => item.syncLevel === "진행 반영 가능").length,
    needsReview: items.filter((item) => item.syncLevel === "확인 필요").length,
    blocked: items.filter((item) => item.syncLevel === "반영 불가").length,
  };
}
