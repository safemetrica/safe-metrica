"use client";

import { useEffect, useState } from "react";

export default function AiDiagnosisCard() {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    fetch("/api/ai-diagnosis")
      .then((response) => response.json())
      .then((data) => {
        setDiagnosis(data.diagnosis);
        setUpdatedAt(
          new Date(data.updatedAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        setLoading(false);
      })
      .catch(() => {
        setDiagnosis("AI 운영 브리핑을 불러올 수 없습니다.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">🤖</span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">AI 운영 비서 브리핑</div>
            <div className="mt-0.5 text-xs text-slate-400">
              TBM · EB · PTW · 위험성평가 관리신호 요약
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300">
            GPT 보조
          </span>
          {updatedAt && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              {updatedAt} 기준
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <span className="text-sm text-slate-300">브리핑 생성 중...</span>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-100">
          {diagnosis}
        </p>
      )}
    </div>
  );
}