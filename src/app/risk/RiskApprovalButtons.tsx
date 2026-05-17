"use client";

// src/app/risk/RiskApprovalButtons.tsx

import { useRouter } from "next/navigation";
import { useState } from "react";

type PostActionReflectionCandidatePayload = {
  hasCandidate?: boolean;
  content?: string;
  types?: string[];
  date?: string;
  evidence?: string;
};

type Props = {
  riskItemId?: string;
  canApprove: boolean;
  isApproved: boolean;
  postActionReflectionCandidate?: PostActionReflectionCandidatePayload;
};

type Decision = "approve" | "reject" | "requestMoreEvidence";

function getButtonLabel(decision: Decision): string {
  if (decision === "reject") return "반려";
  if (decision === "requestMoreEvidence") return "보완 요청";
  return "승인 완료 처리";
}

export function RiskApprovalButtons({
  riskItemId,
  canApprove,
  isApproved,
  postActionReflectionCandidate,
}: Props) {
  const router = useRouter();
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [message, setMessage] = useState("");

  if (!riskItemId) return null;

  async function submit(decision: Decision) {
    const label = getButtonLabel(decision);
    const confirmed = window.confirm(`${label} 하시겠습니까?`);

    if (!confirmed) return;

    setPendingDecision(decision);
    setMessage("");

    try {
      const response = await fetch("/api/risk-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          riskItemId,
          decision,
          postActionReflectionCandidate:
            decision === "approve" && postActionReflectionCandidate?.hasCandidate
              ? postActionReflectionCandidate
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "승인 처리에 실패했습니다.");
      }

      const updatedFields = Array.isArray(data.updatedFields)
        ? data.updatedFields.join(", ")
        : "";

      setMessage(
        updatedFields
          ? `처리 완료: ${updatedFields}`
          : "처리 완료"
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리 실패");
    } finally {
      setPendingDecision(null);
    }
  }

  if (isApproved) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
        승인 완료됨
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        완료 후보 항목만 관리자 승인 처리가 가능합니다.
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={Boolean(pendingDecision)}
        onClick={() => submit("approve")}
        className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        {pendingDecision === "approve" ? "처리 중..." : "승인 완료 처리"}
      </button>

      <button
        type="button"
        disabled={Boolean(pendingDecision)}
        onClick={() => submit("requestMoreEvidence")}
        className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/25 disabled:opacity-50"
      >
        {pendingDecision === "requestMoreEvidence" ? "처리 중..." : "보완 요청"}
      </button>

      <button
        type="button"
        disabled={Boolean(pendingDecision)}
        onClick={() => submit("reject")}
        className="rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-500/25 disabled:opacity-50"
      >
        {pendingDecision === "reject" ? "처리 중..." : "반려"}
      </button>

      {message ? <span className="text-xs text-slate-300">{message}</span> : null}
    </div>
  );
}
