import { NextRequest, NextResponse } from "next/server";

import { uploadRiskShareSource } from "@/lib/risk-share/riskShareSourceUpload";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { requireTenantAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function buildRedirect(
  request: NextRequest,
  rawCompanyCode: string,
  lang: ReturnType<typeof getRiskShareLocale>,
  params: Record<string, string>,
) {
  const href = buildRiskShareLangHref("/risk-share/manager/sources", { company: rawCompanyCode }, lang);
  const url = new URL(href, request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const rawCompanyCode = request.nextUrl.searchParams.get("company") ?? "";
  const lang = getRiskShareLocale(request.nextUrl.searchParams.get("lang"));

  const tenantResolution = await resolveActiveRiskSharePublicTenant(rawCompanyCode);

  if (!tenantResolution.ok) {
    return buildRedirect(request, rawCompanyCode, lang, { actionError: "tenant_not_found" });
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

    return buildRedirect(request, tenantCode, lang, { actionError: "access_denied" });
  }

  const selectedTenantCode = tenantAccessResult.context.selectedTenantCode;
  const role = tenantAccessResult.context.role;

  if (
    selectedTenantCode !== tenantCode ||
    (role !== "tenant_admin" && role !== "tenant_manager")
  ) {
    return buildRedirect(request, tenantCode, lang, { actionError: "access_denied" });
  }

  const siteScope = await resolveRiskShareCanonicalSiteScopeForTenant(
    selectedTenantCode,
    tenantResolution.tenant.defaultSiteId,
  ).catch(() => ({ ok: false as const }));

  if (!siteScope.ok) {
    return buildRedirect(request, selectedTenantCode, lang, {
      actionError: "site_scope_unavailable",
    });
  }

  const oidcToken = request.headers.get("x-vercel-oidc-token")?.trim() ?? "";

  const formData = await request.formData();

  const sourceTitle = readText(formData, "source_title", 200);
  const siteName = readText(formData, "site_name", 160);
  const sourceDocumentDate = readText(formData, "source_document_date", 10);
  const sourceFile = formData.get("source_file");

  const result = await uploadRiskShareSource({
    companyCode: selectedTenantCode,
    siteId: siteScope.siteId,
    sourceTitle,
    siteName,
    sourceDocumentDate,
    sourceFile,
    oidcToken,
    uploadedBy: role,
  });

  if (!result.ok) {
    if (result.reason === "site_scope_mismatch") {
      return buildRedirect(request, selectedTenantCode, lang, {
        actionError: "site_scope_unavailable",
      });
    }

    if (result.reason === "duplicate_source") {
      return buildRedirect(request, selectedTenantCode, lang, { upload: "duplicate" });
    }

    return buildRedirect(request, selectedTenantCode, lang, { actionError: result.reason });
  }

  return buildRedirect(request, result.companyCode, lang, { upload: "created" });
}
