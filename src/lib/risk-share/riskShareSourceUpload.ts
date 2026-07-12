import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

import { getTenantRegistryConfigByCode, selectSupabaseExportRows } from "@/lib/supabaseServer";

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ELIGIBLE_TENANT_SERVICE_MODES = new Set(["risk_share_pack", "full_safemetrica"]);
const ELIGIBLE_TENANT_STATUSES = new Set(["onboarding", "active"]);

const MAX_SOURCE_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const SOURCE_DOCUMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRIVATE_BLOB_HOSTNAME_MARKER = ".private.blob.vercel-storage.com";

const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);
const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);
const XLSX_ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export type RiskShareSourceUploadFailureReason =
  | "invalid_company"
  | "tenant_not_found"
  | "tenant_not_eligible"
  | "invalid_input"
  | "site_required"
  | "file_required"
  | "file_empty"
  | "file_too_large"
  | "unsupported_file_type"
  | "invalid_file_content"
  | "duplicate_source"
  | "storage_not_configured"
  | "upload_failed"
  | "source_insert_failed";

export type RiskShareSourceUploadResult =
  | { ok: true; status: "created"; companyCode: string }
  | { ok: false; reason: RiskShareSourceUploadFailureReason };

export type RiskShareSourceUploadInput = {
  companyCode: string;
  sourceTitle: string;
  siteName: string;
  sourceDocumentDate: string;
  sourceFile: FormDataEntryValue | null;
};

type EligibleTenant = {
  id: string;
  code: string;
  name: string;
  defaultSiteName: string | null;
};

type EligibleTenantResult =
  | { ok: true; tenant: EligibleTenant }
  | { ok: false; reason: RiskShareSourceUploadFailureReason };

function normalizeStrictCompanyCode(rawCompanyCode: string): string | null {
  const value = rawCompanyCode.trim().toLowerCase();
  return COMPANY_CODE_PATTERN.test(value) ? value : null;
}

async function resolveEligibleTenant(rawCompanyCode: string): Promise<EligibleTenantResult> {
  const companyCode = normalizeStrictCompanyCode(rawCompanyCode);

  if (!companyCode) {
    return { ok: false, reason: "invalid_company" };
  }

  let tenant: Awaited<ReturnType<typeof getTenantRegistryConfigByCode>>;

  try {
    tenant = await getTenantRegistryConfigByCode(companyCode);
  } catch {
    return { ok: false, reason: "tenant_not_eligible" };
  }

  if (!tenant) {
    return { ok: false, reason: "tenant_not_found" };
  }

  if (!tenant.id || !tenant.id.trim()) {
    return { ok: false, reason: "tenant_not_eligible" };
  }

  if (
    !ELIGIBLE_TENANT_SERVICE_MODES.has(tenant.serviceMode) ||
    !ELIGIBLE_TENANT_STATUSES.has(tenant.status)
  ) {
    return { ok: false, reason: "tenant_not_eligible" };
  }

  return {
    ok: true,
    tenant: {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      defaultSiteName: tenant.defaultSiteName,
    },
  };
}

function detectSourceFileKind(fileName: string): "xlsx" | "csv" | null {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

type ContentValidationResult =
  | { ok: true }
  | { ok: false; reason: "unsupported_file_type" | "invalid_file_content" };

async function validateXlsxContent(file: File): Promise<ContentValidationResult> {
  if (!XLSX_MIME_TYPES.has(file.type)) {
    return { ok: false, reason: "unsupported_file_type" };
  }

  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isZip = header.length === 4 && XLSX_ZIP_MAGIC.every((byte, index) => header[index] === byte);

  if (!isZip) {
    return { ok: false, reason: "invalid_file_content" };
  }

  return { ok: true };
}

async function validateCsvContent(file: File): Promise<ContentValidationResult> {
  if (!CSV_MIME_TYPES.has(file.type)) {
    return { ok: false, reason: "unsupported_file_type" };
  }

  const sampleBytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());

  if (sampleBytes.includes(0)) {
    return { ok: false, reason: "invalid_file_content" };
  }

  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(sampleBytes);
  } catch {
    return { ok: false, reason: "invalid_file_content" };
  }

  if (!text.trim()) {
    return { ok: false, reason: "invalid_file_content" };
  }

  return { ok: true };
}

function sanitizeSourceFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return safeName || "risk-share-source";
}

async function computeSha256Hex(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}

