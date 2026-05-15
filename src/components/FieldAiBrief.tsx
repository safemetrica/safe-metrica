"use client";

import { useEffect, useState } from "react";

export default function FieldAiBrief() {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    fetch("/api/field-ai-brief")
      .then((r) => r.json())
      .then((d) => {
        setBrief(d.brief ?? "");
        setUpdatedAt(d.updatedAt ?? "");
      })
      .catch(() => setBrief("AI 브리핑을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="order-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 lg:col-start-2 lg:row-start-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="text-white font-bold text-sm">오늘의 현장 요약</span>
        <span className="ml-auto rounded-full bg-blue-950 px-2 py-0.5 text-xs text-blue-300">AI 정리</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
          <p className="text-slate-300 text-sm">현장 데이터 분석 중...</p>
        </div>
      ) : (
        <>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
            {brief}
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs text-slate-500">
              {new Date(updatedAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              분석
            </p>
          )}
        </>
      )}
    </div>
  );
}