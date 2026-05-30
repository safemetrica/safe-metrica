import { NextRequest, NextResponse } from "next/server";

import { getCompanyConfigByCode } from "@/lib/company";

function redirectToLogin(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
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

function getSafeNextPath(rawNext: string | null) {
  if (!rawNext) return "/home";
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return "/home";

  try {
    const parsed = new URL(rawNext, "https://safe-metrica.local");

    if (parsed.pathname !== "/home") {
      return "/home";
    }

    if (parsed.searchParams.get("role") === "manager") {
      return "/home?role=manager";
    }

    return "/home";
  } catch {
    return "/home";
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("token");
  const nextPath = getSafeNextPath(url.searchParams.get("next"));

  if (!code) {
    const res = redirectToLogin(req, "missing_company");
    res.cookies.delete("sm_company_code");
    res.cookies.delete("sm_tenant_token");
    return res;
  }

  if (requiresTenantToken(code)) {
    const expectedToken = getExpectedTenantToken(code);

    if (!expectedToken || token !== expectedToken) {
      const res = redirectToLogin(req, "invalid_tenant_token");
      res.cookies.delete("sm_company_code");
      res.cookies.delete("sm_tenant_token");
      return res;
    }
  }

  try {
    const company = await getCompanyConfigByCode(code);

    const res = NextResponse.redirect(new URL(nextPath, req.url));

    res.cookies.set("sm_company_code", company.code, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    if (requiresTenantToken(company.code) && token) {
      res.cookies.set("sm_tenant_token", token, {
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
    const res = redirectToLogin(req, "invalid_company");
    res.cookies.delete("sm_company_code");
    res.cookies.delete("sm_tenant_token");
    return res;
  }
}