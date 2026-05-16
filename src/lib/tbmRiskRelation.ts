// src/lib/tbmRiskRelation.ts

import { Client } from "@notionhq/client";
import type { LinkedTbmLike } from "./tbmShareTracking";

export interface AttachLinkedTbmsOptions {
  tbmDatabaseId?: string;
  notionApiKey?: string;
}

type RiskItemWithId = {
  id?: string;
  riskItemId?: string;
};

type NotionPageLike = {
  id: string;
  created_time?: string;
  properties?: Record<string, any>;
};

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

  if (property.type === "checkbox") {
    return property.checkbox ? "완료" : "";
  }

  if (property.type === "people") {
    return (property.people ?? []).map((person: any) => person.name ?? "").join(", ");
  }

  if (property.type === "files") {
    return (property.files ?? []).map((file: any) => file.name ?? "").join(", ");
  }

  if (typeof property.name === "string") {
    return property.name;
  }

  return "";
}

function getFirstText(properties: Record<string, any>, names: string[]): string {
  for (const name of names) {
    const value = getPlainText(properties[name]);
    if (value) return value;
  }

  return "";
}

function getTitle(properties: Record<string, any>): string {
  for (const property of Object.values(properties)) {
    if (property?.type === "title") {
      const value = getPlainText(property);
      if (value) return value;
    }
  }

  return "";
}

function getRelationIds(properties: Record<string, any>, riskIdSet: Set<string>): string[] {
  const relationIds: string[] = [];

  for (const [name, property] of Object.entries(properties)) {
    if (property?.type !== "relation") continue;

    const nameLooksLikeRiskRelation =
      name.includes("Risk") ||
      name.includes("risk") ||
      name.includes("위험") ||
      name.includes("연결 Risk Item") ||
      name.includes("연결 Risk");

    const ids = (property.relation ?? [])
      .map((item: any) => item.id)
      .filter(Boolean);

    const hasKnownRiskId = ids.some((id: string) => riskIdSet.has(id));

    if (nameLooksLikeRiskRelation || hasKnownRiskId) {
      relationIds.push(...ids);
    }
  }

  return Array.from(new Set(relationIds));
}

async function fetchAllPages(notion: Client, databaseId: string): Promise<NotionPageLike[]> {
  const pages: NotionPageLike[] = [];
  let startCursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: startCursor,
      page_size: 100,
    });

    pages.push(...(response.results as NotionPageLike[]));
    startCursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (startCursor);

  return pages;
}

function toLinkedTbm(page: NotionPageLike): LinkedTbmLike {
  const properties = page.properties ?? {};
  const title = getTitle(properties);

  return {
    id: page.id,
    title,
    taskName: getFirstText(properties, ["작업명", "작업 이름", "작업", "작업 유형"]),
    workName: title,
    date: getFirstText(properties, ["날짜", "일자", "작성일"]),
    sharedDate: getFirstText(properties, ["공유일", "TBM 공유일", "날짜", "일자"]),
    createdTime: page.created_time,
    sharedBy: getFirstText(properties, [
      "실시자(현장총괄)",
      "실시자",
      "작성자",
      "공유자",
      "담당자",
    ]),
    sharedByRole: getFirstText(properties, ["공유자 역할", "역할", "직책"]),
    memo: getFirstText(properties, ["조치 상태", "조치상태", "메모", "비고"]),
    notes: getFirstText(properties, ["특이사항 내용", "특이사항", "내용"]),
    todayNote: getFirstText(properties, ["오늘의 주의사항", "주의사항", "오늘 주의사항"]),
    specialNote: getFirstText(properties, ["핵심 위험요인", "위험요인", "작업 태그"]),
    safetyNotice: getFirstText(properties, ["안전수칙", "안전 주의사항", "TBM 내용"]),
  };
}

export async function attachLinkedTbmsToRiskItems<T extends RiskItemWithId>(
  items: T[],
  options: AttachLinkedTbmsOptions
): Promise<Array<T & { linkedTbms: LinkedTbmLike[]; tbmLinked: boolean; tbmShared: boolean }>> {
  const { tbmDatabaseId, notionApiKey } = options;

  if (!tbmDatabaseId || !notionApiKey || items.length === 0) {
    return items.map((item) => ({
      ...item,
      linkedTbms: [],
      tbmLinked: false,
      tbmShared: false,
    }));
  }

  const riskIdSet = new Set(
    items
      .map((item) => item.riskItemId ?? item.id)
      .filter(Boolean) as string[]
  );

  try {
    const notion = new Client({ auth: notionApiKey });
    const tbmPages = await fetchAllPages(notion, tbmDatabaseId);

    const linkedMap = new Map<string, LinkedTbmLike[]>();

    for (const page of tbmPages) {
      const properties = page.properties ?? {};
      const relatedRiskIds = getRelationIds(properties, riskIdSet);

      if (relatedRiskIds.length === 0) continue;

      const linkedTbm = toLinkedTbm(page);

      for (const riskId of relatedRiskIds) {
        if (!riskIdSet.has(riskId)) continue;

        const current = linkedMap.get(riskId) ?? [];
        current.push(linkedTbm);
        linkedMap.set(riskId, current);
      }
    }

    return items.map((item) => {
      const riskId = item.riskItemId ?? item.id ?? "";
      const linkedTbms = linkedMap.get(riskId) ?? [];

      return {
        ...item,
        linkedTbms,
        tbmLinked: linkedTbms.length > 0,
        tbmShared: linkedTbms.length > 0,
      };
    });
  } catch (error) {
    console.error("[SafeMetrica] Failed to attach linked TBMs to risk items", error);

    return items.map((item) => ({
      ...item,
      linkedTbms: [],
      tbmLinked: false,
      tbmShared: false,
    }));
  }
}
