"use client";
import {
  riskShareLinkCopy,
  riskShareLinkSubmissionTypeLabels,
} from "@/lib/risk-share-link/copy";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import FieldParticipationFileInput from "./FieldParticipationFileInput";
import {
  FieldQrIdentityCard,
  type FieldQrIdentityCardProps,
} from "./FieldQrIdentityCard";
import {
  clearFieldQrRememberedIdentity,
  readFieldQrRememberedIdentity,
  writeFieldQrRememberedIdentity,
} from "./fieldQrRememberInfo";
import {
  FieldQrSpecialNoteCard,
  type FieldQrSpecialNoteMode,
  type FieldQrSpecialNoteValue,
} from "./FieldQrSpecialNoteCard";
import HandwrittenSignaturePad from "./HandwrittenSignaturePad";
import RichiWorkerConfirmationFlow from "./RichiWorkerConfirmationFlow";
import RichiWorkerEntryChoice from "./RichiWorkerEntryChoice";

const RICHI_WORKER_CONFIRMATION_INFO_STORAGE_KEY =
  "safemetrica:richi:worker-confirmation-info:v1";

type WorkerCopy = {
  code?: string;
  badge: string;
  title: string;
  description: string;
  companyName: string;
  noticeTitle: string;
  noticeBody: string;
  submitButtonLabel: string;
} | null;

type RiskSummaryItem = {
  id: string;
  title: string;
  taskName: string;
  hazard: string;
  accidentType: string;
  riskLevel: string;
  currentControls: string;
  improvementPlan: string;
};

type RiskSummary = {
  hasDb: boolean;
  total: number;
  items: RiskSummaryItem[];
  memo: string;
};

type WeatherNotice = {
  level: "danger" | "warning" | "info";
  icon: string;
  title: string;
  message: string;
  ttsLine: string;
} | null;

type BubblemonWorkerQrEntryIntent =
  | "monthly_risk_share_confirmation"
  | "daily_prework_safety_check";

type BubblemonWorkerQrCadence = "monthly" | "daily";

type Props = {
  companyCode: string;
  flow?: string;
  initialStep: 1 | 2 | 3;
  entryIntent: "risk" | "share" | "report" | "default";
  siteValue: string;
  sourceValue: string;
  todayDateValue: string;
  workerCopy: WorkerCopy;
  riskSummary: RiskSummary;
  feedbackTypes: string[];
  weatherNotice?: WeatherNotice;
  commercialRiskShareEntryEnabled?: boolean;
  commercialCompanyName?: string;
};

const defaultStepLabels = ["위험 확인", "주지 확인", "의견 제출", "완료"];
const richiStepLabels = ["안내·확인", "의견·서명", "완료"];

function createClientSubmissionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeParticipationType(rawType: string) {
  const value = rawType.trim();
  const compact = value.replace(/\s+/g, "");

  if (compact === "위험제보" || compact === "위험요인제보") return "위험제보";
  if (compact === "개선제안" || compact === "개선의견") return "개선제안";
  if (compact === "아차사고" || compact === "아차사고제보") return "아차사고";
  if (compact === "공유확인" || compact === "주지확인") return "공유확인";

  return value || "위험제보";
}

function buildFieldParticipationTtsText(params: {
  companyName?: string;
  canOpenRiskSummary: boolean;
  riskItems: RiskSummaryItem[];
  weatherNotice?: WeatherNotice;
}) {
  const lines: string[] = [];

  lines.push(`${params.companyName ?? "현장"} 안전참여 안내입니다.`);
  lines.push("오늘 작업 전 핵심 위험을 확인합니다.");

  if (params.weatherNotice) {
    lines.push(params.weatherNotice.ttsLine);
  }

  if (params.riskItems.length > 0) {
    params.riskItems.forEach((item, index) => {
      lines.push(
        `핵심 위험 ${index + 1}. ${item.taskName}. 위험요인: ${item.hazard}. 확인할 안전조치: ${item.improvementPlan}.`,
      );
    });
  } else if (params.canOpenRiskSummary) {
    lines.push("공유할 위험요인은 아래 버튼에서 확인할 수 있습니다.");
  } else {
    lines.push(
      "오늘 작업 전 티비엠 공유 내용과 현장 주의사항을 확인해 주세요.",
    );
  }

  lines.push(
    "내용을 확인했으면 핵심 위험 확인 완료 버튼을 눌러 다음 단계로 진행해 주세요.",
  );

  return lines.join(" ");
}

