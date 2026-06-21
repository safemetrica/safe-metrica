import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import {
  TenantRequiredError,
  UnknownCompanyError,
  getCompanyConfig,
  getCompanyConfigByCode,
} from "@/lib/company";

import {
  getTenantRegistryConfigByCode,
  insertEvidenceItemMetadataRecords,
  insertFieldParticipationSubmissionShadowRecord,
  isSupabaseFieldParticipationShadowWriteEnabled,
} from "@/lib/supabaseServer";

const STANDARD_FIELD_VOICE_TYPES = new Set([
  "공유확인",
  "위험제보",
  "아차사고",
  "개선제안",
  "불편사항",
  "위생·안전 확인",
  "기타",
]);

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

  if (compact.includes("불편사항") || compact.includes("불편")) {
    return "불편사항";
  }

  if (
    compact.includes("위생안전확인") ||
    compact.includes("위생·안전확인") ||
    compact.includes("위생안전") ||
    compact.includes("위생확인")
  ) {
    return "위생·안전 확인";
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

function parseJsonPayloadSafely(rawValue: string) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return {
      parse_error: true,
      raw_preview: rawValue.slice(0, 500),
    };
  }
}

function hasValidHandwrittenSignatureDataUrl(dataUrl: string) {
  return dataUrl.startsWith("data:image/") && dataUrl.length > 100;
}


