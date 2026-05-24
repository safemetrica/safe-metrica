import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

import {
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorSubmissionItemById,
} from "@/lib/contractorRelation";

type UploadedEvidenceFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

function isMonsContractorTokenValid(token?: string) {
  const expectedToken = process.env.MONS_CONTRACTOR_TOKEN;
  return Boolean(expectedToken && token === expectedToken);
}

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function sanitizeFileName(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return safeName || "evidence-file";
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
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, { status: 303 });
}

async function uploadEvidenceFiles(files: File[], itemId: string) {
  const uploadedFiles: UploadedEvidenceFile[] = [];

  if (!process.env.BLOB_READ_WRITE_TOKEN || files.length === 0) {
    return uploadedFiles;
  }

  for (const file of files.slice(0, 10)) {
    const fileName = sanitizeFileName(file.name);
    const blob = await put(
      `contractor-submissions/bubblemon/mons/${itemId}/${Date.now()}-${fileName}`,
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

function buildEvidenceMemo(params: {
  evidenceMemo: string;
  files: File[];
  uploadedFiles: UploadedEvidenceFile[];
}) {
  const lines: string[] = [];

  lines.push(params.evidenceMemo || "증빙 메모 미입력");

  if (params.files.length > 0) {
    lines.push("");
    lines.push("촬영/첨부 파일명:");
    params.files.forEach((file) => {
      lines.push(`- ${file.name} (${Math.round(file.size / 1024)}KB)`);
    });
  }

  if (params.uploadedFiles.length > 0) {
    lines.push("");
    lines.push("세메앱 저장 파일 URL:");
    params.uploadedFiles.forEach((file) => {
      lines.push(`- ${file.name}: ${file.url}`);
    });
  } else if (params.files.length > 0) {
    lines.push("");
    lines.push("파일 URL: BLOB_READ_WRITE_TOKEN 설정 후 자동 저장됩니다.");
  }

  return lines.join("\n").slice(0, 1900);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const token = getFormText(formData, "token");
  const itemId = getFormText(formData, "itemId");

  if (!isMonsContractorTokenValid(token)) {
    return redirectTo(req, "/login", { error: "invalid_contractor_token" });
  }

  const item = getContractorSubmissionItemById(itemId);

  if (!item) {
    return redirectTo(req, "/contractor/mons", { token });
  }

  const workDate = getFormText(formData, "workDate");
  const workName = getFormText(formData, "workName");
  const siteArea = getFormText(formData, "siteArea");
  const submitterName = getFormText(formData, "submitterName");
  const contact = getFormText(formData, "contact");
  const submissionContent = getFormText(formData, "submissionContent");
  const evidenceMemo = getFormText(formData, "evidenceMemo");
  const evidenceFiles = formData.getAll("evidenceFiles").filter(isFile);

  if (!workDate || !workName || !siteArea || !submitterName || !contact || !submissionContent) {
    return redirectTo(req, "/contractor/mons/submit", {
      token,
      item: item.id,
      error: "missing_required",
    });
  }

  const uploadedFiles = await uploadEvidenceFiles(evidenceFiles, item.id);
  const finalEvidenceMemo = buildEvidenceMemo({
    evidenceMemo,
    files: evidenceFiles,
    uploadedFiles,
  });

  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_CONTRACTOR_SUBMISSIONS_DB_ID;

  let storageStatus: "saved" | "received" = "received";

  if (notionApiKey && databaseId) {
    const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
    const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          제출명: titleText(`${contractor.name} ${item.itemType} - ${workName}`),
          tenantCode: richText("bubblemon"),
          principalCode: richText(principal.code),
          contractorCode: richText(contractor.code),
          submissionItemId: richText(item.id),
          제출항목: { select: { name: item.itemType } },
          작업일: { date: { start: workDate } },
          작업명: richText(workName),
          "현장/구역": richText(siteArea),
          제출자: richText(submitterName),
          연락처: { phone_number: contact },
          제출내용: richText(submissionContent),
          증빙메모: richText(finalEvidenceMemo),
          제출상태: { select: { name: "제출완료" } },
          원청검토상태: { select: { name: "미검토" } },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return redirectTo(req, "/contractor/mons/submitted", {
        token,
        item: item.id,
        status: "notion_error",
        message: String(response.status),
        detail: text.slice(0, 120),
      });
    }

    storageStatus = "saved";
  }

  return redirectTo(req, "/contractor/mons/submitted", {
    token,
    item: item.id,
    status: storageStatus,
  });
}
