import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  createOwnerTenantMembership,
  inviteOwnerTenantMembership,
  normalizeStrictOwnerCompanyCode,
} from "@/lib/tenant-onboarding/ownerTenantCommercialActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_ROLES = new Set(["tenant_admin", "tenant_manager"]);
const ALLOWED_MEMBERSHIP_STATUSES = new Set(["invited", "active"]);
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_REQUEST_BYTES = 16 * 1024;

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: URLSearchParams, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestHost = request.headers.get("host")?.trim();
    const allowedHosts = new Set(
      [forwardedHost, requestHost, request.nextUrl.host].filter(
        (value): value is string => Boolean(value),
      ),
    );
    const allowedProtocols = new Set(
      [forwardedProtocol ? `${forwardedProtocol}:` : "", request.nextUrl.protocol].filter(Boolean),
    );

    return allowedHosts.has(originUrl.host) && allowedProtocols.has(originUrl.protocol);
  } catch {
    return false;
  }
}

async function readLimitedForm(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_REQUEST_BYTES) {
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const rawBody = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new URLSearchParams(new TextDecoder().decode(rawBody));
}

function buildRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/owner/tenant-onboarding/draft", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return buildRedirect(request, { error: "request_invalid" });
  }

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, { error: "owner_required" });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return buildRedirect(request, { error: "request_invalid" });
  }

  const formData = await readLimitedForm(request);
  if (!formData) {
    return buildRedirect(request, { error: "request_invalid" });
  }

  const companyCodeInput = readText(formData, "company_code", 80);
  const managerEmailInput = readText(formData, "manager_email", 320).toLowerCase();
  const displayName = readText(formData, "display_name", 120);
  const role = readText(formData, "role", 40);
  const membershipStatus = readText(formData, "membership_status", 40);
  const authAccountConfirmed = readText(formData, "auth_account_confirmed", 8) === "1";

  const companyCode = normalizeStrictOwnerCompanyCode(companyCodeInput);

  if (!companyCode) {
    return buildRedirect(request, {
      actionError: "invalid_company",
      companyCode: companyCodeInput,
    });
  }

  if (!managerEmailInput || managerEmailInput.length > 320 || !EMAIL_PATTERN.test(managerEmailInput)) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  if (!ALLOWED_MEMBERSHIP_STATUSES.has(membershipStatus)) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  if (membershipStatus === "active" && !authAccountConfirmed) {
    return buildRedirect(request, {
      actionError: "invalid_input",
      companyCode,
    });
  }

  const result = membershipStatus === "invited"
    ? await inviteOwnerTenantMembership({
        companyCode,
        managerEmail: managerEmailInput,
        displayName,
        role: role as "tenant_admin" | "tenant_manager",
      })
    : await createOwnerTenantMembership({
        companyCode,
        managerEmail: managerEmailInput,
        displayName,
        role: role as "tenant_admin" | "tenant_manager",
        membershipStatus: "active",
      });

  if (!result.ok) {
    return buildRedirect(request, {
      actionError: result.reason,
      companyCode,
    });
  }

  return buildRedirect(request, {
    companyCode: result.companyCode,
    membership: result.status,
  });
}
