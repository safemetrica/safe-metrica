"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultDemoState, readDemoState, writeDemoState, type DemoState } from "../demoState";

const steps = [
  { label: "TBM", title: "음성 TBM 참여", description: "오늘 작업과 핵심 안전수칙을 확인합니다." },
  { label: "공유확인", title: "위험성평가 공유확인", description: "주요 위험요인과 안전조치를 확인합니다." },
  { label: "위험제보", title: "현장 위험제보", description: "현장에서 발견한 위험을 샘플로 제보합니다." },
  { label: "완료", title: "체험 완료", description: "생성된 샘플 기록을 한눈에 확인합니다." },
];
const risks = [
  { title: "지게차 동선 충돌", control: "보행 통로와 지게차 동선을 분리하고, 후진 경고음과 신호수를 확인" },
  { title: "적재물 낙하", control: "적재 높이와 결속 상태를 점검하고, 적재물 아래 접근을 제한" },
  { title: "상하차 작업 중 끼임", control: "차량과 하역 설비 사이 안전거리를 확보하고, 작업 전 정지 상태를 확인" },
  { title: "창고 바닥 미끄럼", control: "바닥의 물기와 포장 잔재를 즉시 제거하고, 통로를 정리" },
];
const reportTypes = ["위험제보", "아차사고", "개선제안"];
const ctaClass =
  "flex min-h-14 w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-black shadow-lg transition-all duration-150 active:scale-[0.98] active:translate-y-0.5";
const workerCtaClass = `${ctaClass} bg-emerald-500 text-white shadow-emerald-950/40 hover:bg-emerald-400 active:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:active:scale-100 disabled:active:translate-y-0`;

type PendingAction = "tbm" | "share" | "report" | null;

function getResumeStep(state: DemoState) {
  if (state.workerReportSubmitted) return 3;
  if (state.riskSharedConfirmed) return 2;
  if (state.tbmConfirmed) return 1;
  return 0;
}

function CompletionCard({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4" aria-live="polite">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-base font-black text-slate-950">✓</span>
        <div>
          <p className="text-sm font-black text-emerald-100">{title}</p>
          {detail && <p className="mt-1 text-xs leading-5 text-emerald-100/80">{detail}</p>}
          <p className="mt-2 text-xs font-bold text-slate-400">체험용 샘플 기록 · 실제 고객 DB 미저장</p>
        </div>
      </div>
    </div>
  );
}

