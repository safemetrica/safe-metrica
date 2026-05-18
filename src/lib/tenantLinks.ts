type TenantLike = {
  code?: string | null;
  name?: string | null;
};

const TBM_FORM_URLS: Record<string, string> = {
  daedo:
    process.env.NEXT_PUBLIC_DAEDO_TBM_FORM_URL ||
    "https://www.notion.so/495ff98dcded498ca2311d4286135603?v=d6a0c01a3a5944a6958b84caa58bf996",
};

export function getTbmFormUrl(company?: TenantLike | null): string | null {
  const code = String(company?.code ?? "").trim().toLowerCase();

  if (!code) {
    return null;
  }

  return TBM_FORM_URLS[code] || null;
}
