import "server-only";

export type NotionProperty = {
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  date?: { start?: string | null };
  checkbox?: boolean;
  select?: { name?: string | null };
  multi_select?: Array<{ name?: string }>;
  people?: Array<{ name?: string }>;
  relation?: unknown[];
  number?: number | null;
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
  | "action"
  | "budget"
  | "reassessment"
  | "open";

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
};

export type RiskIntelligenceData = {
  hasDb: boolean;
  total: number;
  highRiskCount: number;
  actionNeededCount: number;
  budgetNeededCount: number;
  reassessmentDueCount: number;
  openCount: number;
  completedCount: number;
  items: RiskItemDetail[];
};

function getTitlePropPlainText(prop: NotionProperty | undefined): string {
  return prop?.title?.[0]?.plain_text?.trim() ?? "";
}

function getTextPropPlainText(prop: NotionProperty | undefined): string {
  return prop?.rich_text?.[0]?.plain_text?.trim() ?? "";
}

function getDatePropStart(prop: NotionProperty | undefined): string {
  return prop?.date?.start ?? "";
}

function getCheckboxPropValue(prop: NotionProperty | undefined): boolean {
  return prop?.checkbox ?? false;
}

function getSelectPropName(prop: NotionProperty | undefined): string {
  return prop?.select?.name?.trim() ?? "";
}

function getNumberPropValue(prop: NotionProperty | undefined): number | null {
  return typeof prop?.number === "number" ? prop.number : null;
}

function getPeopleNames(prop: NotionProperty | undefined): string {
  return prop?.people?.map((person) => person.name).filter(Boolean).join(", ") ?? "";
}

function getKstDateKey(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
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
  const todayPlus30 = getKstDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return Boolean(
    item.reassessmentDate &&
      item.reassessmentDate <= todayPlus30 &&
      isRiskItemOpen(item)
  );
}

export function getManagementTerm(item: RiskItemDetail): "단기" | "중기" | "장기" {
  if (isHighRiskItem(item) || isReassessmentDueItem(item)) {
    return "단기";
  }

  if (isActionNeededItem(item)) {
    return "중기";
  }

  if (isBudgetNeededItem(item)) {
    return "장기";
  }

  return "중기";
}

export function filterRiskItems(
  items: RiskItemDetail[],
  filter: RiskFilter
): RiskItemDetail[] {
  switch (filter) {
    case "high":
      return items.filter(isHighRiskItem);
    case "action":
      return items.filter(isActionNeededItem);
    case "budget":
      return items.filter(isBudgetNeededItem);
    case "reassessment":
      return items.filter(isReassessmentDueItem);
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
      openCount: 0,
      completedCount: 0,
      items: [],
    };
  }

  const pages = await queryAllRiskPages(riskAssessmentDbId, notionApiKey);

  const items = pages.map((page) => {
    const props = page.properties;

    return {
      id: page.id,
      title: getTitlePropPlainText(props["Risk Item"]),
      no: getTextPropPlainText(props["No"]),
      processName: getTextPropPlainText(props["processName"]),
      taskName: getTextPropPlainText(props["taskName"]),
      hazard: getTextPropPlainText(props["hazard"]),
      accidentType: getSelectPropName(props["accidentType"]) || getTextPropPlainText(props["accidentType"]),
      frequency: getNumberPropValue(props["frequency"]),
      severity: getNumberPropValue(props["severity"]),
      riskScore: getNumberPropValue(props["riskScore"]),
      riskLevel: getSelectPropName(props["riskLevel"]),
      currentControls: getTextPropPlainText(props["currentControls"]),
      improvementPlan: getTextPropPlainText(props["improvementPlan"]),
      afterFrequency: getNumberPropValue(props["afterFrequency"]),
      afterSeverity: getNumberPropValue(props["afterSeverity"]),
      afterRiskScore: getNumberPropValue(props["afterRiskScore"]),
      afterRiskLevel: getSelectPropName(props["afterRiskLevel"]),
      owner: getPeopleNames(props["owner"]) || getTextPropPlainText(props["owner"]),
      dueDate: getDatePropStart(props["dueDate"]),
      completedDate: getDatePropStart(props["completedDate"]),
      status: getSelectPropName(props["status"]),
      budgetRequired: getCheckboxPropValue(props["budgetRequired"]),
      estimatedCost: getNumberPropValue(props["estimatedCost"]),
      reassessmentDate: getDatePropStart(props["reassessmentDate"]),
      tbmLinked: getCheckboxPropValue(props["tbmLinked"]),
      sourceDoc: getTextPropPlainText(props["sourceDoc"]),
      assessmentYear: getTextPropPlainText(props["assessmentYear"]),
      assessmentType: getSelectPropName(props["assessmentType"]) || getTextPropPlainText(props["assessmentType"]),
      memo: getTextPropPlainText(props["memo"]),
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
    openCount: sortedItems.filter(isRiskItemOpen).length,
    completedCount: sortedItems.filter((item) => item.status === "완료").length,
    items: sortedItems,
  };
}
