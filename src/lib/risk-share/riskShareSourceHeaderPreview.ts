import "server-only";

import { Readable } from "node:stream";
import { get as getPrivateBlob } from "@vercel/blob";
import ExcelJS from "exceljs";

import type { RiskShareSourcePrivateReadDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_SHEETS = 20;
const MAX_PREVIEW_ROWS = 20;
const MAX_PREVIEW_COLUMNS = 40;
const MAX_CELL_CHARS = 300;
const BLOB_READ_TIMEOUT_MS = 15_000;

export type RiskShareSourceHeaderPreviewFailureReason =
  | "storage_not_configured"
  | "blob_not_found"
  | "blob_read_failed"
  | "file_too_large"
  | "parse_failed";

export type RiskShareSourceHeaderPreviewSheet = {
  index: number;
  name: string;
};

export type RiskShareSourceHeaderPreview = {
  source: {
    id: string;
    title: string;
    siteName: string | null;
    fileName: string | null;
    fileSize: number | null;
    sourceType: string;
    sourceDocumentDate: string | null;
  };
  sheets: RiskShareSourceHeaderPreviewSheet[];
  selectedSheetIndex: number;
  rows: string[][];
  suggestedHeaderRowIndex: number | null;
  truncatedRows: boolean;
  truncatedColumns: boolean;
  warnings: string[];
};

export type RiskShareSourceHeaderPreviewResult =
  | { ok: true; preview: RiskShareSourceHeaderPreview }
  | { ok: false; reason: RiskShareSourceHeaderPreviewFailureReason };

function getRiskSourceBlobOidcCredentials(rawOidcToken: string) {
  const oidcToken = rawOidcToken.trim();
  const storeId = process.env.RISK_SOURCE_BLOB_STORE_ID?.trim();

  if (!oidcToken || !storeId) {
    return null;
  }

  return { oidcToken, storeId };
}

function buildSourceSummary(descriptor: RiskShareSourcePrivateReadDescriptor): RiskShareSourceHeaderPreview["source"] {
  return {
    id: descriptor.id,
    title: descriptor.sourceTitle,
    siteName: descriptor.siteName,
    fileName: descriptor.fileName,
    fileSize: descriptor.fileSize,
    sourceType: descriptor.sourceType,
    sourceDocumentDate: descriptor.sourceDocumentDate,
  };
}

function clampCellText(value: string): { text: string; truncated: boolean } {
  if (value.length <= MAX_CELL_CHARS) {
    return { text: value, truncated: false };
  }

  return { text: value.slice(0, MAX_CELL_CHARS), truncated: true };
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

function computeSuggestedHeaderRowIndex(rows: string[][]): number | null {
  const scanLimit = Math.min(rows.length, 10);
  let bestIndex: number | null = null;
  let bestCount = 0;

  for (let index = 0; index < scanLimit; index += 1) {
    const nonEmptyCount = rows[index].filter((cell) => cell.trim() !== "").length;

    if (nonEmptyCount >= 2 && nonEmptyCount > bestCount) {
      bestCount = nonEmptyCount;
      bestIndex = index;
    }
  }

  return bestIndex;
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

function parseCsvBuffer(buffer: Buffer): { ok: true; rows: string[][]; truncatedRows: boolean; truncatedColumns: boolean } | { ok: false; reason: "parse_failed" } {
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
  let truncatedColumns = false;
  let truncatedRows = false;

  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowHasContent = false;

  const pushField = () => {
    if (row.length < MAX_PREVIEW_COLUMNS) {
      row.push(field);
    } else {
      truncatedColumns = true;
    }
    field = "";
  };

  const pushRow = () => {
    pushField();
    if (rows.length < MAX_PREVIEW_ROWS) {
      rows.push(row);
    } else {
      truncatedRows = true;
    }
    row = [];
    rowHasContent = false;
  };

  let index = 0;

  while (index < text.length) {
    if (rows.length >= MAX_PREVIEW_ROWS) {
      truncatedRows = true;
      break;
    }

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

  if ((rowHasContent || field.length > 0) && rows.length < MAX_PREVIEW_ROWS) {
    pushRow();
  }

  return { ok: true, rows, truncatedRows, truncatedColumns };
}

async function buildCsvPreview(
  webStream: ReadableStream<Uint8Array>,
): Promise<
  | { ok: true; rows: string[][]; truncatedRows: boolean; truncatedColumns: boolean }
  | { ok: false; reason: "file_too_large" | "parse_failed" }
> {
  const bounded = await readBoundedWebStream(webStream, MAX_SOURCE_BYTES);

  if (!bounded.ok) {
    return bounded;
  }

  if (bounded.buffer.includes(0)) {
    return { ok: false, reason: "parse_failed" };
  }

  return parseCsvBuffer(bounded.buffer);
}

class ByteCapExceededError extends Error {}

async function buildXlsxPreview(
  webStream: ReadableStream<Uint8Array>,
  selectedSheetIndex: number,
): Promise<
  | {
      ok: true;
      sheets: RiskShareSourceHeaderPreviewSheet[];
      rows: string[][];
      truncatedRows: boolean;
      truncatedColumns: boolean;
    }
  | { ok: false; reason: "file_too_large" | "parse_failed" }
> {
  const nodeReadable = Readable.fromWeb(webStream as never);

  let bytesRead = 0;
  nodeReadable.on("data", (chunk: Buffer) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_SOURCE_BYTES) {
      nodeReadable.destroy(new ByteCapExceededError("source exceeded byte cap"));
    }
  });

  const sheets: RiskShareSourceHeaderPreviewSheet[] = [];
  const rows: string[][] = [];
  let truncatedRows = false;
  let truncatedColumns = false;

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

      if (sheets.length < MAX_SHEETS) {
        const rawName = (worksheetReader as unknown as { name?: unknown }).name;
        const name = typeof rawName === "string" && rawName.trim() ? rawName.trim().slice(0, 120) : `Sheet${currentIndex + 1}`;
        sheets.push({ index: currentIndex, name });
      }

      const isSelected = currentIndex === selectedSheetIndex;
      let rowCount = 0;

      for await (const row of worksheetReader) {
        if (!isSelected) {
          continue;
        }

        if (rowCount >= MAX_PREVIEW_ROWS) {
          truncatedRows = true;
          continue;
        }

        const values = Array.isArray((row as { values?: unknown }).values)
          ? ((row as { values: unknown[] }).values.slice(1) as unknown[])
          : [];

        if (values.length > MAX_PREVIEW_COLUMNS) {
          truncatedColumns = true;
        }

        const cells = values.slice(0, MAX_PREVIEW_COLUMNS).map((cellValue) => {
          const formatted = formatCellValue(cellValue);
          const clamped = clampCellText(formatted);
          if (clamped.truncated) truncatedColumns = true;
          return clamped.text;
        });

        rows.push(cells);
        rowCount += 1;
      }

      if (sheets.length >= MAX_SHEETS && currentIndex >= selectedSheetIndex) {
        break;
      }
    }
  } catch (error) {
    if (error instanceof ByteCapExceededError) {
      return { ok: false, reason: "file_too_large" };
    }
    return { ok: false, reason: "parse_failed" };
  }

  return { ok: true, sheets, rows, truncatedRows, truncatedColumns };
}

