// src/lib/riskEvidenceCompletionAdapter.ts

import {
  evaluateRiskCompletion,
  type ActionStatus,
  type RiskCompletionInput,
  type RiskCompletionResult,
  type VisionObject,
} from "./riskCompletionRules";

export type EvidencePhotoPurpose =
  | "signature"
  | "safetyActivity"
  | "workTarget"
  | "action"
  | "other";

export interface EvidencePhotoLike {
  purpose?: EvidencePhotoPurpose | string;
  role?: EvidencePhotoPurpose | string;
  category?: EvidencePhotoPurpose | string;
  label?: string;
  name?: string;
  caption?: string;
  visionObjects?: VisionObject[];
}

export interface RiskItemLike {
  id?: string;
  riskItemId?: string;
  processName?: string;
  taskName?: string;
  hazard?: string;
  accidentType?: string;
  status?: string;
  actionStatus?: string;
  improvementStatus?: string;
}

export interface TbmLike {
  id?: string;
  title?: string;
  taskName?: string;
  workName?: string;
  memo?: string;
  notes?: string;
  specialNote?: string;
  todayNote?: string;
  hasTbmRecord?: boolean;
  ptwRequired?: boolean;
  ptwApproved?: boolean;
}

export interface BuildRiskCompletionInputParams {
  riskItem: RiskItemLike;
  tbm?: TbmLike;
  photos?: EvidencePhotoLike[];
  fallbackVisionObjects?: VisionObject[];
}

function normalize(value?: string): string {
  return (value ?? "").replace(/\s+/g, "").toLowerCase();
}

function includesAny(value: string, keywords: string[]): boolean {
  const normalized = normalize(value);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function getPhotoText(photo: EvidencePhotoLike): string {
  return [
    photo.purpose,
    photo.role,
    photo.category,
    photo.label,
    photo.name,
    photo.caption,
  ]
    .filter(Boolean)
    .join(" ");
}


function inferVisionObjectsFromText(value: string): VisionObject[] {
  const objects: VisionObject[] = [];

  if (includesAny(value, ["차량", "트럭", "청소차", "수거차", "운반차", "vehicle", "truck"])) {
    objects.push("vehicle");
  }

  if (includesAny(value, ["주차라인", "주차 라인", "라인마킹", "라인 마킹", "차선", "구획선"])) {
    objects.push("parkingLine", "laneMarking");
  }

  if (includesAny(value, ["차량분리", "차량 분리", "보행자분리", "보행자 분리", "동선분리", "동선 분리", "보행동선", "보행 동선"])) {
    objects.push("pedestrianVehicleSeparation");
  }

  if (includesAny(value, ["스토퍼", "휠스토퍼", "차량정지", "바퀴막이", "wheelStopper"])) {
    objects.push("wheelStopper");
  }

  return objects;
}

function isSignaturePhoto(photo: EvidencePhotoLike): boolean {
  const text = getPhotoText(photo);
  return includesAny(text, ["signature", "sign", "서명", "참석", "참석자"]);
}

function isSafetyActivityPhoto(photo: EvidencePhotoLike): boolean {
  const text = getPhotoText(photo);
  return includesAny(text, [
    "safetyActivity",
    "tbm",
    "안전활동",
    "체조",
    "조회",
    "교육",
    "브리핑",
  ]);
}

function isWorkTargetPhoto(photo: EvidencePhotoLike): boolean {
  const text = getPhotoText(photo);
  return includesAny(text, [
    "workTarget",
    "target",
    "작업대상",
    "대상",
    "차량",
    "적재함",
    "축대",
    "균열",
    "장비",
    "설비",
    "주차라인",
    "라인마킹",
    "구획선",
    "차량분리",
    "보행자분리",
    "동선분리",
  ]);
}

function isActionPhoto(photo: EvidencePhotoLike): boolean {
  const text = getPhotoText(photo);
  return includesAny(text, [
    "action",
    "조치",
    "개선",
    "보강",
    "완료",
    "after",
    "작업후",
    "정리",
    "청소",
    "주차라인",
    "라인마킹",
    "구획선",
    "차량분리",
    "보행자분리",
    "동선분리",
    "완성",
  ]);
}

function normalizeActionStatus(value?: string): ActionStatus {
  const text = normalize(value);

  if (!text) return "";
  if (includesAny(text, ["완료", "completed", "done"])) return "완료";
  if (includesAny(text, ["진행", "progress"])) return "진행중";
  if (includesAny(text, ["조치필요", "필요", "required"])) return "조치필요";
  if (includesAny(text, ["확인", "review", "check"])) return "확인필요";
  if (includesAny(text, ["미착수", "notstarted", "todo"])) return "미착수";

  return "";
}

function uniqueVisionObjects(values: VisionObject[]): VisionObject[] {
  return Array.from(new Set(values));
}

export function buildRiskCompletionInput({
  riskItem,
  tbm,
  photos = [],
  fallbackVisionObjects = [],
}: BuildRiskCompletionInputParams): RiskCompletionInput {
  const sourceText = [
    riskItem.processName,
    riskItem.taskName,
    riskItem.hazard,
    riskItem.accidentType,
    tbm?.title,
    tbm?.taskName,
    tbm?.workName,
    tbm?.memo,
    tbm?.notes,
    tbm?.specialNote,
    tbm?.todayNote,
    ...photos.map(getPhotoText),
  ]
    .filter(Boolean)
    .join(" ");

  const photoVisionObjects = photos.flatMap((photo) => photo.visionObjects ?? []);
  const inferredVisionObjects = inferVisionObjectsFromText(sourceText);

  const visionObjects = uniqueVisionObjects([
    ...fallbackVisionObjects,
    ...photoVisionObjects,
    ...inferredVisionObjects,
  ]);

  const hasSignatureEvidence = photos.some(isSignaturePhoto);
  const hasSafetyActivityPhoto = photos.some(isSafetyActivityPhoto);
  const hasWorkTargetPhoto = photos.some(isWorkTargetPhoto);
  const hasActionPhoto = photos.some(isActionPhoto);

  const actionStatus = normalizeActionStatus(
    riskItem.actionStatus ?? riskItem.improvementStatus ?? riskItem.status
  );

  return {
    riskItemId: riskItem.riskItemId ?? riskItem.id,
    processName: riskItem.processName,
    taskName: riskItem.taskName ?? tbm?.taskName ?? tbm?.workName ?? tbm?.title,
    hazard: riskItem.hazard,
    accidentType: riskItem.accidentType,
    actionStatus,
    visionObjects,
    hasTbmRecord: Boolean(tbm?.hasTbmRecord ?? tbm?.id),
    hasSignatureEvidence,
    hasSafetyActivityPhoto,
    hasWorkTargetPhoto,
    hasActionPhoto,
    ptwRequired: Boolean(tbm?.ptwRequired),
    ptwApproved: Boolean(tbm?.ptwApproved),
  };
}

export interface RiskCompletionWithSource {
  input: RiskCompletionInput;
  result: RiskCompletionResult;
}

export function evaluateRiskEvidenceCompletion(
  params: BuildRiskCompletionInputParams
): RiskCompletionWithSource {
  const input = buildRiskCompletionInput(params);
  const result = evaluateRiskCompletion(input);

  return {
    input,
    result,
  };
}
