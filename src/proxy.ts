import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/field/participation",
  "/field/anonymous-feedback",
  "/field/representative-confirmation",
  "/api/field/participation/submit",
  "/api/field/anonymous-feedback/submit",
  "/api/worker-representative/confirmation/submit",
  "/select-tenant",
  "/owner",
  "/api/owner",
  "/api/auth",
  "/api/weather",
  "/api/safety-news",
  "/favicon.ico",
];

const PROTECTED_PAGE_PATHS = [
  "/dashboard",
  "/tbm",
  "/ebm",
  "/ptw",
  "/field",
  "/kosha",
];

const PROTECTED_API_PATHS = [
  "/api/ai-diagnosis",
  "/api/field-ai-brief",
  "/api/kosha-data",
  "/api/risk-report-pdf",
];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets")
  );
}

function isProtectedPagePath(pathname: string) {
  return PROTECTED_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isProtectedApiPath(pathname: string) {
  return PROTECTED_API_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isDirectOperationalQueryPath(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const companyCode = searchParams.get("company");

  if (pathname === "/tbm" && (companyCode === "richi" || companyCode === "daedo")) {
    return true;
  }

  if (pathname === "/field/voice" && companyCode === "richi") {
    return true;
  }

  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isProtectedPage = isProtectedPagePath(pathname);
  const isProtectedApi = isProtectedApiPath(pathname);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  if (isDirectOperationalQueryPath(req)) {
    return NextResponse.next();
  }

  const companyCode = req.cookies.get("sm_company_code")?.value;

  if (companyCode) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json(
      {
        error: "TENANT_REQUIRED",
        message: "Company tenant cookie is required.",
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("error", "tenant_required");

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/:path*"],
};
