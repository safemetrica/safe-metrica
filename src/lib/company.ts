import { headers } from "next/headers";

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
};

export async function getCompanyCodeFromRequest(): Promise<string> {
  const h = await headers();
  return h.get("x-company-code") ?? "daedo";
}

function getTextPropPlainText(prop: any): string {
  return prop?.rich_text?.[0]?.plain_text ?? "";
}

function getTitlePropPlainText(prop: any): string {
  return prop?.title?.[0]?.plain_text ?? "";
}

export async function getCompanyConfig(): Promise<CompanyConfig> {
  const code = await getCompanyCodeFromRequest();

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) throw new Error("Missing env: NOTION_API_KEY");

  const companiesDbId = process.env.NOTION_COMPANIES_DB_ID;
  if (!companiesDbId) throw new Error("Missing env: NOTION_COMPANIES_DB_ID");

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
          { property: "companyCode", rich_text: { equals: code } },
          { property: "active", checkbox: { equals: true } },
        ],
      },
      page_size: 1,
    }),
    cache: "no-store",
  });

  const data = await res.json();
  const row = data?.results?.[0];
  if (!row) throw new Error(`Unknown or inactive companyCode: ${code}`);

  const props = row.properties;

  const name = getTitlePropPlainText(props["Company"]) || code;

  const tbmDbId = getTextPropPlainText(props["tbmDbId"]);
  const ebmDbId = getTextPropPlainText(props["ebmDbId"]);
  const ptwDbId = getTextPropPlainText(props["ptwDbId"]);

  if (!tbmDbId) throw new Error(`Missing tbmDbId for ${code}`);
  if (!ebmDbId) throw new Error(`Missing ebmDbId for ${code}`);
  if (!ptwDbId) throw new Error(`Missing ptwDbId for ${code}`);

  const adminEvidenceDbId = getTextPropPlainText(props["adminEvidenceDbId"]) || undefined;
  const fieldVoiceDbId = getTextPropPlainText(props["fieldVoiceDbId"]) || undefined;
  const listeningDbId = getTextPropPlainText(props["listeningDbId"]) || undefined;

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
  };
}