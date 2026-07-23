import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { applyRiskShareDefaultSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";
import {
  getTenantRegistryConfigByCode,
  insertRiskShareItemCandidateRecord,
  selectSupabaseExportRows,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RiskShareSourceRow = {
  id?: string;
  company_code?: string;
  company_name?: string;
  source_title?: string;
  review_status?: string;
  extraction_status?: string;
  site_id?: string | null;
};

type RiskShareCandidateCategory =
  | "common"
  | "non_common"
  | "site_specific"
  | "worker_signal"
  | "other";

const CATEGORIES = new Set<RiskShareCandidateCategory>([
  "common",
  "non_common",
  "site_specific",
  "worker_signal",
  "other",
]);

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readOptionalNumber(formData: FormData, key: string) {
  const text = readText(formData, key, 20);

  if (!text) {
    return null;
  }

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function buildRedirect(request: NextRequest, path: string, params: Record<string, string>) {
  const url = new URL(path, request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return NextResponse.redirect(url);
}

async function findRiskShareSource(
  companyCode: string,
  sourceId: string,
  siteId: string,
) {
  const query = new URLSearchParams({
    select: "id,company_code,company_name,source_title,review_status,extraction_status,site_id",
    id: `eq.${sourceId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });
  applyRiskShareDefaultSiteScope(query, siteId);

  const rows = await selectSupabaseExportRows<RiskShareSourceRow>(
    "risk_share_sources",
    query,
  );
  const source = rows[0] ?? null;

  if (
    !source
    || source.id?.toLowerCase() !== sourceId.toLowerCase()
    || source.company_code?.toLowerCase() !== companyCode.toLowerCase()
    || (
      source.site_id !== null
      && source.site_id?.toLowerCase() !== siteId.toLowerCase()
    )
  ) {
    return null;
  }

  return source;
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, "/login", { error: "owner_required" });
  }

  const formData = await request.formData();

  const companyCode = normalizeCompanyCode(readText(formData, "companyCode", 80));
  const companyNameInput = readText(formData, "companyName", 120);
  const sourceId = readText(formData, "sourceId", 80);
  const taskName = readText(formData, "taskName", 200);
  const hazard = readText(formData, "hazard", 500);
  const categoryInput = readText(formData, "category", 40);
  const category = CATEGORIES.has(categoryInput as RiskShareCandidateCategory)
    ? (categoryInput as RiskShareCandidateCategory)
    : "other";

  const baseRedirectParams = {
    companyCode,
    companyName: companyNameInput,
    sourceId,
  };

  if (!companyCode || !isUuid(sourceId) || !taskName || !hazard) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates/new", {
      ...baseRedirectParams,
      error: "required_fields",
    });
  }

  const tenant = await getTenantRegistryConfigByCode(companyCode).catch(() => null);
  const siteScope = tenant
    ? await resolveRiskShareCanonicalSiteScopeForTenant(
        tenant.code,
        tenant.defaultSiteId,
      ).catch(() => ({ ok: false as const }))
    : { ok: false as const };

  if (!tenant || !siteScope.ok) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates/new", {
      ...baseRedirectParams,
      error: "site_scope_unavailable",
    });
  }

  let source: RiskShareSourceRow | null = null;

  try {
    source = await findRiskShareSource(tenant.code, sourceId, siteScope.siteId);
  } catch {
    return buildRedirect(request, "/owner/risk-share-activation/candidates/new", {
      ...baseRedirectParams,
      error: "source_lookup_failed",
    });
  }

  if (!source) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates/new", {
      ...baseRedirectParams,
      error: "source_not_found",
    });
  }

  const companyName = companyNameInput || source.company_name || null;

  const result = await insertRiskShareItemCandidateRecord({
    source_id: sourceId,
    company_code: tenant.code,
    company_name: companyName,
    site_name: readText(formData, "siteName", 160) || null,
    task_name: taskName,
    hazard,
    accident_type: readText(formData, "accidentType", 160) || null,
    risk_level: readText(formData, "riskLevel", 40) || null,
    current_controls: readText(formData, "currentControls", 800) || null,
    improvement_plan: readText(formData, "improvementPlan", 800) || null,
    worker_share_summary: readText(formData, "workerShareSummary", 800) || null,
    category,
    source_page: readOptionalNumber(formData, "sourcePage"),
    source_row: readText(formData, "sourceRow", 120) || null,
    confidence: null,
    ai_generated: false,
    reviewer_status: "pending",
    reviewer_note: readText(formData, "reviewerNote", 500) || null,
    worker_visible: formData.get("workerVisible") === "on",
    customer_confirmed: false,
    raw_payload: {
      source: "owner_manual_candidate_create_v1",
      sourceTitle: source.source_title ?? null,
      sourceReviewStatus: source.review_status ?? null,
      sourceExtractionStatus: source.extraction_status ?? null,
      createdBy: "owner",
      createdAt: new Date().toISOString(),
      caution:
        "Manual candidate. Requires Owner review, customer confirmation, and version lock before worker sharing.",
    },
  });

  if (!result.ok) {
    return buildRedirect(request, "/owner/risk-share-activation/candidates/new", {
      ...baseRedirectParams,
      error: "insert_failed",
    });
  }

  return buildRedirect(request, "/owner/risk-share-activation/candidates", {
    companyCode,
    status: "pending",
    created: "1",
  });
}
