"use client";

import { useEffect, useState } from "react";

function normalizeBriefingText(value: string | null): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitBriefingLines(value: string | null): string[] {
  const normalized = normalizeBriefingText(value);

  if (!normalized) {
    return [];
  }

  const sentenceLikeText = normalized
    .replace(/(습니다\.|합니다\.|주세요\.|필요합니다\.|있습니다\.|없습니다\.|권장됩니다\.|권장합니다\.)\s*/g, "$1\n")
    .replace(/([.!?])\s+/g, "$1\n");

  return sentenceLikeText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function getBriefingView(value: string | null): {
  headline: string;
  bullets: string[];
  action: string;
} {
  const lines = splitBriefingLines(value);

  if (lines.length === 0) {
    return {
      headline: "오늘 운영 브리핑을 불러올 수 없습니다.",
      bullets: ["잠시 후 다시 확인하거나 TBM·증빙·PTW 현황을 직접 확인하세요."],
      action: "우선 확인: 오늘 TBM 작성 여부",
    };
  }

  const headline = lines[0]
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/^확인 필요[:：]?\s*/, "")
    .trim();

  const bullets = lines.slice(1, 5);

  const hasTbm = lines.some((line) => /TBM|툴박스|미작성|교육/i.test(line));
  const hasEvidence = lines.some((line) => /EB|증빙|사진|연결/i.test(line));
  const hasRisk = lines.some((line) => /고위험|위험성|개선대책|조치/i.test(line));

  const action = hasTbm
    ? "우선 확인: 오늘 TBM 작성 및 공유"
    : hasEvidence
      ? "우선 확인: 증빙 누락 항목 등록"
      : hasRisk
        ? "우선 확인: 고위험 항목 담당자 지정"
        : "우선 확인: 오늘 처리할 항목 확인";

  return {
    headline,
    bullets: bullets.length > 0 ? bullets : ["현재 표시된 관리 항목을 확인하고 필요한 조치를 진행하세요."],
    action,
  };
}

export default function AiDiagnosisCard() {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    fetch("/api/ai-diagnosis", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        setDiagnosis(data.diagnosis ?? "");

        const updatedAtValue = data.updatedAt ? new Date(data.updatedAt) : new Date();

        if (!Number.isNaN(updatedAtValue.getTime())) {
          setUpdatedAt(
            updatedAtValue.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        }

        setLoading(false);
      })
      .catch(() => {
        setDiagnosis("오늘 운영 브리핑을 불러올 수 없습니다.");
        setLoading(false);
      });
  }, []);

  const briefing = getBriefingView(diagnosis);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl ring-1 ring-blue-100">
            🤖
          </span>
          <div className="min-w-0">
            <div className="text-base font-black text-slate-950">AI 운영 비서 브리핑</div>
            <div className="mt-0.5 text-sm text-slate-500 [word-break:keep-all]">
              TBM · EB · PTW · 위험성평가 관리신호 요약
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            GPT-4o-mini
          </span>
          {updatedAt && (
            <span className="hidden text-xs font-medium text-slate-400 sm:inline">
              {updatedAt} 기준
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
          브리핑 생성 중입니다...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="mb-1 text-xs font-black text-blue-700">핵심 요약</div>
            <p className="text-base font-black leading-relaxed text-slate-950 [word-break:keep-all]">
              {briefing.headline}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-xs font-black text-slate-600">확인할 내용</div>
            <ul className="space-y-2">
              {briefing.bullets.map((line, index) => (
                <li
                  key={`${line}-${index}`}
                  className="flex gap-2 text-sm leading-relaxed text-slate-700 [word-break:keep-all]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 [word-break:keep-all]">
            {briefing.action}
          </div>
        </div>
      )}
    </div>
  );
}
