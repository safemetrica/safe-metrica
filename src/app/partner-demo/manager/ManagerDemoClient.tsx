"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultDemoState, readDemoState, writeDemoState, type DemoState } from "../demoState";

const steps = ["TBM 개시", "참여현황 확인", "조치사진 샘플", "현장비서 요약", "완료"];
const workers = ["샘플근로자 A", "샘플근로자 B", "샘플근로자 C", "샘플근로자 D"];
const sampleTranscript = `음성 TBM 텍스트 변환 샘플

오늘 작업은 창고 입출고 및 지게차 상하차입니다.
지게차 후진 중 보행자 충돌, 적재물 낙하, 폭염 시 온열질환에 주의합니다.
보행 통로 분리, 적재 상태 확인, 충분한 수분 섭취를 안내합니다.`;
const ctaClass =
  "flex min-h-14 w-full items-center justify-center rounded-2xl px-5 py-4 text-base font-black shadow-lg transition-all duration-150 active:scale-[0.98] active:translate-y-0.5";
const managerCtaClass = `${ctaClass} bg-blue-500 text-white shadow-blue-950/40 hover:bg-blue-400 active:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:active:scale-100 disabled:active:translate-y-0`;

type PendingAction = "tbm" | "participation" | "photo" | "briefing" | null;

function CompletionCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-400 text-base font-black text-white">✓</span>
        <div>
          <p className="text-sm font-black text-blue-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-blue-100/80">{detail}</p>
          <p className="mt-2 text-sm font-black text-white">샘플 저장 완료</p>
          <p className="mt-1 text-xs leading-5 text-blue-100/80">실제 고객 DB에는 저장되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
}

