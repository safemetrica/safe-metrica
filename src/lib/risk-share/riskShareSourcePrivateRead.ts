import "server-only";

import { applyRiskShareDefaultSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

export type RiskShareSourcePrivateReadFailureReason =
  | "invalid_request"
  | "source_not_found"
  | "preview_unavailable"
  | "unsupported_file_type"
  | "file_too_large"
  | "lookup_failed";

export type RiskShareSourcePrivateReadDescriptor = {
  id: string;
  companyCode: string;
  sourceTitle: string;
  siteName: string | null;
  sourceType: "risk_assessment_xlsx" | "risk_assessment_csv";
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number;
  sourceDocumentDate: string | null;
  filePathname: string;
};

export type RiskShareSourcePrivateReadResult =
  | { ok: true; descriptor: RiskShareSourcePrivateReadDescriptor }
  | { ok: false; reason: RiskShareSourcePrivateReadFailureReason };

type RiskShareSourcePrivateReadRow = {
  id?: unknown;
  company_code?: unknown;
  site_id?: unknown;
  source_title?: unknown;
  site_name?: unknown;
  source_type?: unknown;
  file_name?: unknown;
  file_mime_type?: unknown;
  file_size?: unknown;
  source_document_date?: unknown;
  storage_provider?: unknown;
  storage_access?: unknown;
  file_pathname?: unknown;
};

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();
  return COMPANY_CODE_PATTERN.test(value) ? value : null;
}

function normalizeStrictSourceId(rawSourceId: string): string | null {
  const value = rawSourceId.trim().toLowerCase();
  return UUID_PATTERN.test(value) ? value : null;
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown): string | null {
  const text = readTrimmedString(value);
  return text || null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function resolveSourceType(row: RiskShareSourcePrivateReadRow): "risk_assessment_xlsx" | "risk_assessment_csv" | null {
  const declared = readTrimmedString(row.source_type);

  if (declared === "risk_assessment_xlsx" || declared === "risk_assessment_csv") {
    return declared;
  }

  const fileName = readTrimmedString(row.file_name).toLowerCase();

  if (fileName.endsWith(".xlsx")) return "risk_assessment_xlsx";
  if (fileName.endsWith(".csv")) return "risk_assessment_csv";

  return null;
}

async function readRiskShareSourcePrivateDescriptorByCompanyCode(
  rawCompanyCode: string,
  rawSourceId: string,
  siteId?: string,
): Promise<RiskShareSourcePrivateReadResult> {
  const companyCode = normalizeStrictCompanyCode(rawCompanyCode);
  const sourceId = normalizeStrictSourceId(rawSourceId);

  if (!companyCode || !sourceId) {
    return { ok: false, reason: "invalid_request" };
  }

  const query = new URLSearchParams({
    select:
      "id,company_code,site_id,source_title,site_name,source_type,file_name,file_mime_type,file_size,source_document_date,storage_provider,storage_access,file_pathname",
    company_code: `eq.${companyCode}`,
    id: `eq.${sourceId}`,
    limit: "1",
  });
  if (siteId) {
    applyRiskShareDefaultSiteScope(query, siteId);
  }

  let rows: RiskShareSourcePrivateReadRow[];

  try {
    rows = await selectSupabaseExportRows<RiskShareSourcePrivateReadRow>("risk_share_sources", query);
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }

  const row = rows[0];

  if (!row) {
    return { ok: false, reason: "source_not_found" };
  }

  const id = readTrimmedString(row.id);
  const rowCompanyCode = readTrimmedString(row.company_code).toLowerCase();

  if (!id || rowCompanyCode !== companyCode) {
    return { ok: false, reason: "source_not_found" };
  }

  const storageProvider = readTrimmedString(row.storage_provider);
  const storageAccess = readTrimmedString(row.storage_access);
  const filePathname = readTrimmedString(row.file_pathname);

  if (storageProvider !== "vercel_blob_private" || storageAccess !== "private" || !filePathname) {
    return { ok: false, reason: "preview_unavailable" };
  }

  const sourceType = resolveSourceType(row);

  if (!sourceType) {
    return { ok: false, reason: "unsupported_file_type" };
  }

  const fileSize = readFiniteNumber(row.file_size);

  if (fileSize === null || fileSize <= 0) {
    return { ok: false, reason: "preview_unavailable" };
  }

  if (fileSize > MAX_SOURCE_BYTES) {
    return { ok: false, reason: "file_too_large" };
  }

  return {
    ok: true,
    descriptor: {
      id,
      companyCode: rowCompanyCode,
      sourceTitle: readTrimmedString(row.source_title),
      siteName: readNullableString(row.site_name),
      sourceType,
      fileName: readNullableString(row.file_name),
      fileMimeType: readNullableString(row.file_mime_type),
      fileSize,
      sourceDocumentDate: readNullableString(row.source_document_date),
      filePathname,
    },
  };
}

export async function readRiskShareSourcePrivateDescriptorForTenant(
  rawCompanyCode: string,
  rawSourceId: string,
  siteId: string,
): Promise<RiskShareSourcePrivateReadResult> {
  if (!UUID_PATTERN.test(siteId)) {
    return { ok: false, reason: "invalid_request" };
  }

  return readRiskShareSourcePrivateDescriptorByCompanyCode(
    rawCompanyCode,
    rawSourceId,
    siteId,
  );
}
