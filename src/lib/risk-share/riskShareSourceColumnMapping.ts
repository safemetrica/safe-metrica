import "server-only";

import { createHash } from "node:crypto";

import {
  readRiskShareSourceHeaderPreview,
  type RiskShareSourceHeaderPreview,
} from "@/lib/risk-share/riskShareSourceHeaderPreview";
import type { RiskShareSourcePrivateReadDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";

// Canonical field ids intentionally reuse the existing risk_share_item_candidates /
// risk_share_items column names (hazard, task_name, current_controls,
// improvement_plan, risk_level, category) so a future "mapped row -> candidate"
// step does not need to translate names. There is no existing candidate column
// for a free-text "note" (비고); "note" storage is deferred to that future step.
export const RISK_SHARE_SOURCE_CANONICAL_FIELDS = [
  "category",
  "task_name",
  "hazard",
  "current_controls",
  "improvement_plan",
  "risk_level",
  "note",
] as const;

export type RiskShareSourceCanonicalField = (typeof RISK_SHARE_SOURCE_CANONICAL_FIELDS)[number];

export const RISK_SHARE_SOURCE_REQUIRED_CANONICAL_FIELD: RiskShareSourceCanonicalField = "hazard";

export const RISK_SHARE_SOURCE_CANONICAL_FIELD_LABELS: Record<RiskShareSourceCanonicalField, string> = {
  category: "구분",
  task_name: "작업공정",
  hazard: "위험요인",
  current_controls: "현재조치",
  improvement_plan: "개선대책",
  risk_level: "위험도",
  note: "비고",
};

export type RiskShareSourceColumnMappingStatus = "draft" | "confirmed";

export type RiskShareSourceColumnMappingCreatedByRole =
  | "owner_console"
  | "tenant_admin"
  | "tenant_manager";

export type RiskShareSourceColumnMappingEntry = {
  sourceColumnIndex: number;
  sourceHeader: string;
  standardField: RiskShareSourceCanonicalField | null;
};

const MAX_SOURCE_COLUMNS = 40;
const MAX_HEADER_ROW_SELECTION_INDEX = 9;

function isCanonicalField(value: unknown): value is RiskShareSourceCanonicalField {
  return (
    typeof value === "string" &&
    (RISK_SHARE_SOURCE_CANONICAL_FIELDS as readonly string[]).includes(value)
  );
}

function normalizeHeaderText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[·・‧∙⋅]/g, "·")
    .replace(/\s+/g, " ");
}

const CANONICAL_FIELD_ALIASES: Record<RiskShareSourceCanonicalField, string[]> = {
  category: ["구분", "분류", "대분류", "중분류", "category", "classification"],
  task_name: [
    "작업공정",
    "작업 공정",
    "공정",
    "작업내용",
    "작업 내용",
    "process",
    "work process",
  ],
  hazard: [
    "위험요인",
    "위험 요인",
    "유해위험요인",
    "유해·위험요인",
    "유해 위험요인",
    "위험내용",
    "hazard",
    "risk factor",
  ],
  current_controls: [
    "현재조치",
    "현재 조치",
    "현재대책",
    "기존대책",
    "안전보건조치",
    "현재 안전보건조치",
    "current control",
    "existing control",
  ],
  improvement_plan: [
    "개선대책",
    "개선 대책",
    "감소대책",
    "위험성 감소대책",
    "추가대책",
    "improvement action",
    "control measure",
  ],
  risk_level: ["위험도", "위험성", "위험등급", "위험 수준", "risk level", "risk rating"],
  note: ["비고", "참고", "특이사항", "메모", "note", "remarks"],
};

const NORMALIZED_ALIAS_LOOKUP: Map<string, RiskShareSourceCanonicalField> = new Map();

for (const field of RISK_SHARE_SOURCE_CANONICAL_FIELDS) {
  for (const alias of CANONICAL_FIELD_ALIASES[field]) {
    NORMALIZED_ALIAS_LOOKUP.set(normalizeHeaderText(alias), field);
  }
}

