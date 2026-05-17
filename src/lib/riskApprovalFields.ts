// src/lib/riskApprovalFields.ts

import { Client } from "@notionhq/client";
import { normalizeNotionId, readRiskApprovalReadbackFromPage } from "./riskApprovalReadback";

export interface RiskApprovalFields {
  approvalStatus?: string;
  approvalBy?: string;
  approvalDate?: string;
  approvalMemo?: string;
  riskDbReflectionStatus?: string;
  postActionReflection?: string;
  actionReflectionType?: string;
  actionReflectionDate?: string;
  actionReflectionEvidence?: string;
}

export interface AttachRiskApprovalFieldsOptions {
  riskDatabaseId?: string;
  notionApiKey?: string;
}

type RiskItemWithId = {
  id?: string;
  riskItemId?: string;
  [key: string]: unknown;
};

type NotionPageLike = {
  id: string;
  properties?: Record<string, any>;
};

function normalizeNotionPageId(value?: string): string {
  return normalizeNotionId(value).toLowerCase();
}

function getPlainText(property: any): string {
  if (!property) return "";

  if (property.type === "title") {
    return (property.title ?? []).map((item: any) => item.plain_text ?? "").join("");
  }

  if (property.type === "rich_text") {
    return (property.rich_text ?? []).map((item: any) => item.plain_text ?? "").join("");
  }

  if (property.type === "select") {
    return property.select?.name ?? "";
  }

  if (property.type === "status") {
    return property.status?.name ?? "";
  }

  if (property.type === "date") {
    return property.date?.start ?? "";
  }

  if (property.type === "people") {
    return (property.people ?? []).map((person: any) => person.name ?? "").join(", ");
  }

  if (property.type === "multi_select") {
    return (property.multi_select ?? []).map((item: any) => item.name ?? "").join(", ");
  }

  if (property.type === "created_by" || property.type === "last_edited_by") {
    return property[property.type]?.name ?? "";
  }

  return "";
}

async function resolveDataSourceId(
  notion: Client,
  databaseId: string
): Promise<string> {
  const notionClient = notion as unknown as {
    databases?: {
      retrieve?: (args: { database_id: string }) => Promise<{
        id?: string;
        data_sources?: Array<{ id: string }>;
      }>;
    };
  };

  const database = await notionClient.databases?.retrieve?.({
    database_id: databaseId,
  });

  return database?.data_sources?.[0]?.id ?? databaseId;
}

