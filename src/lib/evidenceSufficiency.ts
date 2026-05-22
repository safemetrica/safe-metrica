export type EvidenceSufficiencyResult = {
  status: "sufficient" | "needs_supplement" | "not_applicable";
  label: string;
  tone: "green" | "amber" | "gray";
  reason: string;
  recommendedEvidence: string[];
};

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

const VEHICLE_INSPECTION_KEYWORDS = [
  "차량검사",
  "자동차 검사",
  "차량 점검",
  "차량점검",
  "정비",
  "수리",
  "검사",
  "점검",
];

const VEHICLE_SUFFICIENT_EVIDENCE_KEYWORDS = [
  "검사일지",
  "점검일지",
  "점검표",
  "점검 내역",
  "점검내역",
  "검사결과",
  "검사 결과",
  "차량상태",
  "차량 상태",
  "타이어",
  "브레이크",
  "등화",
  "경광등",
  "후방카메라",
  "오일",
  "누유",
  "정비완료",
  "정비 완료",
  "조치사진",
  "작업대상사진",
];

const TBM_ACTIVITY_ONLY_KEYWORDS = [
  "체조",
  "안전활동",
  "참석",
  "서명",
  "교육",
  "TBM",
  "툴박스",
];

export function evaluateEvidenceSufficiency(input: {
  title?: string;
  evidenceType?: string;
  note?: string;
  relatedTbmCount?: number;
  relatedPtwCount?: number;
}): EvidenceSufficiencyResult {
  const title = input.title ?? "";
  const evidenceType = input.evidenceType ?? "";
  const note = input.note ?? "";
  const allText = `${title} ${evidenceType} ${note}`.replace(/\s+/g, " ").trim();

  const isVehicleInspection = includesAny(allText, VEHICLE_INSPECTION_KEYWORDS);

  if (!isVehicleInspection) {
    return {
      status: "not_applicable",
      label: "일반 증빙",
      tone: "gray",
      reason: "현재 v1 기준에서는 차량검사·차량점검성 증빙만 별도 적정성 판정합니다.",
      recommendedEvidence: [],
    };
  }

  const hasVehicleSufficientEvidence = includesAny(allText, VEHICLE_SUFFICIENT_EVIDENCE_KEYWORDS);
  const looksActivityOnly = includesAny(allText, TBM_ACTIVITY_ONLY_KEYWORDS) && !hasVehicleSufficientEvidence;

  if (hasVehicleSufficientEvidence) {
    return {
      status: "sufficient",
      label: "증빙 적정",
      tone: "green",
      reason: "차량검사·차량점검과 관련된 점검표, 검사내역, 차량상태 또는 조치사진 단서가 확인됩니다.",
      recommendedEvidence: [],
    };
  }

  return {
    status: "needs_supplement",
    label: "증빙 보완 필요",
    tone: "amber",
    reason: looksActivityOnly
      ? "TBM 활동·서명 증빙은 확인되지만, 차량검사 작업에 필요한 검사일지·점검내역·차량상태 사진 단서는 확인되지 않습니다."
      : "차량검사성 증빙으로 보이나, 검사일지·점검표·차량상태 사진 등 핵심 증빙 단서가 부족합니다.",
    recommendedEvidence: [
      "차량 검사일지 또는 점검표",
      "차량상태 사진",
      "타이어·등화·브레이크 등 주요 점검 사진",
      "검사결과 또는 정비·조치 완료 기록",
    ],
  };
}
