export type TbmRiskLinkType =
  | "direct-risk"
  | "education-management"
  | "common-safety"
  | "unmatched";

export type TbmRiskSmartLinkResult = {
  type: TbmRiskLinkType;
  label: string;
  description: string;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
};

const DIRECT_RISK_KEYWORDS = [
  "차고지",
  "동선",
  "주차라인",
  "축대",
  "펜스",
  "후진",
  "차량",
  "적재함",
  "덮개",
  "협소구간",
  "서행",
  "상차",
  "수거통",
  "음식물",
  "미끄럼",
  "골목",
  "보행",
  "운전",
  "충돌",
  "끼임",
  "협착",
];

const EDUCATION_MANAGEMENT_KEYWORDS = [
  "스트레칭",
  "안전조끼",
  "안전모",
  "보호구",
  "착용",
  "흡연금지",
  "협력",
  "안전교육",
  "주의",
  "점검",
  "정리",
  "정리정돈",
  "잔재물",
  "안전운전",
];

const COMMON_SAFETY_KEYWORDS = [
  "안전",
  "예방",
  "주의",
  "확인",
  "점검",
  "교육",
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function findKeywords(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text);
  return keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));
}

export function classifyTbmRiskLink(input: {
  taskName?: string | null;
  cautionText?: string | null;
  actionStatus?: string | null;
  linkedRiskCount?: number;
}): TbmRiskSmartLinkResult {
  const text = [input.taskName, input.cautionText, input.actionStatus].filter(Boolean).join(" ");

  const direct = findKeywords(text, DIRECT_RISK_KEYWORDS);
  const education = findKeywords(text, EDUCATION_MANAGEMENT_KEYWORDS);
  const common = findKeywords(text, COMMON_SAFETY_KEYWORDS);

  if ((input.linkedRiskCount ?? 0) > 0 || direct.length > 0) {
    return {
      type: "direct-risk",
      label: "위험성평가 연동 항목",
      description: "이 TBM은 위험성평가표의 관련 위험요인과 함께 확인됩니다.",
      confidence: (input.linkedRiskCount ?? 0) > 0 ? "high" : "medium",
      matchedKeywords: direct,
    };
  }

  if (education.length > 0) {
    return {
      type: "education-management",
      label: "교육·관리 TBM",
      description: "이 항목은 특정 개선공사보다 근로자 교육·주의사항 공유 기록으로 관리됩니다.",
      confidence: "medium",
      matchedKeywords: education,
    };
  }

  if (common.length > 0) {
    return {
      type: "common-safety",
      label: "공통 안전수칙 TBM",
      description: "공통 안전수칙으로 관리됩니다. 필요하면 관련 위험요인과 추가 연결할 수 있습니다.",
      confidence: "low",
      matchedKeywords: common,
    };
  }

  return {
    type: "unmatched",
    label: "연결 항목 없음",
    description: "현재 기준으로는 별도 위험요인 연결 없이 일반 TBM 기록으로 관리됩니다.",
    confidence: "low",
    matchedKeywords: [],
  };
}

export function getTbmRiskLinkTone(type: TbmRiskLinkType): string {
  switch (type) {
    case "direct-risk":
      return "border-blue-600 bg-blue-950/40 text-blue-200";
    case "education-management":
      return "border-emerald-600 bg-emerald-950/40 text-emerald-200";
    case "common-safety":
      return "border-slate-600 bg-slate-900/70 text-slate-200";
    default:
      return "border-slate-700 bg-slate-950 text-slate-300";
  }
}
