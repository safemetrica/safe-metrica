import { NextRequest, NextResponse } from "next/server";

import { createSelfServiceSignup } from "@/lib/self-service/selfServiceSignup";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function redirectToSignup(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/signup", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function readField(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return redirectToSignup(request, { error: "request_invalid" });
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded") && !contentType.startsWith("multipart/form-data")) {
    return redirectToSignup(request, { error: "request_invalid" });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData || readField(formData, "website", 200)) {
    return redirectToSignup(request, { error: "request_invalid" });
  }
  if (formData.get("termsAccepted") !== "yes") {
    return redirectToSignup(request, { error: "terms_required" });
  }

  const password = readField(formData, "password", 129);
  const passwordConfirm = readField(formData, "passwordConfirm", 129);
  if (password !== passwordConfirm) {
    return redirectToSignup(request, { error: "password_mismatch" });
  }

  const result = await createSelfServiceSignup({
    companyName: readField(formData, "companyName", 121),
    displayName: readField(formData, "displayName", 81),
    email: readField(formData, "email", 321),
    password,
  });

  if (!result.ok) return redirectToSignup(request, { error: result.reason });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("registered", "1");
  loginUrl.searchParams.set("callbackUrl", `/risk-share/manager?company=${encodeURIComponent(result.companyCode)}&lang=ko`);
  return NextResponse.redirect(loginUrl, 303);
}
