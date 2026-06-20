import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import {
  getTenantRegistryConfigByCode,
  insertFieldParticipationSubmissionShadowRecord,
} from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const ANONYMOUS_FEEDBACK_TYPES = new Set([
  "불편사항",
  "개선제안",
  "위험제보",
  "아차사고",
  "기타",
]);

const MAX_EVIDENCE_FILES = 5;
const MAX_SERVER_FILE_SIZE_BYTES = 4 * 1024 * 1024;

type UploadedAnonymousFeedbackFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function normalizeFeedbackType(value: string) {
  return ANONYMOUS_FEEDBACK_TYPES.has(value) ? value : "기타";
}

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function sanitizeFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return safeName || "anonymous-feedback-file";
}

async function uploadAnonymousEvidenceFiles(files: File[], companyCode: string, reportedDate: string) {
  const uploadedFiles: UploadedAnonymousFeedbackFile[] = [];

  if (!process.env.BLOB_READ_WRITE_TOKEN || files.length === 0) {
    return uploadedFiles;
  }

  for (const file of files.slice(0, MAX_EVIDENCE_FILES)) {
    if (file.size > MAX_SERVER_FILE_SIZE_BYTES) {
      continue;
    }

    const fileName = sanitizeFileName(file.name);
    const blob = await put(
      `field-anonymous-feedback/${companyCode}/${reportedDate}/${Date.now()}-${fileName}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      },
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

function redirectTo(req: NextRequest, pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, req.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, { status: 303 });
}

function toLegacyFieldVoiceType(submissionType: string) {
  if (submissionType === "위험제보") return "위험 제보";
  if (submissionType === "개선제안") return "개선 제안";
  return submissionType;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const companyCode = normalizeCompanyCode(getFormText(formData, "companyCode"));
  const feedbackType = normalizeFeedbackType(getFormText(formData, "feedbackType"));
  const location = getFormText(formData, "location").slice(0, 120);
  const content = getFormText(formData, "content").slice(0, 1900);
  const reportedDate = getTodayDateValue();
  const evidenceFiles = formData.getAll("evidenceFiles").filter(isFile);

  if (!companyCode) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "tenant_required",
    });
  }

  if (content.length < 2) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "content_required",
      companyCode,
    });
  }

  const tenant = await getTenantRegistryConfigByCode(companyCode).catch(() => null);

  if (!tenant) {
    return redirectTo(req, "/field/participation/submitted", {
      status: "unknown_company",
      companyCode,
    });
  }

  const uploadedFiles = await uploadAnonymousEvidenceFiles(evidenceFiles, companyCode, reportedDate);
  const title = `익명 ${feedbackType}`;

  await insertFieldParticipationSubmissionShadowRecord({
    tenant_code: tenant.code,
    company_name: tenant.name,
    submission_type: feedbackType,
    legacy_type: toLegacyFieldVoiceType(feedbackType),
    title,
    content,
    location,
    submitter: "익명",
    anonymous: true,
    reported_date: reportedDate,
    status: "접수",
    notion_page_id: null,
    notion_url: null,
    file_urls: uploadedFiles.map((file) => file.url),
    raw_payload: {
      ledger_schema: "anonymous_worker_feedback_raw_payload_v1",
      source: "anonymous_worker_feedback_v1",
      source_route: "/field/anonymous-feedback",
      tenant_code: tenant.code,
      company_name: tenant.name,
      submission_type: feedbackType,
      identityMode: "anonymous",
      identity_mode: "anonymous",
      anonymous: true,
      signature_required: false,
      signature_data_url_present: false,
      location,
      content,
      file_count: evidenceFiles.length,
      uploaded_file_count: uploadedFiles.length,
      uploaded_files: uploadedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url_present: Boolean(file.url),
      })),
      submitted_at: new Date().toISOString(),
    },
  });

  return redirectTo(req, "/field/participation/submitted", {
    status: "anonymous_feedback_received",
    companyCode: tenant.code,
  });
}
