"use client";

import { useEffect, useMemo, useState } from "react";

function normalizeBriefText(value: string | null): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitBriefLines(value: string | null): string[] {
  const normalized = normalizeBriefText(value);

  if (!normalized) return [];

  const lineText = normalized
    .replace(/(습니다\.|합니다\.|주세요\.|필요합니다\.|있습니다\.|없습니다\.|권장됩니다\.|권장합니다\.)\s*/g, "$1\n")
    .replace(/([.!?])\s+/g, "$1\n");

  return lineText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function getFieldBriefView(value: string | null): {
  headline: string;
  bullets: string[];
  action: string;
} {
  const lines = splitBriefLines(value);

  if (lines.length === 0) {
    return {
      headline: "오늘 현장 브리핑을 불러올 수 없습니다.",
      bullets: ["TBM 작성 여부, 미완료 조치, PTW 대기 항목을 직접 확인하세요."],
      action: "우선 확인: 오늘 TBM 작성 및 공유",
    };
  }

  const headline = lines[0]
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/^확인 필요[:：]?\s*/, "")
    .trim();

  const bullets = lines.slice(1, 5);

  const hasTbm = lines.some((line) => /TBM|툴박스|미작성|공유|교육/i.test(line));
  const hasAction = lines.some((line) => /조치|미완료|처리|상태/i.test(line));
  const hasPtw = lines.some((line) => /PTW|허가|승인|금지|반려/i.test(line));
  const hasRisk = lines.some((line) => /고위험|위험요인|위험성|근로자/i.test(line));

  const action = hasTbm
    ? "우선 확인: 오늘 TBM 작성 및 근로자 공유"
    : hasAction
      ? "우선 확인: 미완료 조치 상태 업데이트"
      : hasPtw
        ? "우선 확인: PTW 승인·금지·반려 항목 확인"
        : hasRisk
          ? "우선 확인: 고위험 요인 작업 전 공유"
          : "우선 확인: 오늘 준비 현황 확인";

  return {
    headline,
    bullets: bullets.length > 0
      ? bullets
      : ["오늘 준비 현황과 공유 위험요인을 확인한 뒤 작업 전 근로자에게 안내하세요."],
    action,
  };
}

type FieldBriefView = ReturnType<typeof getFieldBriefView>;

function buildFieldBriefTtsText(view: FieldBriefView) {
  const lines: string[] = [];

  lines.push("AI 현장 비서 브리핑입니다.");
  lines.push(`핵심 요약. ${view.headline}`);

  if (view.bullets.length > 0) {
    lines.push("확인할 내용입니다.");
    view.bullets.forEach((line, index) => {
      lines.push(`${index + 1}번. ${line}`);
    });
  }

  lines.push(view.action);
  lines.push("위험성평가표의 주요 위험요인과 오늘 TBM 공유 여부를 함께 확인하세요.");

  return lines.join(" ");
}


export default function FieldAiBrief() {
  const [brief, setBrief] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    fetch("/api/field-ai-brief", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        setBrief(data.brief ?? "");

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
        setBrief("오늘 현장 브리핑을 불러올 수 없습니다.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const view = getFieldBriefView(brief);
  const bulletKey = view.bullets.join("|");
  const ttsText = useMemo(() => buildFieldBriefTtsText(view), [view.headline, view.action, bulletKey]);

  function handlePlayTts() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("이 브라우저에서는 음성 안내를 지원하지 않습니다.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(ttsText);
    utterance.lang = "ko-KR";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function handleStopTts() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }

  return (
    <section className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full min-w-0 items-start gap-2 sm:w-auto">
          <span className="text-lg">🤖</span>
          <div className="min-w-0">
            <div className="text-base font-bold leading-tight text-white [word-break:keep-all] sm:text-sm">AI 현장 비서 브리핑</div>
            <div className="mt-0.5 text-xs text-slate-400 [word-break:keep-all]">
              TBM · 조치 · 증빙 · PTW 현장 요약
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {!loading ? (
            <>
              <button
                type="button"
                onClick={handlePlayTts}
                className="whitespace-nowrap rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-[11px] font-black text-blue-100 hover:bg-blue-500/20"
              >
                🔊 브리핑 듣기
              </button>
              <button
                type="button"
                onClick={handleStopTts}
                disabled={!isSpeaking}
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-[11px] font-black text-slate-300 disabled:text-slate-600"
              >
                정지
              </button>
            </>
          ) : null}
          <span className="shrink-0 whitespace-nowrap rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-300">
            GPT-4o-mini
          </span>
          {updatedAt && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              {updatedAt} 기준
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-300">
          현장 브리핑 생성 중입니다...
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="mb-1 text-[11px] font-bold text-blue-200">핵심 요약</div>
            <p className="text-sm font-semibold leading-relaxed text-white [word-break:keep-all]">
              {view.headline}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <div className="mb-2 text-[11px] font-bold text-slate-300">확인할 내용</div>
            <ul className="space-y-1.5">
              {view.bullets.map((line, index) => (
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
            {view.action}
          </div>
        </div>
      )}
    </section>
  );
}
