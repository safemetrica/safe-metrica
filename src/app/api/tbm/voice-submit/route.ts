import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getCompanyConfig, TenantRequiredError, UnknownCompanyError } from "@/lib/company";

const SUPPORTED_COMPANY_CODES = new Set(["daedo", "bubblemon", "hankookgreen", "dongwoo"]);
const MAX_FILES_PER_GROUP = 6;
const MAX_SERVER_FILE_SIZE_BYTES = 8 * 1024 * 1024;

type UploadedTbmFile = {
  name: string;
  url: string;
};

function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function getTodayDateValue() {
  return getKstNow().toISOString().slice(0, 10);
}

function getTimeValue() {
  return getKstNow().toISOString().slice(11, 16);
}

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^\w가-힣.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
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

function selectValue(name: string) {
  return {
    select: {
      name,
    },
  };
}

function multiSelectValue(names: string[]) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean))).slice(0, 8);

  return {
    multi_select: uniqueNames.map((name) => ({ name })),
  };
}

function filesValue(files: UploadedTbmFile[]) {
  return {
    files: files.map((file) => ({
      name: file.name,
      external: {
        url: file.url,
      },
    })),
  };
}

function hasProp(propertiesMeta: Record<string, any>, name: string, type?: string) {
  const prop = propertiesMeta[name];

  if (!prop) return false;
  if (!type) return true;

  return prop.type === type;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferWorkTitle(transcript: string) {
  const text = transcript.replace(/\s+/g, " ").trim();

  if (includesAny(text, ["생활폐기물", "수거", "운반", "골목"])) {
    return "생활폐기물 수거·운반 작업 전 TBM";
  }

  if (includesAny(text, ["지게차", "상하차", "적재", "하차"])) {
    return "지게차·상하차 작업 전 TBM";
  }

  if (includesAny(text, ["청소", "정비", "컨베이어", "끼임", "협착"])) {
    return "정비·청소 작업 전 TBM";
  }

  if (includesAny(text, ["용접", "화재", "불티"])) {
    return "화재위험 작업 전 TBM";
  }

  return "현장 작업 전 TBM";
}

function inferWorkType(transcript: string) {
  const text = transcript.replace(/\s+/g, " ");

  if (includesAny(text, ["생활폐기물", "수거", "운반"])) return "생활폐기물 수거·운반";
  if (includesAny(text, ["지게차", "상하차", "적재", "하차"])) return "상·하차";
  if (includesAny(text, ["정비", "청소", "점검"])) return "정비·점검";
  if (includesAny(text, ["용접", "불티"])) return "용접·화기";
  if (includesAny(text, ["분류", "선별"])) return "선별·분류";

  return "일반작업";
}

function inferRiskTags(transcript: string) {
  const text = transcript.replace(/\s+/g, " ");
  const risks: string[] = [];

  if (includesAny(text, ["차량", "후진", "운전", "골목", "서행", "카메라"])) {
    risks.push("차량 충돌", "후진 충돌", "사각지대");
  }

  if (includesAny(text, ["지게차", "상하차", "적재", "하차"])) {
    risks.push("지게차 충돌", "낙하·맞음");
  }

  if (includesAny(text, ["끼임", "협착", "찔림", "베임", "압착"])) {
    risks.push("끼임·협착", "찔림·베임");
  }

  if (includesAny(text, ["미끄럼", "침출수", "바닥", "우천", "비"])) {
    risks.push("미끄럼·전도");
  }

  if (includesAny(text, ["화재", "용접", "불티", "배터리", "충전"])) {
    risks.push("화재·폭발");
  }

  if (includesAny(text, ["추락", "고소", "사다리", "계단"])) {
    risks.push("추락");
  }

  if (risks.length === 0) {
    risks.push("작업 전 안전확인");
  }

  return Array.from(new Set(risks));
}

function inferWorkTags(transcript: string) {
  const text = transcript.replace(/\s+/g, " ");
  const tags: string[] = [];

  if (includesAny(text, ["생활폐기물", "수거", "운반"])) tags.push("생활폐기물");
  if (includesAny(text, ["차량", "후진", "운전", "서행"])) tags.push("차량작업");
  if (includesAny(text, ["지게차", "상하차"])) tags.push("지게차");
  if (includesAny(text, ["끼임", "협착", "찔림", "베임"])) tags.push("협착·베임");
  if (includesAny(text, ["사진", "증빙", "확인"])) tags.push("사진증빙");

  if (tags.length === 0) tags.push("일반 TBM");

  return tags;
}

function buildSafetyNotice(transcript: string) {
  const risks = inferRiskTags(transcript);
  const lines: string[] = [];

  lines.push("[음성 TBM 직접저장]");
  lines.push("");
  lines.push("[작업 내용]");
  lines.push(transcript || "작업 전 TBM 내용을 음성으로 작성했습니다.");
  lines.push("");
  lines.push("[오늘의 핵심 위험요인]");
  risks.forEach((risk) => lines.push(`- ${risk}`));
  lines.push("");
  lines.push("[근로자 주의사항]");
  lines.push("- 작업 전 보호구 착용상태를 확인합니다.");
  lines.push("- 차량·장비 이동 전 주변 작업자와 보행자 접근 여부를 확인합니다.");
  lines.push("- 이상 상황, 아차사고, 추가 위험요인은 즉시 현장관리자에게 공유합니다.");

  return lines.join("\n");
}

async function uploadFiles(files: File[], companyCode: string, dateValue: string, group: string) {
  const uploadedFiles: UploadedTbmFile[] = [];

  if (!process.env.BLOB_READ_WRITE_TOKEN || files.length === 0) {
    return uploadedFiles;
  }

  for (const file of files.slice(0, MAX_FILES_PER_GROUP)) {
    const fileName = sanitizeFileName(file.name || `${group}.jpg`);
    const path = `tbm/${companyCode}/${dateValue}/${group}/${Date.now()}-${fileName}`;

    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: true,
    });

    uploadedFiles.push({
      name: fileName,
      url: blob.url,
    });
  }

  return uploadedFiles;
}

