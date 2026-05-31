"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
  tbmFormUrl?: string | null;
  companyName?: string | null;
  className?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferRiskBullets(text: string) {
  const compact = text.replace(/\s+/g, " ");
  const risks: string[] = [];

  if (includesAny(compact, ["지게차", "후진", "차량", "상하차", "적재", "하차"])) {
    risks.push("차량·지게차 이동 시 후진 충돌, 사각지대, 보행자 접근 여부 확인");
  }

  if (includesAny(compact, ["끼임", "협착", "컨베이어", "압축", "회전", "롤러"])) {
    risks.push("회전부·협착부 접근 금지, 정비·청소 전 전원 차단 확인");
  }

  if (includesAny(compact, ["추락", "고소", "사다리", "계단", "상부", "지붕"])) {
    risks.push("추락 위험 구간 안전난간, 발판, 사다리 고정상태 확인");
  }

  if (includesAny(compact, ["화재", "용접", "불티", "배터리", "충전", "소화기"])) {
    risks.push("화재 위험물 주변 정리, 소화기 위치, 충전기·배터리 발열 여부 확인");
  }

  if (includesAny(compact, ["미끄럼", "침출수", "물기", "바닥", "우천", "비"])) {
    risks.push("바닥 물기·침출수·미끄럼 구간 확인 및 이동 동선 정리");
  }

  if (risks.length === 0) {
    risks.push("작업 전 통로, 장비, 보호구, 주변 작업자 위치를 확인");
  }

  return risks.slice(0, 4);
}

function buildTbmDraftText(params: {
  companyName?: string | null;
  transcript: string;
}) {
  const raw = params.transcript.trim();
  if (!raw) return "";

  const riskBullets = inferRiskBullets(raw);

  return [
    "[TBM 음성 초안]",
    `사업장: ${params.companyName || "현장"}`,
    "",
    "1. 작업 내용",
    raw,
    "",
    "2. 오늘 공유할 주요 위험요인",
    ...riskBullets.map((item) => `- ${item}`),
    "",
    "3. 근로자 주의사항",
    "- 작업 전 보호구 착용상태를 확인합니다.",
    "- 장비·차량 이동 구간에 접근하지 않습니다.",
    "- 이상 상황이나 아차사고는 즉시 현장관리자에게 공유합니다.",
    "",
    "4. 특이사항/조치 필요",
    "- 현장에서 확인 후 필요 시 조치사항을 추가 입력합니다.",
    "",
    "5. 사진/증빙 첨부 안내",
    "- TBM 실시 또는 참석 확인 사진을 첨부합니다.",
    "- 작업 전 현장사진 또는 작업대상 사진을 첨부합니다.",
    "- 특이사항이 있으면 조치 전 사진과 조치 후 사진을 함께 첨부합니다.",
    "- 위험요인 또는 개선조치가 있는 경우 관련 사진을 누락하지 않습니다.",
  ].join("\n");
}

export default function TbmVoiceDraftHelper({
  tbmFormUrl,
  companyName,
  className = "",
}: Props) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [copied, setCopied] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");

  const combinedTranscript = [transcript, interimText].filter(Boolean).join(" ").trim();

  const draftText = useMemo(
    () =>
      buildTbmDraftText({
        companyName,
        transcript: combinedTranscript,
      }),
    [companyName, combinedTranscript]
  );

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    setInterimText("");
  }

  function startRecording() {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setSupportMessage("이 브라우저에서는 음성입력을 지원하지 않습니다. Android Chrome에서 가장 안정적으로 작동합니다.");
      return;
    }

    setSupportMessage("");
    setCopied(false);

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? "";

        if (result.isFinal) {
          finalText += ` ${text}`;
        } else {
          interim += ` ${text}`;
        }
      }

      if (finalText.trim()) {
        setTranscript((prev) => `${prev} ${finalText}`.trim());
      }

      setInterimText(interim.trim());
    };

    recognition.onerror = () => {
      setSupportMessage("음성입력이 중단되었습니다. 브라우저 권한과 마이크 설정을 확인해 주세요.");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  }

  async function copyDraft() {
    if (!draftText) return;

    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
    } catch {
      setSupportMessage("복사가 차단되었습니다. 초안 내용을 길게 눌러 직접 복사해 주세요.");
    }
  }

  function clearDraft() {
    stopRecording();
    setTranscript("");
    setInterimText("");
    setCopied(false);
    setSupportMessage("");
  }

  return (
    <section id="tbm-voice-draft" className={`scroll-mt-24 rounded-2xl border border-cyan-700/60 bg-cyan-950/25 p-4 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-cyan-200">TBM 음성 작성지원</p>
          <h2 className="mt-1 text-xl font-black text-white">🎙️ 말로 TBM 초안 만들기</h2>
          <p className="mt-2 text-sm leading-6 text-cyan-100/80">
            현장관리자가 말한 내용을 TBM 초안으로 정리합니다. 초안을 복사한 뒤 오늘 TBM 작성 화면에 붙여넣고, 참석사진·현장사진·특이사항/조치사진을 함께 첨부하세요.
          </p>
        </div>
        <span className="w-fit rounded-full border border-cyan-400/30 bg-slate-950 px-3 py-1 text-xs font-black text-cyan-100">
          현장관리자 작성지원
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording}
          className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isRecording ? "녹음 중..." : "녹음 시작"}
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-black text-slate-200 disabled:bg-slate-900 disabled:text-slate-600"
        >
          정지
        </button>
        <button
          type="button"
          onClick={copyDraft}
          disabled={!draftText}
          className="rounded-xl border border-blue-500 bg-blue-950/50 px-4 py-3 text-sm font-black text-blue-100 disabled:border-slate-700 disabled:text-slate-600"
        >
          {copied ? "복사 완료" : "초안 복사"}
        </button>
        {tbmFormUrl ? (
          <a
            href={tbmFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950"
          >
            TBM 작성 열기
          </a>
        ) : (
          <span className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-bold text-slate-500">
            작성 링크 없음
          </span>
        )}
      </div>

      {supportMessage ? (
        <p className="mt-3 rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-sm font-bold leading-6 text-amber-100">
          {supportMessage}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <p className="text-xs font-black text-slate-400">인식된 음성</p>
          <p className="mt-2 min-h-24 whitespace-pre-wrap text-sm leading-6 text-slate-200">
            {combinedTranscript || "녹음 시작 후 현장 작업 내용을 말해 주세요."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <p className="text-xs font-black text-slate-400">복사용 TBM 초안</p>
          <pre className="mt-2 min-h-24 whitespace-pre-wrap text-sm leading-6 text-slate-200 [word-break:keep-all]">
            {draftText || "음성 인식 후 TBM 초안이 생성됩니다. TBM 작성 화면에서 참석사진, 작업 전 현장사진, 특이사항/조치사진을 함께 첨부하세요."}
          </pre>
        </div>
      </div>

      <button
        type="button"
        onClick={clearDraft}
        className="mt-3 text-sm font-bold text-slate-400 underline underline-offset-4 hover:text-white"
      >
        초안 초기화
      </button>
    </section>
  );
}
