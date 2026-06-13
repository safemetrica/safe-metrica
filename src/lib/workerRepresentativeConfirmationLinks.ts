import "server-only";

import { randomUUID } from "node:crypto";

const TABLE_NAME = "worker_representative_confirmation_links";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WorkerRepresentativeConfirmationLinkStatus = "active" | "revoked";

export type WorkerRepresentativeConfirmationLink = {
  linkId: string;
  companyCode: string;
  siteName: string;
  confirmationScope: string;
  riskAssessmentId: string | null;
  status: WorkerRepresentativeConfirmationLinkStatus;
  expiresAt: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

type CreateParams = {
  companyCode: string;
  siteName: string;
  confirmationScope: string;
  riskAssessmentId?: string | null;
  expiresAt?: string | null;
};

export type CreateWorkerRepresentativeConfirmationLinkResult =
  | { status: "created"; linkId: string }
  | { status: "not_configured" }
  | { status: "failed" };

export type FetchWorkerRepresentativeConfirmationLinkResult =
  | { status: "found"; link: WorkerRepresentativeConfirmationLink }
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "not_configured" }
  | { status: "failed" };

export type FetchWorkerRepresentativeConfirmationLinksResult =
  | { status: "ok"; links: WorkerRepresentativeConfirmationLink[] }
  | { status: "not_configured" | "failed"; links: [] };

export type RevokeWorkerRepresentativeConfirmationLinkResult =
  | { status: "revoked" }
  | { status: "not_found" }
  | { status: "not_configured" }
  | { status: "failed" };

type LinkRow = {
  link_id?: unknown;
  related_company_code?: unknown;
  related_site_name?: unknown;
  confirmation_scope?: unknown;
  related_risk_assessment_id?: unknown;
  status?: unknown;
  expires_at?: unknown;
  created_at?: unknown;
  last_used_at?: unknown;
};

function getStorageConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

