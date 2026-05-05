import { NextRequest, NextResponse } from "next/server";

const APP_PREFIXES = ["/dashboard", "/field", "/tbm", "/ebm", "/ptw", "/kosha"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 제외
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/") {
    return NextResponse.next();
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const companyCode = parts[0];
    const restPath = "/" + parts.slice(1).join("/");

    if (APP_PREFIXES.some((p) => restPath === p || restPath.startsWith(p + "/"))) {
      const url = req.nextUrl.clone();
      url.pathname = restPath;

      const headers = new Headers(req.headers);
      headers.set("x-company-code", companyCode);

      return NextResponse.rewrite(url, { request: { headers } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};