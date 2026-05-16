export type PhotoPurpose =
  | "참석서명"
  | "작업 전 안전활동"
  | "작업 대상"
  | "조치/개선"
  | "장비/차량"
  | "보호구/PPE"
  | "기타";

export type PhotoClassificationItem = {
  fieldName: string;
  count: number;
  purpose: PhotoPurpose;
  confidence: "높음" | "중간" | "낮음";
  reason: string;
};

export type PhotoClassificationSummary = {
  items: PhotoClassificationItem[];
  counts: Record<PhotoPurpose, number>;
};

const PURPOSES: PhotoPurpose[] = [
  "참석서명",
  "작업 전 안전활동",
  "작업 대상",
  "조치/개선",
  "장비/차량",
  "보호구/PPE",
  "기타",
];

function emptyCounts(): Record<PhotoPurpose, number> {
  return PURPOSES.reduce((acc, purpose) => {
    acc[purpose] = 0;
    return acc;
  }, {} as Record<PhotoPurpose, number>);
}

export function classifyPhotoField(
  fieldName: string
): Omit<PhotoClassificationItem, "fieldName" | "count"> {
  const name = fieldName.replace(/\s+/g, "").toLowerCase();

  if (
    name.includes("서명") ||
    name.includes("참석") ||
    name.includes("출석") ||
    name.includes("sign")
  ) {
    return {
      purpose: "참석서명",
      confidence: "높음",
      reason: "필드명에 참석 또는 서명 관련 표현이 포함되어 있습니다.",
    };
  }

  if (
    name.includes("조치") ||
    name.includes("개선") ||
    name.includes("완료") ||
    name.includes("전후") ||
    name.includes("보완") ||
    name.includes("action")
  ) {
    return {
      purpose: "조치/개선",
      confidence: "높음",
      reason: "필드명에 조치·개선·완료 관련 표현이 포함되어 있습니다.",
    };
  }

  if (
    name.includes("차량") ||
    name.includes("장비") ||
    name.includes("설비") ||
    name.includes("기계") ||
    name.includes("적재") ||
    name.includes("덮개")
  ) {
    return {
      purpose: "장비/차량",
      confidence: "높음",
      reason: "필드명에 차량·장비·설비 관련 표현이 포함되어 있습니다.",
    };
  }

  if (
    name.includes("보호구") ||
    name.includes("ppe") ||
    name.includes("안전모") ||
    name.includes("안전화") ||
    name.includes("조끼") ||
    name.includes("반사")
  ) {
    return {
      purpose: "보호구/PPE",
      confidence: "높음",
      reason: "필드명에 보호구 또는 PPE 관련 표현이 포함되어 있습니다.",
    };
  }

  if (
    name.includes("작업대상") ||
    name.includes("대상") ||
    name.includes("축대") ||
    name.includes("공사") ||
    name.includes("시설") ||
    name.includes("구역") ||
    name.includes("현장대상")
  ) {
    return {
      purpose: "작업 대상",
      confidence: "높음",
      reason: "필드명에 작업 대상 또는 현장 대상 관련 표현이 포함되어 있습니다.",
    };
  }

  if (
    name.includes("체조") ||
    name.includes("스트레칭") ||
    name.includes("브리핑") ||
    name.includes("교육") ||
    name.includes("조회") ||
    name.includes("tbm") ||
    name.includes("현장사진") ||
    name.includes("현장")
  ) {
    return {
      purpose: "작업 전 안전활동",
      confidence: "중간",
      reason: "필드명이 현장 활동 또는 TBM 활동 사진으로 해석됩니다.",
    };
  }

  return {
    purpose: "기타",
    confidence: "낮음",
    reason: "필드명만으로 사진 목적을 명확히 분류하기 어렵습니다.",
  };
}

export function classifyNotionPhotoFields(props: any): PhotoClassificationSummary {
  const items: PhotoClassificationItem[] = [];
  const counts = emptyCounts();

  for (const [fieldName, prop] of Object.entries(props) as any) {
    const files = prop?.files;
    if (!Array.isArray(files) || files.length === 0) continue;

    const count = files.length;
    const classified = classifyPhotoField(fieldName);

    items.push({
      fieldName,
      count,
      ...classified,
    });

    counts[classified.purpose] += count;
  }

  return { items, counts };
}
