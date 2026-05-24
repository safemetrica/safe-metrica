import { NextRequest, NextResponse } from "next/server";

import {
  TenantRequiredError,
  UnknownCompanyError,
  getCompanyConfig,
  getCompanyConfigByCode,
} from "@/lib/company";

const FIELD_VOICE_TYPES = new Set(["위험 제보", "아차사고", "개선 제안", "기타"]);

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getFormChecked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
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
  riskCheck: boolean;
  riskAssessmentCheck: boolean;
  safetyMeasureCheck: boolean;
}) {
  const lines: string[] = [];

  lines.push(params.content);

  lines.push("");
  lines.push("[위험성평가 공유 확인]");
  lines.push(`- 오늘 작업의 주요 위험요인 확인: ${params.riskCheck ? "확인" : "미확인"}`);
  lines.push(`- 위험성평가 주요 내용 공유: ${params.riskAssessmentCheck ? "확인" : "미확인"}`);
  lines.push(`- 필요한 안전조치와 주의사항 확인: ${params.safetyMeasureCheck ? "확인" : "미확인"}`);

  return lines.join("\n").slice(0, 1900);
}

}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

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
  const type = FIELD_VOICE_TYPES.has(rawType) ? rawType : "기타";
  const reportedDate = getFormText(formData, "reportedDate") || getTodayDateValue();
  const location = getFormText(formData, "location");
  const anonymous = getFormChecked(formData, "anonymous");
  const submitterInput = getFormText(formData, "submitter");
  const submitter = anonymous ? "익명" : submitterInput || "미입력";
  const content = getFormText(formData, "content");

  const riskCheck = getFormChecked(formData, "riskCheck");
  const riskAssessmentCheck = getFormChecked(formData, "riskAssessmentCheck");
  const safetyMeasureCheck = getFormChecked(formData, "safetyMeasureCheck");

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

  const properties: Record<string, unknown> = {
    "의견 제목": titleText(title),
    "의견 유형": { select: { name: type } },
    등록일: { date: { start: reportedDate } },
    "위치/구역": richText(location),
    내용: richText(finalContent),
    처리상태: { select: { name: "접수" } },
  };

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

  return redirectTo(req, "/field/participation/submitted", {
    status: "saved",
    company: company.code,
  });
}
