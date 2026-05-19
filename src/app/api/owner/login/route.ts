import { NextRequest, NextResponse } from "next/server";

function redirectToLogin(req: NextRequest, error: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    const res = redirectToLogin(req, "invalid_owner_token");
    res.cookies.delete("sm_owner_token");
    return res;
  }

  const res = NextResponse.redirect(new URL("/owner", req.url));

  res.cookies.set("sm_owner_token", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
