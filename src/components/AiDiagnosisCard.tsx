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
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg">🤖</span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">오늘 운영 요약</div>
            <div className="mt-0.5 text-xs text-slate-400 [word-break:keep-all]">
              대표 · 현장감독자 · 담당자용 핵심 정리
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300">
            자동 요약
          </span>
          {updatedAt && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              {updatedAt} 기준
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          브리핑 생성 중입니다...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="mb-1 text-[11px] font-bold text-blue-200">핵심 요약</div>
            <p className="text-sm font-semibold leading-relaxed text-white [word-break:keep-all]">
              {briefing.headline}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <div className="mb-2 text-[11px] font-bold text-slate-300">확인할 내용</div>
            <ul className="space-y-1.5">
              {briefing.bullets.map((line, index) => (
                <li
                  key={`${line}-${index}`}
                  className="flex gap-2 text-sm leading-relaxed text-slate-100 [word-break:keep-all]"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-100 [word-break:keep-all]">
            {briefing.action}
          </div>
        </div>
      )}
    </div>
  );
}