export default function ManagerDemoClient() {
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<DemoState>(defaultDemoState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [transcript, setTranscript] = useState(sampleTranscript);

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
  const shareCompleted = demoState.riskSharedConfirmed ? 4 : 3;
  const unresolvedIssues = demoState.managerActionPhotoSaved ? Math.max(0, demoState.unresolvedIssues - 1) : demoState.unresolvedIssues;
  const reportCount = demoState.workerReportSubmitted ? 1 : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-28">
        <header className="rounded-[1.75rem] border border-blue-500/30 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-blue-200">← 뒤로</Link>
            <span className="rounded-full border border-blue-400/30 bg-blue-950/40 px-3 py-1 text-xs font-black text-blue-200">현장관리자</span>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg transition-all active:scale-95">⌂</Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-400">STEP {step + 1} / {steps.length}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{steps[step]}</h1>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5 shadow-xl">
          {step === 0 && (
            <div>
              <div className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-5">
                <p className="text-xs font-black text-slate-400">현장</p>
                <h2 className="mt-1 text-xl font-black text-white">SafeMetrica 샘플 현장</h2>
                <p className="mt-4 text-xs font-black text-slate-400">오늘 작업</p>
                <p className="mt-1 text-base font-bold leading-7 text-slate-100">창고 입출고 및 지게차 상하차</p>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-blue-200">참여 근로자</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {workers.map((worker) => <span key={worker} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-slate-200">{worker}</span>)}
                </div>
              </div>
              <button type="button" onClick={() => runAction("tbm", { managerTbmStarted: true })} disabled={pendingAction !== null || demoState.managerTbmStarted} className={`mt-5 ${managerCtaClass}`}>
                {pendingAction === "tbm" ? "확인 중..." : demoState.managerTbmStarted ? "TBM 확인 완료" : "음성 TBM 녹음 시작"}
              </button>
              {demoState.managerTbmStarted && (
                <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400 text-base font-black text-white">✓</span>
                    <p className="text-sm font-black text-blue-100">샘플 텍스트 변환 완료</p>
                  </div>
                  <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={7} className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white" />
                  <p className="mt-3 text-sm font-black text-white">샘플 저장 완료</p>
                  <p className="mt-1 text-xs leading-5 text-blue-100/80">실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-black text-blue-300">현장참여 4단계 현황</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: "TBM 참여", value: "4/4" },
                  { label: "위험성평가 공유확인", value: `${shareCompleted}/4` },
                  { label: "작업 중 안전수칙 이행", value: "진행중" },
                  { label: "작업 종료 후 정리", value: "대기" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-sm font-black leading-6 text-slate-100">{item.label}</p>
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-black text-blue-200">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">미확인자 수</p>
                <p className="mt-2 text-base font-black text-white">{4 - shareCompleted}명</p>
                <p className="mt-1 text-xs font-bold leading-5 text-amber-100/80">근로자 체험에서 공유확인을 완료하면 이 숫자가 줄어든 것처럼 표시됩니다.</p>
              </div>
              {demoState.workerReportSubmitted && (
                <article className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4">
                  <p className="text-sm font-black text-rose-100">위험제보 접수 카드</p>
                  <h2 className="mt-2 text-lg font-black text-white">창고 출입구 보행 통로 정리 요청</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">근로자 체험에서 제출한 위험제보 1건이 관리자 화면에 반영된 샘플입니다.</p>
                </article>
              )}
              <button type="button" onClick={() => runAction("participation", { managerBriefingChecked: true })} disabled={pendingAction !== null || demoState.managerBriefingChecked} className={`mt-5 ${managerCtaClass}`}>
                {pendingAction === "participation" ? "확인 중..." : "참여현황 확인 완료"}
              </button>
              {demoState.managerBriefingChecked && <CompletionCard title="참여현황 확인 완료" detail="현장참여 4단계 상태가 운영 흐름 샘플에 반영되었습니다." />}
            </div>
          )}

          {step === 2 && (
            <div>
              <article className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-5">
                <p className="text-sm font-black text-rose-200">제보접수 카드</p>
                <h2 className="mt-2 text-xl font-black text-white">창고 출입구 보행 통로 정리 요청</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">근로자 위험제보를 접수하고 조치사진 샘플 등록까지 이어지는 화면입니다.</p>
              </article>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-4 text-center">
                  <div className="flex h-24 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-slate-400">조치 전 사진</div>
                  <p className="mt-2 text-xs font-black text-slate-300">샘플 박스</p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-4 text-center">
                  <div className={`flex h-24 items-center justify-center rounded-xl text-xs font-black ${demoState.managerActionPhotoSaved ? "bg-blue-500/20 text-blue-100" : "bg-slate-900 text-slate-400"}`}>{demoState.managerActionPhotoSaved ? "기록 완료" : "조치 후 사진"}</div>
                  <p className="mt-2 text-xs font-black text-slate-300">샘플 박스</p>
                </div>
              </div>
              <button type="button" onClick={() => runAction("photo", { managerActionPhotoSaved: true })} disabled={pendingAction !== null || demoState.managerActionPhotoSaved} className={`mt-5 ${managerCtaClass}`}>
                {pendingAction === "photo" ? "조치이력 반영 중..." : demoState.managerActionPhotoSaved ? "조치이력 샘플 기록 완료" : "조치사진 샘플 등록"}
              </button>
              {demoState.managerActionPhotoSaved && <CompletionCard title="화면상 조치이력 샘플이 기록되었습니다" detail="실제 파일 업로드 없이 브라우저 상태에만 반영됩니다." />}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-5">
                <p className="text-sm font-black text-blue-200">현장비서 요약 카드</p>
                <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-slate-100">
                  <li>• TBM 기록 · 샘플 텍스트 변환 완료</li>
                  <li>• 공유확인 {shareCompleted}/4명 완료</li>
                  <li>• 위험제보 {reportCount}건 · 조치사진 {demoState.managerActionPhotoSaved ? 1 : 0}건</li>
                  <li>• 미조치 이슈 {unresolvedIssues}건으로 표시</li>
                </ul>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">월간보고서 반영 후보</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-100">TBM, 공유확인, 위험제보, 조치사진 흐름을 월간 요약에 반영하는 샘플입니다.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-400 text-xl font-black text-white">✓</div>
                <p className="mt-3 text-sm font-black text-blue-200">현장관리자 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black text-white">샘플 저장 완료</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-100">실제 고객 DB에는 저장되지 않습니다.</p>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">생성된 운영기록</p>
                <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-300">
                  <li>• 음성 TBM 기록 및 텍스트 변환</li>
                  <li>• 현장참여 4단계 현황</li>
                  <li>• 조치 전후 사진증빙</li>
                  <li>• 현장비서 요약</li>
                  <li>• 월간보고서 반영 후보</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 bg-slate-950/95 pb-3 pt-2">
          {step === 0 && <button type="button" onClick={() => setStep(1)} disabled={!demoState.managerTbmStarted} className={managerCtaClass}>{demoState.managerTbmStarted ? "다음 단계로 이동" : "먼저 TBM을 확인해 주세요"}</button>}
          {step === 1 && <button type="button" onClick={() => setStep(2)} disabled={!demoState.managerBriefingChecked} className={managerCtaClass}>{demoState.managerBriefingChecked ? "다음: 조치사진 샘플" : "공유확인 후 다음 단계로 이동할 수 있습니다"}</button>}
          {step === 2 && <button type="button" onClick={() => setStep(3)} disabled={!demoState.managerActionPhotoSaved} className={managerCtaClass}>{demoState.managerActionPhotoSaved ? "다음 단계로 이동" : "조치사진 체험 후 현장비서로 이동합니다"}</button>}
          {step === 3 && <button type="button" onClick={() => setStep(4)} className={managerCtaClass}>체험 완료</button>}
          {step === 4 && <Link href="/partner-demo" className={managerCtaClass}>다른 역할도 체험해보세요</Link>}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
