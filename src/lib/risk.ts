import "server-only";

export type NotionProperty = {
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  date?: { start?: string | null };
  files?: Array<{
    name?: string;
    type?: "external" | "file" | string;
    external?: { url?: string };
    file?: { url?: string };
  }>;
  checkbox?: boolean;
  select?: { name?: string | null };
  status?: { name?: string | null };
  multi_select?: Array<{ name?: string }>;
  people?: Array<{ name?: string }>;
  relation?: unknown[];
  number?: number | null;
  formula?: {
    string?: string | null;
    number?: number | null;
    boolean?: boolean | null;
    date?: { start?: string | null } | null;
  };
};

type NotionPage = {
  id: string;
  properties: Record<string, NotionProperty>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
};

export type RiskFilter =
  | "all"
  | "high"
  | "short"
  | "mid"
  | "long"
  | "action"
  | "budget"
  | "reassessment"
  | "tbm-needed"
  | "unassigned"
  | "open";

export type ManagementTerm = "단기" | "중기" | "장기";

export type RiskEvidenceFile = {
  name: string;
  url: string;
};

export type RiskItemDetail = {
  id: string;
  title: string;
  no: string;
  processName: string;
  taskName: string;
  hazard: string;
  accidentType: string;
  frequency: number | null;
  severity: number | null;
  riskScore: number | null;
  riskLevel: string;
  currentControls: string;
  improvementPlan: string;
  afterFrequency: number | null;
  afterSeverity: number | null;
  afterRiskScore: number | null;
  afterRiskLevel: string;
  owner: string;
  dueDate: string;
  completedDate: string;
  status: string;
  budgetRequired: boolean;
  estimatedCost: number | null;
  reassessmentDate: string;
  tbmLinked: boolean;
  sourceDoc: string;
  assessmentYear: string;
  assessmentType: string;
  memo: string;
  improvementPlannedDate: string;
  improvementCompletedDate: string;
  beforePhotos: RiskEvidenceFile[];
  afterPhotos: RiskEvidenceFile[];
  actionMemo: string;
  adminConfirmed: boolean;
  representativeConfirmed: boolean;
  legalBasis: string;
  koshaBasis: string;
};

export type RiskIntelligenceData = {
  hasDb: boolean;
  total: number;
  highRiskCount: number;
  actionNeededCount: number;
  budgetNeededCount: number;
  reassessmentDueCount: number;
  tbmShareNeededCount: number;
  tbmShareNeededItems: RiskItemDetail[];
  openCount: number;
  completedCount: number;
  unassignedOwnerCount: number;
  shortTermCount: number;
  midTermCount: number;
  longTermCount: number;
  items: RiskItemDetail[];
};

function getFirstExistingProp(
  props: Record<string, NotionProperty>,
  names: string[]
): NotionProperty | undefined {
  for (const name of names) {
    if (props[name]) return props[name];
  }
  return undefined;
}

