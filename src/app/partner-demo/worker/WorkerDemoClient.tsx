"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultDemoState, readDemoState, writeDemoState, type DemoState } from "../demoState";

const steps = ["음성 TBM 참여", "위험성평가 공유확인", "위험제보", "완료"];
const risks = [
  { title: "지게차 후진 중 보행자 충돌", control: "보행 통로 분리, 후진 경고음 확인, 신호수와 눈 맞춤" },
  { title: "적재물 낙하", control: "적재 높이 확인, 결속 상태 점검, 하부 접근 제한" },
  { title: "폭염 시 온열질환", control: "물 섭취, 휴식 시간 준수, 어지러움 발생 시 즉시 알림" },
];
const reportTypes = ["위험제보", "아차사고", "개선제안"];
const ctaClass =
  "flex min-h-[60px] w-full items-center justify-center rounded-[1.35rem] px-5 py-4 text-base font-black shadow-xl transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0.5";
const workerCtaClass = `${ctaClass} bg-emerald-500 text-white shadow-emerald-950/40 hover:bg-emerald-400 active:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:active:scale-100 disabled:active:translate-y-0`;

type PendingAction = "tbm" | "share" | "report" | null;

function CompletionCard({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-base font-black text-slate-950">✓</span>
        <div>
          <p className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-black text-emerald-100">{title}</p>
          {detail && <p className="mt-1 text-xs leading-5 text-emerald-100/80">{detail}</p>}
          <p className="mt-2 text-sm font-black text-white">샘플 저장 완료</p>
          <p className="mt-1 text-xs leading-5 text-emerald-100/80">실제 고객 DB에는 저장되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
}

export default function WorkerDemoClient() {
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<DemoState>(defaultDemoState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [reportType, setReportType] = useState(reportTypes[0]);
  const [location, setLocation] = useState("창고 출입구 앞 보행 통로");
  const [content, setContent] = useState("지게차 이동 구역 주변 적재물을 정리하면 보행자 동선 확인이 더 쉬울 것 같습니다.");

  useEffect(() => {
    window.setTimeout(() => setDemoState(readDemoState()), 0);
  }, []);

  const updateDemoState = (nextPartial: Partial<DemoState>) => {
    setDemoState((currentState) => {
      const nextState = { ...currentState, ...nextPartial };
      writeDemoState(nextState);
      return nextState;
    });
  };

  const runAction = (action: PendingAction, nextPartial: Partial<DemoState>) => {
    setPendingAction(action);
    window.setTimeout(() => {
      updateDemoState(nextPartial);
      setPendingAction(null);
    }, 450);
  };

  const progress = ((step + 1) / steps.length) * 100;
  const nextLabel = step === 0 ? "먼저 TBM을 확인해 주세요" : "공유확인 후 다음 단계로 이동할 수 있습니다";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0,#020617_45%,#020617_100%)] px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-32">
        <header className="rounded-[2rem] border border-emerald-500/30 bg-slate-900/95 p-4 shadow-2xl shadow-slate-950/50">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-emerald-200">← 뒤로</Link>
            <div className="flex flex-col items-center gap-1"><span className="rounded-full border border-emerald-400/30 bg-emerald-950/40 px-3 py-1 text-xs font-black text-emerald-200">근로자</span><span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-100">체험 중</span></div>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-lg shadow-lg transition-all active:scale-95">⌂</Link>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800 shadow-inner">
            <div className="h-full rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(255,255,255,0.18)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            <p className="text-xs font-black text-slate-400">STEP {step + 1} / {steps.length}</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-white">{steps[step]}</h1>
          </div>
        </header>

        <section className="mt-4 rounded-[2rem] border border-slate-700/90 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/40">
          {step === 0 && (
            <div>
              <p className="text-sm font-black text-emerald-300">오늘의 TBM 카드</p>
              <div className="mt-4 rounded-[1.65rem] border border-emerald-500/30 bg-emerald-950/20 p-5">
                <p className="text-xs font-black text-slate-400">샘플 현장명</p>
                <h2 className="mt-1 text-xl font-black text-white">SafeMetrica 샘플 현장</h2>
                <p className="mt-4 text-xs font-black text-slate-400">샘플 작업</p>
                <p className="mt-1 text-base font-bold leading-7 text-slate-100">창고 입출고 및 지게차 상하차</p>
              </div>
              <button
                type="button"
                onClick={() => runAction("tbm", { tbmConfirmed: true })}
                disabled={pendingAction !== null || demoState.tbmConfirmed}
                className={`mt-5 ${workerCtaClass}`}
              >
                {pendingAction === "tbm" ? "확인 중..." : demoState.tbmConfirmed ? "TBM 확인 완료" : "음성 TBM 듣기"}
              </button>
              {demoState.tbmConfirmed && <CompletionCard title="음성 안내 확인 완료" detail="TBM 확인 완료 가능 상태가 화면에 기록되었습니다." />}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-black text-emerald-300">주요 위험요인 3개</p>
              <div className="mt-4 space-y-3">
                {risks.map((risk, index) => (
                  <article key={risk.title} className="rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-black text-emerald-200">{index + 1}</span>
                      <div>
                        <h2 className="text-base font-black leading-6 text-white">{risk.title}</h2>
                        <p className="mt-2 text-sm font-bold leading-6 text-slate-300">안전조치: {risk.control}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <button
                type="button"
                onClick={() => runAction("share", { riskSharedConfirmed: true })}
                disabled={pendingAction !== null || demoState.riskSharedConfirmed}
                className={`mt-5 ${workerCtaClass}`}
              >
                {pendingAction === "share" ? "샘플 저장 중..." : demoState.riskSharedConfirmed ? "샘플 저장 완료" : "공유확인 완료하기"}
              </button>
              {demoState.riskSharedConfirmed && <CompletionCard title="위험성평가 공유확인 완료" detail="샘플 서명 상태가 화면에만 표시됩니다." />}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm font-black text-emerald-300">현장 의견 샘플 입력</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {reportTypes.map((type) => (
                  <button key={type} type="button" onClick={() => setReportType(type)} className={`rounded-full border px-4 py-2 text-sm font-black transition-all active:scale-95 ${reportType === type ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-700 bg-slate-950 text-slate-300"}`}>
                    {type}
                  </button>
                ))}
              </div>
              <label className="mt-5 grid gap-2 text-sm font-bold text-slate-200">
                위치
                <input value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-12 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
              <label className="mt-4 grid gap-2 text-sm font-bold text-slate-200">
                내용
                <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" />
              </label>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-5 text-center">
                <p className="text-sm font-black text-slate-200">사진 첨부</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">샘플 UI만 표시됩니다. 실제 파일 업로드는 없습니다.</p>
              </div>
              {demoState.workerReportSubmitted && <CompletionCard title="위험제보 1건 제출 완료" detail="근로자 체험에서 생성된 제보가 관리자 화면에 반영되는 흐름입니다." />}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-[1.65rem] border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-xl font-black text-slate-950">✓</div>
                <p className="mt-3 text-sm font-black text-emerald-200">근로자 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black text-white">이번 체험에서 생성된 기록</h2>
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-slate-950/50 p-4">
                  <p className="text-base font-black text-white">샘플 저장 완료</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-emerald-100">실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              </div>
              <div className="mt-5 rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">생성된 운영기록</p>
                <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-300">
                  <li>• TBM 확인 기록</li>
                  <li>• 위험성평가 공유확인</li>
                  <li>• 위험제보 1건</li>
                  <li>• 실제 고객 DB 미저장 안내</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 border-t border-white/10 bg-slate-950/95 pb-4 pt-3 backdrop-blur">
          {step < 2 && (
            <>
              <button type="button" onClick={() => setStep(step + 1)} disabled={step === 0 ? !demoState.tbmConfirmed : !demoState.riskSharedConfirmed} className={workerCtaClass}>
                {step === 0 ? (demoState.tbmConfirmed ? "다음 단계로 이동" : "먼저 TBM을 확인해 주세요") : demoState.riskSharedConfirmed ? "다음 단계로 이동" : nextLabel}
              </button>
              {(step === 0 ? !demoState.tbmConfirmed : !demoState.riskSharedConfirmed) && <p className="mt-2 text-center text-xs font-bold text-slate-400">{nextLabel}</p>}
            </>
          )}
          {step === 2 && (
            <button type="button" onClick={() => runAction("report", { workerReportSubmitted: true })} disabled={pendingAction !== null || demoState.workerReportSubmitted} className={workerCtaClass}>
              {pendingAction === "report" ? "샘플 저장 중..." : demoState.workerReportSubmitted ? "샘플 저장 완료" : "제보 제출하기"}
            </button>
          )}
          {step === 2 && demoState.workerReportSubmitted && <button type="button" onClick={() => setStep(3)} className={`mt-3 ${workerCtaClass}`}>다음 단계로 이동</button>}
          {step === 3 && <Link href="/partner-demo" className={workerCtaClass}>다른 역할도 체험해보세요</Link>}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
