import "server-only";

import { readRiskShareSourcePrivateDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";
import {
  readRiskShareSourceColumnMappingSourceState,
  readLatestRiskShareSourceColumnMappingVersion,
  reconcileRiskShareSourceColumnMappingRecord,
  type RiskShareSourceColumnMappingCreatedByRole,
  type RiskShareSourceCanonicalField,
} from "@/lib/risk-share/riskShareSourceColumnMapping";
import {
  readRiskShareSourceMappedRows,
  computeRiskShareSourceMappedRowSignature,
} from "@/lib/risk-share/riskShareSourceMappedRows";

export type ImportRiskShareCandidatesFailureReason =
  | "confirmed_mapping_required"
  | "header_changed"
  | "source_not_found"
  | "source_read_failed"
  | "unsupported_file"
  | "source_row_limit_exceeded"
  | "no_candidate_rows"
  | "candidate_import_failed";

export type ImportRiskShareCandidatesResult =
  | {
      ok: true;
      insertedCount: number;
      duplicateCount: number;
      invalidCount: number;
      mappingVersion: number;
    }
  | { ok: false; reason: ImportRiskShareCandidatesFailureReason };

type CandidateInsertRow = {
  source_row_number: number;
  source_row_signature_sha256: string;
  company_name: string | null;
  site_name: string | null;
  task_name: string;
  hazard: string;
  current_controls: string | null;
  improvement_plan: string | null;
  risk_level: string | null;
  raw_payload: Record<string, unknown>;
};

function isRowEffectivelyEmpty(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

async function saveCandidatesViaRpc(params: {
  companyCode: string;
  sourceId: string;
  mappingVersion: number;
  sheetIndex: number;
  importActor: RiskShareSourceColumnMappingCreatedByRole;
  candidates: CandidateInsertRow[];
}): Promise<{ ok: true; insertedCount: number; duplicateCount: number } | { ok: false }> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false };
  }

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/create_risk_share_candidates_from_source_mapping`, {
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
        p_mapping_version: params.mappingVersion,
        p_sheet_index: params.sheetIndex,
        p_import_actor: params.importActor,
        p_candidates: params.candidates,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false };
  }

  if (!res.ok) {
    return { ok: false };
  }

  const data = await res.json().catch(() => undefined);
  const row = Array.isArray(data) ? data[0] : undefined;

  const insertedCount = typeof row?.inserted_count === "number" ? row.inserted_count : null;
  const duplicateCount = typeof row?.duplicate_count === "number" ? row.duplicate_count : null;

  if (insertedCount === null || duplicateCount === null) {
    return { ok: false };
  }

  return { ok: true, insertedCount, duplicateCount };
}

/**
 * Reads the current confirmed mapping for a source+sheet, re-verifies it
 * against a fresh Private Blob read (never trusts the stored row alone),
 * reads every mapped data row (bounded, all-or-nothing), and imports valid
 * rows as risk_share_item_candidates through the existing Candidate Review
 * engine. Idempotent: re-running for the same confirmed mapping version,
 * sheet, and source row does not create duplicates. Does not create AI
 * candidates, approve anything, create risk_share_items, or touch Version
 * Lock / source status.
 */
export async function importRiskShareCandidatesFromConfirmedSourceMapping(params: {
  companyCode: string;
  sourceId: string;
  oidcToken: string;
  sheetIndex: number;
  importActor: RiskShareSourceColumnMappingCreatedByRole;
}): Promise<ImportRiskShareCandidatesResult> {
  const descriptorResult = await readRiskShareSourcePrivateDescriptor(params.companyCode, params.sourceId);

  if (!descriptorResult.ok) {
    if (descriptorResult.reason === "unsupported_file_type") {
      return { ok: false, reason: "unsupported_file" };
    }
    if (descriptorResult.reason === "invalid_request" || descriptorResult.reason === "source_not_found") {
      return { ok: false, reason: "source_not_found" };
    }
    return { ok: false, reason: "source_read_failed" };
  }

  const descriptor = descriptorResult.descriptor;

  const latestMappingResult = await readLatestRiskShareSourceColumnMappingVersion({
    companyCode: params.companyCode,
    sourceId: params.sourceId,
    sheetIndex: params.sheetIndex,
  });

  if (!latestMappingResult.ok || !latestMappingResult.record || latestMappingResult.record.status !== "confirmed") {
    return { ok: false, reason: "confirmed_mapping_required" };
  }

  const mappingRecord = latestMappingResult.record;

  const sourceStateResult = await readRiskShareSourceColumnMappingSourceState({
    descriptor,
    oidcToken: params.oidcToken,
    sheetIndex: params.sheetIndex,
    requestedHeaderRowIndex: mappingRecord.headerRowIndex,
  });

  if (!sourceStateResult.ok) {
    if (sourceStateResult.reason === "invalid_header_row") {
      return { ok: false, reason: "header_changed" };
    }
    if (sourceStateResult.reason === "unsupported_file_type") {
      return { ok: false, reason: "unsupported_file" };
    }
    if (sourceStateResult.reason === "invalid_request" || sourceStateResult.reason === "source_not_found") {
      return { ok: false, reason: "source_not_found" };
    }
    return { ok: false, reason: "source_read_failed" };
  }

  const reconciliation = reconcileRiskShareSourceColumnMappingRecord({
    record: mappingRecord,
    selectedSheetIndex: sourceStateResult.selectedSheetIndex,
    headerRowIndex: sourceStateResult.headerRowIndex,
    headerSignature: sourceStateResult.headerSignature,
    headerCells: sourceStateResult.headerCells,
  });

  if (!reconciliation || reconciliation.status !== "confirmed") {
    return { ok: false, reason: "header_changed" };
  }

  const columnIndexByField = new Map<RiskShareSourceCanonicalField, number>();
  for (const [index, field] of reconciliation.initialFieldByIndex.entries()) {
    if (field) columnIndexByField.set(field, index);
  }

  const hazardColumnIndex = columnIndexByField.get("hazard");

  if (hazardColumnIndex === undefined) {
    // Structurally guaranteed by the mapping's own shape validation; defensive only.
    return { ok: false, reason: "confirmed_mapping_required" };
  }

  const rowsResult = await readRiskShareSourceMappedRows(descriptor, {
    oidcToken: params.oidcToken,
    sheetIndex: sourceStateResult.selectedSheetIndex,
    headerRowIndex: sourceStateResult.headerRowIndex,
    columnCount: sourceStateResult.headerCells.length,
  });

  if (!rowsResult.ok) {
    if (rowsResult.reason === "source_row_limit_exceeded") {
      return { ok: false, reason: "source_row_limit_exceeded" };
    }
    return { ok: false, reason: "source_read_failed" };
  }

  const taskNameIndex = columnIndexByField.get("task_name");
  const currentControlsIndex = columnIndexByField.get("current_controls");
  const improvementPlanIndex = columnIndexByField.get("improvement_plan");
  const riskLevelIndex = columnIndexByField.get("risk_level");
  const categoryIndex = columnIndexByField.get("category");
  const noteIndex = columnIndexByField.get("note");

  const readField = (cells: string[], index: number | undefined) =>
    index !== undefined ? (cells[index]?.trim() ?? "") : "";

  let invalidCount = 0;
  const candidateRows: CandidateInsertRow[] = [];

  for (const row of rowsResult.rows) {
    if (isRowEffectivelyEmpty(row.cells)) continue;

    const hazard = readField(row.cells, hazardColumnIndex);

    if (!hazard) {
      invalidCount += 1;
      continue;
    }

    // "category" here is the confirmed mapping's canonical field id, a free-text
    // source classification -- it is not risk_share_item_candidates.category,
    // which is a fixed internal triage enum with a different meaning. The
    // mapped text is preserved in raw_payload only; category is always
    // inserted as 'other' until a future gate decides how to reconcile them.
    const categoryText = readField(row.cells, categoryIndex);
    const noteText = readField(row.cells, noteIndex);

    candidateRows.push({
      source_row_number: row.rowNumber,
      source_row_signature_sha256: computeRiskShareSourceMappedRowSignature(row.cells),
      company_name: null,
      site_name: descriptor.siteName,
      task_name: readField(row.cells, taskNameIndex),
      hazard,
      current_controls: readField(row.cells, currentControlsIndex) || null,
      improvement_plan: readField(row.cells, improvementPlanIndex) || null,
      risk_level: readField(row.cells, riskLevelIndex) || null,
      raw_payload: {
        source: "confirmed_source_mapping_import_v1",
        mappingVersion: mappingRecord.mappingVersion,
        sheetIndex: sourceStateResult.selectedSheetIndex,
        sourceCategoryText: categoryText || null,
        note: noteText || null,
      },
    });
  }

  if (candidateRows.length === 0) {
    return { ok: false, reason: "no_candidate_rows" };
  }

  const saveResult = await saveCandidatesViaRpc({
    companyCode: params.companyCode,
    sourceId: params.sourceId,
    mappingVersion: mappingRecord.mappingVersion,
    sheetIndex: sourceStateResult.selectedSheetIndex,
    importActor: params.importActor,
    candidates: candidateRows,
  });

  if (!saveResult.ok) {
    return { ok: false, reason: "candidate_import_failed" };
  }

  return {
    ok: true,
    insertedCount: saveResult.insertedCount,
    duplicateCount: saveResult.duplicateCount,
    invalidCount,
    mappingVersion: mappingRecord.mappingVersion,
  };
}

/**
 * Confirms, straight from risk_share_item_candidates, that candidates with
 * this exact mapping provenance actually exist. A page must call this
 * before showing any "candidates were created" success state -- a
 * candidateImport=success URL query alone is client-controlled and proves
 * nothing on its own.
 */
export async function hasRiskShareCandidatesForConfirmedMapping(params: {
  companyCode: string;
  sourceId: string;
  mappingVersion: number;
  sheetIndex: number;
}): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return false;
  }

  const query = new URLSearchParams({
    select: "id",
    company_code: `eq.${params.companyCode}`,
    source_id: `eq.${params.sourceId}`,
    mapping_version: `eq.${params.mappingVersion}`,
    sheet_index: `eq.${params.sheetIndex}`,
    limit: "1",
  });

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_item_candidates?${query.toString()}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return false;

    const rows = await res.json().catch(() => undefined);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}