/** Deterministic, rule-based suggestion only. Not an automatic confirmation. */
export function suggestCanonicalFieldForHeader(headerText: string): RiskShareSourceCanonicalField | null {
  const normalized = normalizeHeaderText(headerText);
  if (!normalized) return null;
  return NORMALIZED_ALIAS_LOOKUP.get(normalized) ?? null;
}

export function computeRiskShareSourceColumnMappingHeaderSignature(
  headerCells: { index: number; header: string }[],
): string {
  const ordered = [...headerCells].sort((a, b) => a.index - b.index);
  const payload = JSON.stringify(ordered.map((cell) => [cell.index, cell.header]));
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function clampRiskShareSourceHeaderRowSelection(value: number, maxRowIndex: number): number {
  if (!Number.isInteger(value) || value < 0) return 0;
  const upperBound = Math.min(MAX_HEADER_ROW_SELECTION_INDEX, Math.max(0, maxRowIndex));
  return value > upperBound ? 0 : value;
}

export type RiskShareSourceColumnMappingValidationFailureReason =
  | "empty_columns"
  | "too_many_columns"
  | "column_count_mismatch"
  | "duplicate_index"
  | "index_out_of_range"
  | "header_mismatch"
  | "invalid_standard_field"
  | "duplicate_standard_field"
  | "missing_required_field";

export type RiskShareSourceColumnMappingValidationResult =
  | { ok: true }
  | { ok: false; reason: RiskShareSourceColumnMappingValidationFailureReason };

/**
 * Structural validation only: array shape, index permutation, standardField
 * allowlist, no duplicate index/standardField, and the required risk-factor
 * field present. Does not compare sourceHeader text against anything, so
 * this alone is safe to run against a stored row that may predate the
 * current header (use validateRiskShareSourceColumnMappingEntries for that).
 */
export function validateRiskShareSourceColumnMappingEntryShape(
  entries: RiskShareSourceColumnMappingEntry[],
  sourceColumnCount: number,
): RiskShareSourceColumnMappingValidationResult {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, reason: "empty_columns" };
  }

  if (entries.length > MAX_SOURCE_COLUMNS || sourceColumnCount > MAX_SOURCE_COLUMNS) {
    return { ok: false, reason: "too_many_columns" };
  }

  if (entries.length !== sourceColumnCount) {
    return { ok: false, reason: "column_count_mismatch" };
  }

  const seenIndex = new Set<number>();
  const seenStandardField = new Set<RiskShareSourceCanonicalField>();
  let hasRequiredField = false;

  for (const entry of entries) {
    if (!Number.isInteger(entry.sourceColumnIndex) || entry.sourceColumnIndex < 0) {
      return { ok: false, reason: "index_out_of_range" };
    }

    if (entry.sourceColumnIndex >= sourceColumnCount) {
      return { ok: false, reason: "index_out_of_range" };
    }

    if (typeof entry.sourceHeader !== "string" || entry.sourceHeader.length > 300) {
      return { ok: false, reason: "index_out_of_range" };
    }

    if (seenIndex.has(entry.sourceColumnIndex)) {
      return { ok: false, reason: "duplicate_index" };
    }
    seenIndex.add(entry.sourceColumnIndex);

    if (entry.standardField !== null && !isCanonicalField(entry.standardField)) {
      return { ok: false, reason: "invalid_standard_field" };
    }

    if (entry.standardField !== null) {
      if (seenStandardField.has(entry.standardField)) {
        return { ok: false, reason: "duplicate_standard_field" };
      }
      seenStandardField.add(entry.standardField);

      if (entry.standardField === RISK_SHARE_SOURCE_REQUIRED_CANONICAL_FIELD) {
        hasRequiredField = true;
      }
    }
  }

  if (!hasRequiredField) {
    return { ok: false, reason: "missing_required_field" };
  }

  return { ok: true };
}

/**
 * Validates entries built server-side from a freshly re-read header row.
 * actualHeaderCells is the source of truth; entries must be a permutation of
 * its indices with sourceHeader exactly matching actualHeaderCells at that index.
 */
