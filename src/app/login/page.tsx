"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="text-4xl mb-2">🦺</div>
        <h1 className="text-2xl font-bold text-white mb-1">SafeMetrica™</h1>
        <p className="text-gray-400 text-sm mb-8">산업안전 운영 플랫폼</p>
        <button
          onClick={() => signIn("kakao", { callbackUrl: "/dashboard" })}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <span className="text-lg">💬</span>
          카카오 로그인
        </button>
      </div>
    </div>
  );
}
