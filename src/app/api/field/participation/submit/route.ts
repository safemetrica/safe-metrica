import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import {
  TenantRequiredError,
  UnknownCompanyError,
  getCompanyConfig,
  getCompanyConfigByCode,
} from "@/lib/company";

import {
  insertFieldParticipationSubmissionShadowRecord,
  isSupabaseFieldParticipationShadowWriteEnabled,
} from "@/lib/supabaseServer";

const STANDARD_FIELD_VOICE_TYPES = new Set(["공유확인", "위험제보", "아차사고", "개선제안", "기타"]);

function normalizeFieldVoiceSubmissionType(rawType: string) {
  const compact = rawType.replace(/\s+/g, "").trim();

  if (compact.includes("공유확인") || compact.includes("주지확인") || compact.includes("확인완료")) {
    return "공유확인";
  }

  if (compact.includes("위험제보") || compact.includes("위험신고") || compact.includes("위험요인제보")) {
    return "위험제보";
  }

  if (compact.includes("아차사고") || compact.toLowerCase().includes("nearmiss")) {
    return "아차사고";
  }

  if (compact.includes("개선제안") || compact.includes("개선의견")) {
    return "개선제안";
  }

  return STANDARD_FIELD_VOICE_TYPES.has(rawType) ? rawType : "기타";
}

function toLegacyFieldVoiceType(submissionType: string) {
  if (submissionType === "위험제보") return "위험 제보";
  if (submissionType === "개선제안") return "개선 제안";
  return submissionType;
}

type UploadedFieldVoiceFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

const MAX_EVIDENCE_FILES = 5;
const MAX_SERVER_FILE_SIZE_BYTES = 4 * 1024 * 1024;


function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getFormChecked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function normalizeConfirmationType(rawType: string, submissionType: string) {
  const expectedType = submissionType === "공유확인" ? "risk_share_confirm" : "worker_report";

  return rawType === expectedType ? rawType : expectedType;
}

function normalizeConfirmationStatus(rawStatus: string, allChecksConfirmed: boolean) {
  if (allChecksConfirmed && rawStatus === "confirmed") {
    return "confirmed";
  }

  return rawStatus === "skipped" ? "skipped" : "pending";
}

function normalizeSourceStep(rawStep: string) {
  return /^[1-3]$/.test(rawStep) ? rawStep : "form_submit";
}

function normalizeEntryIntent(rawIntent: string) {
  return ["risk", "share", "report"].includes(rawIntent) ? rawIntent : "default";
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function sanitizeFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return safeName || "field-voice-file";
}

async function uploadEvidenceFiles(files: File[], companyCode: string, reportedDate: string) {
  const uploadedFiles: UploadedFieldVoiceFile[] = [];

  if (!process.env.BLOB_READ_WRITE_TOKEN || files.length === 0) {
    return uploadedFiles;
  }

  for (const file of files.slice(0, MAX_EVIDENCE_FILES)) {
    const fileName = sanitizeFileName(file.name);
    const blob = await put(
      `field-voice/${companyCode}/${reportedDate}/${Date.now()}-${fileName}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      }
    );

    uploadedFiles.push({
      name: file.name,
      url: blob.url,
      size: file.size,
      type: file.type,
    });
  }

  return uploadedFiles;
}

function buildFileMemoLines(params: {
  files: File[];
  uploadedFiles: UploadedFieldVoiceFile[];
}) {
  const lines: string[] = [];

  if (params.files.length === 0) {
    return lines;
  }

  lines.push("[첨부 파일]");
  params.files.forEach((file) => {
    lines.push(`- ${file.name} (${Math.round(file.size / 1024)}KB)`);
  });

  if (params.uploadedFiles.length > 0) {
    lines.push("");
    lines.push("[세메앱 저장 파일 URL]");
    params.uploadedFiles.forEach((file) => {
      lines.push(`- ${file.name}: ${file.url}`);
    });
  } else {
    lines.push("");
    lines.push("파일 URL: BLOB_READ_WRITE_TOKEN 설정 후 자동 저장됩니다.");
  }

  return lines;
}

function normalizeNotionId(rawId: string) {
  return rawId.trim().replace(/^collection:\/\//, "").replace(/-/g, "");
}

function formatNotionUuid(rawId: string) {
  const normalized = normalizeNotionId(rawId);

  if (/^[0-9a-fA-F]{32}$/.test(normalized)) {
    return [
      normalized.slice(0, 8),
      normalized.slice(8, 12),
      normalized.slice(12, 16),
      normalized.slice(16, 20),
      normalized.slice(20),
    ].join("-");
  }

  return rawId.trim();
}

async function fetchDataSourcePropertyNames(notionApiKey: string, dataSourceId: string) {
  const response = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const dataSource = await response.json();
  const propertyNames = Object.keys(dataSource?.properties ?? {});

  return new Set(propertyNames);
}

async function resolveDataSourceMeta(notionApiKey: string, rawId: string) {
  const formattedId = formatNotionUuid(rawId);
  let dataSourceId = formattedId;
  let propertyNames: Set<string> | null = null;

  const databaseResponse = await fetch(`https://api.notion.com/v1/databases/${formattedId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (databaseResponse.ok) {
    const database = await databaseResponse.json();
    const databasePropertyNames = Object.keys(database?.properties ?? {});

    if (databasePropertyNames.length > 0) {
      propertyNames = new Set(databasePropertyNames);
    }

    const resolvedDataSourceId = database?.data_sources?.[0]?.id;

    if (resolvedDataSourceId) {
      dataSourceId = resolvedDataSourceId;
    }
  }

  const dataSourcePropertyNames = await fetchDataSourcePropertyNames(notionApiKey, dataSourceId);

  if (dataSourcePropertyNames) {
    propertyNames = dataSourcePropertyNames;
  }

  return { dataSourceId, propertyNames };
}

function hasNotionProperty(propertyNames: Set<string> | null, propertyName: string) {
  return !propertyNames || propertyNames.has(propertyName);
}

function findNotionPropertyName(propertyNames: Set<string> | null, candidates: string[]) {
  if (!propertyNames) return candidates[0];

  for (const candidate of candidates) {
    if (propertyNames.has(candidate)) return candidate;
  }

  const normalizedCandidates = candidates.map((candidate) => candidate.trim());

  return (
    Array.from(propertyNames).find((propertyName) =>
      normalizedCandidates.includes(propertyName.trim())
    ) ?? null
  );
}

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function richText(content: string) {
  return {
    rich_text: [
      {
        text: {
          content: content.slice(0, 1900),
        },
      },
    ],
  };
}

function titleText(content: string) {
  return {
    title: [
      {
        text: {
          content: content.slice(0, 1900),
        },
      },
    ],
  };
}

function redirectTo(req: NextRequest, pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, req.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url, { status: 303 });
}

