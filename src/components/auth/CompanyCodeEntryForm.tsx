"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

function normalizeCompanyCodeInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

export default function CompanyCodeEntryForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeCompanyCodeInput(code);

    if (!normalized) {
      return;
    }

    router.push(`/risk-share/manager?company=${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="고객사 코드 입력"
        aria-label="고객사 코드"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 sm:flex-1"
      />
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-500"
      >
        운영 화면으로 이동
      </button>
    </form>
  );
}
