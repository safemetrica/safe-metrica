import { type NextRequest, NextResponse } from "next/server";

import {
  getDefaultTenantSiteConfigByTenantCode,
  listTenantSitesByTenantCode,
  selectSupabaseExportRows,
  SupabaseReadError,
} from "@/lib/supabaseServer";
import { resolveRiskShareSingleSiteScope } from "@/lib/risk-share/riskShareDefaultSiteScope";

type ExportRow = Record<string, unknown>;

type Dataset =
  | "tbm_records"
  | "worker_share_confirmations"
  | "worker_reports"
  | "worker_representative_confirmations"
  | "locked_share_items"
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
  "worker_representative_confirmations",
  "locked_share_items",
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

function buildTimestampPeriodFilter(
  createdAtColumn: string,
  eventAtColumn: string,
  startDate: string,
  dayAfterEnd: string
) {
  return `(${[
    `and(${createdAtColumn}.gte.${startDate}T00:00:00.000Z,${createdAtColumn}.lt.${dayAfterEnd}T00:00:00.000Z)`,
    `and(${eventAtColumn}.gte.${startDate}T00:00:00.000Z,${eventAtColumn}.lt.${dayAfterEnd}T00:00:00.000Z)`,
  ].join(",")})`;
}

function applyDefaultSitePeriodScope(
  query: URLSearchParams,
  siteId: string | null,
  periodFilter: string,
) {
  const siteFilter = siteId
    ? `or(site_id.eq.${siteId},site_id.is.null)`
    : "site_id.is.null";
  query.set("and", `(${siteFilter},or${periodFilter})`);
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
  const fileCount = getFileUrls(row).length + getUploadedFiles(row).length;

  return hasRiskShareSignatureEvidence(row) ? Math.max(fileCount, 1) : fileCount;
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

function hasRepresentativeOpinion(row: ExportRow) {
  return Boolean(
    getString(row, ["opinion", "objection_detail", "objectionDetail"])
  );
}

function hasRepresentativeObjection(row: ExportRow) {
  return (
    getBoolean(row, ["has_objection", "hasObjection"]) ||
    Boolean(getString(row, ["objection_detail", "objectionDetail"]))
  );
}

function getRawPayload(row: ExportRow): ExportRow {
  const value = row.raw_payload;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ExportRow;
  }

  return {};
}

function getPayloadString(row: ExportRow, keys: string[]) {
  return getString(getRawPayload(row), keys);
}

const RISK_SHARE_SIGNATURE_SOURCES = new Set([
  "risk_share_participation_submit_v1",
  "risk_share_representative_confirmation_v1",
]);

function isRiskShareSignatureSubmission(row: ExportRow) {
  return RISK_SHARE_SIGNATURE_SOURCES.has(getPayloadString(row, ["source"]));
}

function hasRiskShareSignatureEvidence(row: ExportRow) {
  if (!isRiskShareSignatureSubmission(row)) {
    return false;
  }

  return (
    getBoolean(getRawPayload(row), ["signature_present"]) ||
    Boolean(getPayloadString(row, ["signature_url"]))
  );
}

function getIdentityMode(row: ExportRow) {
  const mode =
    getString(row, ["identity_mode", "identityMode"]) ||
    getPayloadString(row, ["identityMode", "identity_mode"]);

  if (mode) {
    return mode;
  }

  if (getBoolean(row, ["anonymous", "is_anonymous"])) {
    return "anonymous";
  }

  const submitter = cleanText(getString(row, ["submitter", "worker_name", "workerName"]));

  if (!submitter || submitter === "미입력" || submitter === "익명" || submitter === "제출자 미입력") {
    return "legacy_unidentified";
  }

  return "legacy_identified";
}

function getIdentityModeLabel(row: ExportRow) {
  const mode = getIdentityMode(row);

  if (mode === "identified") return "확인정보 있음";
  if (mode === "anonymous") return "익명";
  if (mode === "legacy_unidentified") return "기존기록/확인정보 미입력";
  if (mode === "legacy_identified") return "기존기록/제출자 표시 있음";

  return mode;
}

function shouldHideWorkerIdentity(row: ExportRow) {
  const mode = getIdentityMode(row);

  return mode === "anonymous" || mode === "legacy_unidentified";
}

function getExportWorkerName(row: ExportRow) {
  if (shouldHideWorkerIdentity(row)) {
    return "";
  }

  return (
    getPayloadString(row, ["workerName", "worker_name"]) ||
    getString(row, ["worker_name", "workerName", "submitter"])
  );
}