function createHeaders(serviceRoleKey: string, prefer?: string) {
  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

async function readErrorCode(response: Response) {
  const data = await response.json().catch(() => null);
  return typeof data?.code === "string" ? data.code : null;
}

function isMissingStorage(response: Response, errorCode: string | null) {
  return (
    response.status === 404 ||
    errorCode === "42P01" ||
    errorCode === "PGRST204" ||
    errorCode === "PGRST205"
  );
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseLinkRow(row: LinkRow): WorkerRepresentativeConfirmationLink | null {
  const linkId = readNullableString(row.link_id);
  const companyCode = readNullableString(row.related_company_code);
  const siteName = readNullableString(row.related_site_name);
  const confirmationScope = readNullableString(row.confirmation_scope);

  if (!linkId || !companyCode || !siteName || !confirmationScope) {
    return null;
  }

  const status =
    row.status === "revoked" || row.status === "active"
      ? row.status
      : "active";

  return {
    linkId,
    companyCode,
    siteName,
    confirmationScope,
    riskAssessmentId: readNullableString(row.related_risk_assessment_id),
    status,
    expiresAt: readNullableString(row.expires_at),
    createdAt: readNullableString(row.created_at),
    lastUsedAt: readNullableString(row.last_used_at),
  };
}

async function recordLastUsedAt(params: {
  url: string;
  serviceRoleKey: string;
  linkId: string;
}) {
  const query = new URLSearchParams({ link_id: `eq.${params.linkId}` });

  await fetch(`${params.url}/rest/v1/${TABLE_NAME}?${query.toString()}`, {
    method: "PATCH",
    headers: createHeaders(params.serviceRoleKey, "return=minimal"),
    body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    cache: "no-store",
  }).catch(() => null);
}

export async function createWorkerRepresentativeConfirmationLink(
  params: CreateParams,
): Promise<CreateWorkerRepresentativeConfirmationLinkResult> {
  const config = getStorageConfig();

  if (!config) {
    return { status: "not_configured" };
  }

  const linkId = randomUUID();
  const response = await fetch(`${config.url}/rest/v1/${TABLE_NAME}`, {
    method: "POST",
    headers: createHeaders(config.serviceRoleKey, "return=minimal"),
    body: JSON.stringify({
      link_id: linkId,
      related_company_code: params.companyCode,
      related_site_name: params.siteName,
      confirmation_scope: params.confirmationScope,
      related_risk_assessment_id: params.riskAssessmentId ?? null,
      expires_at: params.expiresAt ?? null,
    }),
    cache: "no-store",
  });

  if (response.ok) {
    return { status: "created", linkId };
  }

  const errorCode = await readErrorCode(response);

  if (isMissingStorage(response, errorCode)) {
    return { status: "not_configured" };
  }

  return { status: "failed" };
}

export async function fetchWorkerRepresentativeConfirmationLink(
  linkId: string,
): Promise<FetchWorkerRepresentativeConfirmationLinkResult> {
  if (!UUID_PATTERN.test(linkId)) {
    return { status: "not_found" };
  }

  const config = getStorageConfig();

  if (!config) {
    return { status: "not_configured" };
  }

  const query = new URLSearchParams({
    select:
      "link_id,related_company_code,related_site_name,confirmation_scope,related_risk_assessment_id,status,expires_at,created_at,last_used_at",
    link_id: `eq.${linkId}`,
    limit: "1",
  });
  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?${query.toString()}`,
    {
      method: "GET",
      headers: createHeaders(config.serviceRoleKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    return {
      status: isMissingStorage(response, errorCode)
        ? "not_configured"
        : "failed",
    };
  }

  const rows = (await response.json().catch(() => null)) as LinkRow[] | null;
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    return { status: "not_found" };
  }

  const link = parseLinkRow(row);

  if (!link) {
    return { status: "failed" };
  }

  const expiresAt = link.expiresAt ? Date.parse(link.expiresAt) : null;

  if (
    link.status !== "active" ||
    (expiresAt !== null &&
      (!Number.isFinite(expiresAt) || expiresAt <= Date.now()))
  ) {
    return { status: "inactive" };
  }

  void recordLastUsedAt({ ...config, linkId });

  return { status: "found", link };
}


export async function fetchWorkerRepresentativeConfirmationLinks(
  companyCode: string,
  limit = 20,
): Promise<FetchWorkerRepresentativeConfirmationLinksResult> {
  const normalizedCompanyCode = companyCode.trim();

  if (!normalizedCompanyCode) {
    return { status: "failed", links: [] };
  }

  const config = getStorageConfig();

  if (!config) {
    return { status: "not_configured", links: [] };
  }

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const query = new URLSearchParams({
    select:
      "link_id,related_company_code,related_site_name,confirmation_scope,related_risk_assessment_id,status,expires_at,created_at,last_used_at",
    related_company_code: `eq.${normalizedCompanyCode}`,
    order: "created_at.desc",
    limit: String(safeLimit),
  });

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?${query.toString()}`,
    {
      method: "GET",
      headers: createHeaders(config.serviceRoleKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    return {
      status: isMissingStorage(response, errorCode)
        ? "not_configured"
        : "failed",
      links: [],
    };
  }

  const rows = (await response.json().catch(() => null)) as LinkRow[] | null;

  if (!Array.isArray(rows)) {
    return { status: "failed", links: [] };
  }

  return {
    status: "ok",
    links: rows
      .map((row) => parseLinkRow(row))
      .filter((link): link is WorkerRepresentativeConfirmationLink => link !== null),
  };
}

export async function revokeWorkerRepresentativeConfirmationLink(params: {
  linkId: string;
  companyCode: string;
}): Promise<RevokeWorkerRepresentativeConfirmationLinkResult> {
  const linkId = params.linkId.trim();
  const companyCode = params.companyCode.trim();

  if (!UUID_PATTERN.test(linkId) || !companyCode) {
    return { status: "not_found" };
  }

  const config = getStorageConfig();

  if (!config) {
    return { status: "not_configured" };
  }

  const query = new URLSearchParams({
    link_id: `eq.${linkId}`,
    related_company_code: `eq.${companyCode}`,
    select: "link_id",
  });

  const response = await fetch(
    `${config.url}/rest/v1/${TABLE_NAME}?${query.toString()}`,
    {
      method: "PATCH",
      headers: createHeaders(config.serviceRoleKey, "return=representation"),
      body: JSON.stringify({ status: "revoked" }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorCode = await readErrorCode(response);
    return isMissingStorage(response, errorCode)
      ? { status: "not_configured" }
      : { status: "failed" };
  }

  const rows = (await response.json().catch(() => null)) as unknown;

  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: "not_found" };
  }

  return { status: "revoked" };
}
