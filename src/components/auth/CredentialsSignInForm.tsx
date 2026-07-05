"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type CredentialsSignInFormProps = {
  callbackUrl: string;
};

export default function CredentialsSignInForm({ callbackUrl }: CredentialsSignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <label className="block text-sm font-black text-slate-800">
        이메일
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
        />
      </label>

      <label className="block text-sm font-black text-slate-800">
        비밀번호
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
        />
      </label>

      {hasError ? (
        <p className="text-sm font-semibold leading-6 text-red-600">
          이메일 또는 비밀번호를 확인해 주세요.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-base font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        로그인
      </button>

      <p className="text-center text-xs font-semibold leading-5 text-slate-500">
        계정이 필요하면 운영 담당자에게 문의해 주세요.
      </p>
    </form>
  );
}
