import "server-only";

import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { get as getPrivateBlob } from "@vercel/blob";
import ExcelJS from "exceljs";

import type { RiskShareSourcePrivateReadDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";

// Bounded full-row reader for confirmed-mapping candidate import. Distinct
// from riskShareSourceHeaderPreview.ts, which intentionally caps at 20 rows
// for a UI preview and must not be reused for row-by-row candidate import.
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_COLUMNS = 40;
const MAX_CELL_CHARS = 300;
const MAX_DATA_ROWS = 2000;
const BLOB_READ_TIMEOUT_MS = 15_000;
const PARSE_TIMEOUT_MS = 15_000;

export type RiskShareSourceMappedRowsFailureReason =
  | "storage_not_configured"
  | "blob_not_found"
  | "blob_read_failed"
  | "file_too_large"
  | "parse_failed"
  | "source_row_limit_exceeded";

export type RiskShareSourceMappedRow = {
  /** 1-based row number as a person reading the sheet/CSV would see it. */
  rowNumber: number;
  cells: string[];
};

export type RiskShareSourceMappedRowsResult =
  | { ok: true; rows: RiskShareSourceMappedRow[] }
  | { ok: false; reason: RiskShareSourceMappedRowsFailureReason };

function getRiskSourceBlobOidcCredentials(rawOidcToken: string) {
  const oidcToken = rawOidcToken.trim();
  const storeId = process.env.RISK_SOURCE_BLOB_STORE_ID?.trim();

  if (!oidcToken || !storeId) {
    return null;
  }

  return { oidcToken, storeId };
}

function clampCellText(value: string): string {
  return value.length <= MAX_CELL_CHARS ? value : value.slice(0, MAX_CELL_CHARS);
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.richText)) {
      return record.richText
        .map((segment) => (segment && typeof segment === "object" ? String((segment as Record<string, unknown>).text ?? "") : ""))
        .join("");
    }

    if (typeof record.text === "string") {
      return record.text;
    }

    if ("result" in record) {
      return formatCellValue(record.result);
    }

    if (typeof record.error === "string") {
      return record.error;
    }
  }

  return "";
}

function normalizeRowToColumnCount(cells: string[], columnCount: number): string[] {
  const normalized = cells.slice(0, columnCount).map((cell) => clampCellText(cell));
  while (normalized.length < columnCount) normalized.push("");
  return normalized;
}

async function readBoundedWebStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; reason: "file_too_large" }> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    if (value) {
      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "file_too_large" };
      }

      chunks.push(value);
    }
  }

  return { ok: true, buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))) };
}

function parseCsvBufferRows(buffer: Buffer): { ok: true; rawRows: string[][] } | { ok: false; reason: "parse_failed" } {
  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return { ok: false, reason: "parse_failed" };
  }

  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowHasContent = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
    rowHasContent = false;
  };

  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      rowHasContent = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      rowHasContent = true;
      pushField();
      index += 1;
      continue;
    }

    if (char === "\r") {
      index += 1;
      continue;
    }

    if (char === "\n") {
      if (rowHasContent || field.length > 0) {
        pushRow();
      }
      index += 1;
      continue;
    }

    field += char;
    rowHasContent = true;
    index += 1;
  }

  if (inQuotes) {
    return { ok: false, reason: "parse_failed" };
  }

  if (rowHasContent || field.length > 0) {
    pushRow();
  }

  return { ok: true, rawRows: rows };
}

async function readCsvMappedRows(
  webStream: ReadableStream<Uint8Array>,
  headerRowIndex: number,
  columnCount: number,
): Promise<RiskShareSourceMappedRowsResult> {
  const bounded = await readBoundedWebStream(webStream, MAX_SOURCE_BYTES);

  if (!bounded.ok) {
    return { ok: false, reason: bounded.reason };
  }

  if (bounded.buffer.includes(0)) {
    return { ok: false, reason: "parse_failed" };
  }

  const parsed = parseCsvBufferRows(bounded.buffer);

  if (!parsed.ok) {
    return { ok: false, reason: "parse_failed" };
  }

  const dataRawRows = parsed.rawRows.slice(headerRowIndex + 1);

  if (dataRawRows.length > MAX_DATA_ROWS) {
    return { ok: false, reason: "source_row_limit_exceeded" };
  }

  const rows: RiskShareSourceMappedRow[] = dataRawRows.map((rawRow, offset) => ({
    rowNumber: headerRowIndex + 2 + offset,
    cells: normalizeRowToColumnCount(rawRow, columnCount),
  }));

  return { ok: true, rows };
}

class ByteCapExceededError extends Error {}
class XlsxParseTimeoutError extends Error {}
class RowLimitExceededError extends Error {}

