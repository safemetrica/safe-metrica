// src/lib/riskTbmShareStatusView.ts

import {
  evaluateTbmShareTracking,
  type RiskItemForTbmShare,
  type TbmShareStatus,
  type TbmEducationStatus,
} from "./tbmShareTracking";

export type RiskTbmShareBadgeTone =
  | "green"
  | "amber"
  | "blue"
  | "slate";

export interface RiskTbmShareStatusView {
  status: TbmShareStatus;
  educationStatus: TbmEducationStatus;
  label: string;
  shortLabel: string;
  tone: RiskTbmShareBadgeTone;
  description: string;
  managerNote: string;
  linkedTbmCount: number;
  latestSharedDate: string | null;
  sharedBy: string | null;
  sharedByRole: string | null;
  reviewNeeded: boolean;
  riskDbUpdateAllowed: false;
}

function formatRole(role?: string | null): string | null {
  if (!role) return null;

  const roleMap: Record<string, string> = {
    fieldSupervisor: "현장관리감독자",
    safetyHealthManager: "안전보건관리담당자",
    executive: "대표이사",
    other: "기타",
  };

  return roleMap[role] ?? role;
}

export function getRiskTbmShareStatusView(
  riskItem: RiskItemForTbmShare
): RiskTbmShareStatusView {
  const result = evaluateTbmShareTracking(riskItem);

  if (result.status === "shared") {
    return {
      status: result.status,
      educationStatus: result.educationStatus,
      label: "TBM 공유 완료",
      shortLabel: "공유 완료",
      tone: "green",
      description:
        "연결된 TBM에서 해당 위험요인 공유 또는 교육 기록이 확인되었습니다.",
      managerNote:
        "TBM 공유 완료는 교육·공유 이행 근거입니다. 개선대책 완료 여부는 별도 증빙과 완료조건으로 판단합니다.",
      linkedTbmCount: result.linkedTbmCount,
      latestSharedDate: result.latestSharedDate,
      sharedBy: result.sharedBy,
      sharedByRole: formatRole(result.sharedByRole),
      reviewNeeded: result.reviewNeeded,
      riskDbUpdateAllowed: false,
    };
  }

  if (result.status === "reviewNeeded") {
    return {
      status: result.status,
      educationStatus: result.educationStatus,
      label: "TBM 연결 확인 필요",
      shortLabel: "확인 필요",
      tone: "amber",
      description:
        "위험요인과 TBM은 연결되어 있으나 공유 내용이 명확하지 않습니다.",
      managerNote:
        "Relation 연결만으로 TBM 공유 완료로 확정하지 않습니다. TBM 주의사항 또는 교육 내용 확인이 필요합니다.",
      linkedTbmCount: result.linkedTbmCount,
      latestSharedDate: result.latestSharedDate,
      sharedBy: result.sharedBy,
      sharedByRole: formatRole(result.sharedByRole),
      reviewNeeded: result.reviewNeeded,
      riskDbUpdateAllowed: false,
    };
  }

  if (result.status === "required") {
    return {
      status: result.status,
      educationStatus: result.educationStatus,
      label: "TBM 공유 필요",
      shortLabel: "공유 필요",
      tone: "blue",
      description:
        "위험성평가 관리 항목으로 보이며 TBM 공유 기록 연결이 필요합니다.",
      managerNote:
        "TBM 공유 필요 항목입니다. 공유 완료 후에도 Risk DB 상태는 자동 변경되지 않습니다.",
      linkedTbmCount: result.linkedTbmCount,
      latestSharedDate: result.latestSharedDate,
      sharedBy: result.sharedBy,
      sharedByRole: formatRole(result.sharedByRole),
      reviewNeeded: result.reviewNeeded,
      riskDbUpdateAllowed: false,
    };
  }

  return {
    status: result.status,
    educationStatus: result.educationStatus,
    label: "TBM 공유 대상 아님",
    shortLabel: "대상 아님",
    tone: "slate",
    description:
      "현재 조건에서는 TBM 공유 필수 항목으로 분류되지 않았습니다.",
    managerNote:
      "위험성평가 원본 상태는 변경되지 않습니다.",
    linkedTbmCount: result.linkedTbmCount,
    latestSharedDate: result.latestSharedDate,
    sharedBy: result.sharedBy,
    sharedByRole: formatRole(result.sharedByRole),
    reviewNeeded: result.reviewNeeded,
    riskDbUpdateAllowed: false,
  };
}
