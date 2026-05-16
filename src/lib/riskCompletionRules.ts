// src/lib/riskCompletionRules.ts

export type VisionObject =
  | "vehicle"
  | "truckBed"
  | "coverClosed"
  | "coverOpen"
  | "crack"
  | "reinforcement"
  | "beforeState"
  | "afterState"
  | "trafficCone"
  | "flagger"
  | "parkingLine"
  | "laneMarking"
  | "pedestrianVehicleSeparation"
  | "wheelStopper"
  | "ppe"
  | "guard"
  | "interlock"
  | "emergencyStop"
  | "workArea"
  | "signage"
  | "cleanedFloor"
  | "antiSlip"
  | "unknown";

export type ActionStatus =
  | "미착수"
  | "진행중"
  | "조치필요"
  | "완료"
  | "확인필요"
  | "";

export type CompletionLevel =
  | "notStarted"
  | "evidenceOnly"
  | "inProgress"
  | "completionCandidate"
  | "approvedCompleted";

export interface RiskCompletionInput {
  riskItemId?: string;
  processName?: string;
  taskName?: string;
  hazard?: string;
  accidentType?: string;
  actionStatus?: ActionStatus;
  visionObjects?: VisionObject[];
  hasTbmRecord?: boolean;
  hasSignatureEvidence?: boolean;
  hasSafetyActivityPhoto?: boolean;
  hasWorkTargetPhoto?: boolean;
  hasActionPhoto?: boolean;
  ptwRequired?: boolean;
  ptwApproved?: boolean;
}

export interface RiskCompletionResult {
  level: CompletionLevel;
  matchedRuleId: string;
  isCompletionCandidate: boolean;
  canSyncToRiskDb: false;
  missingEvidence: string[];
  reason: string;
  fieldMessage: string;
  managerMessage: string;
  recommendedNextAction: string;
}

function normalizeText(value?: string): string {
  return (value ?? "").replace(/\s+/g, "").toLowerCase();
}

function hasAnyText(input: RiskCompletionInput, keywords: string[]): boolean {
  const target = [
    input.processName,
    input.taskName,
    input.hazard,
    input.accidentType,
  ]
    .map(normalizeText)
    .join(" ");

  return keywords.some((keyword) => target.includes(normalizeText(keyword)));
}

function hasObject(objects: Set<VisionObject>, candidates: VisionObject[]): boolean {
  return candidates.some((candidate) => objects.has(candidate));
}

function isActionCompleted(input: RiskCompletionInput): boolean {
  return input.actionStatus === "완료";
}

function baseResult(params: {
  level: CompletionLevel;
  matchedRuleId: string;
  missingEvidence: string[];
  reason: string;
  fieldMessage: string;
  managerMessage: string;
  recommendedNextAction: string;
}): RiskCompletionResult {
  return {
    ...params,
    isCompletionCandidate: params.level === "completionCandidate",
    canSyncToRiskDb: false,
  };
}

function checkPtwGate(input: RiskCompletionInput): string[] {
  if (input.ptwRequired && !input.ptwApproved) {
    return ["작업허가 승인 내역"];
  }

  return [];
}

function evaluateTruckCover(
  input: RiskCompletionInput,
  objects: Set<VisionObject>
): RiskCompletionResult {
  const missingEvidence: string[] = [];

  const hasTarget = hasObject(objects, ["vehicle", "truckBed"]) || Boolean(input.hasWorkTargetPhoto);
  const hasCoverClosed = objects.has("coverClosed");
  const hasActionEvidence = Boolean(input.hasActionPhoto) || hasCoverClosed;
  const actionCompleted = isActionCompleted(input);

  if (!hasTarget) missingEvidence.push("차량 또는 적재함 대상사진");
  if (!hasCoverClosed) missingEvidence.push("덮개 닫힘 상태 확인사진");
  if (!hasActionEvidence) missingEvidence.push("조치사진");
  if (!actionCompleted) missingEvidence.push("조치상태 완료 입력");

  const ptwMissing = checkPtwGate(input);
  missingEvidence.push(...ptwMissing);

  const complete =
    hasTarget &&
    hasCoverClosed &&
    hasActionEvidence &&
    actionCompleted &&
    ptwMissing.length === 0;

  return baseResult({
    level: complete ? "completionCandidate" : "inProgress",
    matchedRuleId: "vehicle-truck-cover-v1",
    missingEvidence,
    reason: complete
      ? "차량 또는 적재함 대상과 덮개 닫힘 상태가 확인되어 완료 반영 후보로 볼 수 있습니다."
      : "일부 증빙은 있으나 적재함 덮개 조치 완료를 인정하기에는 근거가 부족합니다.",
    fieldMessage: complete
      ? "적재함 덮개 조치가 완료 후보로 확인되었습니다."
      : "적재함 전체와 덮개 닫힘 상태가 함께 보이는 사진을 추가해 주세요.",
    managerMessage: complete
      ? "TBM 증빙 기준으로 완료 근거가 확인되었습니다. Risk DB 반영은 관리자 검토 후 처리하세요."
      : "작업대상, 덮개 닫힘, 조치상태 완료가 모두 충족되어야 완료 후보로 인정됩니다.",
    recommendedNextAction: complete
      ? "관리자 검토 후 위험관리표 반영 여부를 승인하세요."
      : "차량/적재함 대상사진과 덮개 닫힘 확인사진을 보완하세요.",
  });
}

