import { type NextRequest, NextResponse } from "next/server";

import {
  selectSupabaseExportRows,
  SupabaseReadError,
} from "@/lib/supabaseServer";

type ExportRow = Record<string, unknown>;

type Dataset =
  | "tbm_records"
  | "worker_share_confirmations"
  | "worker_reports"
  | "evidence_manifest";

type CsvRow = string[];

type UploadedFile = {
  name: string | null;
  url: string;
  groupKey: string;
};

const COMPANY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,49}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESERVED_COMPANY_KEYS = new Set(["all", "*"]);
const DATASETS: Dataset[] = [
  "tbm_records",
  "worker_share_confirmations",
  "worker_reports",
  "evidence_manifest",
];

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isOwner(request: NextRequest) {
  const ownerToken = request.cookies.get("sm_owner_token")?.value;
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;

  return Boolean(expectedToken && ownerToken === expectedToken);
}

function parseDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function getDayAfter(date: Date) {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString().slice(0, 10);
}

function buildPeriodFilter(
  createdAtColumn: string,
  eventDateColumn: string,
  startDate: string,
  endDate: string,
  dayAfterEnd: string
) {
  return `(${[
    `and(${createdAtColumn}.gte.${startDate}T00:00:00.000Z,${createdAtColumn}.lt.${dayAfterEnd}T00:00:00.000Z)`,
    `and(${eventDateColumn}.gte.${startDate},${eventDateColumn}.lte.${endDate})`,
  ].join(",")})`;
}

function parseDataset(value: string): Dataset | null {
  return DATASETS.includes(value as Dataset) ? (value as Dataset) : null;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function summarize(value: unknown, maxLength = 240) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function getString(row: ExportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getBoolean(row: ExportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (["true", "yes", "y", "1", "예"].includes(normalized)) {
        return true;
      }

      if (["false", "no", "n", "0", "아니오"].includes(normalized)) {
        return false;
      }
    }
  }

  return false;
}

function yesNo(value: boolean) {
  return value ? "예" : "아니오";
}

function getStringList(row: ExportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") {
            return cleanText(item);
          }

          if (item && typeof item === "object" && !Array.isArray(item)) {
            const record = item as Record<string, unknown>;
            return cleanText(record.name);
          }

          return "";
        })
        .filter(Boolean);
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function joinList(row: ExportRow, keys: string[]) {
  return getStringList(row, keys).join(", ");
}

function formatKstDate(value: string) {
  if (!value) {
    return "";
  }

  if (DATE_PATTERN.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value);
  }

  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 10);
}

function formatKstDateTime(value: string) {
  if (!value) {
    return "";
  }

  if (DATE_PATTERN.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return cleanText(value);
  }

  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 16).replace("T", " ");
}

function formatCustomerTime(value: string) {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  const timeMatch = text.match(/^(\\d{1,2}):(\\d{2})(?::\\d{2}(?:\\.\\d+)?)?$/);

  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kstDate.toISOString().slice(11, 16);
  }

  return text;
}

function normalizeSubmissionType(value: string) {
  const text = cleanText(value).toLowerCase();

  if (text.includes("공유확인") || text.includes("share")) {
    return "공유확인";
  }

  if (text.includes("위험제보") || text.includes("위험 제보") || text.includes("risk")) {
    return "위험제보";
  }

  if (text.includes("아차") || text.includes("near")) {
    return "아차사고";
  }

  if (text.includes("개선제안") || text.includes("개선 제안") || text.includes("improvement")) {
    return "개선제안";
  }

  return value ? "기타" : "확인 필요";
}

function getSubmissionType(row: ExportRow) {
  return normalizeSubmissionType(
    getString(row, ["submission_type", "submissionType", "submit_type", "report_type", "type"])
  );
}

function normalizeStatus(value: string) {
  const text = cleanText(value).toLowerCase();

  if (text.includes("접수") || text.includes("received")) {
    return "접수";
  }

  if (text.includes("검토") || text.includes("review")) {
    return "검토중";
  }

  if (text.includes("조치필요") || text.includes("action_required") || text.includes("필요")) {
    return "조치필요";
  }

  if (text.includes("조치완료") || text.includes("완료") || text.includes("done") || text.includes("completed")) {
    return "조치완료";
  }

  if (text.includes("반려") || text.includes("reject")) {
    return "반려";
  }

  return value ? cleanText(value) : "확인 필요";
}

