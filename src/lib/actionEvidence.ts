export type ActionEvidenceLevel = "일반" | "조치 필요" | "PTW 가능";
export type ActionEvidenceStatus = "양호" | "보완 추천" | "중요 확인 필요";

export type ActionEvidenceCheckResult = {
  level: ActionEvidenceLevel;
  needsActionEvidence: boolean;
  needsPTW: boolean;
  status: ActionEvidenceStatus;
  reason: string;
  suggestion: string;
  detectedKeywords: string[];
};

const PTW_KEYWORDS = ["고소", "추락", "굴착", "밀폐", "화기", "전기", "중장비"];
const ACTION_KEYWORDS = ["공사", "보수", "수리", "설치", "철거", "교체", "축대", "장비", "차량", "점검", "조치"];

export function evaluateActionEvidence(input: {
  taskName: string;
  cautionText: string;
  actionStatus: string;
  hasIssue: boolean;
  actionPhotoCount: number;
}): ActionEvidenceCheckResult {
  const text = `${input.taskName ?? ""} ${input.cautionText ?? ""} ${input.actionStatus ?? ""}`;

  const detectedPTW = PTW_KEYWORDS.filter((k) => text.includes(k));
  const detectedAction = ACTION_KEYWORDS.filter((k) => text.includes(k));
  const detectedKeywords = Array.from(new Set([...detectedPTW, ...detectedAction]));

  const needsPTW = detectedPTW.length > 0;
  const needsActionEvidence =
    input.actionStatus === "조치 필요" ||
    input.hasIssue ||
    detectedAction.length > 0 ||
    needsPTW;

  const level: ActionEvidenceLevel = needsPTW ? "PTW 가능" : needsActionEvidence ? "조치 필요" : "일반";

  let status: ActionEvidenceStatus = "양호";
  if (needsActionEvidence && input.actionPhotoCount === 0) {
    status = needsPTW ? "중요 확인 필요" : "보완 추천";
  }

  const reason =
    status === "양호"
      ? "현재 작업 수준에 필요한 기본 증빙이 확인됩니다."
      : status === "보완 추천"
        ? "TBM 실시 증빙은 확인되지만, 작업명 또는 조치상태 기준으로 작업 대상·조치 사진을 남기면 조치 이력 신뢰도가 더 높아지는 항목입니다."
        : "PTW 가능 작업으로 판단됩니다. 작업 대상 사진, 안전조치 사진 또는 작업허가 관련 증빙 확인이 권장됩니다.";

  const suggestion =
    status === "양호"
      ? "현재와 같이 TBM 실시 증빙과 현장 정황을 함께 기록해 주세요."
      : status === "보완 추천"
        ? "작업 대상 위치, 작업 전·후 상태, 조치 대상 사진을 추가하면 조치 이력 신뢰도가 향상됩니다. 체조나 TBM 활동사진만으로는 작업·조치 증빙이 충분하다고 보지 않습니다."
        : "고위험 또는 PTW 가능 작업은 작업 대상 사진, 보호구 상태, 작업구역, 작업 전·후 상태를 함께 남기는 것이 좋습니다.";

  return {
    level,
    needsActionEvidence,
    needsPTW,
    status,
    reason,
    suggestion,
    detectedKeywords,
  };
}
