import { NextRequest, NextResponse } from "next/server";

const APP_PREFIXES = ["/dashboard", "/field", "/tbm", "/ebm", "/ptw", "/kosha", "/api"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 제외 (next 내부 리소스만 제외)
  if (pathname.startsWith("/_next") || pathname === "/") {
    return NextResponse.next();
  }

  const parts = pathname.split("/").filter(Boolean);

  // 순정 /api/... 는 프록시가 회사코드로 오인하지 않게 안전핀
  if (parts[0] === "api") {
    return NextResponse.next();
  }

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