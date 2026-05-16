export type ImprovementEvidenceRule = {
  keyword: string;
  expectedEvidence: string[];
  riskCategory: string;
};

export const IMPROVEMENT_EVIDENCE_RULES: ImprovementEvidenceRule[] = [
  {
    keyword: "차량",
    riskCategory: "교통사고",
    expectedEvidence: [
      "차량 동선분리 사진",
      "유도자 배치 사진",
      "콘 설치 사진",
      "반사경 설치 상태",
    ],
  },
  {
    keyword: "미끄럼",
    riskCategory: "전도",
    expectedEvidence: [
      "바닥 상태 사진",
      "살포·청소 상태 사진",
      "통행로 정리 상태",
    ],
  },
  {
    keyword: "축대",
    riskCategory: "붕괴",
    expectedEvidence: [
      "균열 상태 사진",
      "보강 전 사진",
      "보강 후 사진",
      "위험구역 통제 사진",
    ],
  },
  {
    keyword: "펜스",
    riskCategory: "추락·충돌",
    expectedEvidence: [
      "펜스 설치 상태",
      "고정 상태 사진",
      "출입통제 상태",
    ],
  },
  {
    keyword: "적재",
    riskCategory: "낙하",
    expectedEvidence: [
      "적재 상태 사진",
      "덮개 체결 사진",
      "고정끈 상태 사진",
    ],
  },
];

export function findImprovementEvidence(title: string) {
  const matched = IMPROVEMENT_EVIDENCE_RULES.filter((rule) =>
    title.includes(rule.keyword)
  );

  return matched;
}