async function fetchAllPages(notion: Client, databaseId: string): Promise<NotionPageLike[]> {
  const pages: NotionPageLike[] = [];
  let startCursor: string | undefined;

  const notionClient = notion as unknown as {
    dataSources?: {
      query?: (args: {
        data_source_id: string;
        start_cursor?: string;
        page_size?: number;
      }) => Promise<{
        results: unknown[];
        has_more: boolean;
        next_cursor: string | null;
      }>;
    };
    databases?: {
      query?: (args: {
        database_id: string;
        start_cursor?: string;
        page_size?: number;
      }) => Promise<{
        results: unknown[];
        has_more: boolean;
        next_cursor: string | null;
      }>;
    };
  };

  const dataSourceId = await resolveDataSourceId(notion, databaseId);

  do {
    const response = notionClient.dataSources?.query
      ? await notionClient.dataSources.query({
          data_source_id: dataSourceId,
          start_cursor: startCursor,
          page_size: 100,
        })
      : await notionClient.databases?.query?.({
          database_id: databaseId,
          start_cursor: startCursor,
          page_size: 100,
        });

    if (!response) {
      throw new Error("Notion query API is not available for Risk approval fields.");
    }

    pages.push(...(response.results as NotionPageLike[]));
    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  return pages;
}


function getAllPlainTextsFromProperty(property: any): string[] {
  if (!property) return [];

  const value = getPlainText(property);
  return value ? [value] : [];
}

function collectPageApprovalMatchKeys(page: NotionPageLike): string[] {
  const properties = page.properties ?? {};
  const keys = new Set<string>();

  keys.add(normalizeNotionPageId(page.id));
  keys.add(normalizeApprovalMatchKey(page.id));

  const preferredPropertyNames = [
    "No",
    "No.",
    "번호",
    "관리번호",
    "assessmentNo",
    "assessmentNumber",
    "riskItemId",
    "Risk Item ID",
    "제목",
    "이름",
    "Name",
    "작업명",
    "공정",
    "세부공정",
    "유해위험요인",
    "유해·위험요인",
    "위험요인",
    "hazard",
    "memo",
    "메모",
  ];

  for (const propertyName of preferredPropertyNames) {
    const property = properties[propertyName];
    for (const text of getAllPlainTextsFromProperty(property)) {
      const normalized = normalizeApprovalMatchKey(text);
      if (normalized.length >= 2) {
        keys.add(normalized);
      }
    }
  }

  for (const [propertyName, property] of Object.entries(properties)) {
    const lowerName = propertyName.toLowerCase();
    const isLikelyIdentityField =
      lowerName.includes("no") ||
      propertyName.includes("번호") ||
      propertyName.includes("제목") ||
      propertyName.includes("이름") ||
      propertyName.includes("작업") ||
      propertyName.includes("공정") ||
      propertyName.includes("위험") ||
      propertyName.includes("요인");

    if (!isLikelyIdentityField) continue;

    for (const text of getAllPlainTextsFromProperty(property)) {
      const normalized = normalizeApprovalMatchKey(text);
      if (normalized.length >= 2) {
        keys.add(normalized);
      }
    }
  }

  return [...keys].filter(Boolean);
}

function collectRiskItemApprovalMatchKeys(item: RiskItemWithId): string[] {
  const keys = new Set<string>();

  const preferredItemFields = [
    "id",
    "riskItemId",
    "no",
    "No",
    "number",
    "managementNo",
    "assessmentNo",
    "assessmentNumber",
    "title",
    "name",
    "workName",
    "taskName",
    "processName",
    "subProcessName",
    "hazard",
    "hazardName",
    "riskFactor",
    "riskName",
    "memo",
  ];

  for (const fieldName of preferredItemFields) {
    const value = item[fieldName];
    if (typeof value === "string" || typeof value === "number") {
      const normalized = normalizeApprovalMatchKey(value);
      if (normalized.length >= 2) {
        keys.add(normalized);
      }
    }
  }

  for (const [fieldName, value] of Object.entries(item)) {
    if (!(typeof value === "string" || typeof value === "number")) continue;

    const lowerName = fieldName.toLowerCase();
    const isLikelyIdentityField =
      lowerName.includes("id") ||
      lowerName.includes("no") ||
      lowerName.includes("number") ||
      lowerName.includes("title") ||
      lowerName.includes("name") ||
      lowerName.includes("process") ||
      lowerName.includes("hazard") ||
      lowerName.includes("risk") ||
      fieldName.includes("번호") ||
      fieldName.includes("제목") ||
      fieldName.includes("이름") ||
      fieldName.includes("작업") ||
      fieldName.includes("공정") ||
      fieldName.includes("위험") ||
      fieldName.includes("요인");

    if (!isLikelyIdentityField) continue;

    const normalized = normalizeApprovalMatchKey(value);
    if (normalized.length >= 2) {
      keys.add(normalized);
    }
  }

  return [...keys].filter(Boolean);
}



function normalizeApprovalMatchKey(value?: unknown): string {
  return String(value ?? "")
    .replace(/-/g, "")
    .replace(/[—–]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function isUsefulApprovalMatchKey(value?: unknown): boolean {
  const key = normalizeApprovalMatchKey(value);

  if (key.length < 2) return false;

  const genericKeys = new Set([
    "상",
    "중",
    "하",
    "정기",
    "수시",
    "최초",
    "상시",
    "단기",
    "중기",
    "장기",
    "완료",
    "미완료",
    "미착수",
    "진행중",
    "승인대기",
    "승인완료",
    "반영완료",
    "미반영",
    "보완요청",
    "반려",
    "필요",
    "있음",
    "없음",
  ]);

  if (genericKeys.has(key)) return false;

  // 날짜 단독값은 매칭키로 쓰지 않음
  if (/^\d{4}\d{2}\d{2}$/.test(key)) return false;

  return true;
}

function getPropertyTextCandidates(property: any): string[] {
  const text = getPlainText(property);
  return text ? [text] : [];
}

function collectApprovalPageMatchKeys(page: NotionPageLike): string[] {
  const properties = page.properties ?? {};
  const keys = new Set<string>();

  keys.add(normalizeNotionPageId(page.id));
  keys.add(normalizeApprovalMatchKey(page.id));

  for (const [, property] of Object.entries(properties)) {
    for (const text of getPropertyTextCandidates(property)) {
      if (isUsefulApprovalMatchKey(text)) {
        keys.add(normalizeApprovalMatchKey(text));
      }
    }
  }

  return [...keys].filter(Boolean);
}

function collectApprovalPageSearchText(page: NotionPageLike): string {
  const properties = page.properties ?? {};
  const parts: string[] = [page.id];

  for (const [propertyName, property] of Object.entries(properties)) {
    parts.push(propertyName);

    for (const text of getPropertyTextCandidates(property)) {
      parts.push(text);
    }
  }

  return normalizeApprovalMatchKey(parts.join(" "));
}

function collectApprovalItemMatchKeys(item: RiskItemWithId): string[] {
  const keys = new Set<string>();

  for (const [, value] of Object.entries(item)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      if (isUsefulApprovalMatchKey(value)) {
        keys.add(normalizeApprovalMatchKey(value));
      }
    }
  }

  return [...keys].filter(Boolean);
}

function collectApprovalItemSearchText(item: RiskItemWithId): string {
  const parts: string[] = [];

  for (const [fieldName, value] of Object.entries(item)) {
    parts.push(fieldName);

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      parts.push(String(value));
    }
  }

  return normalizeApprovalMatchKey(parts.join(" "));
}

function findApprovalFieldsByTextFallback(
  item: RiskItemWithId,
  entries: Array<{
    pageId: string;
    keys: string[];
    searchText: string;
    fields: RiskApprovalFields;
  }>
): RiskApprovalFields | undefined {
  const itemText = collectApprovalItemSearchText(item);
  const itemKeys = collectApprovalItemMatchKeys(item).filter((key) => key.length >= 4);

  return entries.find((entry) =>
    itemKeys.some((key) => entry.searchText.includes(key) || itemText.includes(key))
  )?.fields;
}


function extractApprovalFields(page: NotionPageLike): RiskApprovalFields {
  const properties = page.properties ?? {};
  const readback = readRiskApprovalReadbackFromPage(page);

  return {
    approvalStatus:
      readback.approvalStatus || getPlainText(properties["반영 승인상태"]),
    approvalBy:
      readback.approvalReviewer || getPlainText(properties["반영 승인자"]),
    approvalDate:
      readback.approvalApprovedAt || getPlainText(properties["반영 승인일"]),
    approvalMemo:
      readback.approvalMemo || getPlainText(properties["반영 승인 메모"]),
    riskDbReflectionStatus:
      readback.riskDbReflectionStatus || getPlainText(properties["Risk DB 반영상태"]),
    postActionReflection:
      readback.postActionReflection || getPlainText(properties["조치 후 반영내용"]),
    actionReflectionType:
      readback.actionReflectionType || getPlainText(properties["조치 반영유형"]),
    actionReflectionDate:
      readback.actionReflectionDate || getPlainText(properties["조치 반영일"]),
    actionReflectionEvidence:
      readback.actionReflectionEvidence || getPlainText(properties["조치 반영 근거"]),
  };
}

export async function attachRiskApprovalFieldsToItems<T extends RiskItemWithId>(
  items: T[],
  options: AttachRiskApprovalFieldsOptions
): Promise<Array<T & RiskApprovalFields>> {
  const { riskDatabaseId, notionApiKey } = options;

  if (!riskDatabaseId || !notionApiKey || items.length === 0) {
    return items.map((item) => ({
      ...item,
    }));
  }

  try {
    const notion = new Client({ auth: notionApiKey });
    const pages = await fetchAllPages(notion, riskDatabaseId);

    const approvalMap = new Map<string, RiskApprovalFields>();
    const approvalEntries: Array<{
      pageId: string;
      keys: string[];
      searchText: string;
      fields: RiskApprovalFields;
    }> = [];

    for (const page of pages) {
      const fields = extractApprovalFields(page);
      const keys = collectApprovalPageMatchKeys(page);

      approvalEntries.push({
        pageId: page.id,
        keys,
        searchText: collectApprovalPageSearchText(page),
        fields,
      });

      for (const key of keys) {
        approvalMap.set(key, fields);
      }
    }

    return items.map((item) => {
      const itemKeys = collectApprovalItemMatchKeys(item);

      const fields =
        itemKeys
          .map((key) => approvalMap.get(key))
          .find((matchedFields): matchedFields is RiskApprovalFields => Boolean(matchedFields)) ??
        findApprovalFieldsByTextFallback(item, approvalEntries) ??
        {};

      return {
        ...item,
        ...fields,
      };
    });
  } catch (error) {
    console.error("[SafeMetrica] Failed to attach Risk approval fields", error);

    return items.map((item) => ({
      ...item,
    }));
  }
}