export function validateRiskShareSourceColumnMappingEntries(
  entries: RiskShareSourceColumnMappingEntry[],
  actualHeaderCells: string[],
): RiskShareSourceColumnMappingValidationResult {
  const shapeResult = validateRiskShareSourceColumnMappingEntryShape(entries, actualHeaderCells.length);

  if (!shapeResult.ok) {
    return shapeResult;
  }

  for (const entry of entries) {
    if (entry.sourceHeader !== actualHeaderCells[entry.sourceColumnIndex]) {
      return { ok: false, reason: "header_mismatch" };
    }
  }

  return { ok: true };
}

export type RiskShareSourceColumnMappingSourceReadFailureReason =
  | "invalid_request"
  | "source_not_found"
  | "preview_unavailable"
  | "unsupported_file_type"
  | "file_too_large"
  | "lookup_failed"
  | "storage_not_configured"
  | "blob_not_found"
  | "blob_read_failed"
  | "parse_failed"
  | "invalid_header_row";

export type RiskShareSourceColumnMappingSourceReadResult =
  | {
      ok: true;
      descriptor: RiskShareSourcePrivateReadDescriptor;
      preview: RiskShareSourceHeaderPreview;
      selectedSheetIndex: number;
      headerRowIndex: number;
      headerCells: string[];
      headerSignature: string;
    }
  | { ok: false; reason: RiskShareSourceColumnMappingSourceReadFailureReason };

/**
 * Re-reads the Private Blob header preview from scratch so a mapping save
 * (or a GET render) never trusts a client-provided header row, column count,
 * or signature as ground truth.
 */
export async function readRiskShareSourceColumnMappingSourceState(params: {
  descriptor: RiskShareSourcePrivateReadDescriptor;
  oidcToken: string;
  sheetIndex: number;
  requestedHeaderRowIndex: number | null;
}): Promise<RiskShareSourceColumnMappingSourceReadResult> {
  const previewResult = await readRiskShareSourceHeaderPreview(params.descriptor, {
    oidcToken: params.oidcToken,
    sheetIndex: params.sheetIndex,
  });

  if (!previewResult.ok) {
    return { ok: false, reason: previewResult.reason };
  }

  const preview = previewResult.preview;

  const headerRowIndex =
    params.requestedHeaderRowIndex !== null
      ? clampRiskShareSourceHeaderRowSelection(params.requestedHeaderRowIndex, preview.rows.length - 1)
      : (preview.suggestedHeaderRowIndex ?? 0);

  const headerCells = preview.rows[headerRowIndex];

  if (!headerCells || headerCells.length === 0) {
    return { ok: false, reason: "invalid_header_row" };
  }

  const headerSignature = computeRiskShareSourceColumnMappingHeaderSignature(
    headerCells.map((header, index) => ({ index, header })),
  );

  return {
    ok: true,
    descriptor: params.descriptor,
    preview,
    selectedSheetIndex: preview.selectedSheetIndex,
    headerRowIndex,
    headerCells,
    headerSignature,
  };
}

export type RiskShareSourceColumnMappingSaveFailureReason =
  | "storage_not_configured"
  | "source_not_found"
  | "save_failed";

export type RiskShareSourceColumnMappingSaveResult =
  | { ok: true; id: string; mappingVersion: number }
  | { ok: false; reason: RiskShareSourceColumnMappingSaveFailureReason };

