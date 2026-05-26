// src/lib/safetyIndustry.ts

export type IndustryTag = "폐기물" | "제조" | "건설" | "물류" | "공통";

export type AccidentType =
  | "끼임"
  | "떨어짐"
  | "부딪힘"
  | "맞음"
  | "넘어짐"
  | "깔림"
  | "화재폭발"
  | "질식중독"
  | "기타";

export const INDUSTRY_KEYWORDS: Record<IndustryTag, string[]> = {
  폐기물: [
  "폐기물",
  "생활폐기물",
  "환경미화",
  "수거차",
  "청소차",
  "압축기",
  "투입구",
  "후진",
],
  제조: [
    "프레스",
    "롤러",
    "컨베이어",
    "컨베어",
    "벨트",
    "지게차",
    "절단",
    "협착",
    "화재",
    "분진",
  ],
  건설: [
    "추락",
    "떨어짐",
    "개구부",
    "비계",
    "발판",
    "낙하물",
    "붕괴",
    "전도",
    "크레인",
    "굴착",
  ],
  물류: [
    "물류",
    "창고",
    "출고장",
    "입고장",
    "도크",
    "상하차",
    "지게차",
    "팔레트",
    "파렛트",
    "적재",
    "화물",
    "하역",
    "랩핑",
    "밴딩",
    "차량",
    "트럭",
    "후진",
    "충돌",
    "끼임",
    "낙하",
    "통로",
  ],
  공통: [
    "떨어짐",
    "추락",
    "끼임",
    "부딪힘",
    "충돌",
    "맞음",
    "낙하",
    "넘어짐",
    "깔림",
    "화재",
    "폭발",
    "질식",
    "중독",
  ],
};

export function normalizeIndustryTag(value?: string | null): IndustryTag {
  if (value === "폐기물") return "폐기물";
  if (value === "제조") return "제조";
  if (value === "건설") return "건설";
  if (value === "물류") return "물류";
  return "공통";
}

export function detectAccidentType(text: string): AccidentType {
  const source = text.replace(/\s+/g, "");

  if (/(끼임|협착|말림|감김)/.test(source)) return "끼임";
  if (/(떨어짐|추락|개구부|발판|비계)/.test(source)) return "떨어짐";
  if (/(부딪힘|충돌|접촉|후진)/.test(source)) return "부딪힘";
  if (/(맞음|낙하|비래|날아옴)/.test(source)) return "맞음";
  if (/(넘어짐|미끄러짐)/.test(source)) return "넘어짐";
  if (/(깔림|붕괴|무너짐|뒤집힘|전도)/.test(source)) return "깔림";
  if (/(화재|폭발|파열|분진폭발)/.test(source)) return "화재폭발";
  if (/(질식|중독|산소결핍|유해가스)/.test(source)) return "질식중독";

  return "기타";
}

export function getCheckpointByAccidentType(type: AccidentType): string {
  switch (type) {
    case "끼임":
      return "설비 정지 · 방호덮개 · 비상정지 · LOTO 확인";
    case "떨어짐":
      return "개구부 덮개 · 안전난간 · 안전대 · 작업발판 확인";
    case "부딪힘":
      return "후방 확인 · 유도자 배치 · 보행동선 분리 · 경광등 확인";
    case "맞음":
      return "낙하물 구역 통제 · 적재상태 · 보호구 · 상하 동시작업 금지 확인";
    case "넘어짐":
      return "바닥 정리 · 미끄럼 방지 · 조도 · 통로 장애물 확인";
    case "깔림":
      return "전도방지 · 받침대 · 작업반경 통제 · 장비 정지상태 확인";
    case "화재폭발":
      return "점화원 제거 · 분진 청소 · 소화기 · 전기설비 이상 여부 확인";
    case "질식중독":
      return "환기 · 산소농도 측정 · 출입통제 · 감시자 배치 확인";
    default:
      return "작업 전 위험요인 공유 · 보호구 · 작업순서 · 비상연락 확인";
  }
}

export function scoreIndustrySimilarity(
  industryTag: IndustryTag,
  text: string
): number {
  const keywords = INDUSTRY_KEYWORDS[industryTag] ?? [];
  const source = text.toLowerCase();

  return keywords.reduce((score, keyword) => {
    return source.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}