async function readXlsxMappedRows(
  webStream: ReadableStream<Uint8Array>,
  targetSheetIndex: number,
  headerRowIndex: number,
  columnCount: number,
): Promise<RiskShareSourceMappedRowsResult> {
  const nodeReadable = Readable.fromWeb(webStream as never);

  let bytesRead = 0;
  nodeReadable.on("data", (chunk: Buffer) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_SOURCE_BYTES) {
      nodeReadable.destroy(new ByteCapExceededError("source exceeded byte cap"));
    }
  });

  const timeoutId = setTimeout(() => {
    nodeReadable.destroy(new XlsxParseTimeoutError("mapped row parse exceeded time budget"));
  }, PARSE_TIMEOUT_MS);

  const rows: RiskShareSourceMappedRow[] = [];
  let sawTargetSheet = false;

  try {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(nodeReadable, {
      worksheets: "emit",
      sharedStrings: "cache",
      hyperlinks: "ignore",
      styles: "ignore",
      entries: "ignore",
    });

    let sheetIndex = 0;

    for await (const worksheetReader of workbookReader) {
      const currentIndex = sheetIndex;
      sheetIndex += 1;

      if (currentIndex !== targetSheetIndex) {
        continue;
      }

      sawTargetSheet = true;
      // headerRowIndex is 0-based; the header's true (1-based) sheet row number is headerRowIndex + 1.
      const headerSheetRowNumber = headerRowIndex + 1;
      let fallbackRowCount = 0;

      for await (const row of worksheetReader) {
        fallbackRowCount += 1;

        const declaredNumber = (row as { number?: unknown }).number;
        const rowNumber =
          typeof declaredNumber === "number" && Number.isInteger(declaredNumber) && declaredNumber > 0
            ? declaredNumber
            : fallbackRowCount;

        if (rowNumber <= headerSheetRowNumber) {
          continue;
        }

        if (rows.length >= MAX_DATA_ROWS) {
          throw new RowLimitExceededError("mapped data rows exceeded limit");
        }

        const values = Array.isArray((row as { values?: unknown }).values)
          ? ((row as { values: unknown[] }).values.slice(1) as unknown[])
          : [];

        const cells = values.slice(0, MAX_COLUMNS).map((cellValue) => formatCellValue(cellValue));

        rows.push({
          rowNumber,
          cells: normalizeRowToColumnCount(cells, columnCount),
        });
      }

      break;
    }
  } catch (error) {
    if (error instanceof ByteCapExceededError) {
      return { ok: false, reason: "file_too_large" };
    }
    if (error instanceof RowLimitExceededError) {
      return { ok: false, reason: "source_row_limit_exceeded" };
    }
    return { ok: false, reason: "parse_failed" };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!sawTargetSheet) {
    return { ok: false, reason: "parse_failed" };
  }

  return { ok: true, rows };
}

/**
 * Reads every data row (after the confirmed header row) of a single sheet,
 * server-only, bounded to MAX_DATA_ROWS. Exceeding the row cap aborts the
 * whole read (source_row_limit_exceeded) rather than truncating -- callers
 * must not fall back to a partial candidate import.
 */
export async function readRiskShareSourceMappedRows(
  descriptor: RiskShareSourcePrivateReadDescriptor,
  options: { oidcToken: string; sheetIndex: number; headerRowIndex: number; columnCount: number },
): Promise<RiskShareSourceMappedRowsResult> {
  const credentials = getRiskSourceBlobOidcCredentials(options.oidcToken);

  if (!credentials) {
    return { ok: false, reason: "storage_not_configured" };
  }

  let blobResult: Awaited<ReturnType<typeof getPrivateBlob>>;

  try {
    blobResult = await getPrivateBlob(descriptor.filePathname, {
      access: "private",
      oidcToken: credentials.oidcToken,
      storeId: credentials.storeId,
      useCache: false,
      abortSignal: AbortSignal.timeout(BLOB_READ_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "blob_read_failed" };
  }

  if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
    return { ok: false, reason: "blob_not_found" };
  }

  if (typeof blobResult.blob.size === "number" && blobResult.blob.size > MAX_SOURCE_BYTES) {
    return { ok: false, reason: "file_too_large" };
  }

  if (descriptor.sourceType === "risk_assessment_csv") {
    return readCsvMappedRows(blobResult.stream, options.headerRowIndex, options.columnCount);
  }

  return readXlsxMappedRows(blobResult.stream, options.sheetIndex, options.headerRowIndex, options.columnCount);
}

export function computeRiskShareSourceMappedRowSignature(cells: string[]): string {
  return createHash("sha256").update(JSON.stringify(cells), "utf8").digest("hex");
}