function evaluateVehicleCollision(
  input: RiskCompletionInput,
  objects: Set<VisionObject>
): RiskCompletionResult {
  const missingEvidence: string[] = [];

  const hasVehicle = objects.has("vehicle") || Boolean(input.hasWorkTargetPhoto);
  const hasControl = hasObject(objects, [
    "trafficCone",
    "flagger",
    "signage",
    "parkingLine",
    "laneMarking",
    "pedestrianVehicleSeparation",
    "wheelStopper",
  ]);
  const hasTbm = Boolean(input.hasTbmRecord);
  const hasActionEvidence = Boolean(input.hasActionPhoto) || hasControl;

  if (!hasVehicle) missingEvidence.push("차량 주변 또는 후방 상태 사진");
  if (!hasControl) missingEvidence.push("유도자·라바콘·표지·주차라인·동선분리 등 충돌방지 조치 사진");
  if (!hasTbm) missingEvidence.push("TBM 공유 기록");
  if (!hasActionEvidence) missingEvidence.push("조치사진");

  const ptwMissing = checkPtwGate(input);
  missingEvidence.push(...ptwMissing);

  const complete =
    hasVehicle &&
    hasControl &&
    hasTbm &&
    hasActionEvidence &&
    ptwMissing.length === 0;

  return baseResult({
    level: complete ? "completionCandidate" : "inProgress",
    matchedRuleId: "vehicle-collision-control-v1",
    missingEvidence,
    reason: complete
      ? "차량 위험과 충돌방지 조치, TBM 공유 기록이 확인되어 완료 반영 후보로 볼 수 있습니다."
      : "차량 위험에 대한 TBM 또는 충돌방지 조치 증빙이 부족합니다.",
    fieldMessage: complete
      ? "차량 주변 안전조치가 완료 후보로 확인되었습니다."
      : "차량 주변, 유도자, 라바콘, 주차라인 또는 동선분리 조치가 보이도록 사진을 보완해 주세요.",
    managerMessage: complete
      ? "차량 충돌 위험에 대한 현장 조치 근거가 확인되었습니다. Risk DB 반영은 승인 후 처리하세요."
      : "차량 사진만으로는 조치 완료가 아닙니다. 유도·분리·표지·주차라인 등 조치 근거가 필요합니다.",
    recommendedNextAction: complete
      ? "관리자 검토 후 위험관리표 반영 여부를 승인하세요."
      : "차량 주변 상태와 유도자, 라바콘, 주차라인 또는 차량·보행자 분리 조치 사진을 추가하세요.",
  });
}

