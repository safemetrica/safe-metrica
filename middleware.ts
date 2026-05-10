import { NextRequest, NextResponse } from "next/server";
import { proxy } from "./src/proxy";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 루트는 테넌트 선택/안내로 고정 (daedo 기본 노출 차단)
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return proxy(req);
}

export const config = {
  matcher: ["/:path*"],
};
