import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const STATUS_OPTIONS = new Set(["접수", "검토중", "조치필요", "조치완료", "반려"]);

const STATUS_PROPERTY_ALIASES = ["처리상태", "처리상태_기존", "처리 상태", "상태"];
const MEMO_PROPERTY_ALIASES = ["조치 메모", "처리 메모", "관리자 메모", "검토 메모", "조치내용", "조치 내용"];
const ACTION_AUTHOR_PROPERTY_ALIASES = ["조치 메모 작성자", "조치메모 작성자", "처리자", "검토자", "관리자"];
const ACTION_CREATED_AT_PROPERTY_ALIASES = ["조치 메모 작성일시", "조치메모 작성일시", "처리일시", "검토일시"];
const ACTION_UPDATED_AT_PROPERTY_ALIASES = ["최종 조치 변경일시", "최종조치변경일시", "처리상태 변경일시", "최종 처리일시"];
const ACTION_HISTORY_PROPERTY_ALIASES = ["조치 이력", "처리 이력", "관리자 조치 이력", "검토 이력"];

type NotionPropertyMeta = {
  type?: string;
  rich_text?: Array<{ plain_text?: string }>;
  title?: Array<{ plain_text?: string }>;
  select?: { name?: string | null } | null;
  status?: { name?: string | null } | null;
  date?: { start?: string | null } | null;
};

type NotionPageResponse = {
  properties?: Record<string, NotionPropertyMeta>;
};

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function redirectTo(req: NextRequest, params?: Record<string, string>) {
  const url = new URL("/field/voice", req.url);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url);
}

function normalizePropertyKey(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function pickPropertyName(
  properties: Record<string, NotionPropertyMeta>,
  aliases: string[]
) {
  const exactMatch = aliases.find((name) => Boolean(properties[name]));

  if (exactMatch) {
    return exactMatch;
  }

  const compactAliases = aliases.map(normalizePropertyKey);

  return Object.keys(properties).find((name) =>
    compactAliases.includes(normalizePropertyKey(name))
  );
}

function buildStatusProperty(propertyType: string | undefined, status: string) {
  if (propertyType === "status") {
    return { status: { name: status } };
  }

  return { select: { name: status } };
}

function buildRichTextProperty(value: string) {
  return {
    rich_text: [
      {
        text: {
          content: value.slice(0, 1900),
        },
      },
    ],
  };
}

function buildDateProperty(value: string) {
  return {
    date: {
      start: value,
    },
  };
}

function getPlainText(prop: NotionPropertyMeta | undefined) {
  if (!prop) return "";

  if (prop.type === "rich_text") {
    return prop.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  if (prop.type === "title") {
    return prop.title?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  if (prop.type === "select") {
    return prop.select?.name?.trim() ?? "";
  }

  if (prop.type === "status") {
    return prop.status?.name?.trim() ?? "";
  }

  if (prop.type === "date") {
    return prop.date?.start?.trim() ?? "";
  }

  return "";
}

function formatKstDateTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildHistoryLine(params: {
  status: string;
  memo: string;
  author: string;
  date: Date;
}) {
  const memoText = params.memo || "메모 없음";
  return `[${formatKstDateTime(params.date)}] ${params.status} / ${params.author}: ${memoText}`;
}

async function retrievePage(notionApiKey: string, pageId: string): Promise<NotionPageResponse> {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`FIELD_VOICE_PAGE_RETRIEVE_FAILED:${response.status}`);
  }

  return (await response.json()) as NotionPageResponse;
}

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    return redirectTo(req, { error: "missing_notion_key" });
  }

  const formData = await req.formData();
  const pageId = getFormString(formData, "pageId");
  const status = getFormString(formData, "status");
  const memo = getFormString(formData, "memo");
  const actionAuthor = getFormString(formData, "actionAuthor") || "SafeMetrica 관리자";
  const now = new Date();
  const nowIso = now.toISOString();

  if (!pageId || !status || !STATUS_OPTIONS.has(status)) {
    return redirectTo(req, { error: "invalid_request" });
  }

  try {
    const page = await retrievePage(notionApiKey, pageId);
    const pageProperties = page.properties ?? {};

    const statusPropertyName =
      pickPropertyName(pageProperties, STATUS_PROPERTY_ALIASES) ?? "처리상태";
    const statusPropertyType = pageProperties[statusPropertyName]?.type;

    const properties: Record<string, unknown> = {
      [statusPropertyName]: buildStatusProperty(statusPropertyType, status),
    };

    const memoPropertyName = pickPropertyName(pageProperties, MEMO_PROPERTY_ALIASES);
    const memoPropertyType = memoPropertyName
      ? pageProperties[memoPropertyName]?.type
      : undefined;

    if (memo && memoPropertyName && memoPropertyType === "rich_text") {
      properties[memoPropertyName] = buildRichTextProperty(memo);
    }

    const authorPropertyName = pickPropertyName(pageProperties, ACTION_AUTHOR_PROPERTY_ALIASES);
    const authorPropertyType = authorPropertyName
      ? pageProperties[authorPropertyName]?.type
      : undefined;

    if (authorPropertyName && authorPropertyType === "rich_text") {
      properties[authorPropertyName] = buildRichTextProperty(actionAuthor);
    }

    const createdAtPropertyName = pickPropertyName(pageProperties, ACTION_CREATED_AT_PROPERTY_ALIASES);
    const createdAtPropertyType = createdAtPropertyName
      ? pageProperties[createdAtPropertyName]?.type
      : undefined;

    if (createdAtPropertyName && createdAtPropertyType === "date") {
      const currentCreatedAtValue = getPlainText(pageProperties[createdAtPropertyName]);
      if (!currentCreatedAtValue) {
        properties[createdAtPropertyName] = buildDateProperty(nowIso);
      }
    }

    const updatedAtPropertyName = pickPropertyName(pageProperties, ACTION_UPDATED_AT_PROPERTY_ALIASES);
    const updatedAtPropertyType = updatedAtPropertyName
      ? pageProperties[updatedAtPropertyName]?.type
      : undefined;

    if (updatedAtPropertyName && updatedAtPropertyType === "date") {
      properties[updatedAtPropertyName] = buildDateProperty(nowIso);
    }

    const historyPropertyName = pickPropertyName(pageProperties, ACTION_HISTORY_PROPERTY_ALIASES);
    const historyPropertyType = historyPropertyName
      ? pageProperties[historyPropertyName]?.type
      : undefined;

    if (historyPropertyName && historyPropertyType === "rich_text") {
      const previousHistory = getPlainText(pageProperties[historyPropertyName]);
      const nextHistoryLine = buildHistoryLine({
        status,
        memo,
        author: actionAuthor,
        date: now,
      });
      const nextHistory = [previousHistory, nextHistoryLine].filter(Boolean).join("\n");
      properties[historyPropertyName] = buildRichTextProperty(nextHistory);
    }

    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties }),
      cache: "no-store",
    });

    if (!updateResponse.ok) {
      throw new Error(`FIELD_VOICE_STATUS_UPDATE_FAILED:${updateResponse.status}`);
    }

    revalidatePath("/field/voice");
    return redirectTo(req, { updated: status });
  } catch (error) {
    console.error(error);
    return redirectTo(req, { error: "status_update_failed" });
  }
}
