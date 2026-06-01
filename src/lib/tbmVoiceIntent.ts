export type TbmVoiceIntent =
  | "safety_policy"
  | "work_tbm"
  | "inspection"
  | "maintenance"
  | "incident_or_issue"
  | "action_completed"
  | "unknown";

const SAFETY_POLICY_KEYWORDS = [
  "안전보건경영방침",
  "경영방침",
  "안전과 건강",
  "모든 구성원",
  "안전보건 목표",
  "대표이사",
  "안전보건 방침",
  "회사는",
  "준수한다",
  "책임과 권한",
];

const INCIDENT_OR_ISSUE_KEYWORDS = [
  "사고",
  "아차사고",
  "고장",
  "파손",
  "누락",
  "불량",
  "미흡",
  "위험 발생",
  "이상 발생",
  "조치 필요",
  "특이사항",
];

const ACTION_COMPLETED_KEYWORDS = [
  "완료",
  "조치 완료",
  "확인 완료",
  "처리 완료",
  "닫힘 확인",
  "잠금 확인",
  "복구 완료",
];

const MAINTENANCE_KEYWORDS = ["정비", "수리", "보수", "교체", "윤활", "분해", "복구"];
const INSPECTION_KEYWORDS = ["점검", "검사", "순찰", "확인 점검", "상태 확인", "작동 확인"];
const WORK_TBM_KEYWORDS = [
  "TBM",
  "작업 전",
  "작업 시",
  "상차",
  "하차",
  "상하차",
  "지게차",
  "파렛트",
  "적재",
  "운반",
  "수거",
  "작업자",
  "주의한다",
  "주의 사항",
];

function normalizeKoreanText(text: string) {
  return text.replace(/\s+/g, "");
}

function includesAny(text: string, keywords: string[]) {
  const compact = normalizeKoreanText(text);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeKoreanText(keyword);
    return text.includes(keyword) || compact.includes(normalizedKeyword);
  });
}

function countMatches(text: string, keywords: string[]) {
  const compact = normalizeKoreanText(text);

  return keywords.reduce((count, keyword) => {
    const normalizedKeyword = normalizeKoreanText(keyword);
    return text.includes(keyword) || compact.includes(normalizedKeyword) ? count + 1 : count;
  }, 0);
}

export function detectTbmVoiceIntent(text: string): TbmVoiceIntent {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) return "unknown";

  const safetyPolicyMatchCount = countMatches(normalizedText, SAFETY_POLICY_KEYWORDS);

  if (safetyPolicyMatchCount >= 2 || includesAny(normalizedText, ["안전보건경영방침", "안전보건 방침"])) {
    return "safety_policy";
  }

  if (includesAny(normalizedText, INCIDENT_OR_ISSUE_KEYWORDS)) {
    return "incident_or_issue";
  }

  if (includesAny(normalizedText, ACTION_COMPLETED_KEYWORDS)) {
    return "action_completed";
  }

  const hasMaintenanceKeyword = includesAny(normalizedText, MAINTENANCE_KEYWORDS);
  const hasInspectionKeyword = includesAny(normalizedText, INSPECTION_KEYWORDS);

  if (hasMaintenanceKeyword) return "maintenance";
  if (hasInspectionKeyword) return "inspection";

  if (includesAny(normalizedText, WORK_TBM_KEYWORDS)) {
    return "work_tbm";
  }

  return "unknown";
}
