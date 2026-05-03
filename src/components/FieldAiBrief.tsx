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
    <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="text-white font-bold text-sm">AI 현장 비서 브리핑</span>
        <span className="ml-auto text-xs text-indigo-400">GPT-4o-mini</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
          <p className="text-indigo-200 text-sm">현장 데이터 분석 중...</p>
        </div>
      ) : (
        <>
          <p className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line">{brief}</p>
          {updatedAt && (
            <p className="mt-2 text-xs text-indigo-500">
              {new Date(updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 분석
            </p>
          )}
        </>
      )}
    </div>
  );
}