function buildHandwrittenSignatureRawPayload(formData: FormData) {
  const signaturePayload: Record<string, unknown> = {};

  const handwrittenSignatureDataUrl = getFormText(formData, "handwritten_signature_data_url");
  const handwrittenSignatureSignedAt = getFormText(formData, "handwritten_signature_signed_at");
  const signatureConfirmationMethod = getFormText(formData, "signature_confirmation_method");
  const signatureConfirmationLabel = getFormText(formData, "signature_confirmation_label");
  const signatureConfirmationSnapshotJson = getFormText(formData, "signature_confirmation_snapshot_json");
  const signatureClientSourceRoute = getFormText(formData, "signature_client_source_route");
  const signatureClientUserAgent = getFormText(formData, "signature_client_user_agent");
  const signatureMetaCompanyCode = getFormText(formData, "signature_meta_company_code");

  if (handwrittenSignatureDataUrl) {
    signaturePayload.handwritten_signature_data_url = handwrittenSignatureDataUrl;
  }

  if (handwrittenSignatureSignedAt) {
    signaturePayload.handwritten_signature_signed_at = handwrittenSignatureSignedAt;
  }

  if (signatureConfirmationMethod) {
    signaturePayload.signature_confirmation_method = signatureConfirmationMethod;
  }

  if (signatureConfirmationLabel) {
    signaturePayload.signature_confirmation_label = signatureConfirmationLabel;
  }

  if (signatureConfirmationSnapshotJson) {
    try {
      signaturePayload.signature_confirmation_snapshot_json = JSON.parse(signatureConfirmationSnapshotJson);
    } catch {
      signaturePayload.signature_confirmation_snapshot_json = signatureConfirmationSnapshotJson;
    }
  }

  if (signatureClientSourceRoute) {
    signaturePayload.signature_client_source_route = signatureClientSourceRoute;
  }

  if (signatureClientUserAgent) {
    signaturePayload.signature_client_user_agent = signatureClientUserAgent;
  }

  if (signatureMetaCompanyCode) {
    signaturePayload.signature_meta_company_code = signatureMetaCompanyCode;
  }

  return signaturePayload;
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


function getSupabaseInsertedRecordId(data: unknown) {
  const record = Array.isArray(data) ? data[0] : data;

  if (!record || typeof record !== "object") {
    return null;
  }

  const id = (record as { id?: unknown }).id;

  return typeof id === "string" && id.length > 0 ? id : null;
}

function getFieldParticipationEvidenceRole(submissionType: string) {
  if (submissionType === "공유확인") return "share_confirmation_attachment";
  if (submissionType === "위험제보") return "worker_report_attachment";
  if (submissionType === "아차사고") return "near_miss_attachment";
  if (submissionType === "개선제안") return "improvement_suggestion_attachment";
  if (submissionType === "불편사항") return "worker_discomfort_attachment";
  if (submissionType === "위생·안전 확인") return "food_safety_confirmation_attachment";

  return "field_participation_attachment";
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

type LegacyFieldParticipationCompanyContext = Awaited<ReturnType<typeof getCompanyConfigByCode>> & {
  source: "legacy";
};

type TenantRegistryFieldParticipationCompanyContext = {
  source: "tenant_registry";
  code: string;
  name: string;
  status: string;
  serviceMode: string;
  enabledModules: string[];
};

type FieldParticipationCompanyContext =
  | LegacyFieldParticipationCompanyContext
  | TenantRegistryFieldParticipationCompanyContext;

const TENANT_REGISTRY_FIELD_PARTICIPATION_STATUSES = new Set(["onboarding", "active", "internal_test"]);

function isTenantRegistryFieldParticipationEnabled(
  tenant: Awaited<ReturnType<typeof getTenantRegistryConfigByCode>>
) {
  if (!tenant) return false;
  if (!TENANT_REGISTRY_FIELD_PARTICIPATION_STATUSES.has(tenant.status)) return false;

  return (
    tenant.enabledModules.includes("worker_qr_e_confirmation") ||
    tenant.enabledModules.includes("quick_feedback") ||
    tenant.serviceMode === "food_factory_e_confirmation_trial"
  );
}

async function resolveCompanyConfig(formData: FormData): Promise<FieldParticipationCompanyContext> {
  const companyCode = getFormText(formData, "companyCode");

  if (companyCode) {
    try {
      const tenantRegistryConfig = await getTenantRegistryConfigByCode(companyCode);

      if (tenantRegistryConfig && isTenantRegistryFieldParticipationEnabled(tenantRegistryConfig)) {
        return {
          source: "tenant_registry",
          code: tenantRegistryConfig.code,
          name: tenantRegistryConfig.name,
          status: tenantRegistryConfig.status,
          serviceMode: tenantRegistryConfig.serviceMode,
          enabledModules: tenantRegistryConfig.enabledModules,
        };
      }
    } catch (error) {
      console.warn("[field-participation-submit] tenant_registry lookup failed, falling back to legacy loader", {
        companyCode,
        errorName: error instanceof Error ? error.name : "unknown",
      });
    }

    const legacyCompany = await getCompanyConfigByCode(companyCode);
    return { ...legacyCompany, source: "legacy" };
  }

  const legacyCompany = await getCompanyConfig();
  return { ...legacyCompany, source: "legacy" };
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

function buildSupabaseFirstFieldParticipationContent(params: {
  content: string;
  sharedRiskSummary: string;
  riskCheck: boolean;
  riskAssessmentCheck: boolean;
  safetyMeasureCheck: boolean;
  identityMode: string;
  anonymous: boolean;
  workerTeam: string;
  workerPhoneLast4: string;
  workerEmployeeNo: string;
  submitter: string;
  evidenceFiles: File[];
  uploadedFiles: UploadedFieldVoiceFile[];
  confirmationType: string;
  confirmationStatus: string;
  sourceStep: string;
  entryIntent: string;
  submissionType: string;
  processingStatus: string;
}) {
  let finalContent = buildContentWithConfirmation({
    content: params.content,
    sharedRiskSummary: params.sharedRiskSummary,
    riskCheck: params.riskCheck,
    riskAssessmentCheck: params.riskAssessmentCheck,
    safetyMeasureCheck: params.safetyMeasureCheck,
  });

  const inlineMetaLines: string[] = [
    `식별 모드: ${params.identityMode}`,
    `제출자: ${params.submitter}`,
    `익명 제출: ${params.anonymous ? "예" : "아니오"}`,
  ];

  if (!params.anonymous && params.workerTeam) {
    inlineMetaLines.push(`소속/작업조: ${params.workerTeam}`);
  }

  if (!params.anonymous && params.workerPhoneLast4) {
    inlineMetaLines.push(`휴대폰 뒷4자리: ${params.workerPhoneLast4}`);
  }

  if (!params.anonymous && params.workerEmployeeNo) {
    inlineMetaLines.push(`사번/식별번호: ${params.workerEmployeeNo}`);
  }

  finalContent = `${finalContent}\n\n[제출 정보]\n${inlineMetaLines.join("\n")}`.slice(0, 1900);

  const fileMemoLines = buildFileMemoLines({
    files: params.evidenceFiles,
    uploadedFiles: params.uploadedFiles,
  });

  if (fileMemoLines.length > 0) {
    finalContent = `${finalContent}\n\n${fileMemoLines.join("\n")}`.slice(0, 1900);
  }

  const operationalMetadata = [
    "[공유확인 메타]",
    `- 확인 유형: ${params.confirmationType}`,
    `- 확인 상태: ${params.confirmationStatus}`,
    `- 제출 출처: ${params.sourceStep}`,
    `- 진입 의도: ${params.entryIntent}`,
    "",
    "[처리 기준]",
    `- 제출구분: ${params.submissionType}`,
    `- 처리상태: ${params.processingStatus}`,
    "- 공유확인은 조치완료 KPI에 포함하지 않습니다.",
    "- 확인 상태는 운영기록 분류용이며 관리자 확인과 사업주 최종 판단을 대신하지 않습니다.",
  ].join("\n");

  return `${finalContent.slice(0, Math.max(0, 1898 - operationalMetadata.length))}\n\n${operationalMetadata}`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const handwrittenSignatureRawPayload = buildHandwrittenSignatureRawPayload(formData);
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
  const requestedAnonymous = getFormChecked(formData, "anonymous");
  const submitterInput = getFormText(formData, "submitter");
  const workerTeam = getFormText(formData, "workerTeam");
  const workerPhoneLast4 = getFormText(formData, "workerPhoneLast4").replace(/\D/g, "").slice(0, 4);
  const workerEmployeeNo = getFormText(formData, "workerEmployeeNo");
  const rawIdentityMode = getFormText(formData, "identityMode");
  const isShareConfirmationSubmission = submissionType === "공유확인";
  const shareConfirmationIdentityReady =
    !isShareConfirmationSubmission ||
    (
      submitterInput.length > 0 &&
      workerTeam.length > 0 &&
      (workerPhoneLast4.length === 4 || workerEmployeeNo.length > 0)
    );
  const anonymous = isShareConfirmationSubmission ? false : requestedAnonymous;
  const identityMode = isShareConfirmationSubmission
    ? "identified"
    : anonymous
      ? "anonymous"
      : rawIdentityMode === "contact_allowed"
        ? "contact_allowed"
        : "identified";
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

  const signatureClientSourceRoute = getFormText(formData, "signature_client_source_route");
  const signatureClientUserAgent = getFormText(formData, "signature_client_user_agent");
  const signatureConfirmationMethod = getFormText(formData, "signature_confirmation_method");
  const signatureConfirmationLabel = getFormText(formData, "signature_confirmation_label");
  const signatureConfirmationSnapshotJson = getFormText(formData, "signature_confirmation_snapshot_json");
  const handwrittenSignatureSignedAt = getFormText(formData, "handwritten_signature_signed_at");
  const handwrittenSignatureDataUrl = getFormText(formData, "handwritten_signature_data_url");
  const signatureMetaCompanyCode = getFormText(formData, "signature_meta_company_code");
  const workerConfirmationLedgerMarker = getFormText(formData, "worker_confirmation_ledger_marker");

  const ledgerSourceRoute = signatureClientSourceRoute || req.nextUrl.pathname + req.nextUrl.search;
  const ledgerUserAgent = signatureClientUserAgent || req.headers.get("user-agent") || "";
  const isRichiLedgerSubmission = company.code === "richi";

  if (
    isRichiLedgerSubmission &&
    !hasValidHandwrittenSignatureDataUrl(handwrittenSignatureDataUrl)
  ) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "signature_required",
      companyCode: company.code,
    });
  }

  const checkedAt = new Date().toISOString();
  const signatureSnapshotPayload = parseJsonPayloadSafely(signatureConfirmationSnapshotJson);

  const richiDailySummarySnapshot = isRichiLedgerSubmission
    ? {
        source_type: "daily_summary",
        source_id: "richi-daily-summary-v1",
        source_version: "v1",
        title: "오늘 확인 요약",
        items: [
          "작업 전 위생과 위생복·장갑 착용 상태를 확인하세요.",
          "포장실·세척구역 바닥 미끄럼과 이동 동선을 확인하세요.",
          "불편사항이나 개선의견이 있으면 다음 단계에서 남겨 주세요.",
        ],
      }
    : null;

  const richiCompanyConfirmSnapshot = isRichiLedgerSubmission
    ? {
        source_type: "company_confirm_content",
        source_id: "richi-company-confirm-v1",
        source_version: "v1",
        title: "위생·안전 확인 체크",
        items: [
          "오늘 확인 요약을 읽었습니다.",
          "작업 전 위생·안전 주의사항을 확인했습니다.",
          "불편사항이 있으면 의견으로 남기겠습니다.",
        ],
      }
    : null;

  const riskShareSnapshot = sharedRiskSummary
    ? {
        source_type: "risk_share_snapshot",
        source_id: `${company.code}-risk-share-summary-v1`,
        source_version: "legacy-summary-v1",
        title: "위험성평가 공유내용",
        summary: sharedRiskSummary,
      }
    : null;

  const confirmationSources = [
    richiDailySummarySnapshot,
    richiCompanyConfirmSnapshot,
    riskShareSnapshot,
  ].filter(Boolean);

  const checkedSources = [
    riskCheck
      ? {
          source_type: isRichiLedgerSubmission ? "daily_summary" : "risk_summary",
          source_id: isRichiLedgerSubmission ? "richi-daily-summary-v1" : `${company.code}-risk-summary-v1`,
          checked_label: isRichiLedgerSubmission
            ? "오늘 확인 요약을 읽었습니다."
            : "오늘 작업의 주요 위험요인을 확인했습니다.",
          checked_at: checkedAt,
        }
      : null,
    riskAssessmentCheck
      ? {
          source_type: isRichiLedgerSubmission ? "company_confirm_content" : "risk_assessment",
          source_id: isRichiLedgerSubmission ? "richi-company-confirm-v1" : `${company.code}-risk-assessment-v1`,
          checked_label: isRichiLedgerSubmission
            ? "작업 전 위생·안전 주의사항을 확인했습니다."
            : "위험성평가 내용을 확인했습니다.",
          checked_at: checkedAt,
        }
      : null,
    safetyMeasureCheck
      ? {
          source_type: isRichiLedgerSubmission ? "feedback_prompt" : "safety_measure",
          source_id: isRichiLedgerSubmission ? "richi-feedback-prompt-v1" : `${company.code}-safety-measure-v1`,
          checked_label: isRichiLedgerSubmission
            ? "불편사항이 있으면 의견으로 남기겠습니다."
            : "안전조치와 주의사항을 확인했습니다.",
          checked_at: checkedAt,
        }
      : null,
  ].filter(Boolean);

  const signatureMetadata = {
    signature_method: signatureConfirmationMethod || null,
    signature_label: signatureConfirmationLabel || null,
    signed_at: handwrittenSignatureSignedAt || null,
    signature_data_url_present: Boolean(handwrittenSignatureDataUrl),
    signature_data_url_length: handwrittenSignatureDataUrl.length,
    signature_snapshot_present: Boolean(signatureConfirmationSnapshotJson),
    signature_client_source_route: signatureClientSourceRoute || null,
    signature_client_user_agent_present: Boolean(signatureClientUserAgent),
    signature_meta_company_code: signatureMetaCompanyCode || null,
  };

  const workerConfirmationLedgerPayload = {
    ledger_schema: "worker_confirmation_raw_payload_v1",
    worker_confirmation_ledger_marker: workerConfirmationLedgerMarker || null,
    source_route: ledgerSourceRoute,
    user_agent: ledgerUserAgent,
    client_submission_id: clientSubmissionId || null,
    company_code: company.code,
    tenant_code: company.code,
    company_name: company.name,
    site_id: "default",
    service_mode: isRichiLedgerSubmission ? "full_safemetrica" : "field_participation",
    confirmation_type: confirmationType,
    confirmation_status: confirmationStatus,
    source_step: sourceStep,
    entry_intent: entryIntent,
    identity_mode: rawIdentityMode || null,
    worker_name: anonymous ? "" : submitterInput,
    worker_team: anonymous ? "" : workerTeam,
    worker_phone_last4: anonymous ? "" : workerPhoneLast4,
    worker_employee_no: anonymous ? "" : workerEmployeeNo,
    confirmation_sources: confirmationSources,
    checked_sources: checkedSources,
    daily_summary_snapshot: richiDailySummarySnapshot,
    company_confirm_snapshot: richiCompanyConfirmSnapshot,
    risk_share_snapshot: riskShareSnapshot,
    signature_confirmation_method: signatureConfirmationMethod || null,
    signature_confirmation_label: signatureConfirmationLabel || null,
    signature_confirmation_snapshot_json: signatureSnapshotPayload,
    handwritten_signature_signed_at: handwrittenSignatureSignedAt || null,
    signature_metadata: signatureMetadata,
    signature_data_url_present: Boolean(handwrittenSignatureDataUrl),
    ...(handwrittenSignatureDataUrl
      ? { handwritten_signature_data_url: handwrittenSignatureDataUrl }
      : {}),
  };
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

  if (!title || !content || !shareConfirmationIdentityReady) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "missing_required",
      company: company.code,
    });
  }

    if (company.source === "tenant_registry") {
      const finalContent = buildSupabaseFirstFieldParticipationContent({
        content,
        sharedRiskSummary,
        riskCheck,
        riskAssessmentCheck,
        safetyMeasureCheck,
        identityMode,
        anonymous,
        workerTeam,
        workerPhoneLast4,
        workerEmployeeNo,
        submitter,
        evidenceFiles,
        uploadedFiles,
        confirmationType,
        confirmationStatus,
        sourceStep,
        entryIntent,
        submissionType,
        processingStatus,
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
        notion_page_id: null,
        notion_url: null,
        file_urls: uploadedFiles.map((file) => file.url),
        raw_payload: {
          ...workerConfirmationLedgerPayload,
          ...handwrittenSignatureRawPayload,
          source: "supabase_first_field_participation_submit_v1",
          clientSubmissionId,
          identityMode,
          workerName: anonymous ? "" : submitterInput,
          workerTeam: anonymous ? "" : workerTeam,
          workerPhoneLast4: anonymous ? "" : workerPhoneLast4,
          workerEmployeeNo: anonymous ? "" : workerEmployeeNo,
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
          tenantRegistry: {
            status: company.status,
            serviceMode: company.serviceMode,
            enabledModules: company.enabledModules,
          },
          uploadedFiles: uploadedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      });

      if (!supabaseResult.ok) {
        return redirectTo(req, "/field/participation/submitted", {
          status: "supabase_error",
          company: company.code,
          message: String(supabaseResult.status || "insert_failed"),
          detail: supabaseResult.message?.slice(0, 120) ?? "",
        });
      }

      if (uploadedFiles.length > 0) {
        const fieldParticipationSourceRecordId =
          getSupabaseInsertedRecordId(supabaseResult.data) ?? (clientSubmissionId || null);

        const evidenceResult = await insertEvidenceItemMetadataRecords(
          uploadedFiles.map((file) => ({
            company_code: company.code,
            company_name: company.name,
            site_id: null,
            site_name: location || null,
            source_type: "field_participation",
            source_record_table: "field_participation_submissions",
            source_record_id: fieldParticipationSourceRecordId,
            submission_type: submissionType,
            file_url: file.url,
            file_name: file.name,
            file_mime_type: file.type || null,
            file_size: file.size,
            evidence_role: getFieldParticipationEvidenceRole(submissionType),
            storage_provider: "vercel_blob",
            submitted_at: new Date().toISOString(),
            submitted_by_label: submitter,
            anonymous,
            raw_payload: {
              source: "supabase_first_field_participation_submit_v1",
              clientSubmissionId,
              reportedDate,
              sourceStep,
              entryIntent,
              confirmationType,
              confirmationStatus,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            },
          }))
        );

        if (!evidenceResult.ok) {
          console.warn("[field-participation-submit] supabase-first evidence_items metadata insert failed", {
            companyCode: company.code,
            submissionType,
            uploadedFileCount: uploadedFiles.length,
            status: evidenceResult.status,
            statusText: evidenceResult.statusText,
            message: evidenceResult.message,
          });
        }
      }

      return redirectTo(req, "/field/participation/submitted", {
        status: "saved",
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

  const inlineMetaLines: string[] = [
    `식별 모드: ${identityMode}`,
  ];

  if (!anonymous && workerTeam) {
    inlineMetaLines.push(`소속/작업조: ${workerTeam}`);
  }

  if (!anonymous && workerPhoneLast4) {
    inlineMetaLines.push(`휴대폰 뒷4자리: ${workerPhoneLast4}`);
  }

  if (!anonymous && workerEmployeeNo) {
    inlineMetaLines.push(`사번/식별번호: ${workerEmployeeNo}`);
  }

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
          ...workerConfirmationLedgerPayload,
          ...handwrittenSignatureRawPayload,
          clientSubmissionId,
          identityMode,
          workerName: anonymous ? "" : submitterInput,
          workerTeam: anonymous ? "" : workerTeam,
          workerPhoneLast4: anonymous ? "" : workerPhoneLast4,
          workerEmployeeNo: anonymous ? "" : workerEmployeeNo,
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

      if (supabaseResult.ok && uploadedFiles.length > 0) {
        const fieldParticipationSourceRecordId =
          getSupabaseInsertedRecordId(supabaseResult.data) ??
          notionPageId ??
          (clientSubmissionId || null);

        const evidenceResult = await insertEvidenceItemMetadataRecords(
          uploadedFiles.map((file) => ({
            company_code: company.code,
            company_name: company.name,
            site_id: null,
            site_name: location || null,
            source_type: "field_participation",
            source_record_table: "field_participation_submissions",
            source_record_id: fieldParticipationSourceRecordId,
            submission_type: submissionType,
            file_url: file.url,
            file_name: file.name,
            file_mime_type: file.type || null,
            file_size: file.size,
            evidence_role: getFieldParticipationEvidenceRole(submissionType),
            storage_provider: "vercel_blob",
            submitted_at: new Date().toISOString(),
            submitted_by_label: submitter,
            anonymous,
            raw_payload: {
              clientSubmissionId,
              notionPageId,
              notionUrl,
              reportedDate,
              sourceStep,
              entryIntent,
              confirmationType,
              confirmationStatus,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            },
          }))
        );

        if (!evidenceResult.ok) {
          console.warn("[field-participation-submit] evidence_items metadata insert failed", {
            companyCode: company.code,
            submissionType,
            uploadedFileCount: uploadedFiles.length,
            status: evidenceResult.status,
            statusText: evidenceResult.statusText,
            message: evidenceResult.message,
          });
        }
      }

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
