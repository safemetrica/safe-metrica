import "server-only";

import { cookies, headers } from "next/headers";

export type CompanyConfig = {
  code: string;
  name: string;
  notionApiKey: string;
  tbmDbId: string;
  ebmDbId: string;
  ptwDbId: string;
  adminEvidenceDbId?: string;
  fieldVoiceDbId?: string;
  listeningDbId?: string;
  riskAssessmentDbId?: string;

  industryTag?: string;
  safetyCaseEnabled?: boolean;
  safetyCaseMode?: "tenant-aware" | "common-only" | "manual";
};

export class TenantRequiredError extends Error {
  constructor() {
    super("TENANT_REQUIRED");
    this.name = "TenantRequiredError";
  }
}

export class UnknownCompanyError extends Error {
  constructor(code: string) {
    super(`UNKNOWN_OR_INACTIVE_COMPANY:${code}`);
    this.name = "UnknownCompanyError";
  }
}

function normalizeCompanyCode(code: string): string {
  return code.trim().toLowerCase();
}

function resolveCompanyCodeAlias(code: string): string {
  const normalized = normalizeCompanyCode(code);

  if (
    normalized === "korea-green" ||
    normalized === "korea_green" ||
    normalized === "koreagreen" ||
    normalized === "greenkorea" ||
    normalized === "hankookgreen"
  ) {
    return "hankookgreen";
  }

  return normalized;
}

function assertSafeCompanyCode(code: string): string {
  const normalized = resolveCompanyCodeAlias(code);

  if (!/^[a-z0-9_-]{2,50}$/.test(normalized)) {
    throw new UnknownCompanyError(normalized || "empty");
  }

  return normalized;
}

function getCompanyRowQueryCodes(code: string) {
  if (code === "hankookgreen") {
    return ["hankookgreen", "greenkorea", "korea-green", "korea_green", "koreagreen"];
  }

  return [code];
}

function getFieldVoiceDbIdFallback(code: string) {
  if (code === "daedo") return process.env.DAEDO_FIELD_VOICE_DB_ID;
  if (code === "dongwoo") return process.env.DONGWOO_FIELD_VOICE_DB_ID;
  if (code === "korea-green" || code === "greenkorea" || code === "hankookgreen") return process.env.KOREA_GREEN_FIELD_VOICE_DB_ID;
  if (code === "bubblemon") return process.env.BUBBLEMON_FIELD_VOICE_DB_ID;
  return undefined;
}

const TENANT_TOKEN_ENV_BY_COMPANY: Record<string, string> = {
  daedo: "DAEDO_TENANT_TOKEN",
  bubblemon: "BUBBLEMON_TENANT_TOKEN",
};

function getExpectedTenantToken(companyCode: string) {
  const envName = TENANT_TOKEN_ENV_BY_COMPANY[companyCode];
  return envName ? process.env[envName] : undefined;
}

function requiresTenantToken(companyCode: string) {
  return companyCode in TENANT_TOKEN_ENV_BY_COMPANY;
}

export async function getCompanyCodeFromRequest(): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    const h = await headers();
    const fromHeader = h.get("x-company-code");

    if (fromHeader) {
      return assertSafeCompanyCode(fromHeader);
    }
  }

  const c = await cookies();
  const fromCookie = c.get("sm_company_code")?.value;

  if (fromCookie) {
    const companyCode = assertSafeCompanyCode(fromCookie);

    if (requiresTenantToken(companyCode)) {
      const tenantToken = c.get("sm_tenant_token")?.value;
      const expectedToken = getExpectedTenantToken(companyCode);

      if (!expectedToken || tenantToken !== expectedToken) {
        throw new TenantRequiredError();
      }
    }

    return companyCode;
  }

  // 운영 환경에서는 절대 daedo fallback 금지.
  // tenant가 없으면 데이터 노출 방지를 위해 명시적으로 실패시킨다.
  if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_COMPANY_CODE) {
    return assertSafeCompanyCode(process.env.DEFAULT_COMPANY_CODE);
  }

  throw new TenantRequiredError();
}

type NotionProperty = {
  rich_text?: Array<{ plain_text?: string }>;
  title?: Array<{ plain_text?: string }>;
  select?: { name?: string };
  checkbox?: boolean;
};