function StepHeader({
  step,
  completedSteps,
  labels,
}: {
  step: number;
  completedSteps: Set<number>;
  labels: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {labels.map((label, index) => {
          const stepNo = index + 1;
          const active = stepNo === step;
          const done = completedSteps.has(stepNo) && !active;

          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex min-w-12 flex-col items-center gap-1">
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-black",
                    done ? "bg-emerald-600 text-white" : "",
                    active ? "bg-blue-700 text-white" : "",
                    !done && !active ? "bg-slate-200 text-slate-500" : "",
                  ].join(" ")}
                >
                  {done ? "✓" : stepNo}
                </div>
                <p
                  className={
                    active
                      ? "text-xs font-black text-blue-700"
                      : "text-xs font-bold text-slate-500"
                  }
                >
                  {label}
                </p>
              </div>
              {index < labels.length - 1 ? (
                <div
                  className={
                    done
                      ? "h-0.5 flex-1 bg-emerald-500"
                      : "h-0.5 flex-1 bg-slate-200"
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FieldParticipationStepper({
  companyCode,
  flow = "",
  initialStep,
  entryIntent,
  siteValue,
  sourceValue,
  todayDateValue,
  workerCopy,
  riskSummary,
  feedbackTypes,
  weatherNotice,
  commercialRiskShareEntryEnabled = false,
  commercialCompanyName,
}: Props) {
  const [step, setStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    () => new Set(),
  );
  const [riskCheck, setRiskCheck] = useState(false);
  const [riskAssessmentCheck, setRiskAssessmentCheck] = useState(false);
  const [safetyMeasureCheck, setSafetyMeasureCheck] = useState(false);
  const [bubblemonEntryIntent, setBubblemonEntryIntent] =
    useState<BubblemonWorkerQrEntryIntent>("monthly_risk_share_confirmation");
  const [bubblemonCadence, setBubblemonCadence] =
    useState<BubblemonWorkerQrCadence>("monthly");
  const [sharedRiskSummaryViewed, setSharedRiskSummaryViewed] = useState(false);
  const isRichiPreworkConfirmationFlow = workerCopy?.code === "richi";

  const formStep = isRichiPreworkConfirmationFlow ? 2 : 3;
  const stepLabels = isRichiPreworkConfirmationFlow
    ? richiStepLabels
    : defaultStepLabels;
  const feedbackTypeOptions = useMemo(() => {
    const source =
      feedbackTypes.length > 0
        ? feedbackTypes
        : riskShareLinkSubmissionTypeLabels.filter(
            (type) =>
              type !==
              riskShareLinkCopy.submissionTypes.shareConfirmation.label,
          );
    return Array.from(new Set(source.map(normalizeParticipationType))).filter(
      (type) => type !== "공유확인",
    );
  }, [feedbackTypes]);
  const [feedbackType, setFeedbackType] = useState(() =>
    normalizeParticipationType(feedbackTypeOptions[0] ?? "위험제보"),
  );
  const [reportTitle, setReportTitle] = useState("");
  const [location, setLocation] = useState(siteValue);
  const [submitter, setSubmitter] = useState("");
  const [workerTeam, setWorkerTeam] = useState("");
  const [workerPhoneLast4, setWorkerPhoneLast4] = useState("");
  const [workerEmployeeNo, setWorkerEmployeeNo] = useState("");
  const [rememberWorkerInfo, setRememberWorkerInfo] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [content, setContent] = useState("");
  const [dailySpecialNoteMode, setDailySpecialNoteMode] =
    useState<FieldQrSpecialNoteMode>("none");
  const [hasEvidenceFiles, setHasEvidenceFiles] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSubmissionId] = useState(createClientSubmissionId);
  const isSubmittingRef = useRef(false);
  const hydratedBubblemonDailyIdentityScopeRef = useRef<string | null>(null);

  const bubblemonModeCopy = useMemo(() => {
    if (bubblemonEntryIntent === "daily_prework_safety_check") {
      return {
        title: "오늘 작업 전 안전확인",
        helper: "오늘 작업 전 보호구·동선·적재·상하차 주의사항을 확인합니다.",
        buttonLabel: "작업 전 확인 시작",
      };
    }

    return {
      title: "이번 달 공유 위험요인 확인",
      helper: "이번 달 주요 위험요인과 필요한 주의사항을 확인합니다.",
      buttonLabel: "공유 위험요인 확인 완료",
    };
  }, [bubblemonEntryIntent]);

  const riskItems = useMemo(
    () => riskSummary.items.slice(0, 3),
    [riskSummary.items],
  );
  const normalizedCompanyCode = companyCode.trim().toLowerCase();
  const isBubblemonWorkerQr = normalizedCompanyCode === "bubblemon";
  const legacyFieldQrCodes = new Set([
    "richi",
    "bubblemon",
    "daedo",
    "dongwoo",
    "hankookgreen",
  ]);
  const isCommercialRiskShareTenant =
    commercialRiskShareEntryEnabled &&
    !legacyFieldQrCodes.has(normalizedCompanyCode);
  const isFieldQrModeEntryTenant =
    isBubblemonWorkerQr || isCommercialRiskShareTenant;
  const isDailyPreworkSafetyCheck =
    isFieldQrModeEntryTenant &&
    bubblemonEntryIntent === "daily_prework_safety_check";
  const isMonthlyRiskShareConfirmation =
    isFieldQrModeEntryTenant &&
    bubblemonEntryIntent === "monthly_risk_share_confirmation";
  const canGoNextFromStep2 =
    riskCheck && riskAssessmentCheck && safetyMeasureCheck;
  const mustViewSharedRiskSummaryBeforeStep2 =
    isMonthlyRiskShareConfirmation && !sharedRiskSummaryViewed;
  const hasBubblemonMonthlyVisibleRiskItems =
    isMonthlyRiskShareConfirmation &&
    sharedRiskSummaryViewed &&
    riskItems.length > 0;
  const canGoNextFromStep1 =
    (!isRichiPreworkConfirmationFlow || canGoNextFromStep2) &&
    !mustViewSharedRiskSummaryBeforeStep2 &&
    (!isMonthlyRiskShareConfirmation || hasBubblemonMonthlyVisibleRiskItems);
  const bubblemonEntryIntentLabel =
    bubblemonEntryIntent === "daily_prework_safety_check"
      ? "오늘 작업 전 안전확인"
      : "월간 위험성평가 공유확인";
  const canOpenRiskSummary =
    isCommercialRiskShareTenant ||
    [
      "daedo",
      "dongwoo",
      "hankookgreen",
      "korea-green",
      "korea_green",
      "koreagreen",
      "greenkorea",
      "bubblemon",
    ].includes(normalizedCompanyCode);
  const hasOpinion =
    reportTitle.trim().length > 0 ||
    content.trim().length > 0 ||
    hasEvidenceFiles;
  const workerName = submitter.trim();
  const normalizedWorkerTeam = workerTeam.trim();
  const normalizedWorkerPhoneLast4 = workerPhoneLast4.trim();
  const normalizedWorkerEmployeeNo = workerEmployeeNo.trim();
  const richiConfirmationCodeValue = workerEmployeeNo || workerPhoneLast4;
  const canRememberBubblemonDailyIdentity = isDailyPreworkSafetyCheck;
  const bubblemonDailyIdentityMode = "daily_prework_safety_check";
  const bubblemonDailyIdentityScope = `${normalizedCompanyCode}:${bubblemonDailyIdentityMode}`;
  const bubblemonDailyIdentity = useMemo(
    () => ({
      workerName,
      workerTeam: normalizedWorkerTeam,
      workerPhoneLast4: normalizedWorkerPhoneLast4,
      workerEmployeeNo: normalizedWorkerEmployeeNo,
    }),
    [
      workerName,
      normalizedWorkerTeam,
      normalizedWorkerPhoneLast4,
      normalizedWorkerEmployeeNo,
    ],
  );
  const handleBubblemonDailyIdentityChange: FieldQrIdentityCardProps["onIdentityChange"] =
    (identity) => {
      setSubmitter(identity.workerName);
      setWorkerTeam(identity.workerTeam);
      setWorkerPhoneLast4(identity.workerPhoneLast4);
      setWorkerEmployeeNo(identity.workerEmployeeNo);
    };
  /* eslint-disable react-hooks/set-state-in-effect -- Hydrates optional saved worker confirmation info from localStorage after mount. */
  useEffect(() => {
    if (!isRichiPreworkConfirmationFlow || typeof window === "undefined") {
      return;
    }

    const rawSavedInfo = window.localStorage.getItem(
      RICHI_WORKER_CONFIRMATION_INFO_STORAGE_KEY,
    );

    if (!rawSavedInfo) {
      return;
    }

    try {
      const savedInfo = JSON.parse(rawSavedInfo) as {
        schema?: string;
        workerName?: string;
        workerTeam?: string;
        workerPhoneLast4?: string;
        workerEmployeeNo?: string;
      };

      if (savedInfo.schema !== "saved_worker_confirmation_info_v1") {
        return;
      }

      if (savedInfo.workerName && !workerName) {
        setSubmitter(savedInfo.workerName.slice(0, 60));
      }

      if (savedInfo.workerTeam && !workerTeam) {
        setWorkerTeam(savedInfo.workerTeam.slice(0, 80));
      }

      if (savedInfo.workerPhoneLast4 && !workerPhoneLast4) {
        setWorkerPhoneLast4(
          savedInfo.workerPhoneLast4.replace(/\D/g, "").slice(0, 4),
        );
      }

      if (savedInfo.workerEmployeeNo && !workerEmployeeNo) {
        setWorkerEmployeeNo(savedInfo.workerEmployeeNo.slice(0, 40));
      }

      setRememberWorkerInfo(true);
    } catch {
      window.localStorage.removeItem(
        RICHI_WORKER_CONFIRMATION_INFO_STORAGE_KEY,
      );
    }
  }, [
    isRichiPreworkConfirmationFlow,
    workerName,
    workerTeam,
    workerPhoneLast4,
    workerEmployeeNo,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (
      !isRichiPreworkConfirmationFlow ||
      !rememberWorkerInfo ||
      typeof window === "undefined"
    ) {
      return;
    }

    const payload = {
      schema: "saved_worker_confirmation_info_v1",
      workerName: workerName.trim().slice(0, 60),
      workerTeam: workerTeam.trim().slice(0, 80),
      workerPhoneLast4: workerPhoneLast4.replace(/\D/g, "").slice(0, 4),
      workerEmployeeNo: workerEmployeeNo.trim().slice(0, 40),
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      RICHI_WORKER_CONFIRMATION_INFO_STORAGE_KEY,
      JSON.stringify(payload),
    );
  }, [
    isRichiPreworkConfirmationFlow,
    rememberWorkerInfo,
    workerName,
    workerTeam,
    workerPhoneLast4,
    workerEmployeeNo,
  ]);

  /* eslint-disable react-hooks/set-state-in-effect -- Hydrates optional saved Field QR identity from localStorage after mode selection. */
  useEffect(() => {
    if (!canRememberBubblemonDailyIdentity) {
      hydratedBubblemonDailyIdentityScopeRef.current = null;
      return;
    }

    if (
      hydratedBubblemonDailyIdentityScopeRef.current ===
      bubblemonDailyIdentityScope
    ) {
      return;
    }

    hydratedBubblemonDailyIdentityScopeRef.current =
      bubblemonDailyIdentityScope;

    const savedIdentity = readFieldQrRememberedIdentity(
      companyCode,
      bubblemonDailyIdentityMode,
    );

    if (!savedIdentity) {
      return;
    }

    setSubmitter((current) =>
      current.trim() ? current : savedIdentity.workerName,
    );
    setWorkerTeam((current) =>
      current.trim() ? current : savedIdentity.workerTeam,
    );
    setWorkerPhoneLast4((current) =>
      current.trim() ? current : savedIdentity.workerPhoneLast4,
    );
    setWorkerEmployeeNo((current) =>
      current.trim() ? current : savedIdentity.workerEmployeeNo,
    );
    setRememberWorkerInfo(true);
  }, [
    bubblemonDailyIdentityMode,
    bubblemonDailyIdentityScope,
    canRememberBubblemonDailyIdentity,
    companyCode,
  ]);

  useEffect(() => {
    if (!canRememberBubblemonDailyIdentity) {
      return;
    }

    if (!rememberWorkerInfo) {
      clearFieldQrRememberedIdentity(companyCode, bubblemonDailyIdentityMode);
      return;
    }

    writeFieldQrRememberedIdentity(
      companyCode,
      {
        workerName,
        workerTeam: normalizedWorkerTeam,
        workerPhoneLast4: normalizedWorkerPhoneLast4,
        workerEmployeeNo: normalizedWorkerEmployeeNo,
      },
      bubblemonDailyIdentityMode,
    );
  }, [
    bubblemonDailyIdentityMode,
    canRememberBubblemonDailyIdentity,
    companyCode,
    rememberWorkerInfo,
    workerName,
    normalizedWorkerTeam,
    normalizedWorkerPhoneLast4,
    normalizedWorkerEmployeeNo,
  ]);

  /* eslint-enable react-hooks/set-state-in-effect */

  function handleRichiConfirmationCodeChange(value: string) {
    const nextValue = value.trim().slice(0, 60);

    if (/^\d{0,4}$/.test(nextValue)) {
      setWorkerPhoneLast4(nextValue);
      setWorkerEmployeeNo("");
      return;
    }

    setWorkerPhoneLast4("");
    setWorkerEmployeeNo(nextValue);
  }
  const shareConfirmationIdentityReady =
    workerName.length > 0 &&
    normalizedWorkerTeam.length > 0 &&
    (normalizedWorkerPhoneLast4.length === 4 ||
      normalizedWorkerEmployeeNo.length > 0);
  const effectiveAnonymous = hasOpinion ? anonymous : false;
  const identityMode = hasOpinion
    ? effectiveAnonymous
      ? "anonymous"
      : "identified"
    : "identified";
  const finalFeedbackType = hasOpinion
    ? normalizeParticipationType(feedbackType)
    : isRichiPreworkConfirmationFlow
      ? "위생·안전 확인"
      : "공유확인";
  const finalContent = hasOpinion
    ? content.trim() || "상세 내용 미입력"
    : "오늘은 추가 의견 없음.";
  const finalTitle = hasOpinion
    ? reportTitle.trim() || `${finalFeedbackType} - 현장근로자 참여`
    : isRichiPreworkConfirmationFlow
      ? "작업 전 위생·안전 전자확인 완료"
      : "위험성평가 공유확인 완료";
  const confirmationType = hasOpinion ? "worker_report" : "risk_share_confirm";
  const confirmationStatus = canGoNextFromStep2 ? "confirmed" : "pending";

  const ttsText = useMemo(
    () =>
      buildFieldParticipationTtsText({
        companyName: workerCopy?.companyName,
        canOpenRiskSummary,
        riskItems,
        weatherNotice,
      }),
    [workerCopy?.companyName, canOpenRiskSummary, riskItems, weatherNotice],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const weatherNoticeClassName =
    weatherNotice?.level === "danger"
      ? "border-red-200 bg-red-50 text-red-900"
      : weatherNotice?.level === "warning"
        ? "border-orange-200 bg-orange-50 text-orange-900"
        : "border-cyan-200 bg-cyan-50 text-cyan-900";

  function handleFormChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.type !== "file") return;

    const fileInputs =
      event.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[type="file"]',
      );
    setHasEvidenceFiles(
      Array.from(fileInputs).some((input) => (input.files?.length ?? 0) > 0),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (canRememberBubblemonDailyIdentity && rememberWorkerInfo) {
      writeFieldQrRememberedIdentity(
        companyCode,
        {
          workerName,
          workerTeam: normalizedWorkerTeam,
          workerPhoneLast4: normalizedWorkerPhoneLast4,
          workerEmployeeNo: normalizedWorkerEmployeeNo,
        },
        bubblemonDailyIdentityMode,
      );
    }

    if (isSubmittingRef.current) {
      event.preventDefault();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
  }

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

  function handleSpecialNoteChange(value: FieldQrSpecialNoteValue) {
    setDailySpecialNoteMode(value.mode);

    if (value.mode === "none") {
      setReportTitle("");
      setContent("");
      setLocation("");
      return;
    }

    setFeedbackType(normalizeParticipationType(value.noteType));
    setLocation(value.location);
    setContent(value.content);
  }

  function handleStopTts() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }

  function handleRevealSharedRiskSummary() {
    setSharedRiskSummaryViewed(true);
  }

  function handleBubblemonModeSelect(
    intent: BubblemonWorkerQrEntryIntent,
    cadence: BubblemonWorkerQrCadence,
  ) {
    setBubblemonEntryIntent(intent);
    setBubblemonCadence(cadence);
    setCompletedSteps(new Set());
    setStep(1);

    setSharedRiskSummaryViewed(intent !== "monthly_risk_share_confirmation");

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("bubblemon-participation-check-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (normalizedCompanyCode === "richi" && flow !== "signed") {
    return <RichiWorkerEntryChoice companyCode={companyCode} />;
  }

  if (normalizedCompanyCode === "richi" && flow === "signed") {
    return <RichiWorkerConfirmationFlow companyCode={companyCode} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <form
        action="/api/field/participation/submit"
        method="post"
        encType="multipart/form-data"
        onChange={handleFormChange}
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="companyCode" value={companyCode} />
        <input
          type="hidden"
          name="clientSubmissionId"
          value={clientSubmissionId}
        />
        <input type="hidden" name="source" value={sourceValue} />
        <input
          type="hidden"
          name="sharedRiskSummary"
          value={riskSummary.memo ?? ""}
        />
        <input type="hidden" name="reportedDate" value={todayDateValue} />
        <input type="hidden" name="type" value={finalFeedbackType} />
        <input type="hidden" name="title" value={finalTitle} />
        <input type="hidden" name="content" value={finalContent} />
        <input
          type="hidden"
          name="confirmation_type"
          value={confirmationType}
        />
        <input
          type="hidden"
          name="confirmation_status"
          value={confirmationStatus}
        />
        <input type="hidden" name="source_step" value={String(step)} />
        <input type="hidden" name="entry_intent" value={entryIntent} />
        {isFieldQrModeEntryTenant ? (
          <>
            <input
              type="hidden"
              name="entryIntent"
              value={bubblemonEntryIntent}
            />
            <input type="hidden" name="cadence" value={bubblemonCadence} />
            <input
              type="hidden"
              name="entryIntentLabel"
              value={bubblemonEntryIntentLabel}
            />
          </>
        ) : null}
        <input type="hidden" name="location" value={location} />
        <input type="hidden" name="submitter" value={workerName} />
        <input type="hidden" name="workerTeam" value={normalizedWorkerTeam} />
        <input
          type="hidden"
          name="workerPhoneLast4"
          value={normalizedWorkerPhoneLast4}
        />
        <input
          type="hidden"
          name="workerEmployeeNo"
          value={normalizedWorkerEmployeeNo}
        />
        <input type="hidden" name="identityMode" value={identityMode} />
        {effectiveAnonymous ? (
          <input type="hidden" name="anonymous" value="on" />
        ) : null}
        {riskCheck ? <input type="hidden" name="riskCheck" value="on" /> : null}
        {riskAssessmentCheck ? (
          <input type="hidden" name="riskAssessmentCheck" value="on" />
        ) : null}
        {safetyMeasureCheck ? (
          <input type="hidden" name="safetyMeasureCheck" value="on" />
        ) : null}

        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-blue-700">
              {workerCopy?.badge ?? "SafeMetrica 현장근로자 참여"}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              {isRichiPreworkConfirmationFlow
                ? "㈜리치코리아 전자확인"
                : (workerCopy?.title ?? "현장근로자 안전참여")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isRichiPreworkConfirmationFlow
                ? "작업 전 위생·안전 확인 후 필요한 의견만 남겨 주세요."
                : "현장 작업 전 핵심 위험을 확인하고, 필요한 의견을 남겨 주세요."}
            </p>
          </section>

          {isFieldQrModeEntryTenant ? (
            <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-xs font-black text-blue-700">
                {isCommercialRiskShareTenant
                  ? `${commercialCompanyName ?? "현장"} 안전운영 QR`
                  : "Bubblemon 근로자 QR"}
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                오늘 필요한 확인을 선택해 주세요.
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-900">
                아래 항목은 운영기록과 관리자 검토를 위한 입구입니다. 위험성평가
                공유확인과 작업 전 안전확인은 현재 참여 흐름에서 이어서
                확인합니다.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    handleBubblemonModeSelect(
                      "monthly_risk_share_confirmation",
                      "monthly",
                    )
                  }
                  aria-pressed={
                    bubblemonEntryIntent === "monthly_risk_share_confirmation"
                  }
                  className={[
                    "rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99]",
                    bubblemonEntryIntent === "monthly_risk_share_confirmation"
                      ? "border-blue-600 bg-white ring-2 ring-blue-500 ring-offset-2"
                      : "border-blue-200 bg-white",
                  ].join(" ")}
                >
                  <span className="block text-sm font-black text-blue-700">
                    이번 달 위험성평가 공유확인
                  </span>
                  <span className="mt-2 block text-sm font-bold leading-6 text-slate-700">
                    월 1회 또는 위험요인 변경 시 주요 위험요인을 확인하고
                    기록합니다.
                  </span>
                  {bubblemonEntryIntent ===
                  "monthly_risk_share_confirmation" ? (
                    <span className="mt-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                      선택됨
                    </span>
                  ) : null}
                  <span className="mt-3 inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-black text-white">
                    월간 공유확인 시작
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleBubblemonModeSelect(
                      "daily_prework_safety_check",
                      "daily",
                    )
                  }
                  aria-pressed={
                    bubblemonEntryIntent === "daily_prework_safety_check"
                  }
                  className={[
                    "rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99]",
                    bubblemonEntryIntent === "daily_prework_safety_check"
                      ? "border-emerald-600 bg-white ring-2 ring-emerald-500 ring-offset-2"
                      : "border-emerald-200 bg-white",
                  ].join(" ")}
                >
                  <span className="block text-sm font-black text-emerald-700">
                    오늘 작업 전 안전확인
                  </span>
                  <span className="mt-2 block text-sm font-bold leading-6 text-slate-700">
                    오늘 작업 전 주요 위험과 보호구·동선·적재 주의사항을 짧게
                    확인합니다.
                  </span>
                  {bubblemonEntryIntent === "daily_prework_safety_check" ? (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      선택됨
                    </span>
                  ) : null}
                  <span className="mt-3 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                    작업 전 확인 시작
                  </span>
                </button>

                <a
                  href={`/field/anonymous-feedback?company=${encodeURIComponent(companyCode)}`}
                  className="rounded-2xl border border-amber-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <span className="block text-sm font-black text-amber-700">
                    익명 의견·아차사고·개선제안
                  </span>
                  <span className="mt-2 block text-sm font-bold leading-6 text-slate-700">
                    이름과 서명 없이 불편사항, 아차사고, 개선의견을 제출합니다.
                  </span>
                  <span className="mt-3 inline-flex rounded-full bg-amber-600 px-3 py-1 text-xs font-black text-white">
                    익명 제출 열기
                  </span>
                </a>

                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 p-4 text-left opacity-85 shadow-sm"
                >
                  <span className="block text-sm font-black text-slate-600">
                    외부인 출입 안전확인
                  </span>
                  <span className="mt-2 block text-sm font-bold leading-6 text-slate-600">
                    방문자·납품기사·협력업체 출입 시 안전수칙 확인을 기록합니다.
                  </span>
                  <span className="mt-3 inline-flex rounded-full bg-slate-500 px-3 py-1 text-xs font-black text-white">
                    준비 중
                  </span>
                </button>
              </div>
            </section>
          ) : null}

          <div className="mt-4">
            <StepHeader
              step={step}
              completedSteps={completedSteps}
              labels={stepLabels}
            />
          </div>

          <section
            id={
              isFieldQrModeEntryTenant
                ? "bubblemon-participation-check-section"
                : undefined
            }
            className="mt-4 scroll-mt-4 flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            {step === 1 ? (
              <div>
                <p className="text-sm font-black text-slate-500">
                  {isRichiPreworkConfirmationFlow ? "Step 1/3" : "Step 1/4"}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {isRichiPreworkConfirmationFlow
                    ? "작업 전 위생·안전 확인"
                    : isFieldQrModeEntryTenant
                      ? bubblemonModeCopy.title
                      : "오늘 작업 전 핵심 위험 확인"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isRichiPreworkConfirmationFlow
                    ? "작업 전 위생·안전 확인 내용입니다."
                    : isFieldQrModeEntryTenant
                      ? bubblemonModeCopy.helper
                      : "오늘 작업과 관련된 핵심 위험요인입니다. 아래 내용을 확인해 주세요."}
                </p>

                <div
                  className={[
                    "mt-4 rounded-2xl border p-4 text-sm font-bold leading-6",
                    isDailyPreworkSafetyCheck
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-900",
                  ].join(" ")}
                >
                  {isRichiPreworkConfirmationFlow
                    ? "작업 전 위생·안전 내용을 확인하세요."
                    : isDailyPreworkSafetyCheck
                      ? "오늘 작업 전 짧은 안전 체크리스트를 확인하세요."
                      : "오늘 작업 전 아래 핵심 위험요인을 반드시 확인하세요."}
                </div>

                {isDailyPreworkSafetyCheck ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="text-base font-black text-emerald-950">
                      작업 전 안전 체크리스트
                    </h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-emerald-900">
                      항목을 확인한 뒤 다음 단계에서 직접 체크해 주세요.
                    </p>
                    <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-800">
                      <li className="rounded-xl bg-white px-3 py-2">
                        ✓ 보호구 착용
                      </li>
                      <li className="rounded-xl bg-white px-3 py-2">
                        ✓ 통로·동선 확인
                      </li>
                      <li className="rounded-xl bg-white px-3 py-2">
                        ✓ 적재 상태 확인
                      </li>
                      <li className="rounded-xl bg-white px-3 py-2">
                        ✓ 지게차·대차·상하차 주변 확인
                      </li>
                      <li className="rounded-xl bg-white px-3 py-2">
                        ✓ 특이사항 있으면 작성
                      </li>
                    </ul>
                  </div>
                ) : null}

                {isRichiPreworkConfirmationFlow ? (
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                    <h3 className="text-sm font-black text-blue-900">
                      오늘 확인 요약
                    </h3>
                    <div className="mt-2 space-y-1 text-sm font-bold leading-6 text-blue-950">
                      <p>
                        • 작업 전 손 위생과 위생복·장갑 착용 상태를 확인하세요.
                      </p>
                      <p>
                        • 포장실·세척구역 바닥 미끄럼과 이동 동선을 확인하세요.
                      </p>
                      <p>
                        • 불편사항이나 개선의견이 있으면 다음 단계에서 남겨
                        주세요.
                      </p>
                    </div>
                  </div>
                ) : null}

                {isRichiPreworkConfirmationFlow ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <h3 className="text-sm font-black text-emerald-900">
                      위생·안전 확인 체크
                    </h3>
                    <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
                      요약을 읽고 아래 항목을 체크해 주세요.
                    </p>

                    <div className="mt-3 space-y-2">
                      <label className="flex gap-3 rounded-xl border border-emerald-100 bg-white p-3 text-sm font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={riskCheck}
                          onChange={(event) =>
                            setRiskCheck(event.target.checked)
                          }
                          className="mt-0.5 h-5 w-5 rounded border-slate-300"
                        />
                        <span>오늘 확인 요약을 읽었습니다.</span>
                      </label>

                      <label className="flex gap-3 rounded-xl border border-emerald-100 bg-white p-3 text-sm font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={riskAssessmentCheck}
                          onChange={(event) =>
                            setRiskAssessmentCheck(event.target.checked)
                          }
                          className="mt-0.5 h-5 w-5 rounded border-slate-300"
                        />
                        <span>작업 전 위생·안전 주의사항을 확인했습니다.</span>
                      </label>

                      <label className="flex gap-3 rounded-xl border border-emerald-100 bg-white p-3 text-sm font-bold text-slate-800">
                        <input
                          type="checkbox"
                          checked={safetyMeasureCheck}
                          onChange={(event) =>
                            setSafetyMeasureCheck(event.target.checked)
                          }
                          className="mt-0.5 h-5 w-5 rounded border-slate-300"
                        />
                        <span>불편사항이 있으면 의견으로 남기겠습니다.</span>
                      </label>
                    </div>

                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-emerald-800">
                      정식 운영 시 회사별 확인내용을 이 영역에 연결합니다.
                    </p>
                  </div>
                ) : null}

                {weatherNotice ? (
                  <div
                    className={`mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${weatherNoticeClassName}`}
                  >
                    <p className="text-xs font-black">오늘 날씨 주의</p>
                    <p className="mt-1">
                      {weatherNotice.icon} {weatherNotice.title} —{" "}
                      {weatherNotice.message}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handlePlayTts}
                    className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm"
                  >
                    🔊 오늘 안내 음성듣기
                  </button>
                  <button
                    type="button"
                    onClick={handleStopTts}
                    disabled={!isSpeaking}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    음성 정지
                  </button>
                </div>

                {!isMonthlyRiskShareConfirmation &&
                !isDailyPreworkSafetyCheck &&
                riskItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {riskItems.map((item, index) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-blue-700">
                              핵심 위험 {index + 1}
                            </p>
                            <h3 className="mt-1 text-base font-black text-slate-950">
                              {item.taskName}
                            </h3>
                          </div>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            {item.riskLevel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
                          {item.hazard}
                        </p>
                        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold leading-6 text-emerald-800">
                          ✓ {item.improvementPlan}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : !isMonthlyRiskShareConfirmation &&
                  !isDailyPreworkSafetyCheck ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                    {canOpenRiskSummary
                      ? "공유할 위험요인은 아래 버튼에서 확인할 수 있습니다."
                      : isRichiPreworkConfirmationFlow
                        ? "작업 전 위생·안전 안내와 현장 주의사항을 확인해 주세요."
                        : "오늘 작업 전 TBM 공유 내용과 현장 주의사항을 확인해 주세요."}
                  </div>
                ) : null}

                {isDailyPreworkSafetyCheck && riskItems.length > 0 ? (
                  <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <summary className="cursor-pointer font-black text-slate-800">
                      참고용 공유 위험요인 보기
                    </summary>
                    <div className="mt-3 space-y-2">
                      {riskItems.map((item, index) => (
                        <p
                          key={item.id}
                          className="rounded-xl bg-white px-3 py-2 font-bold"
                        >
                          {index + 1}. {item.taskName} — {item.hazard}
                        </p>
                      ))}
                    </div>
                  </details>
                ) : null}

                {canOpenRiskSummary && !isDailyPreworkSafetyCheck ? (
                  isMonthlyRiskShareConfirmation ? (
                    <>
                      <button
                        type="button"
                        onClick={handleRevealSharedRiskSummary}
                        className="mt-4 block w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-blue-700"
                      >
                        공유 위험요인 보기
                      </button>

                      {sharedRiskSummaryViewed ? (
                        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <h3 className="text-base font-black text-slate-950">
                            이번 달 공유 위험요인
                          </h3>
                          {riskItems.length > 0 ? (
                            <div className="mt-3 space-y-3">
                              {riskItems.map((item, index) => (
                                <article
                                  key={item.id}
                                  className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-black text-blue-700">
                                        공유 위험요인 {index + 1}
                                      </p>
                                      <h4 className="mt-1 text-sm font-black text-slate-950">
                                        {item.taskName}
                                      </h4>
                                    </div>
                                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                                      {item.riskLevel}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
                                    {item.hazard}
                                  </p>
                                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold leading-6 text-emerald-800">
                                    ✓{" "}
                                    {item.improvementPlan ||
                                      item.currentControls}
                                  </p>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-bold leading-6 text-rose-800">
                              공유 위험요인 항목을 불러오지 못해 월간 공유확인을
                              진행할 수 없습니다. 현장관리자에게 공유본 상태를
                              확인해 주세요.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <a
                      href={`/field/participation/risk-summary?company=${encodeURIComponent(companyCode)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-blue-700"
                    >
                      공유 위험요인 보기
                    </a>
                  )
                ) : null}
              </div>
            ) : null}

            {!isRichiPreworkConfirmationFlow && step === 2 ? (
              <div>
                <p className="text-sm font-black text-slate-500">Step 2/4</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {isDailyPreworkSafetyCheck
                    ? "작업 전 확인 항목"
                    : riskShareLinkCopy.worker.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isDailyPreworkSafetyCheck
                    ? "오늘 작업 전 확인 항목을 직접 체크해야 기록됩니다."
                    : "위험요인 확인 후 공유·주지 확인을 남겨주세요. 아래 항목을 직접 확인해야 기록됩니다."}
                </p>

                {!isDailyPreworkSafetyCheck ? (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <h3 className="text-base font-black text-slate-950">
                      산업안전보건법 제36조
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      사업주는 위험성평가 결과와 조치사항을 해당 작업에 종사하는
                      근로자에게 알려야 합니다.
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={riskCheck}
                      onChange={(event) => setRiskCheck(event.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <span>
                      {isDailyPreworkSafetyCheck
                        ? "보호구 착용 상태를 확인했습니다."
                        : "오늘 작업의 주요 위험요인을 확인했습니다."}
                    </span>
                  </label>
                  <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={riskAssessmentCheck}
                      onChange={(event) =>
                        setRiskAssessmentCheck(event.target.checked)
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <span>
                      {isDailyPreworkSafetyCheck
                        ? "통로·동선과 적재 상태를 확인했습니다."
                        : riskShareLinkCopy.worker.checks.riskAssessment}
                    </span>
                  </label>
                  <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={safetyMeasureCheck}
                      onChange={(event) =>
                        setSafetyMeasureCheck(event.target.checked)
                      }
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <span>
                      {isDailyPreworkSafetyCheck
                        ? "지게차·대차·상하차 이동 주의사항을 확인했습니다."
                        : riskShareLinkCopy.worker.checks.safetyMeasure}
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            {step === formStep ? (
              <div>
                <p className="text-sm font-black text-slate-500">
                  {isRichiPreworkConfirmationFlow ? "Step 2/3" : "Step 3/4"}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {isRichiPreworkConfirmationFlow
                    ? "의견 제출"
                    : isDailyPreworkSafetyCheck
                      ? "특이사항 입력"
                      : "의견 / 아차사고 제출"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isRichiPreworkConfirmationFlow
                    ? "작업 전 확인 후 불편사항이나 개선의견이 있으면 짧게 남겨 주세요."
                    : isDailyPreworkSafetyCheck
                      ? "특이사항이 없으면 ‘의견 없음’을 선택하고, 이상이나 불편사항이 있으면 내용을 남겨 주세요."
                      : riskShareLinkCopy.worker.intro}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-800">
                      {isDailyPreworkSafetyCheck
                        ? "특이사항 없음"
                        : "의견 없음"}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-emerald-900">
                      {isRichiPreworkConfirmationFlow
                        ? "의견이 없으면 전자확인 기록으로 저장됩니다."
                        : isDailyPreworkSafetyCheck
                          ? "특이사항이 없으면 작업 전 확인기록으로 저장됩니다."
                          : "제목, 내용, 사진을 입력하지 않고 제출하면 공유확인 기록으로 저장됩니다."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-800">
                      {isRichiPreworkConfirmationFlow
                        ? "의견 있음"
                        : isDailyPreworkSafetyCheck
                          ? "특이사항 있음"
                          : "위험·아차사고·개선의견 있음"}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-amber-900">
                      {isRichiPreworkConfirmationFlow
                        ? "입력한 의견은 관리자 확인자료로 저장됩니다."
                        : isDailyPreworkSafetyCheck
                          ? "이상, 불편사항, 위험요인, 개선의견이 있으면 관리자 확인자료로 저장됩니다."
                          : "제목, 내용 또는 사진을 입력하면 관리자 검토대상으로 저장됩니다."}
                    </p>
                  </div>
                </div>

                {isDailyPreworkSafetyCheck ? (
                  <div className="mt-4">
                    <FieldQrSpecialNoteCard
                      value={{
                        mode: dailySpecialNoteMode,
                        noteType: feedbackType,
                        location,
                        content,
                      }}
                      onChange={handleSpecialNoteChange}
                      noteTypeOptions={feedbackTypeOptions.map((type) => ({
                        value: type,
                        label: type,
                      }))}
                      title="특이사항 입력"
                      helperText="특이사항이 없으면 그대로 제출하고, 이상이나 불편사항이 있으면 내용을 남겨 주세요."
                      evidenceSlot={<FieldParticipationFileInput />}
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-4">
                      <label className="text-sm font-bold text-slate-700">
                        {isRichiPreworkConfirmationFlow
                          ? "의견 제목"
                          : "제보 제목"}
                      </label>
                      <input
                        value={reportTitle}
                        onChange={(event) =>
                          setReportTitle(event.target.value.slice(0, 80))
                        }
                        placeholder={
                          isRichiPreworkConfirmationFlow
                            ? "예: 포장실 동선이 불편합니다"
                            : "예: 재활용장 바닥 깨진 병 조각 발견"
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <p className="mt-1 text-right text-xs font-bold text-slate-500">
                        {reportTitle.length}/80
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-bold text-slate-700">
                        {isRichiPreworkConfirmationFlow
                          ? "의견 유형"
                          : "제보 유형"}
                      </label>
                      <select
                        value={feedbackType}
                        onChange={(event) =>
                          setFeedbackType(
                            normalizeParticipationType(event.target.value),
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      >
                        {feedbackTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-bold text-slate-700">
                        위치/구역
                      </label>
                      <input
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder={
                          isRichiPreworkConfirmationFlow
                            ? "예: 포장실, 세척구역, 원료보관실"
                            : "예: 상차장, 분리수거장, A구역"
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                        {isRichiPreworkConfirmationFlow
                          ? "위치/구역은 어느 공간의 의견인지 확인하기 위한 보조항목입니다."
                          : "위치/구역은 기록 보조항목입니다. 제목, 내용 또는 사진이 있을 때만 관리자 검토대상으로 분류됩니다."}
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-bold text-slate-700">
                        내용 입력
                      </label>
                      <textarea
                        value={content}
                        onChange={(event) =>
                          setContent(event.target.value.slice(0, 500))
                        }
                        rows={isRichiPreworkConfirmationFlow ? 3 : 4}
                        placeholder={
                          isRichiPreworkConfirmationFlow
                            ? "예: 손 세척 동선이 불편합니다 / 작업대 위치 조정이 필요합니다"
                            : "예: 통로 바닥이 미끄럽습니다 / 적치 위치 조정이 필요합니다"
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base leading-6 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <p className="mt-1 text-right text-xs font-bold text-slate-500">
                        {content.length}/500
                      </p>
                    </div>
                  </>
                )}

                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <h3 className="text-sm font-black text-blue-900">
                    제출 방식
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-blue-900">
                    {isRichiPreworkConfirmationFlow
                      ? hasOpinion
                        ? "의견은 익명 제출할 수 있습니다. 익명 선택 시 내용 중심으로 접수됩니다."
                        : "의견이 없으면 확인자 정보와 자필서명으로 저장합니다."
                      : hasOpinion
                        ? "위험제보·아차사고·개선제안은 익명으로 제출할 수 있습니다. 아래의 익명 제출을 선택하면 이름과 연락처 입력 없이 제출됩니다."
                        : isDailyPreworkSafetyCheck
                          ? "특이사항이나 사진을 남기면 익명 제출을 선택할 수 있습니다. 작업 전 확인만 하는 경우에는 최소 확인정보가 필요합니다."
                          : "의견이나 사진을 남기면 익명 제출을 선택할 수 있습니다. 공유확인만 하는 경우에는 최소 확인정보가 필요합니다."}
                  </p>
                  <label
                    className={[
                      "mt-3 flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold",
                      hasOpinion
                        ? "border-blue-300 bg-white text-slate-800"
                        : "border-slate-200 bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={hasOpinion && anonymous}
                      disabled={!hasOpinion}
                      onChange={(event) => setAnonymous(event.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 disabled:opacity-50"
                    />
                    <span>
                      {isRichiPreworkConfirmationFlow
                        ? "익명으로 의견 제출"
                        : isDailyPreworkSafetyCheck
                          ? "익명으로 특이사항 제출"
                          : "익명으로 제보 제출"}
                    </span>
                  </label>

                  <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-blue-800">
                    익명 제출 시 이름·소속·확인번호는 저장하지 않습니다. 후속
                    확인은 어려울 수 있습니다.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="text-sm font-black text-emerald-900">
                    {hasOpinion
                      ? isRichiPreworkConfirmationFlow
                        ? "의견 제출자 정보"
                        : "제보 제출자 정보"
                      : isRichiPreworkConfirmationFlow
                        ? "전자확인 최소 확인정보"
                        : isDailyPreworkSafetyCheck
                          ? "작업 전 확인 최소 확인정보"
                          : "공유확인 최소 확인정보"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-900">
                    {isRichiPreworkConfirmationFlow
                      ? hasOpinion
                        ? "익명 제출을 선택하면 이름·소속·확인번호 입력란은 사용하지 않습니다."
                        : "전자확인만 제출할 때는 이름, 소속, 확인번호가 필요합니다."
                      : hasOpinion
                        ? "위험제보·아차사고·개선제안은 익명 제출을 선택할 수 있습니다."
                        : isDailyPreworkSafetyCheck
                          ? "작업 전 확인과 특이사항 없음 제출은 기록 구분을 위해 최소 확인정보가 필요합니다."
                          : "공유확인과 의견 없음 제출은 기록 구분을 위해 최소 확인정보가 필요합니다."}
                  </p>

                  {isDailyPreworkSafetyCheck ? (
                    <div className="mt-4">
                      <FieldQrIdentityCard
                        tenantCode={companyCode}
                        identity={bubblemonDailyIdentity}
                        onIdentityChange={handleBubblemonDailyIdentityChange}
                        rememberInfo={rememberWorkerInfo}
                        onRememberInfoChange={setRememberWorkerInfo}
                        rememberMode={bubblemonDailyIdentityMode}
                        required={!hasOpinion}
                        disabled={hasOpinion && anonymous}
                        title="작업 전 확인 최소 확인정보"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      <div>
                        <label className="text-sm font-bold text-slate-700">
                          {hasOpinion ? "이름 또는 별칭" : "이름 또는 별칭 *"}
                        </label>
                        <input
                          value={submitter}
                          onChange={(event) =>
                            setSubmitter(event.target.value.slice(0, 80))
                          }
                          disabled={hasOpinion && anonymous}
                          placeholder={
                            hasOpinion && anonymous
                              ? "익명 제출 시 입력하지 않습니다"
                              : "예: 홍길동 / 작업자A"
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700">
                          {hasOpinion
                            ? "소속 또는 작업조"
                            : "소속 또는 작업조 *"}
                        </label>
                        <input
                          value={workerTeam}
                          onChange={(event) =>
                            setWorkerTeam(event.target.value.slice(0, 100))
                          }
                          disabled={hasOpinion && anonymous}
                          placeholder={
                            hasOpinion && anonymous
                              ? "익명 제출 시 입력하지 않습니다"
                              : "예: 생산1팀 / 주간조"
                          }
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>

                      {isRichiPreworkConfirmationFlow ? (
                        <div>
                          <label className="text-sm font-bold text-slate-700">
                            확인번호 *
                          </label>
                          <input
                            value={richiConfirmationCodeValue}
                            onChange={(event) =>
                              handleRichiConfirmationCodeChange(
                                event.target.value,
                              )
                            }
                            disabled={hasOpinion && anonymous}
                            placeholder={
                              hasOpinion && anonymous
                                ? "익명 제출 시 입력하지 않습니다"
                                : "예: 1234 / A-102"
                            }
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            휴대폰 뒷4자리 또는 사번 중 하나를 입력하세요.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-sm font-bold text-slate-700">
                              휴대폰 뒷4자리
                            </label>
                            <input
                              value={workerPhoneLast4}
                              onChange={(event) =>
                                setWorkerPhoneLast4(
                                  event.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4),
                                )
                              }
                              disabled={hasOpinion && anonymous}
                              inputMode="numeric"
                              maxLength={4}
                              placeholder="예: 1234"
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-700">
                              사번 또는 현장 식별번호
                            </label>
                            <input
                              value={workerEmployeeNo}
                              onChange={(event) =>
                                setWorkerEmployeeNo(
                                  event.target.value.slice(0, 60),
                                )
                              }
                              disabled={hasOpinion && anonymous}
                              placeholder="예: A-102"
                              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                        </div>
                      )}
                      {canRememberBubblemonDailyIdentity ? (
                        <label className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                            checked={rememberWorkerInfo}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setRememberWorkerInfo(checked);

                              if (!checked) {
                                clearFieldQrRememberedIdentity(
                                  companyCode,
                                  bubblemonDailyIdentityMode,
                                );
                              }
                            }}
                          />
                          <span>
                            <span className="block text-slate-900">
                              이 기기에서 제출자 정보 기억하기
                            </span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                              공용 휴대폰이면 체크하지 마세요. 이름,
                              소속/작업조, 휴대폰 뒷4자리, 사번 또는 현장
                              식별번호만 이 브라우저에 저장됩니다.
                            </span>
                          </span>
                        </label>
                      ) : null}
                      {!hasOpinion && !shareConfirmationIdentityReady ? (
                        <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-rose-700">
                          {isRichiPreworkConfirmationFlow
                            ? "전자확인은 이름, 소속, 확인번호가 필요합니다."
                            : isDailyPreworkSafetyCheck
                              ? "작업 전 확인은 이름 또는 별칭, 소속 또는 작업조, 그리고 휴대폰 뒷4자리 또는 사번/식별번호 중 하나가 필요합니다."
                              : "공유확인은 이름 또는 별칭, 소속 또는 작업조, 그리고 휴대폰 뒷4자리 또는 사번/식별번호 중 하나가 필요합니다."}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                {hasOpinion && !isRichiPreworkConfirmationFlow ? (
                  <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(event) => setAnonymous(event.target.checked)}
                      className="h-5 w-5 rounded border-slate-300"
                    />
                    익명으로 제출
                  </label>
                ) : null}

                {isRichiPreworkConfirmationFlow ? (
                  <div className="mt-4">
                    {isRichiPreworkConfirmationFlow ? (
                      <label className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                          checked={rememberWorkerInfo}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setRememberWorkerInfo(checked);

                            if (!checked && typeof window !== "undefined") {
                              window.localStorage.removeItem(
                                RICHI_WORKER_CONFIRMATION_INFO_STORAGE_KEY,
                              );
                            }
                          }}
                        />
                        <span>
                          <span className="block text-slate-900">
                            이 기기에서 내 확인정보 기억하기
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                            공용 휴대폰이면 체크하지 마세요. 이름, 소속/작업조,
                            확인번호만 이 브라우저에 저장됩니다.
                          </span>
                        </span>
                      </label>
                    ) : null}

                    <HandwrittenSignaturePad
                      enabled={isRichiPreworkConfirmationFlow}
                    />
                  </div>
                ) : null}

                {!isDailyPreworkSafetyCheck ? (
                  <div className="mt-4">
                    <FieldParticipationFileInput />
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-black text-amber-800">
                    {workerCopy?.noticeTitle ?? "안내"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {workerCopy?.noticeBody ??
                      "제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다."}
                    {isRichiPreworkConfirmationFlow
                      ? "사진은 필요한 경우에만 첨부하세요."
                      : "첨부 사진은 세메앱이 용량을 줄여 저장합니다."}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <div className="sticky bottom-0 -mx-4 mt-4 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
            {step === 1 ? (
              <>
                {mustViewSharedRiskSummaryBeforeStep2 ? (
                  <p className="mb-2 rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-blue-700">
                    공유 위험요인 보기를 먼저 확인해야 다음 단계로 진행할 수
                    있습니다.
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={!canGoNextFromStep1}
                  onClick={() => {
                    if (!canGoNextFromStep1) return;

                    setCompletedSteps((current) => new Set(current).add(1));
                    setStep(isRichiPreworkConfirmationFlow ? formStep : 2);
                  }}
                  className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white disabled:bg-slate-300 disabled:text-slate-100"
                >
                  {isRichiPreworkConfirmationFlow
                    ? "체크 후 의견·서명으로 →"
                    : isBubblemonWorkerQr
                      ? `${bubblemonModeCopy.buttonLabel} →`
                      : "핵심 위험 확인 완료 →"}
                </button>
              </>
            ) : null}

            {!isRichiPreworkConfirmationFlow && step === 2 ? (
              <button
                type="button"
                disabled={!canGoNextFromStep2}
                onClick={() => {
                  setCompletedSteps((current) => new Set(current).add(2));
                  setStep(3);
                }}
                className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white disabled:bg-slate-300"
              >
                {isDailyPreworkSafetyCheck
                  ? "작업 전 확인 계속 →"
                  : "공유 내용 확인 →"}
              </button>
            ) : null}

            {step === formStep ? (
              <>
                {isRichiPreworkConfirmationFlow &&
                !hasOpinion &&
                !shareConfirmationIdentityReady ? (
                  <p className="mb-2 rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-slate-600">
                    이름·소속·확인번호를 입력하면 제출할 수 있습니다.
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (!hasOpinion && !shareConfirmationIdentityReady)
                  }
                  className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white transition disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100 disabled:opacity-80"
                >
                  {isSubmitting
                    ? riskShareLinkCopy.worker.buttons.submitting
                    : isDailyPreworkSafetyCheck
                      ? "작업 전 확인 제출"
                      : hasOpinion
                        ? isRichiPreworkConfirmationFlow
                          ? "전자확인·의견 제출 →"
                          : "위험 또는 개선의견 제출 →"
                        : isRichiPreworkConfirmationFlow
                          ? "의견 없음, 전자확인 제출 →"
                          : riskShareLinkCopy.worker.buttons.confirmOnly}
                </button>
              </>
            ) : null}

            {step > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setStep((current) =>
                    isRichiPreworkConfirmationFlow ? 1 : current === 3 ? 2 : 1,
                  )
                }
                className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-black text-slate-600"
              >
                이전 단계
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </main>
  );
}
