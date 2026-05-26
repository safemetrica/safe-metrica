import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  TenantRequiredError,
  UnknownCompanyError,
  getCompanyConfig,
} from "@/lib/company";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = new Set(["접수", "검토중", "조치필요", "조치완료", "반려"]);

function normalizeNotionId(rawId: string) {
  return rawId.trim().replace(/^collection:\/\//, "").replace(/-/g, "");
}

function formatNotionUuid(rawId: string) {
  const normalized = normalizeNotionId(rawId);

  if (/^[0-9a-fA-F]{32}$/.test(normalized)) {
    return [
      normalized.slice(0, 8),
      normalized.slice(8, 12),
      normalized.slice(12, 16),
      normalized.slice(16, 20),
      normalized.slice(20),
    ].join("-");
  }

  return rawId.trim();
}

function redirectToFieldVoice(req: NextRequest, status: string) {
  const url = new URL("/field/voice", req.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const pageId = String(formData.get("pageId") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!pageId || !/^[0-9a-fA-F-]{32,36}$/.test(pageId)) {
    return redirectToFieldVoice(req, "invalid_page");
  }

  if (!STATUS_OPTIONS.has(nextStatus)) {
    return redirectToFieldVoice(req, "invalid_status");
  }

  let company;

  try {
    company = await getCompanyConfig();
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return redirectToFieldVoice(req, "tenant_required");
    }

    if (error instanceof UnknownCompanyError) {
      return redirectToFieldVoice(req, "unknown_company");
    }

    return redirectToFieldVoice(req, "company_error");
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${formatNotionUuid(pageId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${company.notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        처리상태: {
          select: {
            name: nextStatus,
          },
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[field-voice-status] Notion update failed", response.status, text);
    return redirectToFieldVoice(req, "update_failed");
  }

  revalidatePath("/field/voice");

  return redirectToFieldVoice(req, "updated");
}
