// src/lib/tbmShareTracking.ts

export type TbmShareStatus =
  | "notRequired"
  | "required"
  | "shared"
  | "reviewNeeded";

export type TbmEducationStatus =
  | "notStarted"
  | "inProgress"
  | "shared"
  | "reviewNeeded";

export type SharedByRole =
  | "fieldSupervisor"
  | "safetyHealthManager"
  | "executive"
  | "other"
  | "";

export interface LinkedTbmLike {
  id?: string;
  title?: string;
  taskName?: string;
  workName?: string;
  date?: string;
  sharedDate?: string;
  createdTime?: string;
  sharedBy?: string;
  sharedByRole?: SharedByRole | string;
  memo?: string;
  notes?: string;
  todayNote?: string;
  specialNote?: string;
  safetyNotice?: string;
}

export interface RiskItemForTbmShare {
  id?: string;
  riskItemId?: string;
  processName?: string;
  taskName?: string;
  hazard?: string;
  accidentType?: string;
  riskLevel?: string;
  status?: string;
  tbmLinked?: boolean;
  tbmShared?: boolean;
  tbmSharedDate?: string;
  tbmSharedBy?: string;
  tbmSharedRole?: SharedByRole | string;
  linkedTbmId?: string;
  linkedTbmTitle?: string;
  linkedTbms?: LinkedTbmLike[];
}

export interface TbmShareTrackingResult {
  status: TbmShareStatus;
  educationStatus: TbmEducationStatus;
  isShared: boolean;
  isRequired: boolean;
  linkedTbmCount: number;
  linkedTbmIds: string[];
  latestSharedDate: string | null;
  sharedBy: string | null;
  sharedByRole: SharedByRole | string | null;
  reviewNeeded: boolean;
  reason: string;
  fieldMessage: string;
  managerMessage: string;
  riskDbUpdateAllowed: false;
}

