import type { RiskItemDetail } from "@/lib/risk";

export type LinkedRiskItem = RiskItemDetail & {
  matchedKeywords: string[];
  matchScore: number;
};

const KEYWORDS = [
  "차량",
  "후진",
  "충돌",
  "협착",
  "끼임",
  "추락",
  "낙하",
  "축대",
  "붕괴",
  "전도",
  "펜스",
  "미끄럼",
  "화재",
  "폭발",
  "온열",
  "질식",
  "적재",
  "장비",
  "지게차",
];

function normalize(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

export function matchTbmToRiskItems(
  tbmText: string,
  items: RiskItemDetail[]
): LinkedRiskItem[] {
  const normalizedTbm = normalize(tbmText);

  const linked = items
    .map((item) => {
      const source = normalize(
        [
          item.title,
          item.taskName,
          item.hazard,
          item.accidentType,
          item.improvementPlan,
        ].join(" ")
      );

      const matchedKeywords = KEYWORDS.filter(
        (keyword) =>
          normalizedTbm.includes(keyword) &&
          source.includes(normalize(keyword))
      );

      let score = matchedKeywords.length;

      if (
        normalizedTbm.includes(normalize(item.taskName)) &&
        item.taskName.trim().length > 0
      ) {
        score += 3;
      }

      if (
        normalizedTbm.includes(normalize(item.accidentType)) &&
        item.accidentType.trim().length > 0
      ) {
        score += 2;
      }

      return {
        ...item,
        matchedKeywords,
        matchScore: score,
      };
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return linked.slice(0, 5);
}
