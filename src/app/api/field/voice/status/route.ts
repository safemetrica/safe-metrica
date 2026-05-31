import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const STATUS_OPTIONS = new Set(["접수", "검토중", "조치필요", "조치완료", "반려"]);

const STATUS_PROPERTY_ALIASES = ["처리상태", "처리상태_기존", "처리 상태", "상태"];
const MEMO_PROPERTY_ALIASES = ["조치 메모", "처리 메모", "관리자 메모", "검토 메모", "조치내용", "조치 내용"];

type NotionPropertyMeta = {
  type?: string;
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

function pickPropertyName(
  properties: Record<string, NotionPropertyMeta>,
  aliases: string[]
) {
  return aliases.find((name) => Boolean(properties[name]));
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
          content: value,
        },
      },
    ],
  };
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
