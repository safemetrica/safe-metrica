import { NextRequest, NextResponse } from "next/server";

import { getCompanyConfig } from "@/lib/company";

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(req: NextRequest, pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, req.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    return redirectTo(req, "/login", { error: "tenant_required" });
  }

  if (company.code !== "bubblemon") {
    return redirectTo(req, "/home", { error: "invalid_principal_tenant" });
  }

  const formData = await req.formData();
  const submissionPageId = getFormText(formData, "submissionPageId");
  const reviewStatus = getFormText(formData, "reviewStatus");

  if (!submissionPageId || !["확인", "보완요청", "검토중"].includes(reviewStatus)) {
    return redirectTo(req, "/contractor-status", { review: "invalid" });
  }

  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    return redirectTo(req, "/contractor-status", { review: "missing_notion_api_key" });
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${submissionPageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        "원청검토상태": {
          select: {
            name: reviewStatus,
          },
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return redirectTo(req, "/contractor-status", {
      review: "notion_error",
      status: String(response.status),
      detail: text.slice(0, 80),
    });
  }

  return redirectTo(req, "/contractor-status", {
    review: "updated",
    result: reviewStatus,
    t: String(Date.now()),
  });
}
