"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

const TENANTS = [
  { code: "daedo", name: "㈜대도환경", emoji: "🟦" },
  { code: "dongwoo", name: "㈜동우환경", emoji: "🟩" },
  { code: "hankookgreen", name: "㈜한국그린환경", emoji: "🟨" },
] as const;

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="text-4xl mb-2">🦺</div>
        <h1 className="text-2xl font-bold text-white mb-1">SafeMetrica™</h1>
        <p className="text-gray-400 text-sm mb-6">산업안전 운영 플랫폼</p>

        <div className="text-left">
          <div className="text-xs font-semibold text-gray-300 mb-2">
            테넌트 선택
          </div>

          <div className="grid gap-2">
            {TENANTS.map((t) => (
              <Link
                key={t.code}
                href={`/${t.code}/dashboard`}
                className="w-full bg-gray-800 hover:bg-gray-750 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{t.emoji}</span>
                  <span>{t.name}</span>
                </span>
                <span className="text-gray-400 text-xs">{`/${t.code}`}</span>
              </Link>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500 leading-relaxed">
            회사코드로 접속: <span className="text-gray-300">/{`{companyCode}`}/dashboard</span>
            <br />
            예: <span className="text-gray-300">/daedo/dashboard</span>
          </div>
        </div>

        <div className="my-6 h-px bg-white/10" />

        <button
          onClick={() => signIn("kakao", { callbackUrl: "/login" })}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <span className="text-lg">💬</span>
          카카오 로그인
        </button>

        <div className="mt-3 text-[11px] text-gray-500">
          (로그인 기반 SaaS 전환은 50개사 이후 단계에서 적용)
        </div>
      </div>
    </div>
  );
}