async function resolveCompanyConfig(formData: FormData) {
  const companyCode = getFormText(formData, "companyCode");

  if (companyCode) {
    return getCompanyConfigByCode(companyCode);
  }

  return getCompanyConfig();
}

function buildContentWithConfirmation(params: {
  content: string;
  sharedRiskSummary: string;
  riskCheck: boolean;
  riskAssessmentCheck: boolean;
  safetyMeasureCheck: boolean;
}) {
  const lines: string[] = [];

  lines.push(params.content);

  if (params.sharedRiskSummary) {
    lines.push("");
    lines.push(params.sharedRiskSummary);
  }

  lines.push("");
  lines.push("[위험성평가 공유 확인]");
  lines.push(`- 오늘 작업의 주요 위험요인 확인: ${params.riskCheck ? "확인" : "미확인"}`);
  lines.push(`- 위험성평가 주요 내용 공유: ${params.riskAssessmentCheck ? "확인" : "미확인"}`);
  lines.push(`- 필요한 안전조치와 주의사항 확인: ${params.safetyMeasureCheck ? "확인" : "미확인"}`);

  return lines.join("\n").slice(0, 1900);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const contractorName = getFormText(formData, "contractorName");
  const clientSubmissionId = getFormText(formData, "clientSubmissionId");

  let company;

  try {
    company = await resolveCompanyConfig(formData);
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return redirectTo(req, "/field/participation/submitted", {
        status: "tenant_required",
      });
    }

    if (error instanceof UnknownCompanyError) {
      return redirectTo(req, "/field/participation/submitted", {
        status: "unknown_company",
      });
    }

    return redirectTo(req, "/field/participation/submitted", {
      status: "company_error",
    });
  }

  const title = getFormText(formData, "title");
  const rawType = getFormText(formData, "type");
  const submissionType = normalizeFieldVoiceSubmissionType(rawType);
  const type = toLegacyFieldVoiceType(submissionType);
  const reportedDate = getFormText(formData, "reportedDate") || getTodayDateValue();
  const location = getFormText(formData, "location");
  const anonymous = getFormChecked(formData, "anonymous");
  const submitterInput = getFormText(formData, "submitter");
  const submitter = anonymous ? "익명" : submitterInput || "미입력";
  const content = getFormText(formData, "content");

  const riskCheck = getFormChecked(formData, "riskCheck");
  const riskAssessmentCheck = getFormChecked(formData, "riskAssessmentCheck");
  const safetyMeasureCheck = getFormChecked(formData, "safetyMeasureCheck");
  const sharedRiskSummary = getFormText(formData, "sharedRiskSummary");
  const allChecksConfirmed = riskCheck && riskAssessmentCheck && safetyMeasureCheck;
  const confirmationType = normalizeConfirmationType(
    getFormText(formData, "confirmation_type"),
    submissionType
  );
  const confirmationStatus = normalizeConfirmationStatus(
    getFormText(formData, "confirmation_status"),
    allChecksConfirmed
  );
  const sourceStep = normalizeSourceStep(getFormText(formData, "source_step"));
  const entryIntent = normalizeEntryIntent(getFormText(formData, "entry_intent"));
  const isAcknowledgementOnly =
    submissionType === "공유확인" &&
    riskCheck &&
    riskAssessmentCheck &&
    safetyMeasureCheck &&
    (!content || content === "오늘은 추가 의견 없음.");
  const processingStatus = "접수";

  const evidenceFiles = formData.getAll("evidenceFiles").filter(isFile);
  const oversizedFile = evidenceFiles.find((file) => file.size > MAX_SERVER_FILE_SIZE_BYTES);

  if (oversizedFile) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "file_too_large",
      company: company.code,
    });
  }

  let uploadedFiles: UploadedFieldVoiceFile[] = [];

  try {
    uploadedFiles = await uploadEvidenceFiles(evidenceFiles, company.code, reportedDate);
  } catch {
    return redirectTo(req, "/field/participation/submitted", {
      status: "file_upload_error",
      company: company.code,
    });
  }

  if (!title || !content) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "missing_required",
      company: company.code,
    });
  }

  if (!company.fieldVoiceDbId) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "missing_field_voice_db",
      company: company.code,
    });
  }

  const { dataSourceId, propertyNames } = await resolveDataSourceMeta(
    company.notionApiKey,
    company.fieldVoiceDbId
  );

  let finalContent = buildContentWithConfirmation({
    content,
    sharedRiskSummary,
    riskCheck,
    riskAssessmentCheck,
    safetyMeasureCheck,
  });

  const inlineMetaLines: string[] = [];

  if (!hasNotionProperty(propertyNames, "제출자")) {
    inlineMetaLines.push(`제출자: ${submitter}`);
  }

  if (!hasNotionProperty(propertyNames, "익명")) {
    inlineMetaLines.push(`익명 제출: ${anonymous ? "예" : "아니오"}`);
  }

  if (inlineMetaLines.length > 0) {
    finalContent = `${finalContent}\n\n[제출 정보]\n${inlineMetaLines.join("\n")}`.slice(0, 1900);
  }

  const fileMemoLines = buildFileMemoLines({
    files: evidenceFiles,
    uploadedFiles,
  });

  if (fileMemoLines.length > 0) {
    finalContent = `${finalContent}\n\n${fileMemoLines.join("\n")}`.slice(0, 1900);
  }

  const operationalMetadata = [
    "[공유확인 메타]",
    `- 확인 유형: ${confirmationType}`,
    `- 확인 상태: ${confirmationStatus}`,
    `- 제출 출처: ${sourceStep}`,
    `- 진입 의도: ${entryIntent}`,
    "",
    "[처리 기준]",
    `- 제출구분: ${submissionType}`,
    `- 처리상태: ${processingStatus}`,
    "- 공유확인은 조치완료 KPI에 포함하지 않습니다.",
    "- 확인 상태는 운영기록 분류용이며 관리자 확인과 사업주 최종 판단을 대신하지 않습니다.",
  ].join("\n");

  finalContent = `${finalContent.slice(0, Math.max(0, 1898 - operationalMetadata.length))}\n\n${operationalMetadata}`;

  const properties: Record<string, unknown> = {};

  if (hasNotionProperty(propertyNames, "제보 제목")) {
    properties["제보 제목"] = titleText(title);
  } else if (hasNotionProperty(propertyNames, "제보제목")) {
    properties["제보제목"] = titleText(title);
  } else if (hasNotionProperty(propertyNames, "제출 제목")) {
    properties["제출 제목"] = titleText(title);
  } else if (hasNotionProperty(propertyNames, "의견 제목")) {
    properties["의견 제목"] = titleText(title);
  } else if (hasNotionProperty(propertyNames, "제목")) {
    properties["제목"] = titleText(title);
  }

  const submissionTypePropName = findNotionPropertyName(propertyNames, ["제출구분"]);

  if (submissionTypePropName) {
    properties[submissionTypePropName] = { select: { name: submissionType } };
  }

  if (hasNotionProperty(propertyNames, "제보유형")) {
    properties["제보유형"] = { select: { name: type } };
  } else if (hasNotionProperty(propertyNames, "제보 유형")) {
    properties["제보 유형"] = { select: { name: type } };
  } else if (hasNotionProperty(propertyNames, "제출 유형")) {
    properties["제출 유형"] = { select: { name: type } };
  } else if (hasNotionProperty(propertyNames, "의견 유형")) {
    properties["의견 유형"] = { select: { name: type } };
  }

  if (hasNotionProperty(propertyNames, "일시")) {
    properties["일시"] = { date: { start: reportedDate } };
  } else if (hasNotionProperty(propertyNames, "등록일")) {
    properties["등록일"] = { date: { start: reportedDate } };
  } else if (hasNotionProperty(propertyNames, "날짜")) {
    properties["날짜"] = { date: { start: reportedDate } };
  }

  if (hasNotionProperty(propertyNames, "작업/위치")) {
    properties["작업/위치"] = richText(location);
  } else if (hasNotionProperty(propertyNames, "위치/구역")) {
    properties["위치/구역"] = richText(location);
  } else if (hasNotionProperty(propertyNames, "위치")) {
    properties["위치"] = richText(location);
  }

  if (hasNotionProperty(propertyNames, "내용")) {
    properties["내용"] = richText(finalContent);
  }

  const processingStatusPropName = findNotionPropertyName(propertyNames, ["처리상태"]);

  if (processingStatusPropName) {
    properties[processingStatusPropName] = { select: { name: processingStatus } };
  }

  if (contractorName && hasNotionProperty(propertyNames, "협력사명")) {
    properties["협력사명"] = {
      select: {
        name: contractorName,
      },
    };
  }

  if (hasNotionProperty(propertyNames, "위험요인 확인")) {
    properties["위험요인 확인"] = { checkbox: riskCheck };
  }

  if (hasNotionProperty(propertyNames, "위험성평가 공유 확인")) {
    properties["위험성평가 공유 확인"] = { checkbox: riskAssessmentCheck };
  }

  if (hasNotionProperty(propertyNames, "안전조치 확인")) {
    properties["안전조치 확인"] = { checkbox: safetyMeasureCheck };
  }

  if (hasNotionProperty(propertyNames, "제출자")) {
    properties["제출자"] = richText(submitter);
  }

  if (hasNotionProperty(propertyNames, "익명")) {
    properties["익명"] = { checkbox: anonymous };
  }

  if (uploadedFiles.length > 0 && hasNotionProperty(propertyNames, "사진/파일")) {
    properties["사진/파일"] = {
      files: uploadedFiles.map((file) => ({
        name: file.name.slice(0, 100),
        type: "external",
        external: {
          url: file.url,
        },
      })),
    };
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${company.notionApiKey}`,
      "Notion-Version": "2025-09-03",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: {
        type: "data_source_id",
        data_source_id: dataSourceId,
      },
      properties,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();

    return redirectTo(req, "/field/participation/submitted", {
      status: "notion_error",
      company: company.code,
      message: String(response.status),
      detail: text.slice(0, 120),
    });
  }

  const notionPage = (await response.json().catch(() => null)) as {
    id?: unknown;
    url?: unknown;
  } | null;

  const notionPageId = typeof notionPage?.id === "string" ? notionPage.id : null;
  const notionUrl = typeof notionPage?.url === "string" ? notionPage.url : null;

  if (isSupabaseFieldParticipationShadowWriteEnabled(company.code)) {
    try {
      console.log("[field-participation-submit] supabase shadow-write start", {
        companyCode: company.code,
        submissionType,
        uploadedFileCount: uploadedFiles.length,
      });

      const supabaseResult = await insertFieldParticipationSubmissionShadowRecord({
        tenant_code: company.code,
        company_name: company.name,
        submission_type: submissionType,
        legacy_type: type,
        title,
        content: finalContent,
        location,
        submitter,
        anonymous,
        reported_date: reportedDate,
        status: processingStatus,
        notion_page_id: notionPageId,
        notion_url: notionUrl,
        file_urls: uploadedFiles.map((file) => file.url),
        raw_payload: {
          clientSubmissionId,
          contractorName,
          sharedRiskSummary,
          riskCheck,
          riskAssessmentCheck,
          safetyMeasureCheck,
          confirmationType,
          confirmationStatus,
          sourceStep,
          entryIntent,
          isAcknowledgementOnly,
          selectedFileCount: evidenceFiles.length,
          uploadedFileCount: uploadedFiles.length,
          uploadedFiles: uploadedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          notionProperties: Object.keys(properties),
        },
      });

      if (supabaseResult.ok) {
        console.log("[field-participation-submit] supabase shadow-write success", {
          companyCode: company.code,
          submissionType,
          status: supabaseResult.status,
        });
      } else {
        console.warn("[field-participation-submit] supabase shadow-write failed", {
          companyCode: company.code,
          submissionType,
          status: supabaseResult.status,
          statusText: supabaseResult.statusText,
        });
      }
    } catch (error) {
      console.warn("[field-participation-submit] supabase shadow-write error", {
        companyCode: company.code,
        submissionType,
        errorName: error instanceof Error ? error.name : "unknown",
      });
    }
  }

  return redirectTo(req, "/field/participation/submitted", {
    status: "saved",
    company: company.code,
  });
}
