export type ExpectedEvidenceRule = {
  id: string;
  label: string;
  keywords: string[];
  expected: string[];
  reason: string;
};

export const EXPECTED_EVIDENCE_RULES: ExpectedEvidenceRule[] = [
  {
    id: "vehicle-check",
    label: "차량 점검",
    keywords: ["차량점검", "차량 점검", "자동차 검사", "엔진오일", "타이어", "브레이크", "등화", "적재함"],
    expected: ["차량 상태사진", "점검표 또는 점검일지", "타이어·등화·적재함 등 주요 확인사진"],
    reason: "차량 점검 작업은 TBM 실시 기록 외에 실제 차량 상태와 점검 결과를 확인할 수 있는 기록이 필요합니다.",
  },
  {
    id: "traffic-separation",
    label: "차량 동선 분리",
    keywords: ["차량동선", "차량 동선", "동선분리", "동선 분리", "보행자", "차량혼재", "혼재", "후진"],
    expected: ["차량·보행자 동선 사진", "분리선·콘·표지판 사진", "유도자 또는 통제상태 사진"],
    reason: "차량과 보행자가 혼재되는 작업은 동선 분리와 통제 상태가 보이는 사진이 기록력에 중요합니다.",
  },
  {
    id: "retaining-wall",
    label: "축대·구조물 공사",
    keywords: ["축대", "장마철", "구조물", "균열", "붕괴", "보강", "옹벽", "석축"],
    expected: ["작업 대상 부위 사진", "균열·붕괴 위험부위 사진", "보강 전·후 사진"],
    reason: "축대 또는 구조물 관련 작업은 작업 대상과 보강 상태가 확인되는 사진이 필요합니다.",
  },
  {
    id: "slip-trip",
    label: "미끄럼·전도 예방",
    keywords: ["미끄럼", "넘어짐", "전도", "바닥", "물기", "결빙", "염화칼슘", "청소"],
    expected: ["바닥 상태 사진", "살포·청소 조치 사진", "통행로 정리상태 사진"],
    reason: "미끄럼·전도 위험은 바닥상태와 조치 후 상태가 확인되어야 기록 신뢰도가 높아집니다.",
  },
  {
    id: "load-cover",
    label: "적재물·덮개 확인",
    keywords: ["적재", "덮개", "카바", "커버", "낙하", "비래", "음식물차량", "음식물 차량"],
    expected: ["적재상태 사진", "덮개 체결상태 사진", "조치 완료 사진"],
    reason: "적재물 또는 덮개 관련 작업은 체결상태와 조치 완료상태가 보이는 사진이 필요합니다.",
  },
  {
    id: "equipment",
    label: "장비·설비 작업",
    keywords: ["장비", "설비", "기계", "끼임", "회전부", "점검", "정비", "수리"],
    expected: ["장비 상태 사진", "방호장치 또는 정지상태 사진", "점검·정비 완료 사진"],
    reason: "장비·설비 작업은 위험부위와 안전조치 상태가 확인되는 기록이 필요합니다.",
  },
];

export function getExpectedEvidenceMatches(text: string): {
  matchedRules: ExpectedEvidenceRule[];
  expectedEvidence: string[];
  reasons: string[];
} {
  const normalized = (text ?? "").replace(/\s+/g, "").toLowerCase();

  const matchedRules = EXPECTED_EVIDENCE_RULES.filter((rule) =>
    rule.keywords.some((keyword) =>
      normalized.includes(keyword.replace(/\s+/g, "").toLowerCase())
    )
  );

  return {
    matchedRules,
    expectedEvidence: Array.from(new Set(matchedRules.flatMap((rule) => rule.expected))),
    reasons: matchedRules.map((rule) => rule.reason),
  };
}
