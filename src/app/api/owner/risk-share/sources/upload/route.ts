import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { uploadRiskShareSource } from "@/lib/risk-share/riskShareSourceUpload";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function buildRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/owner/risk-share/sources", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, { error: "owner_required" });
  }

  const oidcToken = request.headers.get("x-vercel-oidc-token")?.trim() ?? "";

  const formData = await request.formData();

  const companyCodeInput = readText(formData, "company_code", 80);
  const sourceTitle = readText(formData, "source_title", 200);
  const siteName = readText(formData, "site_name", 160);
  const sourceDocumentDate = readText(formData, "source_document_date", 10);
  const sourceFile = formData.get("source_file");

  const result = await uploadRiskShareSource({
    companyCode: companyCodeInput,
    sourceTitle,
    siteName,
    sourceDocumentDate,
    sourceFile,
    oidcToken,
    uploadedBy: "owner_console",
  });

  if (!result.ok) {
    if (result.reason === "duplicate_source") {
      return buildRedirect(request, {
        companyCode: companyCodeInput,
        upload: "duplicate",
      });
    }

    return buildRedirect(request, {
      actionError: result.reason,
      companyCode: companyCodeInput,
    });
  }

  return buildRedirect(request, {
    companyCode: result.companyCode,
    upload: "created",
  });
}
