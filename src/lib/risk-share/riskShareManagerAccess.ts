import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const MANAGER_LINK_SECRET_ENV_VAR = "SAFEMETRICA_RISK_SHARE_MANAGER_LINK_SECRET";

export const RISK_SHARE_MANAGER_ACCESS_QUERY_PARAM = "access";

function normalizeCompanyCodeForAccess(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function getManagerLinkSecret(): string | null {
  const secret = process.env[MANAGER_LINK_SECRET_ENV_VAR];
  return secret ? secret : null;
}

function computeAccessToken(secret: string, normalizedCompanyCode: string) {
  return createHmac("sha256", secret).update(normalizedCompanyCode).digest("hex");
}

export function createRiskShareManagerAccessToken(companyCode: string): string | null {
  const secret = getManagerLinkSecret();
  const normalizedCompanyCode = normalizeCompanyCodeForAccess(companyCode);

  if (!secret || !normalizedCompanyCode) {
    return null;
  }

  return computeAccessToken(secret, normalizedCompanyCode);
}

export function verifyRiskShareManagerAccessToken(
  companyCode: string,
  token?: string | null,
): boolean {
  const secret = getManagerLinkSecret();
  const normalizedCompanyCode = normalizeCompanyCodeForAccess(companyCode);

  if (!secret || !normalizedCompanyCode || !token) {
    return false;
  }

  const expectedToken = computeAccessToken(secret, normalizedCompanyCode);
  const expectedBuffer = Buffer.from(expectedToken, "hex");
  const providedBuffer = Buffer.from(token, "hex");

  if (expectedBuffer.length === 0 || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
