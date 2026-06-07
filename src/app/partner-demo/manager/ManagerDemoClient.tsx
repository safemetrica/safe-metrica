"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultDemoState, readDemoState, writeDemoState, type DemoState } from "../demoState";

const steps = ["참여현황 확인", "위험제보 접수", "조치사진 샘플", "현장비서 요약", "완료"];
const ctaClass =
  "flex min-h-14 w-full items-center justify-center rounded-2xl px-5 py-4 text-center text-base font-black shadow-lg transition-all duration-150 active:scale-[0.98] active:translate-y-0.5";
const managerCtaClass = `${ctaClass} bg-blue-500 text-white shadow-blue-950/40 hover:bg-blue-400 active:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:active:scale-100 disabled:active:translate-y-0`;

const participationSignals = [
  { label: "TBM 참여", value: "4/4", tone: "blue" },
  { label: "위험성평가 공유확인", value: "4/4", tone: "blue" },
  { label: "위험제보", value: "1건 접수", tone: "rose" },
] as const;

const reportDetails = [
  { label: "유형", value: "위험제보" },
  { label: "위치", value: "창고 출입구 앞 보행 통로" },
] as const;

const summaryItems = [
  "TBM 확인 완료",
  "공유확인 완료",
  "위험제보 1건 접수",
  "조치사진 1건 샘플 기록",
  "월간보고서 반영 후보",
];

type PendingAction = "participation" | "photo" | null;

function SampleNotice() {
  return (
    <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black leading-5 text-amber-100">
      체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
    </p>
  );
}

function CompletionCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-400 text-base font-black text-white">
          ✓
        </span>
        <div>
          <p className="text-sm font-black text-blue-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-blue-100/80">{detail}</p>
          <p className="mt-2 text-xs leading-5 text-blue-100/80">실제 고객 DB에는 저장되지 않습니다.</p>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ actionSaved = false }: { actionSaved?: boolean }) {
  return (
    <article className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black tracking-wide text-rose-200">접수된 샘플 제보</p>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${actionSaved ? "bg-blue-500/20 text-blue-100" : "bg-rose-500/20 text-rose-100"}`}>
          {actionSaved ? "접수" : "조치필요"}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-black leading-8 text-white">창고 출입구 보행 통로 정리 요청</h2>
      <dl className="mt-4 space-y-3">
        {reportDetails.map((item) => (
          <div key={item.label} className="grid grid-cols-[3.5rem_1fr] gap-3 text-sm leading-6">
            <dt className="font-black text-rose-200/80">{item.label}</dt>
            <dd className="font-bold text-slate-100">{item.value}</dd>
          </div>
        ))}
        <div className="border-t border-rose-400/15 pt-3 text-sm leading-6">
          <dt className="font-black text-rose-200/80">내용</dt>
          <dd className="mt-1 font-bold text-slate-200">
            지게차 이동 구역 주변 적재물을 정리하면 보행자 동선 확인이 더 쉬울 것 같습니다.
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function ManagerDemoClient() {
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<DemoState>(defaultDemoState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    setDemoState(readDemoState());
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
  const actionNeededCount = demoState.managerActionPhotoSaved ? 0 : 1;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-28">
        <header className="rounded-[1.75rem] border border-blue-500/30 bg-slate-900 p-4 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-blue-200">
              ← 뒤로
            </Link>
            <span className="rounded-full border border-blue-400/30 bg-blue-950/40 px-3 py-1 text-xs font-black text-blue-200">
              현장관리자 체험
            </span>
            <Link
              href="/partner-demo"
              aria-label="Partner Demo 홈"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg transition-all active:scale-95"
            >
              ⌂
            </Link>
          </div>
          <p className="mt-4 text-sm font-bold leading-6 text-slate-300">
            근로자 제보를 확인하고 조치 흐름을 남기는 샘플 체험
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-400">
                STEP {step + 1} / {steps.length}
              </p>
              <h1 className="mt-1 text-2xl font-black text-white">{steps[step]}</h1>
            </div>
            <span className="text-sm font-black text-blue-300">{Math.round(progress)}%</span>
          </div>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5 shadow-xl">
          {step === 0 && (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-blue-300">오늘의 참여현황</p>
                  <h2 className="mt-1 text-xl font-black text-white">근로자 확인 결과를 살펴보세요</h2>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-200">미확인 0건</span>
              </div>

              <div className="mt-5 space-y-3">
                {participationSignals.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-sm font-black leading-6 text-slate-100">{item.label}</p>
                    <span className={`rounded-full px-3 py-1 text-sm font-black ${item.tone === "rose" ? "bg-rose-500/20 text-rose-100" : "bg-blue-500/20 text-blue-200"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4">
                  <p className="text-xs font-black text-emerald-200">공유 미확인</p>
                  <p className="mt-2 text-2xl font-black text-white">0건</p>
                </div>
                <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-4">
                  <p className="text-xs font-black text-rose-200">조치필요</p>
                  <p className="mt-2 text-2xl font-black text-white">{actionNeededCount}건</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                <p className="text-sm font-black text-blue-100">
                  {demoState.workerReportSubmitted
                    ? "근로자 체험에서 제출된 샘플 제보가 접수되었습니다."
                    : "바로 체험할 수 있도록 샘플 제보 1건을 준비했습니다."}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-blue-100/70">
                  근로자 체험 완료 여부와 관계없이 관리자 조치 흐름을 확인할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => runAction("participation", { managerBriefingChecked: true })}
                disabled={pendingAction !== null || demoState.managerBriefingChecked}
                className={`mt-5 ${managerCtaClass}`}
              >
                {pendingAction === "participation" ? "참여현황 확인 중..." : "참여현황 확인 완료"}
              </button>
              {demoState.managerBriefingChecked && (
                <CompletionCard title="참여현황을 확인했습니다" detail="다음 단계에서 접수된 위험제보 내용을 확인합니다." />
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-xs font-black text-rose-300">위험제보 1건 접수</p>
              <h2 className="mt-1 text-xl font-black text-white">조치가 필요한 내용을 확인하세요</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">샘플 제보의 위치와 내용을 확인한 뒤 조치사진 기록으로 이어집니다.</p>
              <div className="mt-5">
                <ReportCard actionSaved={demoState.managerActionPhotoSaved} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-black text-blue-300">조치 흐름 기록</p>
              <h2 className="mt-1 text-xl font-black text-white">조치사진을 샘플로 남겨보세요</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">실제 파일을 선택하거나 업로드하지 않는 체험용 샘플 박스입니다.</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-3 text-center">
                  <div className="flex h-28 flex-col items-center justify-center rounded-xl bg-slate-900 px-2 text-slate-400">
                    <span className="text-2xl">▧</span>
                    <span className="mt-2 text-xs font-black">조치 전 샘플</span>
                  </div>
                  <p className="mt-2 text-xs font-black text-slate-300">적재물 확인</p>
                </div>
                <div className={`rounded-2xl border border-dashed p-3 text-center ${demoState.managerActionPhotoSaved ? "border-blue-400/60 bg-blue-950/30" : "border-slate-600 bg-slate-950/70"}`}>
                  <div className={`flex h-28 flex-col items-center justify-center rounded-xl px-2 ${demoState.managerActionPhotoSaved ? "bg-blue-500/20 text-blue-100" : "bg-slate-900 text-slate-400"}`}>
                    <span className="text-2xl">{demoState.managerActionPhotoSaved ? "✓" : "▧"}</span>
                    <span className="mt-2 text-xs font-black">{demoState.managerActionPhotoSaved ? "샘플 기록 완료" : "조치 후 샘플"}</span>
                  </div>
                  <p className="mt-2 text-xs font-black text-slate-300">통로 정리 확인</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-100">샘플 기록 안내</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400">화면의 샘플 상태만 변경되며 실제 고객 DB에는 저장되지 않습니다.</p>
              </div>

              <button
                type="button"
                onClick={() => runAction("photo", { managerActionPhotoSaved: true })}
                disabled={pendingAction !== null || demoState.managerActionPhotoSaved}
                className={`mt-5 ${managerCtaClass}`}
              >
                {pendingAction === "photo" ? "샘플 기록 중..." : "조치사진 샘플 기록 완료"}
              </button>
              {demoState.managerActionPhotoSaved && (
                <CompletionCard title="조치사진 1건을 샘플 기록했습니다" detail="브라우저의 Partner Demo 샘플 상태에만 반영되었습니다." />
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-xs font-black text-blue-300">현장비서 요약</p>
              <h2 className="mt-1 text-xl font-black text-white">오늘 확인할 항목</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">앞에서 확인하고 기록한 운영 흐름을 한 번에 살펴보세요.</p>

              <ul className="mt-5 space-y-3">
                {summaryItems.map((item, index) => (
                  <li key={item} className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${index === summaryItems.length - 1 ? "bg-amber-500/20 text-amber-200" : "bg-blue-500/20 text-blue-100"}`}>
                      {index === summaryItems.length - 1 ? "→" : "✓"}
                    </span>
                    <span className="text-sm font-black leading-6 text-slate-100">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                <p className="text-sm font-black text-blue-100">운영 흐름 요약</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-200">근로자 확인 결과와 위험제보, 조치사진 샘플 기록을 월간보고서 반영 후보로 모았습니다.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-400 text-2xl font-black text-white">✓</div>
                <p className="mt-4 text-sm font-black text-blue-200">현장관리자 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black leading-9 text-white">근로자 제보가 조치 흐름으로 이어졌습니다</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-100/80">이제 대표 관점에서 샘플 운영기록이 어떻게 요약되는지 확인해보세요.</p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">생성된 샘플 운영기록</p>
                <ul className="mt-3 space-y-3 text-sm font-bold leading-6 text-slate-300">
                  <li className="flex items-center justify-between gap-3"><span>참여·공유 확인</span><strong className="text-blue-200">각 4/4</strong></li>
                  <li className="flex items-center justify-between gap-3"><span>위험제보 접수</span><strong className="text-blue-200">1건</strong></li>
                  <li className="flex items-center justify-between gap-3"><span>조치사진 샘플 기록</span><strong className="text-blue-200">1건</strong></li>
                  <li className="flex items-center justify-between gap-3"><span>보고서 반영</span><strong className="text-amber-200">후보</strong></li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 bg-slate-950/95 pb-3 pt-2 backdrop-blur">
          {step === 0 && (
            <button type="button" onClick={() => setStep(1)} disabled={!demoState.managerBriefingChecked} className={managerCtaClass}>
              {demoState.managerBriefingChecked ? "다음: 위험제보 접수 확인" : "먼저 참여현황을 확인해 주세요"}
            </button>
          )}
          {step === 1 && (
            <button type="button" onClick={() => setStep(2)} className={managerCtaClass}>
              위험제보 접수 확인
            </button>
          )}
          {step === 2 && (
            <button type="button" onClick={() => setStep(3)} disabled={!demoState.managerActionPhotoSaved} className={managerCtaClass}>
              {demoState.managerActionPhotoSaved ? "다음: 현장비서 요약" : "조치사진 샘플을 기록해 주세요"}
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={() => setStep(4)} className={managerCtaClass}>
              현장관리자 체험 완료
            </button>
          )}
          {step === 4 && (
            <Link href="/partner-demo/ceo" className={managerCtaClass}>
              대표 체험으로 이동
            </Link>
          )}
          <SampleNotice />
        </div>
      </div>
    </main>
  );
}
