import { NextRequest, NextResponse } from "next/server";

import { getCompanyConfigByCode } from "@/lib/company";

function redirectToLogin(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim().toLowerCase();

  if (!code) {
    const res = redirectToLogin(req, "missing_company");
    res.cookies.delete("sm_company_code");
    return res;
  }

  try {
    const company = await getCompanyConfigByCode(code);

    const res = NextResponse.redirect(new URL("/", req.url));

    res.cookies.set("sm_company_code", company.code, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    const res = redirectToLogin(req, "invalid_company");
    res.cookies.delete("sm_company_code");
    return res;
  }
}