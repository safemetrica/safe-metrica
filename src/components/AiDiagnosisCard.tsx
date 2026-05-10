"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function AiDiagnosisCard() {
  const pathname = usePathname();
  const companyCode = pathname?.split("/").filter(Boolean)?.[0];
  const prefix = companyCode ? `/${companyCode}` : "";

  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const url = `${prefix}/api/ai-diagnosis`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setDiagnosis(d.diagnosis);
        setUpdatedAt(
          new Date(d.updatedAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        setLoading(false);
      })
      .catch(() => {
        setDiagnosis("AI 진단을 불러올 수 없습니다.");
        setLoading(false);
      });
  }, [prefix]);

  return (
    <div className="rounded-2xl border border-indigo-700 bg-indigo-950 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-white font-bold text-sm">AI 안전 진단</span>
          <span className="ml-auto text-xs text-blue-300">GPT-4o-mini</span>
        </div>
        {updatedAt && (
          <span className="text-indigo-400 text-xs">{updatedAt} 기준</span>
        )}
      </div>

      {loading ? (
        <span className="text-indigo-300 text-sm">분석 중...</span>
      ) : (
        <p className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line">
          {diagnosis}
        </p>
      )}
    </div>
  );
}