"use client";

import { useMemo, useState } from "react";

import FieldParticipationFileInput from "./FieldParticipationFileInput";

type WorkerCopy = {
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

type Props = {
  companyCode: string;
  siteValue: string;
  sourceValue: string;
  todayDateValue: string;
  workerCopy: WorkerCopy;
  riskSummary: RiskSummary;
  feedbackTypes: string[];
};

const stepLabels = ["위험 확인", "주지 확인", "의견 제출", "완료"];

function normalizeParticipationType(rawType: string) {
  const value = rawType.trim();
  const compact = value.replace(/\s+/g, "");

  if (compact === "위험제보" || compact === "위험요인제보") return "위험제보";
  if (compact === "개선제안" || compact === "개선의견") return "개선제안";
  if (compact === "아차사고" || compact === "아차사고제보") return "아차사고";
  if (compact === "공유확인" || compact === "주지확인") return "공유확인";

  return value || "위험제보";
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {stepLabels.map((label, index) => {
          const stepNo = index + 1;
          const done = stepNo < step;
          const active = stepNo === step;

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
                <p className={active ? "text-xs font-black text-blue-700" : "text-xs font-bold text-slate-500"}>
                  {label}
                </p>
              </div>
              {index < stepLabels.length - 1 ? (
                <div className={done ? "h-0.5 flex-1 bg-emerald-500" : "h-0.5 flex-1 bg-slate-200"} />
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
  siteValue,
  sourceValue,
  todayDateValue,
  workerCopy,
  riskSummary,
  feedbackTypes,
}: Props) {
  const [step, setStep] = useState(1);
  const [riskCheck, setRiskCheck] = useState(false);
  const [riskAssessmentCheck, setRiskAssessmentCheck] = useState(false);
  const [safetyMeasureCheck, setSafetyMeasureCheck] = useState(false);
  const feedbackTypeOptions = useMemo(() => {
    const source = feedbackTypes.length > 0 ? feedbackTypes : ["위험제보", "아차사고", "개선제안"];
    return Array.from(new Set(source.map(normalizeParticipationType))).filter(
      (type) => type !== "공유확인"
    );
  }, [feedbackTypes]);
  const [feedbackType, setFeedbackType] = useState(() =>
    normalizeParticipationType(feedbackTypeOptions[0] ?? "위험제보")
  );
  const [reportTitle, setReportTitle] = useState("");
  const [location, setLocation] = useState(siteValue);
  const [submitter, setSubmitter] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [content, setContent] = useState("");

  const riskItems = useMemo(() => riskSummary.items.slice(0, 3), [riskSummary.items]);
  const canGoNextFromStep2 = riskCheck && riskAssessmentCheck && safetyMeasureCheck;
  const hasOpinion = reportTitle.trim().length > 0 || content.trim().length > 0;
  const finalFeedbackType = hasOpinion ? normalizeParticipationType(feedbackType) : "공유확인";
  const finalContent = hasOpinion ? content.trim() || "상세 내용 미입력" : "오늘은 추가 의견 없음.";
  const finalTitle = hasOpinion
    ? reportTitle.trim() || `${finalFeedbackType} - 현장근로자 참여`
    : "위험성평가 공유확인 완료";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <form action="/api/field/participation/submit" method="post" encType="multipart/form-data">
        <input type="hidden" name="companyCode" value={companyCode} />
        <input type="hidden" name="source" value={sourceValue} />
        <input type="hidden" name="sharedRiskSummary" value={riskSummary.memo ?? ""} />
        <input type="hidden" name="reportedDate" value={todayDateValue} />
        <input type="hidden" name="type" value={finalFeedbackType} />
        <input type="hidden" name="title" value={finalTitle} />
        <input type="hidden" name="content" value={finalContent} />
        <input type="hidden" name="location" value={location} />
        <input type="hidden" name="submitter" value={submitter} />
        {anonymous ? <input type="hidden" name="anonymous" value="on" /> : null}
        {riskCheck ? <input type="hidden" name="riskCheck" value="on" /> : null}
        {riskAssessmentCheck ? <input type="hidden" name="riskAssessmentCheck" value="on" /> : null}
        {safetyMeasureCheck ? <input type="hidden" name="safetyMeasureCheck" value="on" /> : null}

        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black text-blue-700">
              {workerCopy?.badge ?? "SafeMetrica 현장근로자 참여"}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              {workerCopy?.title ?? "현장근로자 안전참여"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              현장 작업 전 핵심 위험을 확인하고, 필요한 의견을 남겨 주세요.
            </p>
          </section>

          <div className="mt-4">
            <StepHeader step={step} />
          </div>

          <section className="mt-4 flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {step === 1 ? (
              <div>
                <p className="text-sm font-black text-slate-500">Step 1/4</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">오늘 작업 전 핵심 위험 확인</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  오늘 작업과 관련된 핵심 위험요인입니다. 아래 내용을 확인해 주세요.
                </p>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
                  오늘 작업 전 아래 핵심 위험요인을 반드시 확인하세요.
                </div>

                {riskItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {riskItems.map((item, index) => (
                      <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-blue-700">핵심 위험 {index + 1}</p>
                            <h3 className="mt-1 text-base font-black text-slate-950">{item.taskName}</h3>
                          </div>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                            {item.riskLevel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{item.hazard}</p>
                        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold leading-6 text-emerald-800">
                          ✓ {item.improvementPlan}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
                    연결된 위험성평가표에서 현장근로자 공유 항목을 불러올 수 없습니다.
                    관리자에게 위험성평가표 연결 상태를 확인해 주세요.
                  </div>
                )}

                {riskSummary.hasDb && riskItems.length > 0 ? (
                  <a
                    href={`/field/participation/risk-summary?company=${encodeURIComponent(companyCode)}`}
                    className="mt-4 block w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-center text-sm font-black text-blue-700"
                  >
                    근로자용 위험성평가 요약 보기
                  </a>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className="text-sm font-black text-slate-500">Step 2/4</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">위험성평가 공유·주지 확인</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  오늘 작업과 관련된 핵심 위험 및 주의사항이 공유되었습니다.
                  확인 후 다음 단계로 진행해 주세요.
                </p>

                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-base font-black text-slate-950">산업안전보건법 제36조</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    사업주는 위험성평가 결과와 조치사항을 해당 작업에 종사하는 근로자에게 알려야 합니다.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={riskCheck}
                      onChange={(event) => setRiskCheck(event.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <span>오늘 작업의 주요 위험요인을 확인했습니다.</span>
                  </label>
                  <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={riskAssessmentCheck}
                      onChange={(event) => setRiskAssessmentCheck(event.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <span>위험성평가 주요 내용을 공유받았습니다.</span>
                  </label>
                  <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={safetyMeasureCheck}
                      onChange={(event) => setSafetyMeasureCheck(event.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                    <span>필요한 안전조치와 주의사항을 확인했습니다.</span>
                  </label>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className="text-sm font-black text-slate-500">Step 3/4</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">의견 / 아차사고 제출</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  작업 중 느낀 위험, 개선 의견, 아차사고가 있다면 알려주세요. 선택사항입니다.
                </p>

                <div className="mt-4">
                  <label className="text-sm font-bold text-slate-700">제보 제목</label>
                  <input
                    value={reportTitle}
                    onChange={(event) => setReportTitle(event.target.value.slice(0, 80))}
                    placeholder="예: 재활용장 바닥 깨진 병 조각 발견"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-1 text-right text-xs font-bold text-slate-500">{reportTitle.length}/80</p>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-bold text-slate-700">제보 유형</label>
                  <select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(normalizeParticipationType(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    {feedbackTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-bold text-slate-700">위치/구역</label>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="예: 상차장, 분리수거장, A구역"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-sm font-bold text-slate-700">내용 입력</label>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value.slice(0, 500))}
                    rows={4}
                    placeholder="예: 통로 바닥이 미끄럽습니다 / 적치 위치 조정이 필요합니다"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base leading-6 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-1 text-right text-xs font-bold text-slate-500">{content.length}/500</p>
                </div>

                <div className="mt-4">
                  <label className="text-sm font-bold text-slate-700">작성자</label>
                  <input
                    value={submitter}
                    onChange={(event) => setSubmitter(event.target.value)}
                    placeholder="이름 또는 소속"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(event) => setAnonymous(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  익명으로 제출
                </label>

                <div className="mt-4">
                  <FieldParticipationFileInput />
                </div>

                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-black text-amber-800">
                    {workerCopy?.noticeTitle ?? "안내"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {workerCopy?.noticeBody ??
                      "제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다."}
                    첨부 사진은 세메앱이 용량을 줄여 저장합니다.
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <div className="sticky bottom-0 -mx-4 mt-4 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white"
              >
                핵심 위험 확인 완료 →
              </button>
            ) : null}

            {step === 2 ? (
              <button
                type="button"
                disabled={!canGoNextFromStep2}
                onClick={() => setStep(3)}
                className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white disabled:bg-slate-300"
              >
                공유 내용 확인 →
              </button>
            ) : null}

            {step === 3 ? (
              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-700 px-4 py-4 text-base font-black text-white"
              >
                {hasOpinion ? "제출하기 →" : "의견 없이 완료하기 →"}
              </button>
            ) : null}

            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(1, current - 1))}
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