export async function readRiskShareSourceHeaderPreview(
  descriptor: RiskShareSourcePrivateReadDescriptor,
  options: { oidcToken: string; sheetIndex: number },
): Promise<RiskShareSourceHeaderPreviewResult> {
  const credentials = getRiskSourceBlobOidcCredentials(options.oidcToken);

  if (!credentials) {
    return { ok: false, reason: "storage_not_configured" };
  }

  const requestedSheetIndex = Number.isInteger(options.sheetIndex) && options.sheetIndex >= 0 ? options.sheetIndex : 0;
  const safeSheetIndex = requestedSheetIndex < MAX_SHEETS ? requestedSheetIndex : 0;

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

  const warnings: string[] = [];

  if (descriptor.sourceType === "risk_assessment_csv") {
    const csvResult = await buildCsvPreview(blobResult.stream);

    if (!csvResult.ok) {
      return { ok: false, reason: csvResult.reason };
    }

    if (csvResult.truncatedRows) warnings.push("일부 행이 생략되었습니다.");
    if (csvResult.truncatedColumns) warnings.push("일부 열 또는 셀 내용이 생략되었습니다.");

    return {
      ok: true,
      preview: {
        source: buildSourceSummary(descriptor),
        sheets: [{ index: 0, name: "CSV" }],
        selectedSheetIndex: 0,
        rows: csvResult.rows,
        suggestedHeaderRowIndex: computeSuggestedHeaderRowIndex(csvResult.rows),
        truncatedRows: csvResult.truncatedRows,
        truncatedColumns: csvResult.truncatedColumns,
        warnings,
      },
    };
  }

  const xlsxResult = await buildXlsxPreview(blobResult.stream, safeSheetIndex);

  if (!xlsxResult.ok) {
    return { ok: false, reason: xlsxResult.reason };
  }

  if (xlsxResult.sheets.length === 0) {
    return { ok: false, reason: "parse_failed" };
  }

  if (xlsxResult.truncatedRows) warnings.push("일부 행이 생략되었습니다.");
  if (xlsxResult.truncatedColumns) warnings.push("일부 열 또는 셀 내용이 생략되었습니다.");
  if (xlsxResult.sheets.length >= MAX_SHEETS) warnings.push("일부 시트가 목록에서 생략되었을 수 있습니다.");

  const resolvedSheetIndex = xlsxResult.sheets.some((sheet) => sheet.index === safeSheetIndex) ? safeSheetIndex : xlsxResult.sheets[0].index;

  return {
    ok: true,
    preview: {
      source: buildSourceSummary(descriptor),
      sheets: xlsxResult.sheets,
      selectedSheetIndex: resolvedSheetIndex,
      rows: xlsxResult.rows,
      suggestedHeaderRowIndex: computeSuggestedHeaderRowIndex(xlsxResult.rows),
      truncatedRows: xlsxResult.truncatedRows,
      truncatedColumns: xlsxResult.truncatedColumns,
      warnings,
    },
  };
}
