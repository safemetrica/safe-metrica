export type TbmEvidenceStatus = "적합" | "보완 필요" | "부적합" | "판단불가";

export type TbmEvidenceInput = {
  hasSignaturePhoto: boolean;
  hasExercisePhoto: boolean;
  hasAnyEvidencePhoto: boolean;
  hasCautionText: boolean;
  hasTaskName: boolean;
};

export type TbmEvidenceCheckResult = {
  status: TbmEvidenceStatus;
  score: number;
  reason: string;
  suggestion: string;
  findings: string[];
  missing: string[];
};

export function evaluateTbmEvidence(input: TbmEvidenceInput): TbmEvidenceCheckResult {
  let score = 0;
  const findings: string[] = [];
  const missing: string[] = [];

  if (input.hasSignaturePhoto) {
    score += 30;
    findings.push("참석 서명사진 확인");
  } else {
    missing.push("참석 서명사진");
  }

  if (input.hasExercisePhoto) {
    score += 25;
    findings.push("체조사진 또는 작업 전 안전활동 사진 확인");
  } else {
    missing.push("체조사진 또는 작업 전 안전활동 사진");
  }

  if (input.hasCautionText) {
    score += 20;
    findings.push("오늘의 주의사항 기록 확인");
  } else {
    missing.push("오늘의 주의사항 기록");
  }

  if (input.hasTaskName) {
    score += 15;
    findings.push("작업명 확인");
  } else {
    missing.push("작업명");
  }

  if (input.hasAnyEvidencePhoto) {
    score += 10;
    findings.push("교육 기록사진 첨부 확인");
  } else {
    missing.push("교육 기록사진");
  }

  let status: TbmEvidenceStatus = "판단불가";

  if (score >= 85) status = "적합";
  else if (score >= 60) status = "보완 필요";
  else if (score >= 30) status = "부적합";

  const reason =
    status === "적합"
      ? "참석 서명사진, 작업 전 안전활동 사진, 오늘의 주의사항 기록이 확인되어 TBM 실시 기록으로 적절합니다."
      : status === "보완 필요"
        ? `TBM 실시 정황은 일부 확인되지만 ${missing.slice(0, 2).join(", ")} 항목 보완이 필요합니다.`
        : status === "부적합"
          ? "TBM 실시 기록으로 보기에는 핵심 자료가 부족합니다."
          : "사진 또는 TBM 기록 정보가 부족하여 판별하기 어렵습니다.";

  const suggestion =
    status === "적합"
      ? "생활폐기물 새벽 작업 특성상 단체사진을 강요하지 않아도 됩니다. 다만 사진이 어두운 경우 차량 조명이나 현장 조명을 활용하면 기록 품질이 더 좋아집니다."
      : status === "보완 필요"
        ? "다음 TBM부터 참석 서명사진, 체조사진 또는 작업 전 안전활동 사진, 오늘의 주의사항을 함께 남겨주세요."
        : status === "부적합"
          ? "TBM 참석 여부와 작업 전 안전활동 정황을 확인할 수 있는 사진과 오늘 주의사항 기록을 보완해 주세요."
          : "Notion 폼에 교육 기록사진과 오늘의 주의사항이 입력되었는지 확인해 주세요.";

  return {
    status,
    score,
    reason,
    suggestion,
    findings,
    missing,
  };
}
