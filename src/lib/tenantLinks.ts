type TenantLike = {
  code?: string | null;
  name?: string | null;
};

const TBM_FORM_URLS: Record<string, string> = {
  daedo:
    process.env.NEXT_PUBLIC_DAEDO_TBM_FORM_URL ||
    "https://www.notion.so/495ff98dcded498ca2311d4286135603?v=1b757b2e91454827b38fabac38a702c9",
  bubblemon:
    process.env.NEXT_PUBLIC_BUBBLEMON_TBM_FORM_URL ||
    "https://www.notion.so/67d050dc3b0f4d3f9098af9abf0c8813?v=b3283e3c5de948f5908f2fef607855f4",
};

export function getTbmFormUrl(company?: TenantLike | null): string | null {
  const code = String(company?.code ?? "").trim().toLowerCase();

  if (!code) {
    return null;
  }

  return TBM_FORM_URLS[code] || null;
}
