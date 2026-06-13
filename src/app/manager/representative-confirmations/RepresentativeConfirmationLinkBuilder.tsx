"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  defaultConfirmationScope: string;
};

type CopyStatus = "idle" | "copied" | "error";

type CreateStatus =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "error"; message: string };

type CreateResponse = {
  ok?: boolean;
  link?: string;
  error?: {
    message?: string;
  };
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10";

export default function RepresentativeConfirmationLinkBuilder({
  defaultConfirmationScope,
}: Props) {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [confirmationScope, setConfirmationScope] = useState(
    defaultConfirmationScope,
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [createStatus, setCreateStatus] = useState<CreateStatus>({
    status: "idle",
  });

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus({ status: "creating" });
    setCopyStatus("idle");

    try {
      const response = await fetch(
        "/api/manager/representative-confirmation-links/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteName: siteName.trim(),
            confirmationScope: confirmationScope.trim(),
            expiresAt: expiresAt || null,
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as CreateResponse;

      if (!response.ok || !result.ok || !result.link) {
        setGeneratedLink("");
        setCreateStatus({
          status: "error",
          message:
            result.error?.message ??
            "링크를 만들지 못했습니다. 잠시 후 다시 시도해주세요.",
        });
        return;
      }

      setGeneratedLink(new URL(result.link, window.location.origin).toString());
      setCreateStatus({ status: "idle" });
      router.refresh();
    } catch {
      setGeneratedLink("");
      setCreateStatus({
        status: "error",
        message: "네트워크 연결을 확인한 뒤 다시 시도해주세요.",
      });
    }
  }

  async function handleCopy() {
    if (!generatedLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-blue-500/30 bg-slate-900 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
      <div>
        <p className="text-xs font-black tracking-wide text-blue-300">
          제출 링크 준비
        </p>
        <h2 className="mt-1 text-xl font-black text-white">
          근로자대표 확인 링크 만들기
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          현장명과 오늘 확인할 내용을 입력하면 근로자대표 제출 링크가
          생성됩니다.
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          공유받은 내용이 다르면 근로자대표가 관리자에게 확인할 수 있습니다.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleGenerate}>
        <label className="block text-sm font-black text-slate-200">
          현장명
          <input
            className={inputClassName}
            name="siteName"
            value={siteName}
            onChange={(event) => {
              setSiteName(event.target.value);
              setGeneratedLink("");
              setCopyStatus("idle");
              setCreateStatus({ status: "idle" });
            }}
            placeholder="예: 한국그린환경 본사"
            required
          />
        </label>

        <label className="block text-sm font-black text-slate-200">
          오늘 확인할 내용
          <textarea
            className={`${inputClassName} min-h-28 resize-y leading-6`}
            name="confirmationScope"
            value={confirmationScope}
            onChange={(event) => {
              setConfirmationScope(event.target.value);
              setGeneratedLink("");
              setCopyStatus("idle");
              setCreateStatus({ status: "idle" });
            }}
            required
          />
        </label>

        <label className="block text-sm font-black text-slate-200">
          링크 만료일
          <input
            className={inputClassName}
            name="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(event) => {
              setExpiresAt(event.target.value);
              setGeneratedLink("");
              setCopyStatus("idle");
              setCreateStatus({ status: "idle" });
            }}
          />
          <span className="mt-2 block text-xs leading-5 text-slate-400">
            선택한 날짜의 한국시간 23:59까지 사용할 수 있습니다. 비워두면 별도 만료일 없이 생성됩니다.
          </span>
        </label>

        <button
          type="submit"
          disabled={createStatus.status === "creating"}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 sm:w-auto"
        >
          {createStatus.status === "creating"
            ? "링크 만드는 중..."
            : "링크 만들기"}
        </button>
      </form>

      {createStatus.status === "error" ? (
        <p
          className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200"
          role="alert"
        >
          {createStatus.message}
        </p>
      ) : null}

      {generatedLink ? (
        <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <label
            className="block text-xs font-black text-slate-400"
            htmlFor="representativeConfirmationLink"
          >
            생성된 링크
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="representativeConfirmationLink"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none"
              value={generatedLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-xl border border-blue-500/60 bg-blue-500/15 px-4 py-2.5 text-sm font-black text-blue-100 transition hover:bg-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              {copyStatus === "copied" ? "복사 완료" : "링크 복사"}
            </button>
          </div>
          <p
            className={`mt-2 text-xs ${
              copyStatus === "error" ? "text-amber-300" : "text-emerald-300"
            }`}
            aria-live="polite"
          >
            {copyStatus === "copied"
              ? "링크를 클립보드에 복사했습니다."
              : copyStatus === "error"
                ? "복사가 차단되었습니다. 링크를 선택해 직접 복사해주세요."
                : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