function evaluateRetainingWall(
  input: RiskCompletionInput,
  objects: Set<VisionObject>
): RiskCompletionResult {
  const missingEvidence: string[] = [];

  const hasCrack = objects.has("crack") || Boolean(input.hasWorkTargetPhoto);
  const hasReinforcement = objects.has("reinforcement");
  const hasAfterState = objects.has("afterState") || Boolean(input.hasActionPhoto);
  const actionCompleted = isActionCompleted(input);

  if (!hasCrack) missingEvidence.push("균열 또는 작업 전 상태 사진");
  if (!hasReinforcement) missingEvidence.push("보강 조치 사진");
  if (!hasAfterState) missingEvidence.push("작업 후 상태 사진");
  if (!actionCompleted) missingEvidence.push("조치상태 완료 입력");

  const ptwMissing = checkPtwGate(input);
  missingEvidence.push(...ptwMissing);

  const complete =
    hasCrack &&
    hasReinforcement &&
    hasAfterState &&
    actionCompleted &&
    ptwMissing.length === 0;

  return baseResult({
    level: complete ? "completionCandidate" : "inProgress",
    matchedRuleId: "retaining-wall-repair-v1",
    missingEvidence,
    reason: complete
      ? "균열부위, 보강 조치, 작업 후 상태가 확인되어 완료 반영 후보로 볼 수 있습니다."
      : "축대 또는 공사성 조치의 전·후 상태 증빙이 부족합니다.",
    fieldMessage: complete
      ? "축대 보강 조치가 완료 후보로 확인되었습니다."
      : "균열 부위, 보강 중 또는 보강 후 상태가 구분되도록 사진을 추가해 주세요.",
    managerMessage: complete
      ? "공사성 조치의 전·후 근거가 확인되었습니다. Risk DB 반영은 관리자 검토 후 처리하세요."
      : "체조사진이나 서명사진만으로는 축대 조치 완료를 인정할 수 없습니다.",
    recommendedNextAction: complete
      ? "관리자 검토 후 위험관리표 반영 여부를 승인하세요."
      : "작업 전 균열상태, 보강 조치, 작업 후 상태 사진을 각각 보완하세요.",
  });
}

function evaluateCaughtIn(
  input: RiskCompletionInput,
  objects: Set<VisionObject>
): RiskCompletionResult {
  const missingEvidence: string[] = [];

  const hasMachineSafety = hasObject(objects, [
    "guard",
    "interlock",
    "emergencyStop",
  ]);
  const hasActionEvidence = Boolean(input.hasActionPhoto) || hasMachineSafety;
  const actionCompleted = isActionCompleted(input);

  if (!hasMachineSafety) missingEvidence.push("방호장치·인터록·비상정지 상태 확인사진");
  if (!hasActionEvidence) missingEvidence.push("조치사진");
  if (!actionCompleted) missingEvidence.push("조치상태 완료 입력");

  const ptwMissing = checkPtwGate(input);
  missingEvidence.push(...ptwMissing);

  const complete =
    hasMachineSafety &&
    hasActionEvidence &&
    actionCompleted &&
    ptwMissing.length === 0;

  return baseResult({
    level: complete ? "completionCandidate" : "inProgress",
    matchedRuleId: "caught-in-machine-safety-v1",
    missingEvidence,
    reason: complete
      ? "협착 위험에 대한 방호 또는 정지 관련 조치가 확인되어 완료 반영 후보로 볼 수 있습니다."
      : "협착 위험에 대한 방호장치 또는 정지상태 증빙이 부족합니다.",
    fieldMessage: complete
      ? "협착 위험 안전조치가 완료 후보로 확인되었습니다."
      : "방호장치, 인터록, 비상정지 또는 정지상태가 보이는 사진을 추가해 주세요.",
    managerMessage: complete
      ? "협착 위험 조치 근거가 확인되었습니다. Risk DB 반영은 관리자 승인 후 처리하세요."
      : "작업사진만으로는 협착 위험 조치 완료가 아닙니다. 방호·인터록·비상정지 근거가 필요합니다.",
    recommendedNextAction: complete
      ? "관리자 검토 후 위험관리표 반영 여부를 승인하세요."
      : "방호장치, 인터록, 비상정지 상태 확인사진을 보완하세요.",
  });
}