function normalize(value?: string | boolean | number | null): string {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

function includesAny(value: string, keywords: string[]): boolean {
  const target = normalize(value);
  return keywords.some((keyword) => target.includes(normalize(keyword)));
}

function compactText(values: Array<string | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

function isCompletedStatus(value?: string): boolean {
  return includesAny(value ?? "", ["완료", "done", "complete", "completed"]);
}

function isIncompleteStatus(value?: string): boolean {
  return includesAny(value ?? "", [
    "미착수",
    "진행중",
    "조치필요",
    "확인필요",
    "보완",
    "필요",
    "대기",
  ]);
}

function isHighOrManagedRisk(riskItem: RiskItemForTbmShare): boolean {
  const text = compactText([
    riskItem.riskLevel,
    riskItem.accidentType,
    riskItem.hazard,
    riskItem.taskName,
    riskItem.processName,
  ]);

  return includesAny(text, [
    "상",
    "고위험",
    "끼임",
    "협착",
    "충돌",
    "추락",
    "낙하",
    "깔림",
    "전도",
    "붕괴",
    "질식",
    "화재",
    "폭발",
    "차량",
    "차량분리",
    "보행자분리",
    "동선분리",
    "주차라인",
    "라인마킹",
    "구획선",
    "압축기",
    "축대",
    "공사",
  ]);
}

function hasTbmShareText(tbm: LinkedTbmLike): boolean {
  const text = compactText([
    tbm.title,
    tbm.taskName,
    tbm.workName,
    tbm.memo,
    tbm.notes,
    tbm.todayNote,
    tbm.specialNote,
    tbm.safetyNotice,
  ]);

  return includesAny(text, [
    "tbm",
    "교육",
    "공유",
    "주의",
    "위험",
    "안전",
    "작업전",
    "작업 전",
    "브리핑",
    "조회",
    "체조",
    "주차라인",
    "라인마킹",
    "구획선",
    "차량분리",
    "보행자분리",
    "동선분리",
    "보행동선",
    "완성",
  ]);
}

function getLinkedTbms(riskItem: RiskItemForTbmShare): LinkedTbmLike[] {
  const linkedTbms = riskItem.linkedTbms ?? [];

  if (linkedTbms.length > 0) {
    return linkedTbms;
  }

  if (riskItem.linkedTbmId || riskItem.linkedTbmTitle) {
    return [
      {
        id: riskItem.linkedTbmId,
        title: riskItem.linkedTbmTitle,
        sharedDate: riskItem.tbmSharedDate,
        sharedBy: riskItem.tbmSharedBy,
        sharedByRole: riskItem.tbmSharedRole,
      },
    ];
  }

  return [];
}

function getLatestDate(tbms: LinkedTbmLike[], fallbackDate?: string): string | null {
  const dates = [
    fallbackDate,
    ...tbms.map((tbm) => tbm.sharedDate ?? tbm.date ?? tbm.createdTime),
  ].filter(Boolean) as string[];

  if (dates.length === 0) return null;

  return dates.sort().at(-1) ?? null;
}

function getFirstNonEmpty(values: Array<string | undefined | null>): string | null {
  return values.find((value) => Boolean(value)) ?? null;
}

export function evaluateTbmShareTracking(
  riskItem: RiskItemForTbmShare
): TbmShareTrackingResult {
  const linkedTbms = getLinkedTbms(riskItem);
  const linkedTbmIds = linkedTbms
    .map((tbm) => tbm.id)
    .filter(Boolean) as string[];

  const linkedTbmCount = linkedTbms.length;
  const hasLinkedTbm = linkedTbmCount > 0;
  const explicitShared = Boolean(riskItem.tbmShared);
  const relationLinked = Boolean(riskItem.tbmLinked) || hasLinkedTbm;

  const latestSharedDate = getLatestDate(linkedTbms, riskItem.tbmSharedDate);
  const sharedBy = getFirstNonEmpty([
    riskItem.tbmSharedBy,
    ...linkedTbms.map((tbm) => tbm.sharedBy),
  ]);

  const sharedByRole =
    getFirstNonEmpty([
      riskItem.tbmSharedRole,
      ...linkedTbms.map((tbm) => tbm.sharedByRole),
    ]) ?? null;

  const hasShareText = linkedTbms.some(hasTbmShareText);
  const completed = isCompletedStatus(riskItem.status);
  const incomplete = isIncompleteStatus(riskItem.status);
  const managedRisk = isHighOrManagedRisk(riskItem);

  const isRequired = !completed && (managedRisk || incomplete || Boolean(riskItem.tbmLinked));

  if (!isRequired && !relationLinked && !explicitShared) {
    return {
      status: "notRequired",
      educationStatus: "notStarted",
      isShared: false,
      isRequired: false,
      linkedTbmCount,
      linkedTbmIds,
      latestSharedDate,
      sharedBy,
      sharedByRole,
      reviewNeeded: false,
      reason: "TBM 공유 필요 대상으로 분류되지 않았고 연결된 TBM도 없습니다.",
      fieldMessage: "현재 TBM 공유 필수 항목으로 표시되지 않습니다.",
      managerMessage: "위험성평가 원본 상태는 변경되지 않습니다.",
      riskDbUpdateAllowed: false,
    };
  }

  if (explicitShared || (relationLinked && hasShareText)) {
    return {
      status: "shared",
      educationStatus: "shared",
      isShared: true,
      isRequired,
      linkedTbmCount,
      linkedTbmIds,
      latestSharedDate,
      sharedBy,
      sharedByRole,
      reviewNeeded: false,
      reason: "Risk Item과 연결된 TBM에서 위험요인 공유 또는 교육 기록이 확인되었습니다.",
      fieldMessage: "TBM 공유 완료로 확인되었습니다.",
      managerMessage:
        "TBM 공유 완료는 교육·공유 이행 근거입니다. 개선대책 완료 여부는 별도 증빙과 완료조건으로 판단해야 합니다.",
      riskDbUpdateAllowed: false,
    };
  }

  if (relationLinked && !hasShareText) {
    return {
      status: "reviewNeeded",
      educationStatus: "reviewNeeded",
      isShared: false,
      isRequired,
      linkedTbmCount,
      linkedTbmIds,
      latestSharedDate,
      sharedBy,
      sharedByRole,
      reviewNeeded: true,
      reason: "Risk Item과 TBM은 연결되어 있으나 TBM 내용에서 위험요인 공유 여부가 명확하지 않습니다.",
      fieldMessage: "연결된 TBM은 있으나 공유 내용 확인이 필요합니다.",
      managerMessage:
        "Relation 연결만으로 TBM 공유 완료로 확정하지 않습니다. TBM 주의사항 또는 교육 내용 확인이 필요합니다.",
      riskDbUpdateAllowed: false,
    };
  }

  return {
    status: "required",
    educationStatus: "inProgress",
    isShared: false,
    isRequired: true,
    linkedTbmCount,
    linkedTbmIds,
    latestSharedDate,
    sharedBy,
    sharedByRole,
    reviewNeeded: true,
    reason: "TBM 공유 필요 항목으로 보이나 연결된 TBM 기록이 없습니다.",
    fieldMessage: "오늘 TBM에서 이 위험요인을 공유해 주세요.",
    managerMessage:
      "TBM 공유 필요 항목입니다. 공유 완료 후에도 Risk DB 상태는 자동 변경되지 않습니다.",
    riskDbUpdateAllowed: false,
  };
}
