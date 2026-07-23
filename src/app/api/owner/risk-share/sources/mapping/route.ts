import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { readRiskShareSourcePrivateDescriptorForTenant } from "@/lib/risk-share/riskShareSourcePrivateRead";
import {
  readRiskShareSourceColumnMappingSourceState,
  validateRiskShareSourceColumnMappingEntries,
  saveRiskShareSourceColumnMappingVersion,
  RISK_SHARE_SOURCE_CANONICAL_FIELDS,
  type RiskShareSourceCanonicalField,
  type RiskShareSourceColumnMappingEntry,
} from "@/lib/risk-share/riskShareSourceColumnMapping";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

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

function parseNonNegativeInt(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isCanonicalFieldValue(value: string): value is RiskShareSourceCanonicalField {
  return (RISK_SHARE_SOURCE_CANONICAL_FIELDS as readonly string[]).includes(value);
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
  const sheetIndex = parseNonNegativeInt(readText(formData, "sheetIndex", 10)) ?? 0;
  const submittedHeaderRowIndex = parseNonNegativeInt(readText(formData, "headerRowIndex", 10)) ?? 0;
  const expectedHeaderSignature = readText(formData, "expectedHeaderSignature", 64);
  const saveIntentRaw = readText(formData, "saveIntent", 20);

  const fallback = { companyCode, sourceId, sheet: sheetIndex, headerRow: submittedHeaderRowIndex };

  const tenant = await getTenantRegistryConfigByCode(companyCode).catch(() => null);
  const siteScope = tenant
    ? await resolveRiskShareCanonicalSiteScopeForTenant(
        tenant.code,
        tenant.defaultSiteId,
      ).catch(() => ({ ok: false as const }))
    : { ok: false as const };

  if (!tenant || !siteScope.ok) {
    return buildRedirect(request, fallback, {
      actionError: "site_scope_unavailable",
    });
  }

  if (saveIntentRaw !== "draft" && saveIntentRaw !== "confirm") {
    return buildRedirect(request, fallback, { actionError: "invalid_intent" });
  }

  const descriptorResult = await readRiskShareSourcePrivateDescriptorForTenant(
    tenant.code,
    sourceId,
    siteScope.siteId,
  );

  if (!descriptorResult.ok) {
    return buildRedirect(request, fallback, { actionError: "access_denied" });
  }

  const sourceStateResult = await readRiskShareSourceColumnMappingSourceState({
    descriptor: descriptorResult.descriptor,
    oidcToken,
    sheetIndex,
    requestedHeaderRowIndex: submittedHeaderRowIndex,
  });

  if (!sourceStateResult.ok) {
    return buildRedirect(request, fallback, { actionError: "access_denied" });
  }

  const { selectedSheetIndex, headerRowIndex, headerCells, headerSignature } = sourceStateResult;
  const resolved = { companyCode, sourceId, sheet: selectedSheetIndex, headerRow: headerRowIndex };

  if (headerSignature !== expectedHeaderSignature) {
    return buildRedirect(request, resolved, { actionError: "header_changed" });
  }

  const entries: RiskShareSourceColumnMappingEntry[] = headerCells.map((header, index) => {
    const rawField = readText(formData, `mapping_field_${index}`, 40);
    const standardField = rawField && isCanonicalFieldValue(rawField) ? rawField : null;

    return { sourceColumnIndex: index, sourceHeader: header, standardField };
  });

  const validation = validateRiskShareSourceColumnMappingEntries(entries, headerCells);

  if (!validation.ok) {
    return buildRedirect(request, resolved, { actionError: validation.reason });
  }

  const saveResult = await saveRiskShareSourceColumnMappingVersion({
    companyCode: tenant.code,
    sourceId,
    sheetIndex: selectedSheetIndex,
    headerRowIndex,
    status: saveIntentRaw === "confirm" ? "confirmed" : "draft",
    headerSignature,
    sourceColumnCount: headerCells.length,
    mappings: entries,
    createdByRole: "owner_console",
  });

  if (!saveResult.ok) {
    return buildRedirect(request, resolved, {
      actionError: saveResult.reason === "source_not_found" ? "access_denied" : "save_failed",
    });
  }

  return buildRedirect(request, resolved, {
    saved: saveIntentRaw === "confirm" ? "confirmed" : "draft",
    version: String(saveResult.mappingVersion),
  });
}
