"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import LoginThemeProvider from "@/app/login/LoginThemeProvider";
import LoginThemeToggleButton from "@/app/login/LoginThemeToggleButton";

type CallbackState = "checking" | "ready" | "invalid" | "submitting" | "complete";

const ERROR_MESSAGES: Record<string, string> = {
  invite_invalid: "초대 링크가 만료되었거나 이미 사용되었습니다. 운영 담당자에게 새 초대를 요청해 주세요.",
  password_invalid: "비밀번호를 확인해 주세요. 10자 이상으로 두 칸에 동일하게 입력해야 합니다.",
  request_limited: "요청이 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.",
  service_unavailable: "비밀번호 설정을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  request_invalid: "요청을 확인하지 못했습니다. 초대 메일의 링크를 다시 열어 주세요.",
};

function parseInviteAccessToken() {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const accessToken = fragment.get("access_token") ?? "";
  const flowType = fragment.get("type") ?? "";
  const hasProviderError = Boolean(fragment.get("error") || query.get("error"));
  const hasUnsupportedServerFlow = Boolean(query.get("code") || query.get("token_hash"));

  window.history.replaceState(null, "", window.location.pathname);

  if (
    hasProviderError ||
    hasUnsupportedServerFlow ||
    flowType !== "invite" ||
    !accessToken
  ) {
    return null;
  }

  return accessToken;
}

export default function InvitePasswordForm() {
  const accessTokenRef = useRef("");
  const [callbackState, setCallbackState] = useState<CallbackState>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const accessToken = parseInviteAccessToken();
    let isActive = true;

    queueMicrotask(() => {
      if (!isActive) return;

      if (!accessToken) {
        setCallbackState("invalid");
        return;
      }

      accessTokenRef.current = accessToken;
      setCallbackState("ready");
    });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (
      password.length < 10 ||
      password.length > 128 ||
      password !== passwordConfirm ||
      !accessTokenRef.current
    ) {
      setMessage(ERROR_MESSAGES.password_invalid);
      return;
    }

    setCallbackState("submitting");

    try {
      const response = await fetch("/api/auth/invite/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessTokenRef.current,
          password,
          passwordConfirm,
        }),
        cache: "no-store",
        credentials: "same-origin",
        referrerPolicy: "no-referrer",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true) {
        const reason = typeof result?.reason === "string" ? result.reason : "service_unavailable";
        setMessage(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.service_unavailable);
        setCallbackState(reason === "invite_invalid" ? "invalid" : "ready");
        return;
      }

      accessTokenRef.current = "";
      setPassword("");
      setPasswordConfirm("");
      setCallbackState("complete");
    } catch {
      setMessage(ERROR_MESSAGES.service_unavailable);
      setCallbackState("ready");
    }
  }

  const isChecking = callbackState === "checking";
  const isInvalid = callbackState === "invalid";
  const isComplete = callbackState === "complete";
  const isSubmitting = callbackState === "submitting";

  return (
    <LoginThemeProvider>
      <div className="login-body">
        <div className="login-card">
          <LoginThemeToggleButton />
          <aside className="login-visual">
            <p className="login-visual__eyebrow">Secure Account Setup</p>
            <h1>
              초대받은 계정의
              <br />
              비밀번호를 설정합니다
            </h1>
            <p className="login-visual__sub">
              인증 완료 후에도 고객사 운영 권한은 별도로 확인됩니다
            </p>
          </aside>

          <main className="login-form">
            <div className="login-form__top">
              <Link href="/login" style={{ color: "var(--brand-600)", fontWeight: 800 }}>
                로그인으로 이동
              </Link>
            </div>
            <div className="login-form__mid">
              <img
                className="login-logo logo-img logo-img--light"
                src="/risk-share-assets/logo.png"
                alt="SafeMetrica"
              />
              <img
                className="login-logo logo-img logo-img--dark"
                src="/risk-share-assets/logo_darkmode.png"
                alt="SafeMetrica"
              />
              <h1 className="login-title">
                비밀번호 설정
                <small>초대 링크를 확인한 뒤 새 비밀번호를 등록합니다</small>
              </h1>

              {isChecking ? (
                <p className="login-forgot" style={{ marginTop: "24px" }}>
                  초대 정보를 확인하고 있습니다.
                </p>
              ) : null}

              {isInvalid ? (
                <div className="login-qr login-qr--static" role="alert">
                  <span className="login-qr__ic">
                    <iconify-icon icon="lucide:shield-alert"></iconify-icon>
                  </span>
                  <div>
                    <b>초대 링크를 사용할 수 없습니다.</b>
                    <span>
                      링크가 만료되었거나 이미 사용되었을 수 있습니다. 운영 담당자에게 새
                      초대를 요청해 주세요.
                    </span>
                  </div>
                </div>
              ) : null}

              {isComplete ? (
                <div className="login-qr login-qr--static" role="status">
                  <span className="login-qr__ic">
                    <iconify-icon icon="lucide:shield-check"></iconify-icon>
                  </span>
                  <div>
                    <b>비밀번호 설정이 완료되었습니다.</b>
                    <span>로그인 후 연결된 고객사 운영 권한을 확인합니다.</span>
                  </div>
                  <Link className="go" href="/login?password_set=1" aria-label="로그인으로 이동">
                    <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                  </Link>
                </div>
              ) : null}

              {callbackState === "ready" || isSubmitting ? (
                <form onSubmit={handleSubmit} noValidate>
                  <div className={`kfld${message ? " is-error" : ""}`}>
                    <div className="kfld__main">
                      <label className="kfld__label" htmlFor="newPassword">
                        새 비밀번호
                      </label>
                      <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        minLength={10}
                        maxLength={128}
                        autoComplete="new-password"
                        placeholder="10자 이상"
                        required
                        disabled={isSubmitting}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                    <span className="kfld__ic">
                      <iconify-icon icon="lucide:lock-keyhole"></iconify-icon>
                    </span>
                  </div>
                  <div className={`kfld${message ? " is-error" : ""}`}>
                    <div className="kfld__main">
                      <label className="kfld__label" htmlFor="newPasswordConfirm">
                        새 비밀번호 확인
                      </label>
                      <input
                        id="newPasswordConfirm"
                        name="newPasswordConfirm"
                        type="password"
                        minLength={10}
                        maxLength={128}
                        autoComplete="new-password"
                        placeholder="비밀번호 다시 입력"
                        required
                        disabled={isSubmitting}
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                      />
                    </div>
                    <span className="kfld__ic">
                      <iconify-icon icon="lucide:shield-check"></iconify-icon>
                    </span>
                  </div>
                  {message ? (
                    <p className="login-error" role="alert">
                      {message}
                    </p>
                  ) : null}
                  <div className="login-row">
                    <span className="login-forgot">
                      비밀번호는 SafeMetrica가 직접 저장하지 않습니다
                    </span>
                    <button
                      type="submit"
                      className="login-submit"
                      disabled={isSubmitting}
                      aria-label="비밀번호 설정"
                    >
                      <iconify-icon
                        icon={isSubmitting ? "lucide:loader-2" : "lucide:arrow-right"}
                        className={isSubmitting ? "is-spinning" : ""}
                      ></iconify-icon>
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </LoginThemeProvider>
  );
}