function getExportWorkerTeam(row: ExportRow) {
  if (shouldHideWorkerIdentity(row)) {
    return "";
  }

  return (
    getPayloadString(row, ["workerTeam", "worker_team"]) ||
    getString(row, ["worker_team", "workerTeam"])
  );
}

function getExportWorkerPhoneLast4(row: ExportRow) {
  if (shouldHideWorkerIdentity(row)) {
    return "";
  }

  return (
    getPayloadString(row, ["workerPhoneLast4", "worker_phone_last4"]) ||
    getString(row, ["worker_phone_last4", "workerPhoneLast4"])
  );
}

function getExportWorkerEmployeeNo(row: ExportRow) {
  if (shouldHideWorkerIdentity(row)) {
    return "";
  }

  return (
    getPayloadString(row, ["workerEmployeeNo", "worker_employee_no"]) ||
    getString(row, ["worker_employee_no", "workerEmployeeNo"])
  );
}

function buildWorkerRepresentativeConfirmationRows(rows: ExportRow[]) {
  const headers = [
    "제출일시",
    "확인일",
    "회사코드",
    "현장명",
    "확인범위",
    "근로자대표 성명",
    "소속/작업조",
    "역할",
    "의견 여부",
    "보완 의견 여부",
    "의견 요약",
    "검토상태",
    "고객 전달 비고",
  ];

  const csvRows = rows.map((row) => {
    const reviewStatus =
      getString(row, ["review_status", "reviewStatus"]) || "미확인";

    return [
      formatKstDateTime(getString(row, ["submitted_at", "submittedAt"])),
      formatKstDateTime(getString(row, ["confirmed_at", "confirmedAt"])),
      getString(row, ["related_company_code", "company_code", "companyCode"]),
      summarize(getString(row, ["related_site_name", "site_name", "siteName"]), 120),
      summarize(getString(row, ["confirmation_scope", "confirmationScope"]), 180),
      summarize(getString(row, ["representative_name", "representativeName"]), 80),
      summarize(getString(row, ["representative_department", "representativeDepartment"]), 120),
      summarize(getString(row, ["representative_role", "representativeRole"]), 80),
      yesNo(hasRepresentativeOpinion(row)),
      yesNo(hasRepresentativeObjection(row)),
      summarize(
        getString(row, ["objection_detail", "objectionDetail", "opinion"]),
        240
      ),
      summarize(reviewStatus, 80),
      "근로자대표 참여확인 운영기록입니다. 평가 결과, 현장 조치 상태 또는 법적 판단을 확정하는 자료가 아닙니다.",
    ];
  });

  return { headers, rows: csvRows };
}