function collectFiles(formData: FormData, key: string) {
  return formData.getAll(key).filter(isFile);
}

function validateFileSize(fileGroups: File[][]) {
  for (const files of fileGroups) {
    const oversized = files.find((file) => file.size > MAX_SERVER_FILE_SIZE_BYTES);

    if (oversized) {
      return false;
    }
  }

  return true;
}

async function getTbmDbProperties(notionApiKey: string, tbmDbId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${tbmDbId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "TBM database metadata failed");
  }

  const data = await res.json();
  return data?.properties ?? {};
}

export async function POST(req: NextRequest) {
  let company;

  try {
    company = await getCompanyConfig();
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json(
        { ok: false, error: "tenant_required", message: "업체 홈 접속 후 다시 시도하세요." },
        { status: 401 }
      );
    }

    if (error instanceof UnknownCompanyError) {
      return NextResponse.json(
        { ok: false, error: "unknown_company", message: "업체 정보를 확인할 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "company_error", message: "업체 설정 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!SUPPORTED_COMPANY_CODES.has(company.code)) {
    return NextResponse.json(
      { ok: false, error: "unsupported_company", message: "현재 TBM 음성 직접저장은 정식 운영 4개사만 지원합니다." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const transcript = getFormText(formData, "transcript");
  const draftText = getFormText(formData, "draftText");
  const supervisorName = getFormText(formData, "supervisorName") || (company.code === "daedo" ? "김인길" : "현장관리자");

  const signatureFiles = collectFiles(formData, "signatureFiles");
  const siteFiles = collectFiles(formData, "siteFiles");
  const workFiles = collectFiles(formData, "workFiles");
  const actionFiles = collectFiles(formData, "actionFiles");

  if (!transcript && !draftText) {
    return NextResponse.json(
      { ok: false, error: "missing_content", message: "음성 인식 내용이 없습니다." },
      { status: 400 }
    );
  }

  if (!validateFileSize([signatureFiles, siteFiles, workFiles, actionFiles])) {
    return NextResponse.json(
      { ok: false, error: "file_too_large", message: "사진 1장당 8MB 이하로 첨부해 주세요." },
      { status: 413 }
    );
  }

  const notionApiKey = company.notionApiKey || process.env.NOTION_API_KEY;

  if (!notionApiKey || !company.tbmDbId) {
    return NextResponse.json(
      { ok: false, error: "missing_tbm_config", message: "TBM 저장 DB 설정을 확인해 주세요." },
      { status: 500 }
    );
  }

  const dateValue = getTodayDateValue();
  const startTime = getFormText(formData, "startTime") || getTimeValue();
  const endTime = getTimeValue();
  const mainText = transcript || draftText;

  const selectedFileCount =
    signatureFiles.length + siteFiles.length + workFiles.length + actionFiles.length;

  if (selectedFileCount > 0 && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "missing_blob_token", message: "사진 저장 설정이 없습니다. BLOB_READ_WRITE_TOKEN을 확인해 주세요." },
      { status: 500 }
    );
  }

  let uploadedSignatureFiles: UploadedTbmFile[] = [];
  let uploadedSiteFiles: UploadedTbmFile[] = [];
  let uploadedWorkFiles: UploadedTbmFile[] = [];
  let uploadedActionFiles: UploadedTbmFile[] = [];

  try {
    [uploadedSignatureFiles, uploadedSiteFiles, uploadedWorkFiles, uploadedActionFiles] = await Promise.all([
      uploadFiles(signatureFiles, company.code, dateValue, "signature"),
      uploadFiles(siteFiles, company.code, dateValue, "site"),
      uploadFiles(workFiles, company.code, dateValue, "work"),
      uploadFiles(actionFiles, company.code, dateValue, "action"),
    ]);
  } catch {
    return NextResponse.json(
      { ok: false, error: "file_upload_error", message: "사진 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  let meta: Record<string, any>;

  try {
    meta = await getTbmDbProperties(notionApiKey, company.tbmDbId);
  } catch {
    return NextResponse.json(
      { ok: false, error: "notion_meta_error", message: "TBM DB 속성 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const title = inferWorkTitle(mainText);
  const safetyNotice = buildSafetyNotice(mainText);
  const hasSpecialIssue = /특이|조치|고장|위험|아차|사고|파손|누락|불량|미흡/.test(mainText);

  const properties: Record<string, any> = {};

  if (hasProp(meta, "작업명", "title")) properties["작업명"] = titleText(title);
  if (hasProp(meta, "날짜", "date")) properties["날짜"] = { date: { start: dateValue } };
  if (hasProp(meta, "시작시간", "rich_text")) properties["시작시간"] = richText(startTime);
  if (hasProp(meta, "종료시간", "rich_text")) properties["종료시간"] = richText(endTime);
  if (hasProp(meta, "작업 유형", "select")) properties["작업 유형"] = selectValue(inferWorkType(mainText));
  if (hasProp(meta, "작업 태그", "multi_select")) properties["작업 태그"] = multiSelectValue(inferWorkTags(mainText));
  if (hasProp(meta, "핵심 위험요인", "multi_select")) properties["핵심 위험요인"] = multiSelectValue(inferRiskTags(mainText));
  if (hasProp(meta, "오늘의 주의사항", "rich_text")) properties["오늘의 주의사항"] = richText(safetyNotice);
  if (hasProp(meta, "특이사항", "checkbox")) properties["특이사항"] = { checkbox: hasSpecialIssue };
  if (hasProp(meta, "특이사항 내용", "rich_text")) {
    properties["특이사항 내용"] = richText(hasSpecialIssue ? mainText : "특이사항 없음");
  }
  if (hasProp(meta, "조치 상태", "select")) {
    properties["조치 상태"] = selectValue(hasSpecialIssue ? "조치 필요" : "해당 없음");
  }
  if (hasProp(meta, "실시자(현장총괄)", "select")) {
    properties["실시자(현장총괄)"] = selectValue(supervisorName);
  }

  if (hasProp(meta, "서명 사진 (참석자 확인)", "files") && uploadedSignatureFiles.length > 0) {
    properties["서명 사진 (참석자 확인)"] = filesValue(uploadedSignatureFiles);
  }

  if (hasProp(meta, "현장 사진", "files") && uploadedSiteFiles.length > 0) {
    properties["현장 사진"] = filesValue(uploadedSiteFiles);
  }

  if (hasProp(meta, "파일과 미디어", "files") && uploadedWorkFiles.length > 0) {
    properties["파일과 미디어"] = filesValue(uploadedWorkFiles);
  }

  if (hasProp(meta, "조치 사진", "files") && uploadedActionFiles.length > 0) {
    properties["조치 사진"] = filesValue(uploadedActionFiles);
  }

  const createRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: {
        database_id: company.tbmDbId,
      },
      properties,
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "notion_create_error",
        message: createData?.message ?? "TBM 저장 중 Notion 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }

  const uploadedFileCount =
    uploadedSignatureFiles.length + uploadedSiteFiles.length + uploadedWorkFiles.length + uploadedActionFiles.length;

  return NextResponse.json({
    ok: true,
    pageId: createData?.id,
    uploadedFileCount,
    message: uploadedFileCount > 0 ? "TBM 내용과 사진이 기존 양식에 맞게 저장되었습니다." : "TBM 내용이 기존 양식에 맞게 저장되었습니다.",
  });
}
