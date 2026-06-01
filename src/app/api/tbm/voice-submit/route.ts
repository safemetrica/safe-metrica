import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getCompanyConfig, TenantRequiredError, UnknownCompanyError } from "@/lib/company";

const SUPPORTED_COMPANY_CODES = new Set(["daedo", "bubblemon", "hankookgreen", "dongwoo"]);
const MAX_TBM_FILES = 6;
const MAX_SERVER_FILE_SIZE_BYTES = 8 * 1024 * 1024;

type UploadedTbmFile = {
  name: string;
  url: string;
};

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
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

function notionRichText(content: string) {
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

function notionTitle(content: string) {
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

function findPropertyName(
  properties: Record<string, any>,
  candidates: string[],
  expectedType?: string
) {
  for (const name of candidates) {
    const property = properties[name];

    if (!property) continue;

    if (!expectedType || property.type === expectedType) {
      return name;
    }
  }

  if (expectedType) {
    const found = Object.entries(properties).find(([, property]) => (property as any)?.type === expectedType);
    return found?.[0] ?? null;
  }

  return null;
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
    const text = await res.text();
    throw new Error(`TBM database metadata failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  return data?.properties ?? {};
}

async function uploadTbmFiles(files: File[], companyCode: string, dateValue: string) {
  const uploadedFiles: UploadedTbmFile[] = [];

  if (!process.env.BLOB_READ_WRITE_TOKEN || files.length === 0) {
    return uploadedFiles;
  }

  for (const file of files.slice(0, MAX_TBM_FILES)) {
    const fileName = sanitizeFileName(file.name || "tbm-photo.jpg");
    const path = `tbm/${companyCode}/${dateValue}/${Date.now()}-${fileName}`;

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

function buildTbmMemo(params: {
  companyName: string;
  transcript: string;
  draftText: string;
  uploadedFiles: UploadedTbmFile[];
}) {
  const lines: string[] = [];

  lines.push("[SafeMetrica 음성 TBM]");
  lines.push(`사업장: ${params.companyName}`);
  lines.push("");
  lines.push("[인식된 음성]");
  lines.push(params.transcript || "미입력");
  lines.push("");
  lines.push("[TBM 정리 내용]");
  lines.push(params.draftText || "미입력");

  if (params.uploadedFiles.length > 0) {
    lines.push("");
    lines.push("[첨부 사진]");
    params.uploadedFiles.forEach((file, index) => {
      lines.push(`${index + 1}. ${file.name} - ${file.url}`);
    });
  }

  return lines.join("\n").slice(0, 1900);
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
  const dateValue = getTodayDateValue();
  const files = formData.getAll("tbmFiles").filter(isFile);

  if (!transcript && !draftText) {
    return NextResponse.json(
      { ok: false, error: "missing_content", message: "음성 인식 내용이 없습니다." },
      { status: 400 }
    );
  }

  const oversizedFile = files.find((file) => file.size > MAX_SERVER_FILE_SIZE_BYTES);

  if (oversizedFile) {
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

  let uploadedFiles: UploadedTbmFile[] = [];

  try {
    uploadedFiles = await uploadTbmFiles(files, company.code, dateValue);
  } catch {
    return NextResponse.json(
      { ok: false, error: "file_upload_error", message: "사진 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const memo = buildTbmMemo({
    companyName: company.name,
    transcript,
    draftText,
    uploadedFiles,
  });

  const propertiesMeta = await getTbmDbProperties(notionApiKey, company.tbmDbId);

  const titleProp = findPropertyName(propertiesMeta, ["작업명", "제목", "Name", "이름"], "title");
  const dateProp = findPropertyName(propertiesMeta, ["날짜", "작성일", "일자", "TBM일자"], "date");
  const contentProp = findPropertyName(propertiesMeta, ["TBM 내용", "내용", "작업내용", "안전수칙", "주의사항", "특이사항"], "rich_text");
  const routeProp = findPropertyName(propertiesMeta, ["제출경로", "작성방식", "입력경로"], "rich_text");
  const fileProp = findPropertyName(propertiesMeta, ["사진/파일", "사진", "첨부", "첨부파일", "현장사진", "증빙사진"], "files");

  if (!titleProp) {
    return NextResponse.json(
      { ok: false, error: "missing_title_property", message: "TBM DB의 제목 속성을 찾지 못했습니다." },
      { status: 500 }
    );
  }

  const properties: Record<string, any> = {
    [titleProp]: notionTitle(`음성 TBM - ${dateValue}`),
  };

  if (dateProp) {
    properties[dateProp] = {
      date: {
        start: dateValue,
      },
    };
  }

  if (contentProp) {
    properties[contentProp] = notionRichText(memo);
  }

  if (routeProp) {
    properties[routeProp] = notionRichText("voice-tbm-direct-submit");
  }

  if (fileProp && uploadedFiles.length > 0) {
    properties[fileProp] = {
      files: uploadedFiles.map((file) => ({
        name: file.name,
        external: {
          url: file.url,
        },
      })),
    };
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

  return NextResponse.json({
    ok: true,
    pageId: createData?.id,
    uploadedFileCount: uploadedFiles.length,
    message: uploadedFiles.length > 0 ? "TBM 내용과 사진이 저장되었습니다." : "TBM 내용이 저장되었습니다.",
  });
}