function buildLockedShareItemRows(lockedRows: ExportRow[]) {
  const headers = [
    "최종 공유본 확정일시",
    "Lock ID",
    "회사코드",
    "회사명",
    "현장명",
    "대상월",
    "작업명",
    "위험요인",
    "사고유형",
    "위험등급",
    "현재 관리대책",
    "근로자 확인 안전조치",
    "고객 확인 상태",
    "근로자 QR 노출",
    "고객 전달 비고",
  ];

  const rows = lockedRows.map((row) => [
    formatKstDateTime(getString(row, ["version_locked_at", "updated_at", "created_at"])),
    summarize(getString(row, ["version_lock_id"]), 80),
    getString(row, ["company_code"]),
    summarize(getString(row, ["company_name"]), 120),
    summarize(getString(row, ["site_name"]), 120),
    summarize(getString(row, ["lock_month"]), 20),
    summarize(getString(row, ["task_name"]), 160),
    summarize(getString(row, ["hazard"]), 240),
    summarize(getString(row, ["accident_type"]), 120),
    summarize(getString(row, ["risk_level"]), 40),
    summarize(getString(row, ["current_controls"]), 240),
    summarize(
      getString(row, ["worker_share_summary"]) ||
        getString(row, ["improvement_plan"]) ||
        getString(row, ["current_controls"]),
      300
    ),
    getString(row, ["customer_check_status"]) === "confirmed" && getBoolean(row, ["customer_confirmed"])
      ? "고객 확인 완료"
      : "확인 필요",
    yesNo(getBoolean(row, ["worker_visible"])),
    "최종 공유본 기준 고객 전달용 공유항목입니다. 법적 판단, 면책, 조치완료 또는 AI 확정 판단을 의미하지 않습니다.",
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
        "식별 모드",
        "제출자 표시",
        "소속/작업조",
        "휴대폰 뒷4자리",
        "사번/식별번호",
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
        "식별 모드",
        "제출자 표시",
        "소속/작업조",
        "휴대폰 뒷4자리",
        "사번/식별번호",
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
      getIdentityModeLabel(row),
      summarize(getExportWorkerName(row), 80),
      summarize(getExportWorkerTeam(row), 120),
      summarize(getExportWorkerPhoneLast4(row), 20),
      summarize(getExportWorkerEmployeeNo(row), 80),
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


function getEvidenceSourceLabel(value: string) {
  const text = cleanText(value);

  if (text === "field_participation") return "현장참여";
  if (text === "tbm_voice") return "TBM";
  if (text === "contractor_submission") return "협력사 제출";
  if (text === "action") return "조치 증빙";
  if (text === "risk_assessment") return "위험성평가";
  if (text === "manual") return "수기 등록";

  return text || "확인 필요";
}

function getEvidenceTypeLabel(value: string) {
  const text = cleanText(value);

  if (text === "photo") return "사진";
  if (text === "checklist") return "체크리스트";
  if (text === "edu") return "교육자료";
  if (text === "sign") return "서명";
  if (text === "report") return "보고서";

  return text || "확인 필요";
}

function getEvidenceRoleLabel(value: string) {
  const text = cleanText(value);

  if (text === "share_confirmation_attachment") return "공유확인 첨부";
  if (text === "worker_report_attachment") return "위험제보 첨부";
  if (text === "near_miss_attachment") return "아차사고 첨부";
  if (text === "improvement_suggestion_attachment") return "개선제안 첨부";
  if (text === "field_participation_attachment") return "현장참여 첨부";
  if (text === "tbm_attendance_attachment") return "TBM 참석/서명";
  if (text === "tbm_pre_work_attachment") return "TBM 작업 전";
  if (text === "tbm_work_target_attachment") return "TBM 작업 대상";
  if (text === "tbm_action_attachment") return "TBM 조치";
  if (text === "contractor_attachment") return "협력사 제출 첨부";

  return text || "확인 필요";
}

function buildEvidenceManifestRows(
  evidenceRows: ExportRow[],
  fieldRows: ExportRow[],
  tbmRows: ExportRow[],
  startDate: string
) {
  const headers = [
    "증빙번호",
    "제출일시",
    "회사명",
    "관련 기록 유형",
    "제출구분",
    "증빙유형",
    "증빙역할",
    "파일명",
    "파일URL",
    "제출자 표시",
    "익명 여부",
    "고객 전달 비고",
  ];

  const rows: CsvRow[] = [];
  const exportedFileUrls = new Set<string>();
  let sequence = 1;

  function pushEvidenceRow({
    eventDate,
    companyName,
    sourceType,
    submissionType,
    evidenceType,
    evidenceRole,
    fileName,
    fileUrl,
    submittedByLabel,
    anonymous,
    note,
  }: {
    eventDate: string;
    companyName: string;
    sourceType: string;
    submissionType: string;
    evidenceType: string;
    evidenceRole: string;
    fileName: string;
    fileUrl: string;
    submittedByLabel: string;
    anonymous: boolean;
    note: string;
  }) {
    const cleanFileUrl = cleanText(fileUrl);

    if (!cleanFileUrl || exportedFileUrls.has(cleanFileUrl)) {
      return;
    }

    exportedFileUrls.add(cleanFileUrl);

    const yearMonth = getYearMonth(eventDate, startDate);
    const evidenceNumber = `EV-${yearMonth}-${String(sequence).padStart(4, "0")}`;
    const safeFileName = sanitizeFilename(fileName || getFilenameFromUrl(cleanFileUrl));

    rows.push([
      evidenceNumber,
      formatKstDateTime(eventDate),
      summarize(companyName, 120),
      sourceType,
      submissionType,
      evidenceType,
      evidenceRole,
      safeFileName,
      cleanFileUrl,
      summarize(submittedByLabel, 80),
      yesNo(anonymous),
      note,
    ]);

    sequence += 1;
  }

  for (const row of evidenceRows) {
    const fileUrl = getString(row, ["file_url", "fileUrl"]);

    pushEvidenceRow({
      eventDate: getString(row, ["submitted_at", "created_at"]),
      companyName: getString(row, ["company_name", "companyName"]),
      sourceType: getEvidenceSourceLabel(getString(row, ["source_type", "sourceType"])),
      submissionType: getSubmissionType(row),
      evidenceType: getEvidenceTypeLabel(getString(row, ["evidence_type_code", "evidenceTypeCode"])),
      evidenceRole: getEvidenceRoleLabel(getString(row, ["evidence_role", "evidenceRole"])),
      fileName: getString(row, ["file_name", "fileName"]) || getFilenameFromUrl(fileUrl),
      fileUrl,
      submittedByLabel: getString(row, ["submitted_by_label", "submittedByLabel"]),
      anonymous: getBoolean(row, ["anonymous"]),
      note: "evidence_items 원장 기준 증빙입니다.",
    });
  }

  for (const row of fieldRows) {
    if (isRiskShareSignatureSubmission(row)) {
      continue;
    }

    const eventDate = getString(row, ["reported_date", "submitted_at", "created_at"]);
    const submissionType = getSubmissionType(row);

    for (const fileUrl of getFileUrls(row)) {
      pushEvidenceRow({
        eventDate,
        companyName: getString(row, ["company_name", "companyName"]),
        sourceType: "현장참여",
        submissionType,
        evidenceType: "사진",
        evidenceRole: getEvidenceRoleLabel(
          submissionType === "공유확인"
            ? "share_confirmation_attachment"
            : submissionType === "위험제보"
              ? "worker_report_attachment"
              : submissionType === "아차사고"
                ? "near_miss_attachment"
                : submissionType === "개선제안"
                  ? "improvement_suggestion_attachment"
                  : "field_participation_attachment"
        ),
        fileName: getFilenameFromUrl(fileUrl),
        fileUrl,
        submittedByLabel: getExportWorkerName(row) || getString(row, ["submitter"]),
        anonymous: getBoolean(row, ["anonymous", "is_anonymous"]),
        note: "기존 현장참여 file_urls 기준 보완 항목입니다.",
      });
    }
  }

  for (const row of tbmRows) {
    const eventDate = getString(row, ["date_value", "work_date", "created_at"]);

    for (const file of getUploadedFiles(row)) {
      pushEvidenceRow({
        eventDate,
        companyName: getString(row, ["company_name", "companyName"]),
        sourceType: "TBM",
        submissionType: "TBM",
        evidenceType: getEvidenceTypeFromGroupKey(file.groupKey),
        evidenceRole: getEvidenceRoleLabel(`tbm_${file.groupKey}_attachment`),
        fileName: file.name ?? getFilenameFromUrl(file.url),
        fileUrl: file.url,
        submittedByLabel: getString(row, ["submitter", "created_by", "manager_name"]),
        anonymous: false,
        note: "기존 TBM uploaded_files 기준 보완 항목입니다.",
      });
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
      "dataset must be one of tbm_records, worker_share_confirmations, worker_reports, worker_representative_confirmations, locked_share_items, evidence_manifest."
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
  const needsEvidenceRows = dataset === "evidence_manifest";
  const needsFieldRows =
    dataset === "worker_share_confirmations" ||
    dataset === "worker_reports" ||
    dataset === "evidence_manifest";
  const needsTbmRows = dataset === "tbm_records" || dataset === "evidence_manifest";
  const needsWorkerRepresentativeRows =
    dataset === "worker_representative_confirmations";
  const needsLockedShareItems = dataset === "locked_share_items";
  const needsDefaultSiteScope =
    needsFieldRows || needsEvidenceRows || needsLockedShareItems;
  let defaultSiteId: string | null = null;
  if (needsDefaultSiteScope) {
    try {
      const [resolvedDefaultSite, tenantSites] = await Promise.all([
        getDefaultTenantSiteConfigByTenantCode(companyKey),
        listTenantSitesByTenantCode(companyKey),
      ]);
      const singleSiteScope = resolveRiskShareSingleSiteScope(
        resolvedDefaultSite,
        tenantSites,
      );
      if (!singleSiteScope.ok) {
        return errorResponse(
          409,
          "multi_site_export_blocked",
          "Core site-scoped export is blocked because its canonical site scope is ambiguous.",
        );
      }
      defaultSiteId = singleSiteScope.siteId;
    } catch {
      return errorResponse(
        503,
        "default_site_lookup_failed",
        "The customer export could not verify its site scope.",
      );
    }
  }
  const fieldPeriodFilter = buildPeriodFilter(
    "created_at",
    "reported_date",
    startDate,
    endDate,
    dayAfterEnd,
  );
  const evidencePeriodFilter = buildTimestampPeriodFilter(
    "created_at",
    "submitted_at",
    startDate,
    dayAfterEnd,
  );
  const lockedShareItemsPeriodFilter = buildTimestampPeriodFilter(
    "created_at",
    "version_locked_at",
    startDate,
    dayAfterEnd,
  );

  const fieldQuery = new URLSearchParams({
    select: "*",
    tenant_code: `eq.${companyKey}`,
    order: "created_at.asc",
  });
  applyDefaultSitePeriodScope(fieldQuery, defaultSiteId, fieldPeriodFilter);
  const tbmQuery = new URLSearchParams({
    select: "*",
    company_code: `eq.${companyKey}`,
    or: buildPeriodFilter("created_at", "date_value", startDate, endDate, dayAfterEnd),
    order: "created_at.asc",
  });
  const workerRepresentativeQuery = new URLSearchParams({
    select: [
      "related_company_code",
      "related_site_name",
      "confirmation_scope",
      "representative_name",
      "representative_department",
      "representative_role",
      "confirmed_at",
      "opinion",
      "has_objection",
      "objection_detail",
      "review_status",
      "submitted_at",
    ].join(","),
    related_company_code: `eq.${companyKey}`,
    or: buildTimestampPeriodFilter("submitted_at", "confirmed_at", startDate, dayAfterEnd),
    order: "submitted_at.asc",
  });
  const evidenceQuery = new URLSearchParams({
    select: [
      "company_name",
      "source_type",
      "submission_type",
      "file_url",
      "file_name",
      "evidence_type_code",
      "evidence_role",
      "submitted_at",
      "submitted_by_label",
      "anonymous",
      "created_at",
    ].join(","),
    company_code: `eq.${companyKey}`,
    order: "created_at.asc",
  });
  applyDefaultSitePeriodScope(evidenceQuery, defaultSiteId, evidencePeriodFilter);
  const lockedShareItemsQuery = new URLSearchParams({
    select: [
      "version_locked_at",
      "updated_at",
      "created_at",
      "version_lock_id",
      "company_code",
      "company_name",
      "site_name",
      "lock_month",
      "task_name",
      "hazard",
      "accident_type",
      "risk_level",
      "current_controls",
      "improvement_plan",
      "worker_share_summary",
      "customer_check_status",
      "customer_confirmed",
      "worker_visible",
      "share_status",
    ].join(","),
    company_code: `eq.${companyKey}`,
    share_status: "eq.locked",
    customer_confirmed: "eq.true",
    worker_visible: "eq.true",
    version_lock_id: "not.is.null",
    order: "version_locked_at.asc.nullslast,created_at.asc",
  });
  applyDefaultSitePeriodScope(
    lockedShareItemsQuery,
    defaultSiteId,
    lockedShareItemsPeriodFilter,
  );

  try {
    const [fieldRows, tbmRows, workerRepresentativeRows, evidenceRows, lockedShareItemRows] = await Promise.all([
      needsFieldRows
        ? selectSupabaseExportRows<ExportRow>("field_participation_submissions", fieldQuery)
        : Promise.resolve([]),
      needsTbmRows
        ? selectSupabaseExportRows<ExportRow>("tbm_voice_submissions", tbmQuery)
        : Promise.resolve([]),
      needsWorkerRepresentativeRows
        ? selectSupabaseExportRows<ExportRow>(
            "worker_representative_confirmations",
            workerRepresentativeQuery
          )
        : Promise.resolve([]),
      needsEvidenceRows
        ? selectSupabaseExportRows<ExportRow>("evidence_items", evidenceQuery)
        : Promise.resolve([]),
      needsLockedShareItems
        ? selectSupabaseExportRows<ExportRow>("risk_share_items", lockedShareItemsQuery)
        : Promise.resolve([]),
    ]);

    const csvData =
      dataset === "tbm_records"
        ? buildTbmRows(tbmRows)
        : dataset === "evidence_manifest"
          ? buildEvidenceManifestRows(evidenceRows, fieldRows, tbmRows, startDate)
          : dataset === "worker_representative_confirmations"
            ? buildWorkerRepresentativeConfirmationRows(workerRepresentativeRows)
            : dataset === "locked_share_items"
              ? buildLockedShareItemRows(lockedShareItemRows)
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
