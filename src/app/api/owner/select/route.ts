import { NextRequest, NextResponse } from "next/server";

import { getCompanyConfigByCode } from "@/lib/company";

function redirectToLogin(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

function isOwner(req: NextRequest) {
  const ownerToken = req.cookies.get("sm_owner_token")?.value;
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;

  return Boolean(expectedToken && ownerToken === expectedToken);
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

export async function GET(req: NextRequest) {
  if (!isOwner(req)) {
    const res = redirectToLogin(req, "owner_required");
    res.cookies.delete("sm_company_code");
    res.cookies.delete("sm_tenant_token");
    return res;
  }

  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim().toLowerCase();

  if (!/^[a-z0-9_-]{2,50}$/.test(code)) {
    return redirectToLogin(req, "invalid_company");
  }

  try {
    const company = await getCompanyConfigByCode(code);
    const res = NextResponse.redirect(new URL("/home", req.url));

    res.cookies.set("sm_company_code", company.code, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    if (requiresTenantToken(company.code)) {
      const tenantToken = getExpectedTenantToken(company.code);

      if (!tenantToken) {
        return redirectToLogin(req, "missing_tenant_token");
      }

      res.cookies.set("sm_tenant_token", tenantToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      res.cookies.delete("sm_tenant_token");
    }

    return res;
  } catch {
    return redirectToLogin(req, "invalid_company");
  }
}
