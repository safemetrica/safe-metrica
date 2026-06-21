export const RICHI_FOOD_FACTORY_PROFILE = {
  industryProfile: "food_factory",
  voiceProfile: "richi_food_factory_v1",
} as const;

type AliasRule = {
  pattern: RegExp;
  replacement: string;
  aliasLabel: string;
};

type KeywordRule = {
  tag: string;
  keywords: string[];
};

const RICHI_FOOD_ALIAS_RULES: AliasRule[] = [
  { pattern: /\b(?:TVN|티\s*비\s*엔|티\s*비\s*엠)\b/gi, replacement: "TBM", aliasLabel: "TBM" },
  { pattern: /이물\s*혼입(?:\s*주의)?/g, replacement: "이물혼입 주의", aliasLabel: "이물혼입 주의" },
  { pattern: /(?:칼\s*절단|절단\s*위험|베임|절상)/g, replacement: "칼·절단 위험", aliasLabel: "칼·절단 위험" },
  { pattern: /(?:바닥\s*물기|바닥\s*미끄럼|미끄럼|침출수)/g, replacement: "미끄럼 위험", aliasLabel: "미끄럼 위험" },
];

const RICHI_RISK_FACTOR_RULES: KeywordRule[] = [
  { tag: "미끄럼", keywords: ["미끄럼", "바닥 물기", "바닥물기", "침출수", "바닥 미끄럼"] },
  { tag: "절단·베임", keywords: ["칼", "절단", "베임", "절상", "커터", "칼날"] },
  { tag: "이물혼입", keywords: ["이물", "이물혼입", "혼입"] },
  { tag: "개인위생", keywords: ["위생복", "위생", "손씻기", "손 세척", "마스크", "모자"] },
  { tag: "보호구", keywords: ["보호구", "장갑", "마스크", "모자", "안전화", "위생복"] },
  { tag: "컨베이어·포장기", keywords: ["컨베이어", "포장기", "실링기", "롤러", "끼임"] },
  { tag: "냉장·냉동", keywords: ["냉장", "냉동", "저온", "냉동실", "냉장실"] },
  { tag: "화재·전기", keywords: ["화재", "전기", "누전", "콘센트", "배선", "스파크"] },
  { tag: "중량물·박스 적재", keywords: ["중량물", "박스", "적재", "파렛트", "팔레트", "박스 적재"] },
];

const RICHI_WORK_AREA_RULES: KeywordRule[] = [
  { tag: "포장실", keywords: ["포장실", "포장 라인", "포장라인"] },
  { tag: "세척실", keywords: ["세척실", "세척"] },
  { tag: "냉장", keywords: ["냉장", "냉장실"] },
  { tag: "냉동", keywords: ["냉동", "냉동실"] },
  { tag: "컨베이어", keywords: ["컨베이어"] },
  { tag: "포장기", keywords: ["포장기"] },
  { tag: "실링기", keywords: ["실링기", "실러"] },
  { tag: "위생복", keywords: ["위생복"] },
  { tag: "장갑", keywords: ["장갑"] },
  { tag: "마스크", keywords: ["마스크"] },
  { tag: "모자", keywords: ["모자"] },
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function applyRichiFoodFactoryVoiceProfile(text: string) {
  let normalizedTranscript = text;
  const matchedAliases: string[] = [];

  RICHI_FOOD_ALIAS_RULES.forEach((rule) => {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(normalizedTranscript)) {
      rule.pattern.lastIndex = 0;
      matchedAliases.push(rule.aliasLabel);
      normalizedTranscript = normalizedTranscript.replace(rule.pattern, rule.replacement);
    }
  });

  normalizedTranscript = normalizedTranscript.replace(/\s+/g, " ").trim();

  const searchableText = `${text} ${normalizedTranscript}`.replace(/\s+/g, " ");
  const matchedRiskFactors = RICHI_RISK_FACTOR_RULES.filter((rule) => includesAny(searchableText, rule.keywords)).map(
    (rule) => rule.tag
  );
  const matchedWorkAreas = RICHI_WORK_AREA_RULES.filter((rule) => includesAny(searchableText, rule.keywords)).map(
    (rule) => rule.tag
  );
  const voiceQualityNotes = unique([
    matchedAliases.length > 0 ? "식품공장 전용 음성 보정 사전 적용" : "식품공장 전용 음성 보정 사전 확인",
    matchedRiskFactors.length > 0 ? "식품공장 위험요인 태그 자동 추출" : "식품공장 위험요인 키워드 미검출",
  ]);

  return {
    ...RICHI_FOOD_FACTORY_PROFILE,
    normalizedTranscript,
    matchedAliases: unique(matchedAliases),
    matchedRiskFactors: unique(matchedRiskFactors),
    matchedWorkAreas: unique(matchedWorkAreas),
    voiceQualityNotes,
  };
}
