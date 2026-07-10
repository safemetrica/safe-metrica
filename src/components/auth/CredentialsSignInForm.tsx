"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type CredentialsSignInFormProps = {
  callbackUrl: string;
};

export default function CredentialsSignInForm({ callbackUrl }: CredentialsSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setHasError(false);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (!result || result.error) {
      setHasError(true);
      setIsSubmitting(false);
      return;
    }

    window.location.href = result.url ?? callbackUrl;
  }

  return (
    <form id="loginForm" onSubmit={handleSubmit} noValidate>
      <div className={`kfld${hasError ? " is-error" : ""}`}>
        <div className="kfld__main">
          <label className="kfld__label" htmlFor="email">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="name@company.com"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <span className="kfld__ic">
          <iconify-icon icon="lucide:mail"></iconify-icon>
        </span>
      </div>

      <div className={`kfld${hasError ? " is-error" : ""}`} id="pwFld">
        <div className="kfld__main">
          <label className="kfld__label" htmlFor="password">
            Password
          </label>
          <input
            type={isPasswordVisible ? "text" : "password"}
            id="password"
            name="password"
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="kfld__ic"
          aria-label={isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
          onClick={() => setIsPasswordVisible((visible) => !visible)}
        >
          <iconify-icon icon={isPasswordVisible ? "lucide:eye-off" : "lucide:eye"}></iconify-icon>
        </button>
      </div>

      {hasError ? (
        <p className="login-error">이메일 또는 비밀번호를 확인해 주세요.</p>
      ) : null}

      <label className="login-remember">
        <input type="checkbox" defaultChecked /> 로그인 유지
      </label>

      <div className="login-row">
        <span className="login-forgot">비밀번호 문의: 운영 담당자</span>
        <button type="submit" className="login-submit" disabled={isSubmitting} aria-label="로그인">
          <iconify-icon
            icon={isSubmitting ? "lucide:loader-2" : "lucide:arrow-right"}
            className={isSubmitting ? "is-spinning" : ""}
          ></iconify-icon>
        </button>
      </div>
    </form>
  );
}