function getRiskSourceBlobToken() {
  return process.env.RISK_SOURCE_BLOB_READ_WRITE_TOKEN;
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

type RiskShareSourceIdRow = { id?: unknown };

async function findDuplicateSourceByChecksum(companyCode: string, checksum: string) {
  const query = new URLSearchParams({
    select: "id",
    company_code: `eq.${companyCode}`,
    file_checksum_sha256: `eq.${checksum}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<RiskShareSourceIdRow>("risk_share_sources", query);

  return rows[0] ?? null;
}

async function insertRiskShareSourceRow(record: Record<string, unknown>): Promise<boolean> {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return false;
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_sources`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
  });

  return res.ok;
}

async function safeDeletePrivateBlob(url: string) {
  try {
    await del(url, { token: getRiskSourceBlobToken() });
  } catch {
    // Cleanup best-effort only; failure detail is never surfaced to the client.
  }
}

export async function uploadRiskShareSource(
  input: RiskShareSourceUploadInput,
): Promise<RiskShareSourceUploadResult> {
  const tenantResolution = await resolveEligibleTenant(input.companyCode);

  if (!tenantResolution.ok) {
    return tenantResolution;
  }

  const tenant = tenantResolution.tenant;

  const sourceTitle = input.sourceTitle.trim().slice(0, 200);

  if (!sourceTitle) {
    return { ok: false, reason: "invalid_input" };
  }

  const siteNameInput = input.siteName.trim().slice(0, 160);
  const siteName = siteNameInput || tenant.defaultSiteName?.trim() || "";

  if (!siteName) {
    return { ok: false, reason: "site_required" };
  }

  let sourceDocumentDate: string | null = null;

  if (input.sourceDocumentDate.trim()) {
    const trimmedDate = input.sourceDocumentDate.trim();

    if (!SOURCE_DOCUMENT_DATE_PATTERN.test(trimmedDate)) {
      return { ok: false, reason: "invalid_input" };
    }

    sourceDocumentDate = trimmedDate;
  }

  const file = input.sourceFile;

  if (!(file instanceof File)) {
    return { ok: false, reason: "file_required" };
  }

  if (file.size === 0) {
    return { ok: false, reason: "file_empty" };
  }

  if (file.size > MAX_SOURCE_FILE_SIZE_BYTES) {
    return { ok: false, reason: "file_too_large" };
  }

  const fileKind = detectSourceFileKind(file.name || "");

  if (!fileKind) {
    return { ok: false, reason: "unsupported_file_type" };
  }

  const contentValidation =
    fileKind === "xlsx" ? await validateXlsxContent(file) : await validateCsvContent(file);

  if (!contentValidation.ok) {
    return { ok: false, reason: contentValidation.reason };
  }

  const checksum = await computeSha256Hex(file);

  try {
    const duplicate = await findDuplicateSourceByChecksum(tenant.code, checksum);

    if (duplicate) {
      return { ok: false, reason: "duplicate_source" };
    }
  } catch {
    return { ok: false, reason: "source_insert_failed" };
  }

  const blobToken = getRiskSourceBlobToken();

  if (!blobToken) {
    return { ok: false, reason: "storage_not_configured" };
  }

  const year = new Date().getUTCFullYear();
  const safeFileName = sanitizeSourceFileName(file.name || "risk-share-source");
  const pathname = `risk-share-sources/${tenant.code}/${year}/${randomUUID()}-${safeFileName}`;

  let blob: Awaited<ReturnType<typeof put>>;

  try {
    blob = await put(pathname, file, {
      access: "private",
      token: blobToken,
      addRandomSuffix: false,
      contentType: file.type,
    });
  } catch {
    return { ok: false, reason: "upload_failed" };
  }

  let blobHostname = "";

  try {
    blobHostname = new URL(blob.url).hostname;
  } catch {
    blobHostname = "";
  }

  if (!blobHostname.includes(PRIVATE_BLOB_HOSTNAME_MARKER)) {
    await safeDeletePrivateBlob(blob.url);
    return { ok: false, reason: "upload_failed" };
  }

  const insertOk = await insertRiskShareSourceRow({
    company_code: tenant.code,
    company_name: tenant.name || null,
    site_name: siteName,
    source_title: sourceTitle,
    source_type: fileKind === "xlsx" ? "risk_assessment_xlsx" : "risk_assessment_csv",
    file_url: blob.url,
    file_pathname: blob.pathname,
    file_name: file.name || null,
    file_mime_type: file.type || null,
    file_size: file.size,
    file_checksum_sha256: checksum,
    file_etag: blob.etag,
    storage_provider: "vercel_blob_private",
    storage_access: "private",
    uploaded_by: "owner_console",
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_document_date: sourceDocumentDate,
    raw_text_status: "pending",
    extraction_status: "pending",
    review_status: "pending",
    source_note: null,
  });

  if (!insertOk) {
    await safeDeletePrivateBlob(blob.url);
    return { ok: false, reason: "source_insert_failed" };
  }

  return { ok: true, status: "created", companyCode: tenant.code };
}
