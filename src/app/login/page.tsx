import { redirect } from "next/navigation";
import Link from "next/link";

import CredentialsSignInForm from "@/components/auth/CredentialsSignInForm";
import SignOutButton from "@/components/auth/SignOutButton";
import { resolveManagerTenantDestinationForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import { getCurrentTenantSessionEmail } from "@/lib/tenant-auth/tenantSessionServer";
import LoginThemeProvider from "./LoginThemeProvider";
import LoginThemeToggleButton from "./LoginThemeToggleButton";

export const dynamic = "force-dynamic";

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isExplicitSafeCallbackUrl(value: string) {
  return Boolean(value) && value.startsWith("/") && !value.startsWith("//");
}

function getSafeCallbackUrl(value: string) {
  return isExplicitSafeCallbackUrl(value) ? value : "/login";
}

/** Reuses the company param already present in a validated callbackUrl — never guesses or hardcodes one. */
function extractCompanyCodeFromCallbackUrl(value: string) {
  try {
    const url = new URL(value, "http://login-callback.invalid");
    const raw = url.searchParams.get("company") ?? "";
    return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
  } catch {
    return "";
  }
}

type AlertTone = "info" | "warning" | "danger";

function AlertNote({ tone, children }: { tone: AlertTone; children: React.ReactNode }) {
  const colorVar = tone === "info" ? "--info" : tone === "warning" ? "--warning" : "--danger";
  const bgVar = tone === "info" ? "--info-bg" : tone === "warning" ? "--warning-bg" : "--danger-bg";

  return (
    <div
      style={{
        marginTop: "18px",
        borderRadius: "13px",
        border: `1px solid color-mix(in srgb, var(${colorVar}) 25%, transparent)`,
        background: `var(${bgVar})`,
        padding: "14px 16px",
        fontSize: "14px",
        lineHeight: 1.6,
        color: "var(--text-2)",
      }}
    >
      {children}
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    callbackUrl?: string;
    registered?: string;
    password_set?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = resolvedSearchParams.error;
  const registered = resolvedSearchParams.registered === "1";
  const passwordSet = resolvedSearchParams.password_set === "1";
  const isTenantRequired = error === "tenant_required";
  const hasOtherError = Boolean(error && !isTenantRequired);
  const rawCallbackUrl = readSearchParam(resolvedSearchParams.callbackUrl);
  const hasExplicitCallbackUrl = isExplicitSafeCallbackUrl(rawCallbackUrl);
  const callbackUrl = getSafeCallbackUrl(rawCallbackUrl);

  const sessionEmail = await getCurrentTenantSessionEmail();
  const isAlreadySignedIn = Boolean(sessionEmail);

  if (isAlreadySignedIn && hasExplicitCallbackUrl) {
    redirect(callbackUrl);
  }

  const managerDestination =
    isAlreadySignedIn && !hasExplicitCallbackUrl
      ? await resolveManagerTenantDestinationForCurrentSession()
      : null;

  if (managerDestination?.status === "single") {
    redirect(
      `/risk-share/manager?company=${encodeURIComponent(managerDestination.tenantCode)}&lang=ko`,
    );
  }

  const companyCodeFromCallback = hasExplicitCallbackUrl
    ? extractCompanyCodeFromCallbackUrl(rawCallbackUrl)
    : "";
  const fieldHref = companyCodeFromCallback
    ? `/risk-share/field?company=${encodeURIComponent(companyCodeFromCallback)}`
    : "/risk-share/field";

  return (
    <LoginThemeProvider>
      <div className="login-body">
        <div className="login-card">
          <LoginThemeToggleButton />

          {/* 좌측 비주얼 패널 */}
          <aside className="login-visual">
            <p className="login-visual__eyebrow">One Platform for Field Safety Records</p>
            <h1>
              확인, 검토,
              <br />
              안전운영 기록
            </h1>
            <p className="login-visual__sub">
              <b>SafeMetrica</b> — 현장의 기록이 다음 위험성평가로 이어집니다
            </p>
            <Link className="login-visual__cta" href="/">
              SafeMetrica 알아보기 <u>Learn More</u> <iconify-icon icon="lucide:arrow-right"></iconify-icon>
            </Link>
          </aside>

          {/* 우측 폼 */}
          <main className="login-form">
            <div className="login-form__top">
              {isAlreadySignedIn ? null : <>계정이 없나요? <Link href="/signup" style={{ color: "var(--brand-600)", fontWeight: 800 }}>가입하기</Link></>}
            </div>

            <div className="login-form__mid">
              <img className="login-logo logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" />
              <img className="login-logo logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
              <h2 className="login-title">
                <small>안전운영 대시보드에 접속합니다</small>
              </h2>

              {isAlreadySignedIn ? (
                <AlertNote
                  tone={
                    managerDestination?.status === "none"
                      ? "warning"
                      : managerDestination?.status === "lookup_failed"
                        ? "danger"
                        : "info"
                  }
                >
                  {managerDestination?.status === "none" ? (
                    <>
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>
                        활성화된 관리자 권한을 확인할 수 없습니다.
                      </p>
                      <p style={{ marginTop: "4px" }}>접근 권한이 필요하면 운영 담당자에게 문의해 주세요.</p>
                    </>
                  ) : managerDestination?.status === "multiple" ? (
                    <>
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>
                        여러 사업장 운영 권한이 확인되었습니다.
                      </p>
                      <p style={{ marginTop: "4px" }}>안내받은 사업장 전용 링크로 접속해 주세요.</p>
                    </>
                  ) : managerDestination?.status === "lookup_failed" ? (
                    <>
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>
                        운영 화면 정보를 확인하지 못했습니다.
                      </p>
                      <p style={{ marginTop: "4px" }}>
                        잠시 후 다시 시도하거나 운영 담당자에게 문의해 주세요.
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>이미 로그인되어 있습니다.</p>
                      <p style={{ marginTop: "4px" }}>운영 화면은 안내받은 고객사 전용 링크로 접속해 주세요.</p>
                      <p style={{ marginTop: "4px" }}>다른 계정으로 로그인하려면 로그아웃 후 다시 로그인해 주세요.</p>
                    </>
                  )}
                  <div style={{ marginTop: "12px" }}>
                    <SignOutButton />
                  </div>
                </AlertNote>
              ) : (
                <>
                  {registered ? (
                    <AlertNote tone="info">
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>가입이 완료되었습니다.</p>
                      <p style={{ marginTop: "4px" }}>가입한 이메일과 비밀번호로 로그인해 주세요.</p>
                    </AlertNote>
                  ) : null}
                  {passwordSet ? (
                    <AlertNote tone="info">
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>
                        비밀번호 설정이 완료되었습니다.
                      </p>
                      <p style={{ marginTop: "4px" }}>
                        초대받은 이메일과 새 비밀번호로 로그인해 주세요.
                      </p>
                    </AlertNote>
                  ) : null}
                  {!hasExplicitCallbackUrl ? (
                    <AlertNote tone="info">
                      <p style={{ fontWeight: 700, color: "var(--text)" }}>고객사 운영 화면으로 이동하시나요?</p>
                      <p style={{ marginTop: "4px" }}>운영 화면은 안내받은 고객사 전용 링크로 접속해 주세요.</p>
                      <p style={{ marginTop: "4px" }}>계정이 필요하면 운영 담당자에게 문의해 주세요.</p>
                    </AlertNote>
                  ) : null}
                  <CredentialsSignInForm callbackUrl={callbackUrl} />
                </>
              )}

              {isTenantRequired ? (
                <AlertNote tone="warning">
                  고객사 정보가 포함된 주소로 접속해야 하는 화면입니다. 계속 확인되지 않으면 운영
                  담당자에게 문의해 주세요.
                </AlertNote>
              ) : null}

              {hasOtherError ? (
                <AlertNote tone="danger">
                  접근 권한을 확인할 수 없습니다. 로그인 후 접근 권한을 확인합니다. 접근 권한이
                  확인되지 않으면 운영 담당자에게 문의해 주세요.
                </AlertNote>
              ) : null}

              {companyCodeFromCallback ? (
                <a className="login-qr" href={fieldHref}>
                  <span className="login-qr__ic">
                    <iconify-icon icon="lucide:qr-code"></iconify-icon>
                  </span>
                  <div>
                    <b>근로자이신가요?</b>
                    <span>로그인 없이 현장 QR로 바로 참여합니다</span>
                  </div>
                  <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                </a>
              ) : (
                <div className="login-qr login-qr--static">
                  <span className="login-qr__ic">
                    <iconify-icon icon="lucide:qr-code"></iconify-icon>
                  </span>
                  <div>
                    <b>현장 참여자는 사업장에 게시된 QR을 이용해 주세요.</b>
                    <span>QR을 찾기 어려우면 현장 담당자에게 문의해 주세요.</span>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </LoginThemeProvider>
  );
}