function getStatus(row: ExportRow) {
  return normalizeStatus(getString(row, ["status", "processing_status", "action_status"]));
}

function getFileUrls(row: ExportRow) {
  const value = row.file_urls;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function getUploadedFiles(row: ExportRow) {
  const uploadedFiles = row.uploaded_files;

  if (!uploadedFiles || typeof uploadedFiles !== "object" || Array.isArray(uploadedFiles)) {
    return [];
  }

  const files: UploadedFile[] = [];

  for (const [groupKey, groupFiles] of Object.entries(uploadedFiles)) {
    if (!Array.isArray(groupFiles)) {
      continue;
    }

    for (const file of groupFiles) {
      if (!file || typeof file !== "object" || Array.isArray(file)) {
        continue;
      }

      const fileRecord = file as Record<string, unknown>;

      if (typeof fileRecord.url !== "string" || fileRecord.url.length === 0) {
        continue;
      }

      files.push({
        groupKey,
        name: typeof fileRecord.name === "string" ? fileRecord.name : null,
        url: fileRecord.url,
      });
    }
  }

  return files;
}

function getEvidenceCount(row: ExportRow) {
  return getFileUrls(row).length + getUploadedFiles(row).length;
}

function hasEvidence(row: ExportRow) {
  return getEvidenceCount(row) > 0 ? "있음" : "없음";
}

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(headers: string[], rows: CsvRow[]) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

function createCsvResponse(filename: string, headers: string[], rows: CsvRow[]) {
  const csv = `\uFEFF${toCsv(headers, rows)}`;

  return new NextResponse(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function buildTbmRows(tbmRows: ExportRow[]) {
  const headers = [
    "날짜",
    "시작시간",
    "종료시간",
    "작업명",
    "작업유형",
    "작업유형(복수)",
    "주요 위험요인",
    "안전공지/오늘의 주의사항",
    "특이사항 여부",
    "특이사항 내용",
    "조치상태",
    "증빙 여부",
    "증빙 수",
    "비고",
  ];

  const rows = tbmRows.map((row) => [
    formatKstDate(getString(row, ["date_value", "work_date", "created_at"])),
    formatCustomerTime(getString(row, ["start_time", "startTime"])),
    formatCustomerTime(getString(row, ["end_time", "endTime"])),
    summarize(getString(row, ["work_name", "title"])),
    getString(row, ["work_type"]),
    joinList(row, ["work_types", "work_type_multi", "work_type_multi_select"]),
    joinList(row, ["work_tags", "risk_tags", "core_risks"]),
    summarize(getString(row, ["safety_notice", "daily_notice", "today_notice"]), 300),
    yesNo(getBoolean(row, ["special_issue", "has_special_issue"])),
    summarize(getString(row, ["special_issue_content", "special_issue_note"]), 240),
    getStatus(row),
    hasEvidence(row),
    String(getEvidenceCount(row)),
    "",
  ]);

  return { headers, rows };
}

function buildFieldParticipationRows(fieldRows: ExportRow[], dataset: Dataset) {
  const isShareConfirmation = dataset === "worker_share_confirmations";

  const headers = isShareConfirmation
    ? [
        "제출일시",
        "제출구분",
        "제목",
        "위치/구역",
        "내용 요약",
        "익명 여부",
        "처리상태",
        "증빙 여부",
        "증빙 수",
        "관리자 메모",
        "월간보고서 반영 후보",
        "비고",
      ]
    : [
        "제출일시",
        "제출구분",
        "제목",
        "위치/구역",
        "내용 요약",
        "익명 여부",
        "처리상태",
        "조치 메모",
        "증빙 여부",
        "증빙 수",
        "월간보고서 반영 후보",
        "비고",
      ];

  const filteredRows = fieldRows.filter((row) => {
    const submissionType = getSubmissionType(row);
    return isShareConfirmation
      ? submissionType === "공유확인"
      : submissionType !== "공유확인";
  });

  const rows = filteredRows.map((row) => {
    const commonValues = [
      formatKstDateTime(getString(row, ["submitted_at", "reported_date", "created_at"])),
      getSubmissionType(row),
      summarize(getString(row, ["title", "report_title"]), 120),
      summarize(getString(row, ["location", "area", "place"]), 120),
      summarize(getString(row, ["content", "body", "message", "description"]), 240),
      yesNo(getBoolean(row, ["anonymous", "is_anonymous"])),
      getStatus(row),
    ];

    if (isShareConfirmation) {
      return [
        ...commonValues,
        hasEvidence(row),
        String(getEvidenceCount(row)),
        summarize(getString(row, ["manager_memo", "action_memo", "memo"]), 180),
        yesNo(getBoolean(row, ["monthly_report_candidate", "monthlyReportCandidate"])),
        "",
      ];
    }

    return [
      ...commonValues,
      summarize(getString(row, ["action_memo", "manager_memo", "memo"]), 180),
      hasEvidence(row),
      String(getEvidenceCount(row)),
      yesNo(getBoolean(row, ["monthly_report_candidate", "monthlyReportCandidate"])),
      "",
    ];
  });

  return { headers, rows };
}

function getEvidenceTypeFromGroupKey(groupKey: string) {
  const text = groupKey.toLowerCase();

  if (text.includes("attendance") || text.includes("sign") || groupKey.includes("서명")) {
    return "참석/서명";
  }

  if (text.includes("pre") || text.includes("site") || groupKey.includes("현장")) {
    return "작업 전";
  }

  if (text.includes("target") || text.includes("work") || groupKey.includes("작업")) {
    return "작업 대상";
  }

  if (text.includes("action") || groupKey.includes("조치")) {
    return "조치";
  }

  return "기타";
}

function sanitizeFilename(value: string) {
  const filename = cleanText(value).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
  return filename || "evidence-file";
}

function getFilenameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return sanitizeFilename(decodeURIComponent(lastSegment ?? "evidence-file"));
  } catch {
    return "evidence-file";
  }
}

function getYearMonth(value: string, fallbackDate: string) {
  const date = formatKstDate(value || fallbackDate);
  return DATE_PATTERN.test(date) ? date.slice(0, 7).replace("-", "") : fallbackDate.slice(0, 7).replace("-", "");
}

function buildEvidenceManifestRows(
  fieldRows: ExportRow[],
  tbmRows: ExportRow[],
  startDate: string
) {
  const headers = [
    "증빙번호",
    "날짜",
    "관련 기록 유형",
    "관련 제목",
    "증빙유형",
    "파일명",
    "ZIP 내 경로",
    "ZIP 포함 여부",
    "비고",
  ];

  const rows: CsvRow[] = [];
  let sequence = 1;

  function pushEvidenceRow(
    eventDate: string,
    sourceType: string,
    sourceTitle: string,
    evidenceType: string,
    fileName: string
  ) {
    const yearMonth = getYearMonth(eventDate, startDate);
    const evidenceNumber = `EV-${yearMonth}-${String(sequence).padStart(4, "0")}`;
    const safeFileName = sanitizeFilename(fileName);
    const zipPath = `evidence/${yearMonth}/${sourceType}/${evidenceNumber}_${safeFileName}`;

    rows.push([
      evidenceNumber,
      formatKstDate(eventDate),
      sourceType,
      summarize(sourceTitle, 120),
      evidenceType,
      safeFileName,
      zipPath,
      "예",
      "",
    ]);

    sequence += 1;
  }

  for (const row of fieldRows) {
    const eventDate = getString(row, ["reported_date", "submitted_at", "created_at"]);
    const title = getString(row, ["title", "report_title", "content"]) || "현장참여 기록";

    for (const fileUrl of getFileUrls(row)) {
      pushEvidenceRow(
        eventDate,
        "현장참여",
        title,
        "기타",
        getFilenameFromUrl(fileUrl)
      );
    }
  }

  for (const row of tbmRows) {
    const eventDate = getString(row, ["date_value", "work_date", "created_at"]);
    const title = getString(row, ["work_name", "title"]) || "TBM 기록";

    for (const file of getUploadedFiles(row)) {
      pushEvidenceRow(
        eventDate,
        "TBM",
        title,
        getEvidenceTypeFromGroupKey(file.groupKey),
        file.name ?? getFilenameFromUrl(file.url)
      );
    }
  }

  return { headers, rows };
}

function buildFilename(companyKey: string, dataset: Dataset, startDate: string, endDate: string) {
  return `safemetrica-customer-${dataset}-${companyKey}-${startDate}-${endDate}.csv`;
}

export async function GET(request: NextRequest) {
  if (!isOwner(request)) {
    return errorResponse(403, "export_forbidden", "Owner access is required.");
  }

  const companyKey = request.nextUrl.searchParams.get("companyKey")?.trim().toLowerCase() ?? "";
  const startDate = request.nextUrl.searchParams.get("startDate")?.trim() ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate")?.trim() ?? "";
  const dataset = parseDataset(request.nextUrl.searchParams.get("dataset")?.trim() ?? "");

  if (!companyKey) {
    return errorResponse(400, "company_key_required", "companyKey is required.");
  }

  if (!COMPANY_KEY_PATTERN.test(companyKey) || RESERVED_COMPANY_KEYS.has(companyKey)) {
    return errorResponse(400, "invalid_company_key", "companyKey must identify one specific company.");
  }

  if (!startDate) {
    return errorResponse(400, "start_date_required", "startDate is required.");
  }

  if (!endDate) {
    return errorResponse(400, "end_date_required", "endDate is required.");
  }

  if (!dataset) {
    return errorResponse(
      400,
      "invalid_dataset",
      "dataset must be one of tbm_records, worker_share_confirmations, worker_reports, evidence_manifest."
    );
  }

  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return errorResponse(400, "invalid_period", "startDate and endDate must use YYYY-MM-DD.");
  }

  if (parsedEndDate < parsedStartDate) {
    return errorResponse(400, "invalid_period", "endDate must not be earlier than startDate.");
  }

  const dayAfterEnd = getDayAfter(parsedEndDate);
  const needsFieldRows =
    dataset === "worker_share_confirmations" ||
    dataset === "worker_reports" ||
    dataset === "evidence_manifest";
  const needsTbmRows = dataset === "tbm_records" || dataset === "evidence_manifest";

  const fieldQuery = new URLSearchParams({
    select: "*",
    tenant_code: `eq.${companyKey}`,
    or: buildPeriodFilter("created_at", "reported_date", startDate, endDate, dayAfterEnd),
    order: "created_at.asc",
  });
  const tbmQuery = new URLSearchParams({
    select: "*",
    company_code: `eq.${companyKey}`,
    or: buildPeriodFilter("created_at", "date_value", startDate, endDate, dayAfterEnd),
    order: "created_at.asc",
  });

  try {
    const [fieldRows, tbmRows] = await Promise.all([
      needsFieldRows
        ? selectSupabaseExportRows<ExportRow>("field_participation_submissions", fieldQuery)
        : Promise.resolve([]),
      needsTbmRows
        ? selectSupabaseExportRows<ExportRow>("tbm_voice_submissions", tbmQuery)
        : Promise.resolve([]),
    ]);

    const csvData =
      dataset === "tbm_records"
        ? buildTbmRows(tbmRows)
        : dataset === "evidence_manifest"
          ? buildEvidenceManifestRows(fieldRows, tbmRows, startDate)
          : buildFieldParticipationRows(fieldRows, dataset);

    return createCsvResponse(
      buildFilename(companyKey, dataset, startDate, endDate),
      csvData.headers,
      csvData.rows
    );
  } catch (error) {
    if (error instanceof SupabaseReadError) {
      return errorResponse(502, "supabase_read_failed", error.message);
    }

    return errorResponse(500, "export_failed", "Customer CSV export failed.");
  }
}