function evaluateSlipTrip(
  input: RiskCompletionInput,
  objects: Set<VisionObject>
): RiskCompletionResult {
  const missingEvidence: string[] = [];

  const hasWorkArea = objects.has("workArea") || Boolean(input.hasWorkTargetPhoto);
  const hasControl = hasObject(objects, ["cleanedFloor", "antiSlip", "signage"]);
  const hasActionEvidence = Boolean(input.hasActionPhoto) || hasControl;
  const actionCompleted = isActionCompleted(input);

  if (!hasWorkArea) missingEvidence.push("바닥 또는 작업구역 상태 사진");
  if (!hasControl) missingEvidence.push("청소·살포·미끄럼방지 조치 사진");
  if (!hasActionEvidence) missingEvidence.push("조치사진");
  if (!actionCompleted) missingEvidence.push("조치상태 완료 입력");

  const complete = hasWorkArea && hasControl && hasActionEvidence && actionCompleted;

  return baseResult({
    level: complete ? "completionCandidate" : "inProgress",
    matchedRuleId: "slip-trip-control-v1",
    missingEvidence,
    reason: complete
      ? "바닥 상태와 미끄럼방지 조치가 확인되어 완료 반영 후보로 볼 수 있습니다."
      : "넘어짐·미끄럼 위험에 대한 바닥상태 또는 조치 후 증빙이 부족합니다.",
    fieldMessage: complete
      ? "미끄럼 방지 조치가 완료 후보로 확인되었습니다."
      : "바닥 상태와 청소·살포·미끄럼방지 조치가 보이도록 사진을 보완해 주세요.",
    managerMessage: complete
      ? "넘어짐 위험 조치 근거가 확인되었습니다. Risk DB 반영은 관리자 승인 후 처리하세요."
      : "바닥 사진만으로는 완료가 아닙니다. 조치 후 상태가 확인되어야 합니다.",
    recommendedNextAction: complete
      ? "관리자 검토 후 위험관리표 반영 여부를 승인하세요."
      : "바닥 전·후 상태와 미끄럼방지 조치 사진을 추가하세요.",
  });
}

function evaluateDefaultEvidenceOnly(
  input: RiskCompletionInput
): RiskCompletionResult {
  const hasAnyEvidence =
    input.hasTbmRecord ||
    input.hasSignatureEvidence ||
    input.hasSafetyActivityPhoto ||
    input.hasWorkTargetPhoto ||
    input.hasActionPhoto ||
    Boolean(input.visionObjects?.length);

  if (!hasAnyEvidence) {
    return baseResult({
      level: "notStarted",
      matchedRuleId: "default-no-evidence-v1",
      missingEvidence: ["TBM 기록", "작업대상 사진", "조치사진"],
      reason: "확인 가능한 TBM 또는 조치 증빙이 없습니다.",
      fieldMessage: "아직 확인 가능한 증빙이 없습니다.",
      managerMessage: "위험요인별 완료조건을 판단할 증빙이 부족합니다.",
      recommendedNextAction: "TBM 기록, 작업대상 사진, 조치사진을 등록하세요.",
    });
  }

  return baseResult({
    level: "evidenceOnly",
    matchedRuleId: "default-evidence-only-v1",
    missingEvidence: ["위험요인별 완료조건 확인 필요"],
    reason: "증빙은 있으나 해당 위험요인의 완료조건 룰이 아직 정의되지 않았습니다.",
    fieldMessage: "증빙은 확인되지만 완료 여부는 관리자 확인이 필요합니다.",
    managerMessage: "일반 증빙만으로 Risk DB 완료 처리는 하지 않습니다. 위험유형별 완료조건을 확인하세요.",
    recommendedNextAction: "관리자가 위험유형을 확인하고 완료조건 룰을 지정하세요.",
  });
}

export function evaluateRiskCompletion(
  input: RiskCompletionInput
): RiskCompletionResult {
  const objects = new Set(input.visionObjects ?? []);

  if (
    hasAnyText(input, [
      "적재함",
      "덮개",
      "상차",
      "하차",
      "차량상하차",
      "덮개닫힘",
    ])
  ) {
    return evaluateTruckCover(input, objects);
  }

  if (
    hasAnyText(input, [
      "후진",
      "차량충돌",
      "충돌",
      "차량",
      "유도자",
      "차량계",
      "주차라인",
      "라인마킹",
      "구획선",
      "동선분리",
      "차량분리",
      "보행자분리",
      "보행동선",
    ])
  ) {
    return evaluateVehicleCollision(input, objects);
  }

  if (
    hasAnyText(input, [
      "축대",
      "균열",
      "보강",
      "공사",
      "붕괴",
      "전도",
      "사면",
    ])
  ) {
    return evaluateRetainingWall(input, objects);
  }

  if (
    hasAnyText(input, [
      "협착",
      "끼임",
      "압축기",
      "롤러",
      "벨트",
      "컨베이어",
      "방호장치",
    ])
  ) {
    return evaluateCaughtIn(input, objects);
  }

  if (
    hasAnyText(input, [
      "미끄럼",
      "넘어짐",
      "바닥",
      "결빙",
      "청소",
      "살포",
    ])
  ) {
    return evaluateSlipTrip(input, objects);
  }

  return evaluateDefaultEvidenceOnly(input);
}
