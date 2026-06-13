"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RevokeStatus =
  | { status: "idle" }
  | { status: "revoking" }
  | { status: "error"; message: string };

export default function RevokeRepresentativeConfirmationLinkButton({
  linkId,
  disabled = false,
}: {
  linkId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [revokeStatus, setRevokeStatus] = useState<RevokeStatus>({
    status: "idle",
  });

  async function handleRevoke() {
    if (disabled || revokeStatus.status === "revoking") {
      return;
    }

    const confirmed = window.confirm(
      "이 근로자대표 참여확인 링크를 폐기할까요? 폐기 후에는 해당 링크로 제출할 수 없습니다.",
    );

    if (!confirmed) {
      return;
    }

    setRevokeStatus({ status: "revoking" });

    try {
      const response = await fetch(
        "/api/manager/representative-confirmation-links/revoke",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!response.ok || !result.ok) {
        setRevokeStatus({
          status: "error",
          message:
            result.error?.message ?? "링크를 폐기하지 못했습니다.",
        });
        return;
      }

      setRevokeStatus({ status: "idle" });
      router.refresh();
    } catch {
      setRevokeStatus({
        status: "error",
        message: "네트워크 연결을 확인한 뒤 다시 시도해주세요.",
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={disabled || revokeStatus.status === "revoking"}
        className="rounded-full border border-rose-400/50 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
      >
        {revokeStatus.status === "revoking" ? "폐기 중..." : "링크 폐기"}
      </button>
      {revokeStatus.status === "error" ? (
        <p className="mt-2 max-w-xs text-xs leading-5 text-rose-200">
          {revokeStatus.message}
        </p>
      ) : null}
    </div>
  );
}
