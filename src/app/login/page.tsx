import { redirect } from "next/navigation";

import CredentialsSignInForm from "@/components/auth/CredentialsSignInForm";
import SignOutButton from "@/components/auth/SignOutButton";
import { getCurrentTenantSessionEmail } from "@/lib/tenant-auth/tenantSessionServer";

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
  searchParams?: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = resolvedSearchParams.error;
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

  return (
    <div className="rsx-shell">
      <div className="login-body">
        <div className="login-card">
          <button className="iconbtn theme-toggle login-theme" aria-label="테마 전환">
            <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
            <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
          </button>

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
            <a className="login-visual__cta" href="/">
              SafeMetrica 알아보기 <u>Learn More</u> <iconify-icon icon="lucide:arrow-right"></iconify-icon>
            </a>
          </aside>

          {/* 우측 폼 */}
          <main className="login-form">
            <div className="login-form__top">
              {isAlreadySignedIn ? null : "계정이 없나요? 운영 담당자에게 문의해 주세요."}
            </div>

            <div className="login-form__mid">
              <img className="login-logo logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" />
              <img className="login-logo logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
              <h2 className="login-title">
                <small>안전운영 대시보드에 접속합니다</small>
              </h2>

              {isAlreadySignedIn ? (
                <AlertNote tone="info">
                  <p style={{ fontWeight: 700, color: "var(--text)" }}>이미 로그인되어 있습니다.</p>
                  <p style={{ marginTop: "4px" }}>운영 화면은 안내받은 고객사 전용 링크로 접속해 주세요.</p>
                  <p style={{ marginTop: "4px" }}>다른 계정으로 로그인하려면 로그아웃 후 다시 로그인해 주세요.</p>
                  <div style={{ marginTop: "12px" }}>
                    <SignOutButton />
                  </div>
                </AlertNote>
              ) : (
                <>
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

              <a className="login-qr" href="/risk-share/field">
                <span className="login-qr__ic">
                  <iconify-icon icon="lucide:qr-code"></iconify-icon>
                </span>
                <div>
                  <b>근로자 · 외부인이신가요?</b>
                  <span>로그인 없이 현장 QR로 바로 참여합니다</span>
                </div>
                <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
              </a>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
