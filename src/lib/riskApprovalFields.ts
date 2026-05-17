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

    for (const page of pages) {
      approvalMap.set(normalizeNotionPageId(page.id), extractApprovalFields(page));
    }

    return items.map((item) => {
      const riskId = item.riskItemId ?? item.id ?? "";
      const fields = approvalMap.get(normalizeNotionPageId(riskId)) ?? {};

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