export default function WorkerDemoClient() {
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<DemoState>(defaultDemoState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showResumeHandoff, setShowResumeHandoff] = useState(false);
  const [reportType, setReportType] = useState(reportTypes[0]);
  const [location, setLocation] = useState("창고 출입구 앞 보행 통로");
  const [content, setContent] = useState("지게차 이동 구역 주변 적재물을 정리하면 보행자 동선 확인이 더 쉬울 것 같습니다.");

  useEffect(() => {
    window.setTimeout(() => {
      const savedState = readDemoState();
      setDemoState(savedState);
      setStep(getResumeStep(savedState));
      setShowResumeHandoff(savedState.workerReportSubmitted);
    }, 0);
  }, []);

  const updateDemoState = (nextPartial: Partial<DemoState>) => {
    setDemoState((currentState) => {
      const nextState = { ...currentState, ...nextPartial };
      writeDemoState(nextState);
      return nextState;
    });
  };

  const runAction = (action: Exclude<PendingAction, null>, nextPartial: Partial<DemoState>) => {
    setPendingAction(action);
    window.setTimeout(() => {
      updateDemoState(nextPartial);
      setPendingAction(null);
    }, 450);
  };

  const handleRestart = () => {
    updateDemoState({
      tbmConfirmed: false,
      riskSharedConfirmed: false,
      workerReportSubmitted: false,
    });
    setShowResumeHandoff(false);
    setStep(0);
  };

  const progress = ((step + 1) / steps.length) * 100;
  const reportReady = location.trim().length > 0 && content.trim().length > 0;

  const handlePrimaryAction = () => {
    if (step === 0) {
      if (demoState.tbmConfirmed) setStep(1);
      else runAction("tbm", { tbmConfirmed: true });
      return;
    }
    if (step === 1) {
      if (demoState.riskSharedConfirmed) setStep(2);
      else runAction("share", { riskSharedConfirmed: true });
      return;
    }
    if (step === 2) {
      if (demoState.workerReportSubmitted) setStep(3);
      else if (reportReady) runAction("report", { workerReportSubmitted: true });
    }
  };

  const primaryLabel = (() => {
    if (pendingAction === "tbm") return "TBM 확인 중...";
    if (pendingAction === "share") return "공유확인 저장 중...";
    if (pendingAction === "report") return "제보 저장 중...";
    if (step === 0) return demoState.tbmConfirmed ? "위험성평가 확인하기 →" : "음성 TBM 듣고 확인하기";
    if (step === 1) return demoState.riskSharedConfirmed ? "위험제보 작성하기 →" : "위험요인 확인 완료";
    if (step === 2) return demoState.workerReportSubmitted ? "체험 결과 확인하기 →" : "샘플 위험제보 제출하기";
    return "";
  })();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-24">
        <header className="rounded-[1.75rem] border border-emerald-500/30 bg-slate-900 p-4 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-emerald-200">← 데모 홈</Link>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-950/40 px-3 py-1 text-xs font-black text-emerald-200">근로자 체험</span>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg transition-all active:scale-95">⌂</Link>
          </div>

          <div className="mt-5 flex items-start" aria-label={`전체 ${steps.length}단계 중 ${step + 1}단계`}>
            {steps.map((item, index) => {
              const isComplete = index < step;
              const isCurrent = index === step;
              return (
                <div key={item.label} className="relative flex flex-1 flex-col items-center">
                  {index > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= step ? "bg-emerald-400" : "bg-slate-700"}`} />}
                  <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${isComplete ? "border-emerald-400 bg-emerald-400 text-slate-950" : isCurrent ? "border-emerald-300 bg-emerald-950 text-emerald-200 ring-4 ring-emerald-500/15" : "border-slate-700 bg-slate-900 text-slate-500"}`}>
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span className={`mt-2 text-[10px] font-black ${isCurrent ? "text-emerald-200" : isComplete ? "text-slate-300" : "text-slate-600"}`}>{item.label}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-4 text-xs font-black text-emerald-300">STEP {step + 1} · {steps[step].label}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{steps[step].title}</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{steps[step].description}</p>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5 shadow-xl">
          {step === 0 && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-emerald-300">오늘의 TBM</p>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-300">약 1분</span>
              </div>
              <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                <p className="text-xs font-black text-slate-400">샘플 현장</p>
                <h2 className="mt-1 text-xl font-black text-white">SafeMetrica 샘플 현장</h2>
                <div className="mt-4 rounded-2xl bg-slate-950/50 p-4">
                  <p className="text-xs font-black text-slate-400">오늘의 작업</p>
                  <p className="mt-1 text-base font-bold leading-7 text-slate-100">창고 입출고 및 지게차 상하차</p>
                </div>
                <div className="mt-4 flex items-center gap-3 text-sm font-bold text-emerald-100">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-slate-950">▶</span>
                  음성 안내로 핵심 안전수칙을 확인합니다.
                </div>
              </div>
              {demoState.tbmConfirmed && <CompletionCard title="음성 TBM 확인 완료" detail="다음 단계에서 오늘 작업의 주요 위험요인을 확인해 주세요." />}
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-emerald-300">주요 위험요인</p>
                <span className="text-xs font-black text-slate-400">{risks.length}개 항목</span>
              </div>
              <div className="mt-4 space-y-3">
                {risks.map((risk, index) => (
                  <article key={risk.title} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-xs font-black text-amber-200">{index + 1}</span>
                      <div>
                        <h2 className="text-base font-black leading-6 text-white">{risk.title}</h2>
                        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                          <p className="text-xs font-black text-emerald-300">안전조치</p>
                          <p className="mt-1 text-sm font-bold leading-6 text-slate-300">{risk.control}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {demoState.riskSharedConfirmed && <CompletionCard title="위험성평가 공유확인 완료" detail="샘플 서명 상태가 이 데모 화면에만 기록되었습니다." />}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm font-black text-emerald-300">현장 의견 샘플 입력</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">제보 유형을 고르고 위치와 내용을 확인해 주세요.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {reportTypes.map((type) => (
                  <button key={type} type="button" onClick={() => setReportType(type)} aria-pressed={reportType === type} className={`rounded-2xl border px-2 py-3 text-sm font-black transition-all active:scale-95 ${reportType === type ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-700 bg-slate-950 text-slate-300"}`}>
                    {type}
                  </button>
                ))}
              </div>
              <label className="mt-5 grid gap-2 text-sm font-bold text-slate-200">
                위치 <span className="text-xs text-slate-500">어디에서 발견했나요?</span>
                <input value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-12 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400" />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-bold text-slate-200">
                내용 <span className="text-xs text-slate-500">위험 상황이나 개선 의견을 적어 주세요.</span>
                <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400" />
              </label>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg">＋</span>
                <p className="mt-2 text-sm font-black text-slate-200">사진 첨부 체험 영역</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">샘플 UI만 표시되며 실제 파일은 업로드되지 않습니다.</p>
              </div>
              {!reportReady && <p className="mt-3 text-center text-xs font-bold text-amber-200">위치와 내용을 모두 입력해 주세요.</p>}
              {demoState.workerReportSubmitted && <CompletionCard title={`${reportType} 1건 제출 완료`} detail="근로자 체험에서 생성된 제보가 관리자 데모 화면에 반영됩니다." />}
            </div>
          )}

          {step === 3 && (
            <div>
              {showResumeHandoff && (
                <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <p className="text-sm font-black text-amber-100">이전 체험 기록이 남아 있습니다.</p>
                  <div className="mt-3 grid gap-2">
                    <button type="button" onClick={handleRestart} className="min-h-12 rounded-2xl border border-amber-400/40 bg-slate-950/40 px-4 py-3 text-sm font-black text-amber-100 transition hover:bg-slate-950/70 active:scale-[0.98]">
                      처음부터 다시 체험
                    </button>
                    <Link href="/partner-demo/manager" className="flex min-h-12 items-center justify-center rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 active:scale-[0.98]">
                      현장관리자 체험으로 이동
                    </Link>
                  </div>
                </div>
              )}
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-2xl font-black text-slate-950">✓</div>
                <p className="mt-4 text-sm font-black text-emerald-200">근로자 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black text-white">안전 참여 흐름을 모두 체험했습니다</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-emerald-100/80">TBM부터 위험제보까지 현장 근로자의 하루 안전 참여 과정을 확인했습니다.</p>
              </div>
              <div className="mt-5 space-y-2">
                {["음성 TBM 확인", "위험성평가 공유확인", `${reportType} 1건 제출`].map((record) => (
                  <div key={record} className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-black text-emerald-300">✓</span>
                    <p className="text-sm font-black text-slate-200">{record}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-center text-xs font-black leading-5 text-amber-100">모든 기록은 체험용 샘플이며 실제 고객 DB에는 저장되지 않습니다.</p>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 z-20 mt-5 border-t border-slate-800 bg-slate-950/95 pb-3 pt-3 backdrop-blur">
          {step > 0 && step < 3 && (
            <button type="button" onClick={() => setStep(step - 1)} disabled={pendingAction !== null} className="mb-2 min-h-10 w-full text-sm font-black text-slate-400 disabled:opacity-50">← 이전 단계</button>
          )}
          {step < 3 && (
            <button type="button" onClick={handlePrimaryAction} disabled={pendingAction !== null || (step === 2 && !demoState.workerReportSubmitted && !reportReady)} className={workerCtaClass}>
              {primaryLabel}
            </button>
          )}
          {step === 3 && <Link href="/partner-demo/manager" className={workerCtaClass}>현장관리자 체험으로 이동</Link>}
          <p className="mt-3 text-center text-[11px] font-bold text-slate-500">체험 모드 · 샘플 데이터 · 외부 시스템 미연결</p>
        </div>
      </div>
    </main>
  );
}
