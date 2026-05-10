"use client";

import { useEffect, useState } from "react";

type CompanyItem = {
  id: string;
  항목: string;
  상태: string;
  passYn: string;
  must: boolean;
  기한: string;
  우선순위: string;
};

type Summary = {
  total: number;
  passCount: number;
  failCount: number;
  mustFailCount: number;
};

export default function KoshaCompanyStatus() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mustFail, setMustFail] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/kosha-data")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setSummary(d.summary);
        setMustFail(d.mustFail ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-600 animate-pulse">노션 DB 데이터 로딩 중...</p>
      </div>
    );

  if (error)
    return (
      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">DB 연동 오류: {error}</p>
      </div>
    );

  return (
    <div className="mt-5">
      <h2 className="mb-3 text-sm font-bold text-slate-700">📡 실행 DB 실시간 현황 (노션 연동)</h2>

      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "전체", value: summary.total, color: "bg-slate-50 border-slate-200 text-slate-700" },
            { label: "PASS", value: summary.passCount, color: "bg-green-50 border-green-200 text-green-700" },
            { label: "FAIL", value: summary.failCount, color: "bg-red-50 border-red-200 text-red-700" },
            { label: "Must FAIL", value: summary.mustFailCount, color: "bg-orange-50 border-orange-200 text-orange-700" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border p-3 text-center ${item.color}`}>
              <p className="text-xs font-semibold opacity-70">{item.label}</p>
              <p className="mt-1 text-2xl font-black">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {mustFail.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold text-red-700">🚨 Must FAIL — 즉시 보완 필요</p>
          <div className="space-y-2">
            {mustFail.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.항목}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.우선순위 && (
                      <span className="mr-2 font-semibold text-orange-600">{item.우선순위}</span>
                    )}
                    {item.기한 && <span>기한: {item.기한}</span>}
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {item.상태 || "미설정"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mustFail.length === 0 && summary && summary.failCount === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
          <p className="text-sm font-bold text-green-700">✅ 모든 항목 PASS — 인정심사 준비 완료</p>
        </div>
      )}
    </div>
  );
}