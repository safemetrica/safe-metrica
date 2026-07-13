import { NextRequest, NextResponse } from "next/server";

import { readRiskShareSourcePrivateDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";
import {
  readRiskShareSourceColumnMappingSourceState,
  validateRiskShareSourceColumnMappingEntries,
  saveRiskShareSourceColumnMappingVersion,
  RISK_SHARE_SOURCE_CANONICAL_FIELDS,
  type RiskShareSourceCanonicalField,
  type RiskShareSourceColumnMappingEntry,
} from "@/lib/risk-share/riskShareSourceColumnMapping";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  rawCompanyCode: string,
  lang: ReturnType<typeof getRiskShareLocale>,
  params: { sourceId: string; sheet: number; headerRow: number },
  extra: Record<string, string>,
) {
  const href = buildRiskShareLangHref(
    "/risk-share/manager/sources/mapping",
    { company: rawCompanyCode, sourceId: params.sourceId, sheet: String(params.sheet), headerRow: String(params.headerRow) },
    lang,
  );
  const url = new URL(href, request.url);

  Object.entries(extra).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const rawCompanyCode = request.nextUrl.searchParams.get("company") ?? "";
  const lang = getRiskShareLocale(request.nextUrl.searchParams.get("lang"));

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    const href = buildRiskShareLangHref("/risk-share/manager/sources", { company: rawCompanyCode }, lang);
    return NextResponse.redirect(new URL(`${href}&actionError=tenant_not_found`, request.url), { status: 303 });
  }

  const tenantCode = tenantResolution.tenant.code;

  const tenantAccessResult = await requireTenantAccessForCurrentSession({
    tenantCode,
    allowedRoles: ["tenant_admin", "tenant_manager"],
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      const sourcesHref = buildRiskShareLangHref("/risk-share/manager/sources", { company: tenantCode }, lang);
      const loginUrl = new URL(`/login?callbackUrl=${encodeURIComponent(sourcesHref)}`, request.url);
      return NextResponse.redirect(loginUrl, { status: 303 });
    }

    const href = buildRiskShareLangHref("/risk-share/manager/sources", { company: tenantCode }, lang);
    return NextResponse.redirect(new URL(`${href}&actionError=access_denied`, request.url), { status: 303 });
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    const href = buildRiskShareLangHref("/risk-share/manager/sources", { company: tenantCode }, lang);
    return NextResponse.redirect(new URL(`${href}&actionError=access_denied`, request.url), { status: 303 });
  }

  const oidcToken = request.headers.get("x-vercel-oidc-token")?.trim() ?? "";

  const formData = await request.formData();

  const sourceId = readText(formData, "sourceId", 80);
  const sheetIndex = parseNonNegativeInt(readText(formData, "sheetIndex", 10)) ?? 0;
  const submittedHeaderRowIndex = parseNonNegativeInt(readText(formData, "headerRowIndex", 10)) ?? 0;
  const expectedHeaderSignature = readText(formData, "expectedHeaderSignature", 64);
  const saveIntentRaw = readText(formData, "saveIntent", 20);

  const fallback = { sourceId, sheet: sheetIndex, headerRow: submittedHeaderRowIndex };

  if (saveIntentRaw !== "draft" && saveIntentRaw !== "confirm") {
    return buildRedirect(request, selectedTenantCode, lang, fallback, { actionError: "invalid_intent" });
  }

  const descriptorResult = await readRiskShareSourcePrivateDescriptor(selectedTenantCode, sourceId);

  if (!descriptorResult.ok) {
    return buildRedirect(request, selectedTenantCode, lang, fallback, { actionError: "access_denied" });
  }

  const sourceStateResult = await readRiskShareSourceColumnMappingSourceState({
    descriptor: descriptorResult.descriptor,
    oidcToken,
    sheetIndex,
    requestedHeaderRowIndex: submittedHeaderRowIndex,
  });

  if (!sourceStateResult.ok) {
    return buildRedirect(request, selectedTenantCode, lang, fallback, { actionError: "access_denied" });
  }

  const { selectedSheetIndex, headerRowIndex, headerCells, headerSignature } = sourceStateResult;
  const resolved = { sourceId, sheet: selectedSheetIndex, headerRow: headerRowIndex };

  if (headerSignature !== expectedHeaderSignature) {
    return buildRedirect(request, selectedTenantCode, lang, resolved, { actionError: "header_changed" });
  }

  const entries: RiskShareSourceColumnMappingEntry[] = headerCells.map((header, index) => {
    const rawField = readText(formData, `mapping_field_${index}`, 40);
    const standardField = rawField && isCanonicalFieldValue(rawField) ? rawField : null;

    return { sourceColumnIndex: index, sourceHeader: header, standardField };
  });

  const validation = validateRiskShareSourceColumnMappingEntries(entries, headerCells);

  if (!validation.ok) {
    return buildRedirect(request, selectedTenantCode, lang, resolved, { actionError: validation.reason });
  }

  if (role !== "tenant_admin" && role !== "tenant_manager") {
    return buildRedirect(request, selectedTenantCode, lang, resolved, { actionError: "access_denied" });
  }

  const saveResult = await saveRiskShareSourceColumnMappingVersion({
    companyCode: selectedTenantCode,
    sourceId,
    sheetIndex: selectedSheetIndex,
    headerRowIndex,
    status: saveIntentRaw === "confirm" ? "confirmed" : "draft",
    headerSignature,
    sourceColumnCount: headerCells.length,
    mappings: entries,
    createdByRole: role,
  });

  if (!saveResult.ok) {
    return buildRedirect(request, selectedTenantCode, lang, resolved, {
      actionError: saveResult.reason === "source_not_found" ? "access_denied" : "save_failed",
    });
  }

  return buildRedirect(request, selectedTenantCode, lang, resolved, {
    saved: saveIntentRaw === "confirm" ? "confirmed" : "draft",
    version: String(saveResult.mappingVersion),
  });
}