export async function saveRiskShareSourceColumnMappingVersion(params: {
  companyCode: string;
  sourceId: string;
  sheetIndex: number;
  headerRowIndex: number;
  status: RiskShareSourceColumnMappingStatus;
  headerSignature: string;
  sourceColumnCount: number;
  mappings: RiskShareSourceColumnMappingEntry[];
  createdByRole: RiskShareSourceColumnMappingCreatedByRole;
}): Promise<RiskShareSourceColumnMappingSaveResult> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false, reason: "storage_not_configured" };
  }

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/save_risk_share_source_column_mapping_version`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_company_code: params.companyCode,
        p_source_id: params.sourceId,
        p_sheet_index: params.sheetIndex,
        p_header_row_index: params.headerRowIndex,
        p_status: params.status,
        p_header_signature_sha256: params.headerSignature,
        p_source_column_count: params.sourceColumnCount,
        p_mappings: params.mappings,
        p_created_by_role: params.createdByRole,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "save_failed" };
  }

  if (!res.ok) {
    return { ok: false, reason: "save_failed" };
  }

  const data = await res.json().catch(() => undefined);
  const row = Array.isArray(data) ? data[0] : data;

  const id = typeof row?.id === "string" ? row.id : "";
  const mappingVersion = typeof row?.mapping_version === "number" ? row.mapping_version : null;

  if (!id || mappingVersion === null) {
    return { ok: false, reason: "source_not_found" };
  }

  return { ok: true, id, mappingVersion };
}

const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RiskShareSourceColumnMappingRowStatus = RiskShareSourceColumnMappingStatus | "superseded";

export type RiskShareSourceColumnMappingRecord = {
  id: string;
  companyCode: string;
  sourceId: string;
  sheetIndex: number;
  headerRowIndex: number;
  mappingVersion: number;
  status: RiskShareSourceColumnMappingRowStatus;
  headerSignature: string;
  sourceColumnCount: number;
  mappings: RiskShareSourceColumnMappingEntry[];
  createdByRole: RiskShareSourceColumnMappingCreatedByRole;
  createdAt: string;
};

export type RiskShareSourceColumnMappingReadFailureReason =
  | "invalid_request"
  | "storage_not_configured"
  | "lookup_failed";

export type RiskShareSourceColumnMappingReadResult =
  | { ok: true; record: RiskShareSourceColumnMappingRecord | null }
  | { ok: false; reason: RiskShareSourceColumnMappingReadFailureReason };

function isRowStatus(value: unknown): value is RiskShareSourceColumnMappingRowStatus {
  return value === "draft" || value === "confirmed" || value === "superseded";
}

function isCreatedByRole(value: unknown): value is RiskShareSourceColumnMappingCreatedByRole {
  return value === "owner_console" || value === "tenant_admin" || value === "tenant_manager";
}

/**
 * Parses a raw mappings jsonb value into typed entries, or returns null if
 * the shape is not a well-formed mapping entry array. This does not run the
 * full validateRiskShareSourceColumnMappingEntryShape checks (duplicate
 * index/field, required field) -- callers that need those run them
 * separately once they also have the current header cell count.
 */
function parseStoredMappingEntries(raw: unknown): RiskShareSourceColumnMappingEntry[] | null {
  if (!Array.isArray(raw)) return null;

  const entries: RiskShareSourceColumnMappingEntry[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;

    const record = item as Record<string, unknown>;
    const sourceColumnIndex = record.sourceColumnIndex;
    const sourceHeader = record.sourceHeader;
    const standardField = record.standardField;

    if (!Number.isInteger(sourceColumnIndex) || (sourceColumnIndex as number) < 0) return null;
    if (typeof sourceHeader !== "string" || sourceHeader.length > 300) return null;
    if (standardField !== null && !isCanonicalField(standardField)) return null;

    entries.push({
      sourceColumnIndex: sourceColumnIndex as number,
      sourceHeader,
      standardField: standardField as RiskShareSourceCanonicalField | null,
    });
  }

  return entries;
}

/**
 * Reads the newest mapping version (draft, confirmed, or superseded) for a
 * given source+sheet. Returns { ok: true, record: null } when no row exists
 * or the stored row is malformed -- callers must treat both the same way
 * (fall back to deterministic suggestions) and must not surface DB/schema
 * detail to the page.
 */
export async function readLatestRiskShareSourceColumnMappingVersion(params: {
  companyCode: string;
  sourceId: string;
  sheetIndex: number;
}): Promise<RiskShareSourceColumnMappingReadResult> {
  const companyCode = params.companyCode.trim().toLowerCase();
  const sourceId = params.sourceId.trim().toLowerCase();

  if (!COMPANY_CODE_PATTERN.test(companyCode) || !UUID_PATTERN.test(sourceId)) {
    return { ok: false, reason: "invalid_request" };
  }

  if (!Number.isInteger(params.sheetIndex) || params.sheetIndex < 0) {
    return { ok: false, reason: "invalid_request" };
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false, reason: "storage_not_configured" };
  }

  const query = new URLSearchParams({
    select:
      "id,company_code,source_id,sheet_index,header_row_index,mapping_version,status,header_signature_sha256,source_column_count,mappings,created_by_role,created_at",
    company_code: `eq.${companyCode}`,
    source_id: `eq.${sourceId}`,
    sheet_index: `eq.${params.sheetIndex}`,
    order: "mapping_version.desc",
    limit: "1",
  });

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/risk_share_source_column_mappings?${query.toString()}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "lookup_failed" };
  }

  if (!res.ok) {
    return { ok: false, reason: "lookup_failed" };
  }

  const rows = await res.json().catch(() => undefined);
  const row = Array.isArray(rows) ? rows[0] : undefined;

  if (!row || typeof row !== "object") {
    return { ok: true, record: null };
  }

  const id = typeof row.id === "string" ? row.id : "";
  const rowCompanyCode = typeof row.company_code === "string" ? row.company_code.trim().toLowerCase() : "";
  const rowSourceId = typeof row.source_id === "string" ? row.source_id.trim().toLowerCase() : "";
  const sheetIndex = row.sheet_index;
  const headerRowIndex = row.header_row_index;
  const mappingVersion = row.mapping_version;
  const status = row.status;
  const headerSignature = typeof row.header_signature_sha256 === "string" ? row.header_signature_sha256 : "";
  const sourceColumnCount = row.source_column_count;
  const createdByRole = row.created_by_role;
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";

  if (
    !id ||
    rowCompanyCode !== companyCode ||
    rowSourceId !== sourceId ||
    !Number.isInteger(sheetIndex) ||
    !Number.isInteger(headerRowIndex) ||
    !Number.isInteger(mappingVersion) ||
    !isRowStatus(status) ||
    !/^[0-9a-f]{64}$/.test(headerSignature) ||
    !Number.isInteger(sourceColumnCount) ||
    !isCreatedByRole(createdByRole) ||
    !createdAt
  ) {
    return { ok: true, record: null };
  }

  const mappings = parseStoredMappingEntries(row.mappings);

  if (!mappings) {
    return { ok: true, record: null };
  }

  return {
    ok: true,
    record: {
      id,
      companyCode: rowCompanyCode,
      sourceId: rowSourceId,
      sheetIndex,
      headerRowIndex,
      mappingVersion,
      status,
      headerSignature,
      sourceColumnCount,
      mappings,
      createdByRole,
      createdAt,
    },
  };
}

export type RiskShareSourceColumnMappingReconciliation = {
  status: RiskShareSourceColumnMappingStatus;
  version: number;
  initialFieldByIndex: Map<number, RiskShareSourceCanonicalField | null>;
};

/**
 * Applies a saved mapping row to the current header view only when every
 * dimension it was saved against (sheet, header row, header signature,
 * column count) still matches, and its stored entries still pass shape +
 * header-equality validation. Any mismatch returns null so the page falls
 * back to deterministic suggestions instead of silently applying a stale
 * or superseded mapping.
 */
export function reconcileRiskShareSourceColumnMappingRecord(params: {
  record: RiskShareSourceColumnMappingRecord | null;
  selectedSheetIndex: number;
  headerRowIndex: number;
  headerSignature: string;
  headerCells: string[];
}): RiskShareSourceColumnMappingReconciliation | null {
  const { record, selectedSheetIndex, headerRowIndex, headerSignature, headerCells } = params;

  if (!record) return null;
  if (record.status !== "draft" && record.status !== "confirmed") return null;
  if (record.sheetIndex !== selectedSheetIndex) return null;
  if (record.headerRowIndex !== headerRowIndex) return null;
  if (record.headerSignature !== headerSignature) return null;
  if (record.sourceColumnCount !== headerCells.length) return null;

  const validation = validateRiskShareSourceColumnMappingEntries(record.mappings, headerCells);

  if (!validation.ok) return null;

  const initialFieldByIndex = new Map<number, RiskShareSourceCanonicalField | null>();

  for (const entry of record.mappings) {
    initialFieldByIndex.set(entry.sourceColumnIndex, entry.standardField);
  }

  return { status: record.status, version: record.mappingVersion, initialFieldByIndex };
}
