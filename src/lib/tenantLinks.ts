type TenantLike = {
  code?: string | null;
  name?: string | null;
  tbmDbId?: string | null;
};

function normalizeNotionDatabaseId(value?: string | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  const compact = raw.replace(/-/g, "");

  if (!/^[a-f0-9]{32}$/i.test(compact)) {
    return "";
  }

  return compact;
}

export function getTbmFormUrl(company?: TenantLike | null): string | null {
  const tbmDbId = normalizeNotionDatabaseId(company?.tbmDbId);

  if (!tbmDbId) {
    return null;
  }

  return `https://www.notion.so/${tbmDbId}`;
}