function getTitlePropPlainText(prop: NotionProperty | undefined): string {
  return prop?.title?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getTextPropPlainText(prop: NotionProperty | undefined): string {
  return prop?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getDatePropStart(prop: NotionProperty | undefined): string {
  return prop?.date?.start ?? prop?.formula?.date?.start ?? "";
}

function getCheckboxPropValue(prop: NotionProperty | undefined): boolean {
  return prop?.checkbox ?? prop?.formula?.boolean ?? false;
}

function getFilesPropValue(prop: NotionProperty | undefined): RiskEvidenceFile[] {
  return (
    prop?.files
      ?.map((file) => ({
        name: file.name || "첨부파일",
        url: file.external?.url || file.file?.url || "",
      }))
      .filter((file) => file.url) ?? []
  );
}

function getSelectPropName(prop: NotionProperty | undefined): string {
  return prop?.select?.name?.trim() ?? prop?.status?.name?.trim() ?? "";
}

function getNumberPropValue(prop: NotionProperty | undefined): number | null {
  if (typeof prop?.number === "number") return prop.number;
  if (typeof prop?.formula?.number === "number") return prop.formula.number;
  return null;
}

function getFormulaStringValue(prop: NotionProperty | undefined): string {
  return prop?.formula?.string?.trim() ?? "";
}

function getMultiSelectNamesText(prop: NotionProperty | undefined): string {
  return prop?.multi_select?.map((item) => item.name ?? "").filter(Boolean).join(", ") ?? "";
}

function getPeopleNames(prop: NotionProperty | undefined): string {
  return prop?.people?.map((person) => person.name ?? "").filter(Boolean).join(", ") ?? "";
}

function getFlexibleTextValue(prop: NotionProperty | undefined): string {
  return (
    getPeopleNames(prop) ||
    getSelectPropName(prop) ||
    getMultiSelectNamesText(prop) ||
    getTextPropPlainText(prop) ||
    getTitlePropPlainText(prop) ||
    getFormulaStringValue(prop) ||
    ""
  );
}

function getOwnerValue(props: Record<string, NotionProperty>): string {
  const prop = getFirstExistingProp(props, [
    "owner",
    "담당자",
    "Owner",
    "담당",
    "responsible",
    "assignee",
  ]);

  return getFlexibleTextValue(prop);
}

function getKstDateKey(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function isDateWithinDays(dateValue: string, days: number): boolean {
  if (!dateValue) return false;

  const today = getKstDateKey();
  const target = getKstDateKey(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

  return dateValue >= today && dateValue <= target;
}

async function queryNotionDatabase(
  databaseId: string,
  notionApiKey: string,
  body: Record<string, unknown>
): Promise<NotionQueryResponse> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Risk Items DB query failed: ${response.status} ${text}`);
  }

  return (await response.json()) as NotionQueryResponse;
}

async function queryAllRiskPages(
  databaseId: string,
  notionApiKey: string
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let startCursor: string | null | undefined = undefined;

  do {
    const data = await queryNotionDatabase(databaseId, notionApiKey, {
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    });

    pages.push(...(data.results ?? []));
    startCursor = data.has_more ? data.next_cursor : null;
  } while (startCursor);

  return pages;
}

export function isRiskItemOpen(item: RiskItemDetail): boolean {
  return item.status !== "완료";
}

export function isOwnerUnassignedItem(item: RiskItemDetail): boolean {
  return item.owner.trim().length === 0 && isRiskItemOpen(item);
}

export function isHighRiskItem(item: RiskItemDetail): boolean {
  return item.riskLevel === "상" && isRiskItemOpen(item);
}

export function isActionNeededItem(item: RiskItemDetail): boolean {
  return item.improvementPlan.trim().length > 0 && isRiskItemOpen(item);
}

export function isBudgetNeededItem(item: RiskItemDetail): boolean {
  return item.budgetRequired && isRiskItemOpen(item);
}

export function isReassessmentDueItem(item: RiskItemDetail): boolean {
  return Boolean(
    item.reassessmentDate &&
      item.reassessmentDate <= getKstDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) &&
      isRiskItemOpen(item)
  );
}

export function isDueSoonItem(item: RiskItemDetail): boolean {
  return isRiskItemOpen(item) && isDateWithinDays(item.dueDate, 30);
}

export function isTbmShareNeededItem(item: RiskItemDetail): boolean {
  const accidentType = item.accidentType || "";
  const majorAccident =
    accidentType.includes("끼임") ||
    accidentType.includes("협착") ||
    accidentType.includes("충돌") ||
    accidentType.includes("추락") ||
    accidentType.includes("낙하") ||
    accidentType.includes("온열") ||
    accidentType.includes("질식") ||
    accidentType.includes("화재");

  return (
    isRiskItemOpen(item) &&
    !item.tbmLinked &&
    (isHighRiskItem(item) || isDueSoonItem(item) || majorAccident)
  );
}

export function getManagementTerm(item: RiskItemDetail): ManagementTerm {
  if (isHighRiskItem(item) || isReassessmentDueItem(item) || isDueSoonItem(item)) {
    return "단기";
  }

  if (isBudgetNeededItem(item)) {
    return "장기";
  }

  if (isActionNeededItem(item)) {
    return "중기";
  }

  return "중기";
}

export function getManagementTermReason(item: RiskItemDetail): string {
  if (isHighRiskItem(item)) {
    return "위험수준 상 항목으로 단기 확인이 필요합니다.";
  }

  if (isReassessmentDueItem(item)) {
    return "30일 이내 재평가 예정 항목입니다.";
  }

  if (isDueSoonItem(item)) {
    return "기한이 30일 이내인 항목입니다.";
  }

  if (isBudgetNeededItem(item)) {
    return "예산 검토 또는 설비개선 반영이 필요한 장기 관리 항목입니다.";
  }

  if (isActionNeededItem(item)) {
    return "개선대책 담당자·기한 관리가 필요한 중기 관리 항목입니다.";
  }

  return "일반 관리 항목입니다.";
}

export function filterRiskItems(
  items: RiskItemDetail[],
  filter: RiskFilter
): RiskItemDetail[] {
  switch (filter) {
    case "high":
      return items.filter(isHighRiskItem);
    case "short":
      return items.filter((item) => getManagementTerm(item) === "단기");
    case "mid":
      return items.filter((item) => getManagementTerm(item) === "중기");
    case "long":
      return items.filter((item) => getManagementTerm(item) === "장기");
    case "action":
      return items.filter(isActionNeededItem);
    case "budget":
      return items.filter(isBudgetNeededItem);
    case "reassessment":
      return items.filter(isReassessmentDueItem);
    case "tbm-needed":
      return items.filter(isTbmShareNeededItem);
    case "unassigned":
      return items.filter(isOwnerUnassignedItem);
    case "open":
      return items.filter(isRiskItemOpen);
    case "all":
    default:
      return items;
  }
}

export async function getRiskIntelligenceData(
  riskAssessmentDbId: string | undefined,
  notionApiKey: string
): Promise<RiskIntelligenceData> {
  if (!riskAssessmentDbId) {
    return {
      hasDb: false,
      total: 0,
      highRiskCount: 0,
      actionNeededCount: 0,
      budgetNeededCount: 0,
      reassessmentDueCount: 0,
      tbmShareNeededCount: 0,
      tbmShareNeededItems: [],
      openCount: 0,
      completedCount: 0,
      unassignedOwnerCount: 0,
      shortTermCount: 0,
      midTermCount: 0,
      longTermCount: 0,
      items: [],
    };
  }

  const pages = await queryAllRiskPages(riskAssessmentDbId, notionApiKey);

  const items = pages.map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      title: getTitlePropPlainText(getFirstExistingProp(props, ["Risk Item", "title", "항목명"])),
      no: getTextPropPlainText(getFirstExistingProp(props, ["No", "no", "번호"])),
      processName: getTextPropPlainText(getFirstExistingProp(props, ["processName", "공정명", "process"])),
      taskName: getTextPropPlainText(getFirstExistingProp(props, ["taskName", "작업명", "task"])),
      hazard: getTextPropPlainText(getFirstExistingProp(props, ["hazard", "유해위험요인", "위험요인"])),
      accidentType: getFlexibleTextValue(getFirstExistingProp(props, ["accidentType", "사고형태", "accident"])),
      frequency: getNumberPropValue(getFirstExistingProp(props, ["frequency", "빈도", "F"])),
      severity: getNumberPropValue(getFirstExistingProp(props, ["severity", "강도", "S"])),
      riskScore: getNumberPropValue(getFirstExistingProp(props, ["riskScore", "위험도", "R"])),
      riskLevel: getFlexibleTextValue(getFirstExistingProp(props, ["riskLevel", "위험수준", "등급"])),
      currentControls: getTextPropPlainText(getFirstExistingProp(props, ["currentControls", "현재 안전조치", "기존 안전조치"])),
      improvementPlan: getTextPropPlainText(getFirstExistingProp(props, ["improvementPlan", "개선대책", "개선계획"])),
      afterFrequency: getNumberPropValue(getFirstExistingProp(props, ["afterFrequency", "개선후빈도", "개선 후 빈도"])),
      afterSeverity: getNumberPropValue(getFirstExistingProp(props, ["afterSeverity", "개선후강도", "개선 후 강도"])),
      afterRiskScore: getNumberPropValue(getFirstExistingProp(props, ["afterRiskScore", "개선후위험도", "개선 후 위험도"])),
      afterRiskLevel: getFlexibleTextValue(getFirstExistingProp(props, ["afterRiskLevel", "개선후등급", "개선 후 등급"])),
      owner: getOwnerValue(props),
      dueDate: getDatePropStart(getFirstExistingProp(props, ["dueDate", "기한", "완료예정일"])),
      completedDate: getDatePropStart(getFirstExistingProp(props, ["completedDate", "완료일"])),
      status: getFlexibleTextValue(getFirstExistingProp(props, ["status", "상태"])),
      budgetRequired: getCheckboxPropValue(getFirstExistingProp(props, ["budgetRequired", "예산필요", "예산 필요"])),
      estimatedCost: getNumberPropValue(getFirstExistingProp(props, ["estimatedCost", "예상비용", "예상 비용"])),
      reassessmentDate: getDatePropStart(getFirstExistingProp(props, ["reassessmentDate", "재평가일", "재평가 예정일"])),
      tbmLinked: getCheckboxPropValue(getFirstExistingProp(props, ["tbmLinked", "TBM공유", "TBM 공유"])),
      sourceDoc: getTextPropPlainText(getFirstExistingProp(props, ["sourceDoc", "출처문서", "source"])),
      assessmentYear: getTextPropPlainText(getFirstExistingProp(props, ["assessmentYear", "평가연도"])),
      assessmentType: getFlexibleTextValue(getFirstExistingProp(props, ["assessmentType", "평가유형"])),
      memo: getTextPropPlainText(getFirstExistingProp(props, ["memo", "메모"])),
      improvementPlannedDate: getDatePropStart(
        getFirstExistingProp(props, ["개선예정일", "improvementPlannedDate", "개선 예정일"])
      ),
      improvementCompletedDate: getDatePropStart(
        getFirstExistingProp(props, ["개선완료일", "improvementCompletedDate", "개선 완료일"])
      ),
      beforePhotos: getFilesPropValue(
        getFirstExistingProp(props, ["개선 전 사진", "개선전사진", "조치 전 사진", "beforePhotos"])
      ),
      afterPhotos: getFilesPropValue(
        getFirstExistingProp(props, ["개선 후 사진", "개선후사진", "조치 후 사진", "afterPhotos"])
      ),
      actionMemo: getTextPropPlainText(
        getFirstExistingProp(props, ["조치 메모", "처리 메모", "관리자 메모", "actionMemo"])
      ),
      adminConfirmed: getCheckboxPropValue(
        getFirstExistingProp(props, ["관리자 확인", "adminConfirmed", "관리자확인"])
      ),
      representativeConfirmed: getCheckboxPropValue(
        getFirstExistingProp(props, ["대표 확인", "사업주 확인", "representativeConfirmed", "대표확인"])
      ),
      legalBasis: getTextPropPlainText(
        getFirstExistingProp(props, ["법령근거", "관련 법령", "법령/기준", "legalBasis"])
      ),
      koshaBasis: getTextPropPlainText(
        getFirstExistingProp(props, ["KOSHA근거", "KOSHA 기준", "KOSHA기준", "koshaBasis"])
      ),
    };
  });

  const sortedItems = items.sort((a, b) => {
    const riskDiff = (b.riskScore ?? 0) - (a.riskScore ?? 0);

    if (riskDiff !== 0) {
      return riskDiff;
    }

    return a.no.localeCompare(b.no, "ko-KR", { numeric: true });
  });

  return {
    hasDb: true,
    total: sortedItems.length,
    highRiskCount: sortedItems.filter(isHighRiskItem).length,
    actionNeededCount: sortedItems.filter(isActionNeededItem).length,
    budgetNeededCount: sortedItems.filter(isBudgetNeededItem).length,
    reassessmentDueCount: sortedItems.filter(isReassessmentDueItem).length,
    tbmShareNeededCount: sortedItems.filter(isTbmShareNeededItem).length,
    tbmShareNeededItems: sortedItems.filter(isTbmShareNeededItem).slice(0, 3),
    openCount: sortedItems.filter(isRiskItemOpen).length,
    completedCount: sortedItems.filter((item) => item.status === "완료").length,
    unassignedOwnerCount: sortedItems.filter(isOwnerUnassignedItem).length,
    shortTermCount: sortedItems.filter((item) => getManagementTerm(item) === "단기").length,
    midTermCount: sortedItems.filter((item) => getManagementTerm(item) === "중기").length,
    longTermCount: sortedItems.filter((item) => getManagementTerm(item) === "장기").length,
    items: sortedItems,
  };
}
