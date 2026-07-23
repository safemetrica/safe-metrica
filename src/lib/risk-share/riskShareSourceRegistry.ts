import "server-only";

import { applyRiskShareDefaultSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

const KNOWN_STATUS_VALUES = new Set(["pending", "processing", "completed", "failed"]);

export type RiskShareSourceRegistryEntry = {
  id: string;
  companyCode: string;
  sourceTitle: string;
  siteName: string | null;
  sourceType: string | null;
  fileName: string | null;
  fileSize: number | null;
  sourceDocumentDate: string | null;
  rawTextStatus: string;
  extractionStatus: string;
  reviewStatus: string;
  uploadedBy: string | null;
  uploadedAt: string | null;
};

type RiskShareSourceRegistryRow = {
  id?: unknown;
  company_code?: unknown;
  source_title?: unknown;
  site_name?: unknown;
  source_type?: unknown;
  file_name?: unknown;
  file_size?: unknown;
  source_document_date?: unknown;
  raw_text_status?: unknown;
  extraction_status?: unknown;
  review_status?: unknown;
  uploaded_by?: unknown;
  uploaded_at?: unknown;
};

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();
  return COMPANY_CODE_PATTERN.test(value) ? value : null;
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown): string | null {
  const text = readTrimmedString(value);
  return text || null;
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStatus(value: unknown): string {
  const text = readTrimmedString(value).toLowerCase();
  return KNOWN_STATUS_VALUES.has(text) ? text : "unknown";
}

function toRegistryEntry(row: RiskShareSourceRegistryRow): RiskShareSourceRegistryEntry | null {
  const id = readTrimmedString(row.id);

  if (!id) {
    return null;
  }

  const companyCode = readTrimmedString(row.company_code);
  const sourceTitle = readTrimmedString(row.source_title);

  return {
    id,
    companyCode,
    sourceTitle,
    siteName: readNullableString(row.site_name),
    sourceType: readNullableString(row.source_type),
    fileName: readNullableString(row.file_name),
    fileSize: readNullableNumber(row.file_size),
    sourceDocumentDate: readNullableString(row.source_document_date),
    rawTextStatus: normalizeStatus(row.raw_text_status),
    extractionStatus: normalizeStatus(row.extraction_status),
    reviewStatus: normalizeStatus(row.review_status),
    uploadedBy: readNullableString(row.uploaded_by),
    uploadedAt: readNullableString(row.uploaded_at),
  };
}

async function listRiskShareSourcesByCompanyCode(
  rawCompanyCode: string,
  options?: { limit?: number; siteId?: string },
): Promise<RiskShareSourceRegistryEntry[]> {
  const companyCode = normalizeStrictCompanyCode(rawCompanyCode);

  if (!companyCode) {
    return [];
  }

  const requestedLimit = options?.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

  const query = new URLSearchParams({
    select:
      "id,company_code,source_title,site_name,source_type,file_name,file_size,source_document_date,raw_text_status,extraction_status,review_status,uploaded_by,uploaded_at",
    company_code: `eq.${companyCode}`,
    order: "uploaded_at.desc",
    limit: String(limit),
  });

  if (options?.siteId) {
    applyRiskShareDefaultSiteScope(query, options.siteId);
  }

  const rows = await selectSupabaseExportRows<RiskShareSourceRegistryRow>("risk_share_sources", query);

  return rows
    .map(toRegistryEntry)
    .filter((entry): entry is RiskShareSourceRegistryEntry => entry !== null);
}

export async function listRiskShareSourcesForOwner(
  rawCompanyCode: string,
  options?: { limit?: number },
): Promise<RiskShareSourceRegistryEntry[]> {
  return listRiskShareSourcesByCompanyCode(rawCompanyCode, options);
}

export async function listRiskShareSourcesForTenant(
  rawCompanyCode: string,
  siteId: string,
  options?: { limit?: number },
): Promise<RiskShareSourceRegistryEntry[]> {
  if (!UUID_PATTERN.test(siteId)) {
    return [];
  }

  return listRiskShareSourcesByCompanyCode(rawCompanyCode, {
    ...options,
    siteId,
  });
}
