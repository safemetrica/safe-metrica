import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { importRiskShareCandidatesFromConfirmedSourceMapping } from "@/lib/risk-share/riskShareSourceCandidateImport";

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

function parseNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function buildRedirect(
  request: NextRequest,
  params: { companyCode: string; sourceId: string; sheet: number; headerRow: number },
  extra: Record<string, string>,
) {
  const url = new URL("/owner/risk-share/sources/mapping", request.url);
  url.searchParams.set("companyCode", params.companyCode);
  url.searchParams.set("sourceId", params.sourceId);
  url.searchParams.set("sheet", String(params.sheet));
  url.searchParams.set("headerRow", String(params.headerRow));

  Object.entries(extra).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return NextResponse.redirect(new URL("/login?error=owner_required", request.url), { status: 303 });
  }

  const oidcToken = request.headers.get("x-vercel-oidc-token")?.trim() ?? "";

  const formData = await request.formData();

  const companyCode = readText(formData, "companyCode", 80);
  const sourceId = readText(formData, "sourceId", 80);
  const sheetIndex = parseNonNegativeInt(readText(formData, "sheetIndex", 10));
  const headerRowIndex = parseNonNegativeInt(readText(formData, "headerRowIndex", 10));

  const fallback = { companyCode, sourceId, sheet: sheetIndex, headerRow: headerRowIndex };

  const importResult = await importRiskShareCandidatesFromConfirmedSourceMapping({
    companyCode,
    sourceId,
    oidcToken,
    sheetIndex,
    importActor: "owner_console",
  });

  if (!importResult.ok) {
    return buildRedirect(request, fallback, { actionError: importResult.reason });
  }

  return buildRedirect(request, fallback, {
    candidateImport: "success",
    inserted: String(importResult.insertedCount),
    duplicate: String(importResult.duplicateCount),
    invalid: String(importResult.invalidCount),
  });
}
