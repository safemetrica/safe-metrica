"use client";

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from "react";

import { TBM_VOICE_UPLOAD_FIELD_KEYS } from "@/lib/tbmVoiceUploadFields";
import { normalizeTbmVoiceTranscript } from "@/lib/tbmVoiceTranscriptNormalize";

type Props = {
  tbmFormUrl?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
  className?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript?: string } | undefined;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
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

function getCurrentTimeText() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferRiskBullets(text: string) {
  const compact = text.replace(/\s+/g, " ");
  const risks: string[] = [];

  if (includesAny(compact, ["지게차", "후진", "차량", "상하차", "적재", "하차", "물류창고", "좁은 동선", "이동 동선", "통로", "생활폐기물", "골목길", "후방카메라", "유도자", "사각지대"])) {
    risks.push("차량·지게차 이동 시 후진 충돌, 사각지대, 보행자 접근 여부 확인");
  }

  if (includesAny(compact, ["끼임", "협착", "컨베이어", "압축", "압착", "적재함", "압축기", "압축진개차", "회전", "롤러"])) {
    risks.push("회전부·협착부 접근 금지, 정비·청소 전 전원 차단 확인");
  }

  if (includesAny(compact, ["추락", "낙상", "고소", "고소대", "고소작업", "사다리", "계단", "상부", "지붕", "랙", "높은 곳"])) {
    risks.push("추락 위험 구간 안전난간, 발판, 사다리 고정상태 확인");
  }

  if (includesAny(compact, ["화재", "화재예방", "용접", "불티", "전자담배", "배터리", "충전", "발열", "소화기"])) {
    risks.push("화재 위험물 주변 정리, 소화기 위치, 충전기·배터리 발열 여부 확인");
  }

  if (includesAny(compact, ["미끄럼", "침출수", "물기", "바닥", "우천", "비", "경사로"])) {
    risks.push("바닥 물기·침출수·미끄럼 구간 확인 및 이동 동선 정리");
  }

  if (includesAny(compact, ["새벽", "야간", "어두움", "시야", "전조등", "반사조끼"])) {
    risks.push("야간·새벽작업 시 전조등, 반사조끼, 유도자 위치를 확인");
  }

  if (includesAny(compact, ["유리", "캔", "날카로운 폐기물", "찔림", "베임"])) {
    risks.push("날카로운 폐기물 취급 시 베임·찔림 방지 장갑 착용");
  }

  if (includesAny(compact, ["중량물", "무거운 봉투", "반복작업", "허리"])) {
    risks.push("중량물은 2인 1조로 취급하고 허리 부담을 줄이는 자세 확인");
  }

  if (includesAny(compact, ["여름", "여름철", "온열질환", "폭염", "더위", "수분", "휴식"])) {
    risks.push("온열질환 예방을 위해 수분 섭취, 그늘 휴식, 이상 증상 동료 확인");
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
  const raw = normalizeTbmVoiceTranscript(params.transcript);
  if (!raw) return "";

  const riskBullets = inferRiskBullets(raw);

  return [
    "[TBM 음성 작성 내용]",
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
  companyCode,
  className = "",
}: Props) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [copied, setCopied] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [signatureFiles, setSignatureFiles] = useState<File[]>([]);
  const [siteFiles, setSiteFiles] = useState<File[]>([]);
  const [workFiles, setWorkFiles] = useState<File[]>([]);
  const [actionFiles, setActionFiles] = useState<File[]>([]);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const siteInputRef = useRef<HTMLInputElement | null>(null);
  const workInputRef = useRef<HTMLInputElement | null>(null);
  const actionInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState("");
  const defaultSupervisorName = companyCode === "daedo" || companyName?.includes("대도") ? "김인길" : "현장관리자";

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
    setSubmitMessage("");
    setHasSubmitted(false);
    setRecordingStartTime(getCurrentTimeText());
    clearPhotoFileState();
    clearPhotoInputValues();
    setCopied(false);

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
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

  function getSelectedFiles(input: HTMLInputElement) {
    return Array.from(input.files ?? []).filter((file) => file.size > 0).slice(0, 6);
  }

  function clearPhotoInputValues() {
    [signatureInputRef, siteInputRef, workInputRef, actionInputRef].forEach((inputRef) => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    });
  }

  function clearPhotoFileState() {
    setSignatureFiles([]);
    setSiteFiles([]);
    setWorkFiles([]);
    setActionFiles([]);
  }

  function updateSelectedFiles(input: HTMLInputElement, setter: (files: File[]) => void) {
    setter(getSelectedFiles(input));
    setHasSubmitted(false);
    setSubmitMessage("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>, setter: (files: File[]) => void) {
    updateSelectedFiles(event.currentTarget, setter);
  }

  function handleFileInput(event: FormEvent<HTMLInputElement>, setter: (files: File[]) => void) {
    updateSelectedFiles(event.currentTarget, setter);
  }

  async function submitDirectTbm() {
    if (isSubmitting || hasSubmitted) return;
    if (isRecording) {
      setSubmitMessage("녹음을 완료한 뒤 저장해 주세요.");
      return;
    }
    if (!draftText && !combinedTranscript) return;

    setIsSubmitting(true);
    setSubmitMessage("");

    const formData = new FormData();
    formData.append("transcript", combinedTranscript);
    formData.append("draftText", draftText);
    formData.append("startTime", recordingStartTime || getCurrentTimeText());
    formData.append("supervisorName", defaultSupervisorName);

    signatureFiles.forEach((file) => formData.append(TBM_VOICE_UPLOAD_FIELD_KEYS.signature, file, file.name));
    siteFiles.forEach((file) => formData.append(TBM_VOICE_UPLOAD_FIELD_KEYS.site, file, file.name));
    workFiles.forEach((file) => formData.append(TBM_VOICE_UPLOAD_FIELD_KEYS.work, file, file.name));
    actionFiles.forEach((file) => formData.append(TBM_VOICE_UPLOAD_FIELD_KEYS.action, file, file.name));

    try {
      const res = await fetch("/api/tbm/voice-submit", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setSubmitMessage(data.message || "TBM 저장 중 오류가 발생했습니다.");
        return;
      }

      setSubmitMessage(data.message || "TBM이 저장되었습니다.");
      setHasSubmitted(true);
      setTranscript("");
      setInterimText("");
      clearPhotoFileState();
      clearPhotoInputValues();
      setRecordingStartTime("");
      setCopied(false);
    } catch {
      setSubmitMessage("TBM 저장 요청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyDraft() {
    if (!draftText) return;

    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
    } catch {
      setSupportMessage("복사가 차단되었습니다. 인식된 내용을 길게 눌러 직접 복사해 주세요.");
    }
  }

  function clearDraft() {
    stopRecording();
    setTranscript("");
    setInterimText("");
    setCopied(false);
    setSupportMessage("");
    setSubmitMessage("");
    setRecordingStartTime("");
    setHasSubmitted(false);
    clearPhotoFileState();
    clearPhotoInputValues();
  }

  function renderPhotoInput(params: {
    label: string;
    description: string;
    files: File[];
    setter: (files: File[]) => void;
    inputRef: RefObject<HTMLInputElement | null>;
  }) {
    return (
      <label className="block rounded-xl border border-slate-700 bg-slate-900 p-3">
        <span className="text-xs font-black text-cyan-200">{params.label}</span>
        <span className="mt-1 block text-[11px] leading-5 text-slate-500">{params.description}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={params.inputRef}
          onChange={(event) => handleFileChange(event, params.setter)}
          onInput={(event) => handleFileInput(event, params.setter)}
          className="mt-2 block w-full text-xs text-slate-300 file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
        />
        <span className="mt-2 block rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-black text-slate-200">
          선택 {params.files.length}개
        </span>
        {params.files.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[11px] leading-5 text-slate-400">
            {params.files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="truncate">
                {index + 1}. {file.name}
              </li>
            ))}
          </ul>
        ) : null}
      </label>
    );
  }

  const hasVoiceContent = Boolean(combinedTranscript || draftText);
  const canSubmit = hasVoiceContent && !isRecording;
  const saveButtonLabel = isSubmitting ? "저장 중..." : hasSubmitted ? "TBM 저장 완료" : "TBM 저장하기";

  return (
    <section
      id="tbm-voice-draft"
      className={`max-w-full scroll-mt-24 rounded-2xl border border-cyan-700/60 bg-cyan-950/25 p-3 pb-24 sm:p-4 ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-cyan-200">TBM 음성 작성지원</p>
          <h2 className="mt-1 text-xl font-black text-white">🎙️ 말로 TBM 작성</h2>
          <p className="mt-2 text-sm leading-6 text-cyan-100/80">
            현장관리자가 말한 내용을 인식된 TBM 내용으로 정리하고, 사진을 첨부한 뒤 바로 Notion TBM DB에 저장합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-700/50 bg-slate-950/50 p-3">
        <p className="text-xs font-black text-cyan-200">1단계 · 녹음 시작 / 완료</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
            녹음 완료
          </button>
        </div>
      </div>

      {supportMessage ? (
        <p className="mt-3 rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-sm font-bold leading-6 text-amber-100">
          {supportMessage}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black text-cyan-200">2단계 · 인식된 음성 및 TBM 내용</p>
          <button
            type="button"
            onClick={clearDraft}
            className="shrink-0 rounded-full border border-slate-700 px-3 py-1 text-xs font-black text-slate-300 hover:border-cyan-500 hover:text-white"
          >
            내용 초기화
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-xs font-black text-slate-400">인식된 음성</p>
            <p className="mt-2 min-h-24 whitespace-pre-wrap text-sm leading-6 text-slate-200">
              {combinedTranscript || "녹음 시작 후 현장 작업 내용을 말해 주세요."}
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
            <p className="text-xs font-black text-slate-400">인식된 TBM 내용</p>
            <pre className="mt-2 min-h-24 whitespace-pre-wrap text-sm leading-6 text-slate-200 [word-break:keep-all]">
              {draftText || "음성 인식 후 TBM 내용이 생성됩니다. 사진을 첨부한 뒤 TBM 저장하기를 누르세요."}
            </pre>
          </div>
        </div>

        <details className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <summary className="cursor-pointer text-xs font-black text-slate-400">관리자/보조 기능</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyDraft}
              disabled={!draftText}
              className="rounded-xl border border-blue-500 bg-blue-950/50 px-4 py-3 text-sm font-black text-blue-100 disabled:border-slate-700 disabled:text-slate-600"
            >
              {copied ? "복사 완료" : "내용 복사"}
            </button>
            {tbmFormUrl ? (
              <a
                href={tbmFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-black text-slate-200"
              >
                노션폼 열기
              </a>
            ) : (
              <span className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-bold text-slate-500">
                작성 링크 없음
              </span>
            )}
          </div>
        </details>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
        <p className="text-xs font-black text-cyan-200">3단계 · 사진 촬영/첨부</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">실시자 {defaultSupervisorName} · 각 항목 최대 6장</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {renderPhotoInput({
            label: "참석·서명사진",
            description: "Notion ‘서명 사진 (참석자 확인)’ 필드로 저장",
            files: signatureFiles,
            setter: setSignatureFiles,
            inputRef: signatureInputRef,
          })}
          {renderPhotoInput({
            label: "작업 전 현장사진",
            description: "Notion ‘현장 사진’ 필드로 저장",
            files: siteFiles,
            setter: setSiteFiles,
            inputRef: siteInputRef,
          })}
          {renderPhotoInput({
            label: "작업사진",
            description: "Notion ‘파일과 미디어’ 필드로 저장",
            files: workFiles,
            setter: setWorkFiles,
            inputRef: workInputRef,
          })}
          {renderPhotoInput({
            label: "특이사항·조치사진",
            description: "Notion ‘조치 사진’ 필드로 저장",
            files: actionFiles,
            setter: setActionFiles,
            inputRef: actionInputRef,
          })}
        </div>
      </div>

      {submitMessage ? (
        <p className="mt-3 rounded-xl border border-emerald-700 bg-emerald-950/40 p-3 text-sm font-bold leading-6 text-emerald-100">
          {submitMessage}
        </p>
      ) : null}

      {hasVoiceContent ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-700/60 bg-slate-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="text-xs font-black text-emerald-200">4단계 · 하단 고정 저장</p>
              <p className="truncate text-xs text-slate-400">
                사진 {signatureFiles.length + siteFiles.length + workFiles.length + actionFiles.length}개 선택됨
              </p>
            </div>
            <button
              type="button"
              onClick={submitDirectTbm}
              disabled={!canSubmit || isSubmitting || hasSubmitted}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:bg-slate-700 disabled:text-slate-400 sm:w-56"
            >
              {saveButtonLabel}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
