import { headers } from "next/headers";

export type CompanyConfig = {
  code: string;
  name: string;
  notionApiKey: string;
  tbmDbId: string;
  ebmDbId: string;
  ptwDbId: string;
  koshaMasterDbId?: string;
  koshaCompanyDbId?: string;
};

export async function getCompanyCodeFromRequest(): Promise<string> {
  const h = await headers();
  return h.get("x-company-code") ?? "daedo";
}

export async function getCompanyConfig(): Promise<CompanyConfig> {
  const code = await getCompanyCodeFromRequest();

  if (code !== "daedo") {
    throw new Error(`Unknown companyCode: ${code}`);
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  if (!notionApiKey) throw new Error("Missing env: NOTION_API_KEY");

  return {
    code,
    name: "㈜대도환경",
    notionApiKey,
    tbmDbId: process.env.NOTION_TBM_DB_ID!,
    ebmDbId: process.env.NOTION_EBM_DB_ID!,
    ptwDbId: process.env.NOTION_PTW_DB_ID!,
    koshaMasterDbId: process.env.NOTION_KOSHA_MASTER_DB_ID,
    koshaCompanyDbId: process.env.NOTION_KOSHA_COMPANY_DB_ID,
  };
}