function getTextPropPlainText(prop: NotionProperty | undefined): string {
  return prop?.rich_text?.[0]?.plain_text?.trim() ?? "";
}

function getTitlePropPlainText(prop: NotionProperty | undefined): string {
  return prop?.title?.[0]?.plain_text?.trim() ?? "";
}

function getSelectPropName(prop: NotionProperty | undefined): string {
  return prop?.select?.name?.trim() ?? "";
}

function getCheckboxPropValue(prop: NotionProperty | undefined): boolean | undefined {
  if (typeof prop?.checkbox === "boolean") {
    return prop.checkbox;
  }

  return undefined;
}

async function queryCompanyRow(code: string) {
  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    throw new Error("Missing env: NOTION_API_KEY");
  }

  const companiesDbId = process.env.NOTION_COMPANIES_DB_ID;

  if (!companiesDbId) {
    throw new Error("Missing env: NOTION_COMPANIES_DB_ID");
  }

  const queryCodes = getCompanyRowQueryCodes(code);

  for (const queryCode of queryCodes) {
    const res = await fetch(`https://api.notion.com/v1/databases/${companiesDbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: "companyCode",
              rich_text: {
                equals: queryCode,
              },
            },
            {
              property: "active",
              checkbox: {
                equals: true,
              },
            },
          ],
        },
        page_size: 1,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Companies DB query failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    const row = data?.results?.[0] ?? null;

    if (row) {
      return row;
    }
  }

  return null;
}

export async function getCompanyConfigByCode(rawCode: string): Promise<CompanyConfig> {
  const code = assertSafeCompanyCode(rawCode);

  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    throw new Error("Missing env: NOTION_API_KEY");
  }

  const row = await queryCompanyRow(code);

  if (!row) {
    throw new UnknownCompanyError(code);
  }

  const props = row.properties;

  const name = getTitlePropPlainText(props["Company"]) || code;

  const tbmDbId = getTextPropPlainText(props["tbmDbId"]);
  const ebmDbId = getTextPropPlainText(props["ebmDbId"]);
  const ptwDbId = getTextPropPlainText(props["ptwDbId"]);

  if (!tbmDbId) {
    throw new Error(`Missing tbmDbId for ${code}`);
  }

  if (!ebmDbId) {
    throw new Error(`Missing ebmDbId for ${code}`);
  }

  if (!ptwDbId) {
    throw new Error(`Missing ptwDbId for ${code}`);
  }

  const adminEvidenceDbId =
    getTextPropPlainText(props["adminEvidenceDbId"]) || undefined;
  const fieldVoiceDbId =
    getTextPropPlainText(props["fieldVoiceDbId"]) ||
    getFieldVoiceDbIdFallback(code) ||
    undefined;
  const listeningDbId =
    getTextPropPlainText(props["listeningDbId"]) || undefined;
  const riskAssessmentDbId =
  getTextPropPlainText(props["riskAssessmentDbId"]) ||
  (code === "daedo" ? process.env.NOTION_DAEDO_RISK_ASSESSMENT_DB_ID : undefined);

  const industryTag =
    getSelectPropName(props["industryTag"]) ||
    getTextPropPlainText(props["industryTag"]) ||
    "공통";

  const safetyCaseEnabled =
    getCheckboxPropValue(props["safetyCaseEnabled"]) ?? true;

  const rawSafetyCaseMode =
    getSelectPropName(props["safetyCaseMode"]) ||
    getTextPropPlainText(props["safetyCaseMode"]) ||
    "tenant-aware";

  const safetyCaseMode =
    rawSafetyCaseMode === "common-only" ||
    rawSafetyCaseMode === "manual" ||
    rawSafetyCaseMode === "tenant-aware"
      ? rawSafetyCaseMode
      : "tenant-aware";

  return {
    code,
    name,
    notionApiKey,
    tbmDbId,
    ebmDbId,
    ptwDbId,
    adminEvidenceDbId,
    fieldVoiceDbId,
    listeningDbId,
    riskAssessmentDbId,
    industryTag,
    safetyCaseEnabled,
    safetyCaseMode,
  };
}

export async function getCompanyConfig(): Promise<CompanyConfig> {
  const code = await getCompanyCodeFromRequest();
  return getCompanyConfigByCode(code);
}