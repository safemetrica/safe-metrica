"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultDemoState, readDemoState, writeDemoState, type DemoState } from "../demoState";

const steps = ["운영 대시보드", "위험성평가표 샘플", "월간보고서 샘플", "완료"];
const ctaClass =
  "flex min-h-[60px] w-full items-center justify-center rounded-[1.35rem] px-5 py-4 text-base font-black shadow-xl transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0.5";
const ceoCtaClass = `${ctaClass} bg-amber-500 text-slate-950 shadow-amber-950/40 hover:bg-amber-400 active:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:active:scale-100 disabled:active:translate-y-0`;

function CompletionNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-base font-black text-slate-950">✓</span>
        <div>
          <p className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-black text-amber-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">{detail}</p>
          <p className="mt-2 text-sm font-black text-white">샘플 저장 완료</p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">실제 고객 DB에는 저장되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
}

export default function CeoDemoClient() {
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<DemoState>(defaultDemoState);
  const [pending, setPending] = useState(false);
  const [outputNotice, setOutputNotice] = useState(false);
  const [reportNotice, setReportNotice] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      const savedState = readDemoState();
      const viewedState = { ...savedState, ceoDashboardViewed: true };
      setDemoState(viewedState);
      writeDemoState(viewedState);
    }, 0);
  }, []);

  const updateDemoState = (nextPartial: Partial<DemoState>) => {
    setPending(true);
    window.setTimeout(() => {
      setDemoState((currentState) => {
        const nextState = { ...currentState, ...nextPartial };
        writeDemoState(nextState);
        return nextState;
      });
      setPending(false);
    }, 350);
  };

  const progress = ((step + 1) / steps.length) * 100;
  const workerReportCount = demoState.workerReportSubmitted ? 1 : 0;
  const actionDoneCount = demoState.managerActionPhotoSaved ? 1 : 0;
  const unresolvedIssues = demoState.managerActionPhotoSaved ? Math.max(0, demoState.unresolvedIssues - 1) : demoState.unresolvedIssues;
  const shareConfirmRate = demoState.riskSharedConfirmed ? Math.min(99, demoState.shareConfirmRate + 2) : demoState.shareConfirmRate;
  const tbmCount = demoState.managerTbmStarted ? demoState.tbmCount + 1 : demoState.tbmCount;
  const bars = [
    { label: "TBM", value: `${tbmCount}건`, width: `${Math.min(100, tbmCount * 2)}%` },
    { label: "공유확인", value: `${shareConfirmRate}%`, width: `${shareConfirmRate}%` },
    { label: "위험제보", value: `${workerReportCount}건 반영`, width: workerReportCount ? "62%" : "28%" },
    { label: "조치사진", value: `${actionDoneCount}건`, width: actionDoneCount ? "72%" : "24%" },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0,#020617_45%,#020617_100%)] px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-32">
        <header className="rounded-[2rem] border border-amber-500/30 bg-slate-900/95 p-4 shadow-2xl shadow-slate-950/50">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-amber-200">← 뒤로</Link>
            <div className="flex flex-col items-center gap-1"><span className="rounded-full border border-amber-400/30 bg-amber-950/40 px-3 py-1 text-xs font-black text-amber-200">대표</span><span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black text-amber-100">체험 중</span></div>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-lg shadow-lg transition-all active:scale-95">⌂</Link>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800 shadow-inner">
            <div className="h-full rounded-full bg-amber-400 shadow-[0_0_18px_rgba(255,255,255,0.18)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            <p className="text-xs font-black text-slate-400">STEP {step + 1} / {steps.length}</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-white">{steps[step]}</h1>
          </div>
        </header>

        <section className="mt-4 rounded-[2rem] border border-slate-700/90 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/40">
          {step === 0 && (
            <div>
              <p className="text-sm font-black text-amber-300">전체 현장 운영현황</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "TBM", value: `${tbmCount}건`, tone: "text-blue-200" },
                  { label: "공유확인율", value: `${shareConfirmRate}%`, tone: "text-emerald-200" },
                  { label: "위험제보", value: `${workerReportCount}건`, tone: "text-rose-200" },
                  { label: "미조치", value: `${unresolvedIssues}건`, tone: "text-amber-200" },
                ].map((kpi) => (
                  <article key={kpi.label} className="rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs font-black text-slate-400">{kpi.label}</p>
                    <p className={`mt-2 text-2xl font-black ${kpi.tone}`}>{kpi.value}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">운영 흐름 반영</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-100">근로자/관리자 체험 상태가 있으면 위험제보 1건, 조치완료 1건, 미조치 1건 감소가 반영된 것처럼 표시됩니다.</p>
              </div>
              <CompletionNotice title="대표 대시보드 확인 완료" detail="현재 브라우저의 데모 상태를 기준으로 KPI를 표시합니다." />
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-black text-amber-300">위험성평가표 샘플</p>
              <div className="mt-4 space-y-3">
                {[
                  { risk: "지게차 후진 중 보행자 충돌", status: actionDoneCount ? "조치완료" : "점검중", owner: "현장관리자", confirm: demoState.riskSharedConfirmed ? "공유확인 완료" : "공유확인 진행중" },
                  { risk: "창고 출입구 보행 통로 장애물", status: workerReportCount ? "접수" : "샘플 대기", owner: "현장관리자", confirm: actionDoneCount ? "조치사진 확인" : "확인 필요" },
                  { risk: "폭염 시 온열질환", status: "관리중", owner: "안전담당", confirm: "안내 완료" },
                ].map((row) => (
                  <article key={row.risk} className="rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-base font-black leading-6 text-white">{row.risk}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black text-slate-300">
                      <span className="rounded-xl bg-slate-900 px-3 py-2">조치상태: {row.status}</span>
                      <span className="rounded-xl bg-slate-900 px-3 py-2">담당자: {row.owner}</span>
                      <span className="col-span-2 rounded-xl bg-amber-500/10 px-3 py-2 text-amber-100">확인 상태: {row.confirm}</span>
                    </div>
                  </article>
                ))}
              </div>
              <button type="button" onClick={() => setOutputNotice(true)} className={`mt-5 ${ceoCtaClass}`}>PDF/Excel 출력 지원(정식 도입 시)</button>
              {outputNotice && <CompletionNotice title="샘플 저장 완료" detail="실제 다운로드는 없으며 위험성평가표 형태를 보여주는 샘플입니다." />}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="rounded-[1.65rem] border border-amber-500/30 bg-amber-950/20 p-5">
                <p className="text-sm font-black text-amber-100">월간 안전운영 보고서 카드</p>
                <h2 className="mt-2 text-xl font-black text-white">TBM·공유확인·제보·조치 요약</h2>
                <div className="mt-4 space-y-3">
                  {bars.map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs font-black text-slate-300"><span>{bar.label}</span><span>{bar.value}</span></div>
                      <div className="mt-1 h-3 rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400 shadow-[0_0_18px_rgba(255,255,255,0.18)] transition-all" style={{ width: bar.width }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <article className="rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">위험제보 및 조치</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">제보 {workerReportCount}건 · 조치완료 {actionDoneCount}건 · 미조치 {unresolvedIssues}건</p>
                </article>
                <article className="rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">공유확인 이력</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">샘플 근로자 4명 · 공유확인 {demoState.riskSharedConfirmed ? "4/4" : "3/4"}</p>
                </article>
                <article className="rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">사진증빙</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">조치 전후 사진 {actionDoneCount}세트 기록 표시</p>
                </article>
              </div>
              <button type="button" onClick={() => { setReportNotice(true); updateDemoState({ monthlyReportViewed: true }); }} disabled={pending || demoState.monthlyReportViewed} className={`mt-5 ${ceoCtaClass}`}>
                {pending ? "샘플 저장 중..." : demoState.monthlyReportViewed ? "샘플 저장 완료" : "월간보고서 샘플 확인"}
              </button>
              {(reportNotice || demoState.monthlyReportViewed) && <CompletionNotice title="월간보고서 샘플 확인 완료" detail="TBM, 공유확인, 위험제보, 조치사진, 미조치 요약이 화면에만 기록됩니다." />}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-[1.65rem] border border-amber-500/30 bg-amber-950/20 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-xl font-black text-slate-950">✓</div>
                <p className="mt-3 text-sm font-black text-amber-100">대표 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black text-white">대표가 확인할 수 있는 운영기록</h2>
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-slate-950/50 p-4">
                  <p className="text-base font-black text-white">샘플 저장 완료</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-amber-100">실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              </div>
              <div className="mt-5 rounded-[1.35rem] border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">대표 운영기록 요약</p>
                <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-300">
                  <li>• 전체 현장 운영현황</li>
                  <li>• 위험성평가표 요약</li>
                  <li>• 월간 안전운영 보고서</li>
                  <li>• 위험제보 및 조치이력 통계</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 border-t border-white/10 bg-slate-950/95 pb-4 pt-3 backdrop-blur">
          {step === 0 && <button type="button" onClick={() => setStep(1)} className={ceoCtaClass}>다음: 위험성평가표 샘플</button>}
          {step === 1 && <button type="button" onClick={() => setStep(2)} className={ceoCtaClass}>다음: 월간보고서 샘플</button>}
          {step === 2 && <button type="button" onClick={() => setStep(3)} disabled={!demoState.monthlyReportViewed} className={ceoCtaClass}>{demoState.monthlyReportViewed ? "다음 단계로 이동" : "월간보고서 확인 후 다음 단계로 이동할 수 있습니다"}</button>}
          {step === 3 && <Link href="/partner-demo" className={ceoCtaClass}>다른 역할도 체험해보세요</Link>}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
