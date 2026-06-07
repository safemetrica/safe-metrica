"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultDemoState, readDemoState, writeDemoState, type DemoState } from "../demoState";

const steps = ["운영 대시보드", "위험성평가표 샘플", "월간보고서 샘플", "완료"];
const ctaClass =
  "flex min-h-14 w-full items-center justify-center rounded-2xl px-5 py-4 text-center text-base font-black shadow-lg transition-all duration-150 active:scale-[0.98] active:translate-y-0.5";
const ceoCtaClass = `${ctaClass} bg-amber-500 text-slate-950 shadow-amber-950/40 hover:bg-amber-400 active:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:active:scale-100 disabled:active:translate-y-0`;

function SampleNotice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-base font-black text-slate-950">✓</span>
        <div>
          <p className="text-sm font-black text-amber-100">{title}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-amber-100/80">{detail}</p>
          <p className="mt-2 text-xs font-black text-white">샘플 저장 · 실제 고객 DB 미연결</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div>
      <p className="text-xs font-black text-amber-300">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black leading-8 text-white">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

export default function CeoDemoClient() {
  const [step, setStep] = useState(0);
  const [demoState, setDemoState] = useState<DemoState>(defaultDemoState);
  const [pending, setPending] = useState(false);
  const [outputNotice, setOutputNotice] = useState(false);

  useEffect(() => {
    const savedState = readDemoState();
    const viewedState = { ...savedState, ceoDashboardViewed: true };
    setDemoState(viewedState);
    writeDemoState(viewedState);
  }, []);

  const confirmMonthlyReport = () => {
    setPending(true);
    window.setTimeout(() => {
      setDemoState((currentState) => {
        const nextState = { ...currentState, monthlyReportViewed: true };
        writeDemoState(nextState);
        return nextState;
      });
      setPending(false);
    }, 350);
  };

  const progress = ((step + 1) / steps.length) * 100;
  const workerReportCount = demoState.workerReportSubmitted ? 1 : 0;
  const actionPhotoCount = demoState.managerActionPhotoSaved ? 1 : 0;
  const unresolvedIssues = demoState.managerActionPhotoSaved ? Math.max(0, demoState.unresolvedIssues - 1) : demoState.unresolvedIssues;
  const shareConfirmRate = demoState.riskSharedConfirmed ? Math.min(99, demoState.shareConfirmRate + 2) : demoState.shareConfirmRate;
  const tbmCount = demoState.managerTbmStarted ? demoState.tbmCount + 1 : demoState.tbmCount;
  const reportBars = [
    { label: "TBM", value: `${tbmCount}건`, width: `${Math.min(100, tbmCount * 2)}%` },
    { label: "공유확인", value: `${shareConfirmRate}%`, width: `${shareConfirmRate}%` },
    { label: "위험제보", value: `${workerReportCount}건`, width: workerReportCount ? "64%" : "28%" },
    { label: "조치사진", value: `${actionPhotoCount}건`, width: actionPhotoCount ? "72%" : "24%" },
  ];
  const riskRows = [
    {
      risk: "지게차 후진 중 보행자 충돌",
      status: actionPhotoCount ? "조치사진 기록" : "확인 필요",
      owner: "현장관리자",
      confirm: demoState.riskSharedConfirmed ? "공유확인 완료" : "공유확인 진행중",
      candidate: "반영 후보",
    },
    {
      risk: "창고 출입구 보행 통로 장애물",
      status: workerReportCount ? "위험제보 접수" : "샘플 점검중",
      owner: "현장관리자",
      confirm: actionPhotoCount ? "조치사진 확인" : "현장 확인 필요",
      candidate: "반영 후보",
    },
    {
      risk: "상하차 작업 중 끼임 또는 낙하",
      status: "예방조치 확인중",
      owner: "안전담당자",
      confirm: "다음 TBM 확인 후보",
      candidate: "검토 후보",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px] pb-28">
        <header className="rounded-[1.75rem] border border-amber-500/30 bg-slate-900 p-4 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-amber-200">← 뒤로</Link>
            <span className="rounded-full border border-amber-400/30 bg-amber-950/40 px-3 py-1 text-xs font-black text-amber-200">대표 체험</span>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg transition-all active:scale-95">⌂</Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-400">STEP {step + 1} / {steps.length}</p>
              <h1 className="mt-1 text-2xl font-black text-white">{steps[step]}</h1>
            </div>
            <span className="shrink-0 text-xs font-black text-amber-300">약 1분 체험</span>
          </div>
          <p className="mt-3 border-t border-slate-800 pt-3 text-sm font-bold leading-6 text-slate-300">
            현장 입력과 관리자 조치가 대표 화면의 운영 신호로 이어지는 샘플 체험입니다.
          </p>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5 shadow-xl">
          {step === 0 && (
            <div>
              <SectionHeading
                eyebrow="한눈에 보는 운영 신호"
                title="대표가 먼저 확인할 숫자 4개"
                detail="근로자 체험과 현장관리자 체험 결과가 반영된 샘플 운영 신호입니다."
              />
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { label: "TBM", value: `${tbmCount}건`, note: "현장 활동", tone: "text-blue-200" },
                  { label: "공유확인율", value: `${shareConfirmRate}%`, note: "근로자 확인", tone: "text-emerald-200" },
                  { label: "위험제보", value: `${workerReportCount}건`, note: "현장 입력", tone: "text-rose-200" },
                  { label: "미조치", value: `${unresolvedIssues}건`, note: "추가 확인", tone: "text-amber-200" },
                ].map((kpi) => (
                  <article key={kpi.label} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-400">{kpi.label}</p>
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    </div>
                    <p className={`mt-2 text-3xl font-black ${kpi.tone}`}>{kpi.value}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">{kpi.note}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">현장 입력 → 관리자 조치 → 대표 확인</p>
                <p className="mt-2 text-xs font-bold leading-5 text-amber-100/80">
                  앞선 역할에서 남긴 샘플 상태를 숫자로 연결해 보여줍니다. 실제 고객 DB에는 저장되지 않습니다.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <SectionHeading
                eyebrow="위험성평가표 출력지원 샘플"
                title="현장 위험과 확인 상태를 표처럼 확인"
                detail="정식 도입 시 출력지원 가능하며, 현재 체험판에서는 샘플 데이터로만 표시됩니다."
              />
              <div className="mt-5 space-y-3">
                {riskRows.map((row, index) => (
                  <article key={row.risk} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-slate-950">{index + 1}</span>
                      <p className="text-sm font-black leading-6 text-white">{row.risk}</p>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
                      <div className="rounded-xl bg-slate-900 px-3 py-2.5">
                        <dt className="text-slate-500">조치상태</dt>
                        <dd className="mt-1 text-slate-200">{row.status}</dd>
                      </div>
                      <div className="rounded-xl bg-slate-900 px-3 py-2.5">
                        <dt className="text-slate-500">담당자</dt>
                        <dd className="mt-1 text-slate-200">{row.owner}</dd>
                      </div>
                      <div className="rounded-xl bg-slate-900 px-3 py-2.5">
                        <dt className="text-slate-500">확인 상태</dt>
                        <dd className="mt-1 text-slate-200">{row.confirm}</dd>
                      </div>
                      <div className="rounded-xl bg-amber-500/10 px-3 py-2.5">
                        <dt className="text-amber-200/60">월간보고서</dt>
                        <dd className="mt-1 text-amber-100">{row.candidate}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
              <button type="button" onClick={() => setOutputNotice(true)} className={`mt-5 ${ceoCtaClass}`}>
                위험성평가표 샘플 확인
              </button>
              {outputNotice && (
                <SampleNotice title="출력지원 형태를 확인했습니다" detail="읽기 전용 카드이며, 이 체험에서는 파일을 생성하거나 외부로 전송하지 않습니다." />
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionHeading
                eyebrow="월간보고서 샘플 확인"
                title="입력된 운영기록을 한 장으로 요약"
                detail="TBM, 공유확인, 위험제보, 조치사진 기록을 대표 확인용 카드로 구성한 샘플입니다."
              />
              <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
                <p className="text-xs font-black text-amber-200">이번 달 운영기록 요약</p>
                <div className="mt-4 space-y-3">
                  {reportBars.map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs font-black text-slate-300"><span>{bar.label}</span><span>{bar.value}</span></div>
                      <div className="mt-1.5 h-2.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: bar.width }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { label: "위험제보 및 조치 요약", value: `제보 ${workerReportCount}건 · 조치사진 ${actionPhotoCount}건 · 미조치 ${unresolvedIssues}건`, icon: "!" },
                  { label: "공유확인 이력", value: `샘플 근로자 4명 · 공유확인 ${demoState.riskSharedConfirmed ? "4/4" : "3/4"}`, icon: "✓" },
                ].map((item) => (
                  <article key={item.label} className="flex gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-sm font-black text-amber-200">{item.icon}</span>
                    <div>
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{item.value}</p>
                    </div>
                  </article>
                ))}
              </div>

              <article className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-white">사전점검 또는 조치 전후 사진 샘플</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 text-slate-400">
                    <span className="text-xl">▧</span>
                    <span className="mt-2 text-xs font-black">조치 전 샘플</span>
                  </div>
                  <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/40 bg-amber-950/20 text-amber-100">
                    <span className="text-xl">{actionPhotoCount ? "✓" : "▧"}</span>
                    <span className="mt-2 text-xs font-black">조치 후 샘플</span>
                  </div>
                </div>
              </article>

              <article className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">다음 달 확인 후보</p>
                <ul className="mt-2 space-y-1 text-xs font-bold leading-5 text-amber-100/80">
                  <li>• 미조치 항목 담당자 확인</li>
                  <li>• 상하차 작업 예방조치 재확인</li>
                </ul>
              </article>

              <p className="mt-4 text-center text-xs font-bold leading-5 text-slate-500">입력된 운영기록을 요약한 샘플이며 실제 고객 DB에는 저장되지 않습니다.</p>
              <button type="button" onClick={confirmMonthlyReport} disabled={pending || demoState.monthlyReportViewed} className={`mt-4 ${ceoCtaClass}`}>
                {pending ? "샘플 확인 중..." : demoState.monthlyReportViewed ? "월간보고서 샘플 확인 완료" : "월간보고서 샘플 확인"}
              </button>
              {demoState.monthlyReportViewed && (
                <SampleNotice title="월간보고서 구성을 확인했습니다" detail="운영기록이 보고서 항목으로 이어지는 샘플 흐름을 브라우저에만 기록했습니다." />
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-2xl font-black text-slate-950">✓</div>
                <p className="mt-4 text-sm font-black text-amber-100">대표 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black leading-9 text-white">현장 기록이 대표 확인과 보고서까지 이어졌습니다</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-amber-100/80">모든 내용은 Partner Demo 샘플 상태이며 실제 고객 DB에는 저장되지 않습니다.</p>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">대표가 확인할 수 있는 운영 기록</p>
                <ul className="mt-3 space-y-2.5 text-sm font-bold leading-6 text-slate-300">
                  {["전체 현장 운영현황", "위험성평가표 요약", "월간 안전운영 보고서", "위험제보 및 조치이력 통계"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 bg-slate-950/95 pb-3 pt-2 backdrop-blur">
          {step === 0 && <button type="button" onClick={() => setStep(1)} className={ceoCtaClass}>다음: 위험성평가표 샘플</button>}
          {step === 1 && <button type="button" onClick={() => setStep(2)} className={ceoCtaClass}>다음: 월간보고서 샘플</button>}
          {step === 2 && (
            <button type="button" onClick={() => setStep(3)} disabled={!demoState.monthlyReportViewed} className={ceoCtaClass}>
              {demoState.monthlyReportViewed ? "대표 체험 완료하기" : "월간보고서 확인 후 완료할 수 있습니다"}
            </button>
          )}
          {step === 3 && <Link href="/partner-demo" className={ceoCtaClass}>파트너 체험판 홈으로 돌아가기</Link>}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
