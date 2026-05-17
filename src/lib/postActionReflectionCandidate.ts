// src/lib/postActionReflectionCandidate.ts

export type PostActionReflectionCandidate = {
  hasCandidate: boolean;
  content: string;
  types: string[];
  date?: string;
  evidence: string;
  confidence: number;
  source: "auto" | "none";
  reason: string;
};

type CandidateInput = {
  riskItem: Record<string, any>;
  tbm?: Record<string, any>;
  completionCandidate?: Record<string, any>;
  tbmShare?: Record<string, any>;
};

function textOf(value: unknown): string {
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(" ");
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toDate(value: unknown): string | undefined {
  const text = textOf(value);
  if (!text) return undefined;

  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return undefined;
}

function collectTbmText(input: CandidateInput): string {
  const tbms = Array.isArray(input.riskItem.linkedTbms)
    ? input.riskItem.linkedTbms
    : input.tbm
      ? [input.tbm]
      : [];

  return [
    ...tbms.map((tbm) =>
      [
        tbm.title,
        tbm.taskName,
        tbm.workName,
        tbm.memo,
        tbm.notes,
        tbm.todayNote,
        tbm.specialNote,
        tbm.safetyNotice,
        tbm.sharedBy,
      ].map(textOf).join(" ")
    ),
  ].join(" ");
}

function resolveReflectionTypes(allText: string, isCompletionCandidate: boolean): string[] {
  const types: string[] = [];

  if (includesAny(allText, ["tbm", "TBM", "교육", "공유", "주의사항", "브리핑"])) {
    types.push("TBM 교육");
  }

  if (
    includesAny(allText, [
      "유도자",
      "신호수",
      "지정 보행로",
      "보행로",
      "출입구 분리",
      "통제",
      "점검",
      "작업표준",
      "작업절차",
      "관리",
    ])
  ) {
    types.push("관리적 조치");
  }

  if (
    includesAny(allText, [
      "주차라인",
      "라인마킹",
      "구획선",
      "동선분리",
      "보행자분리",
      "차량분리",
      "안전난간",
      "덮개",
      "방호",
      "인터록",
      "센서",
      "조도",
      "표지",
      "보강",
    ])
  ) {
    types.push("기술적 조치");
  }

  if (
    includesAny(allText, [
      "방호장치",
      "비상정지",
      "인터록",
      "센서",
      "압축기",
      "후방카메라",
      "경광등",
      "덮개",
      "가드",
    ])
  ) {
    types.push("기계·설비 개선");
  }

  if (includesAny(allText, ["완료", "조치", "시공", "설치", "보강", "정비", "수리"])) {
    types.push("현장 조치");
  }

  if (includesAny(allText, ["사진", "증빙", "촬영"]) || isCompletionCandidate) {
    types.push("사진 증빙");
  }

  return unique(types);
}

function resolveCandidateContent(allText: string, riskItem: Record<string, any>): string {
  const hazard = textOf(riskItem.hazard || riskItem.title || riskItem.taskName || riskItem.processName);
  const improvementPlan = textOf(riskItem.improvementPlan || riskItem.improvement || riskItem.countermeasure);

  if (
    includesAny(allText, ["주차라인", "라인마킹", "구획선"]) &&
    includesAny(allText, ["차량", "보행", "동선", "차고지"])
  ) {
    return "주차라인 시공 및 차량·보행 동선 분리 조치가 완료된 것으로 판단됩니다.";
  }

  if (includesAny(allText, ["교육", "TBM", "주의사항", "브리핑"]) && !includesAny(allText, ["설치", "시공", "보강"])) {
    return `${hazard || "해당 위험요인"}에 대해 TBM 교육·공유 조치가 이행된 것으로 판단됩니다.`;
  }

  if (improvementPlan) {
    return `${improvementPlan}에 대한 실행 근거가 연결 TBM 및 증빙자료에서 확인되었습니다.`;
  }

  return "연결 TBM, 조치상태 및 증빙자료를 기준으로 개선대책 실행 근거가 확인되었습니다.";
}

function resolveCandidateDate(input: CandidateInput): string | undefined {
  const tbms = Array.isArray(input.riskItem.linkedTbms)
    ? input.riskItem.linkedTbms
    : input.tbm
      ? [input.tbm]
      : [];

  for (const tbm of tbms) {
    const date =
      toDate(tbm.date) ||
      toDate(tbm.sharedDate) ||
      toDate(tbm.createdTime) ||
      toDate(tbm.completedDate);

    if (date) return date;
  }

  return toDate(input.riskItem.completedDate) || toDate(input.riskItem.dueDate);
}

function resolveEvidence(input: CandidateInput, allText: string, isCompletionCandidate: boolean): string {
  const linkedTbmCount = Array.isArray(input.riskItem.linkedTbms)
    ? input.riskItem.linkedTbms.length
    : input.tbm
      ? 1
      : 0;

  const evidence: string[] = [];

  if (linkedTbmCount > 0) {
    evidence.push(`연결 TBM ${linkedTbmCount}건`);
  }

  if (includesAny(allText, ["즉시 조치 완료", "조치 완료", "완료"])) {
    evidence.push("조치상태 완료");
  }

  if (isCompletionCandidate) {
    evidence.push("위험요인별 완료조건 충족");
  }

  if (includesAny(allText, ["사진", "증빙", "조치사진", "현장사진"])) {
    evidence.push("사진 증빙 확인");
  }

  if (includesAny(allText, ["주차라인", "라인마킹", "동선분리", "차량분리", "보행자분리"])) {
    evidence.push("차량·보행 동선분리 근거 확인");
  }

  return unique(evidence).join(", ") || "연결 TBM 및 조치상태 기준 자동 후보";
}

export function buildPostActionReflectionCandidate(
  input: CandidateInput
): PostActionReflectionCandidate {
  const tbmText = collectTbmText(input);
  const riskText = [
    input.riskItem.processName,
    input.riskItem.taskName,
    input.riskItem.title,
    input.riskItem.hazard,
    input.riskItem.accidentType,
    input.riskItem.currentSafetyMeasures,
    input.riskItem.improvementPlan,
    input.riskItem.status,
    input.riskItem.actionStatus,
  ].map(textOf).join(" ");

  const allText = `${riskText} ${tbmText}`;
  const isCompletionCandidate = Boolean(input.completionCandidate?.isCompletionCandidate);
  const linkedTbmCount = Array.isArray(input.riskItem.linkedTbms)
    ? input.riskItem.linkedTbms.length
    : input.tbm
      ? 1
      : 0;

  if (!isCompletionCandidate || linkedTbmCount === 0) {
    return {
      hasCandidate: false,
      content: "",
      types: [],
      evidence: "",
      confidence: 0,
      source: "none",
      reason: "완료 후보 또는 연결 TBM 조건이 충족되지 않았습니다.",
    };
  }

  const types = resolveReflectionTypes(allText, isCompletionCandidate);
  const content = resolveCandidateContent(allText, input.riskItem);
  const evidence = resolveEvidence(input, allText, isCompletionCandidate);
  const date = resolveCandidateDate(input);

  return {
    hasCandidate: true,
    content,
    types,
    date,
    evidence,
    confidence: types.length >= 3 ? 0.9 : 0.75,
    source: "auto",
    reason: "연결 TBM, 조치상태, 증빙자료, 위험요인별 완료조건을 기준으로 자동 생성되었습니다.",
  };
}
