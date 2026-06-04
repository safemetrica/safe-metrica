"use client";

import Link from "next/link";
import { useState } from "react";

const steps = ["TBM 개시", "현장참여 4단계 확인", "조치 전후 사진증빙", "현장비서", "완료"];
const workers = ["샘플근로자 A", "샘플근로자 B", "샘플근로자 C", "샘플근로자 D"];
const participation = [
  { label: "TBM 참여", value: "4/4" },
  { label: "위험성평가 공유확인", value: "3/4" },
  { label: "작업 중 안전수칙 이행", value: "-" },
  { label: "작업 종료 후 정리", value: "-" },
];
const sampleTranscript = `음성 TBM 텍스트 변환 샘플

오늘 작업은 창고 입출고 및 지게차 상하차입니다.
지게차 후진 중 보행자 충돌, 적재물 낙하, 폭염 시 온열질환에 주의합니다.
보행 통로 분리, 적재 상태 확인, 충분한 수분 섭취를 안내합니다.`;

export default function ManagerDemoClient() {
  const [step, setStep] = useState(0);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [transcript, setTranscript] = useState(sampleTranscript);
  const [participationChecked, setParticipationChecked] = useState(false);
  const [afterPhotoDone, setAfterPhotoDone] = useState(false);

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="rounded-[1.75rem] border border-blue-500/30 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-blue-200">← 뒤로</Link>
            <span className="rounded-full border border-blue-400/30 bg-blue-950/40 px-3 py-1 text-xs font-black text-blue-200">현장관리자</span>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg">⌂</Link>
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
                  {workers.map((worker) => (
                    <span key={worker} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-slate-200">{worker}</span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTranscriptVisible(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white hover:bg-blue-400"
              >
                음성 TBM 녹음 시작
              </button>
              {transcriptVisible && (
                <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                  <p className="text-sm font-black text-blue-100">샘플 텍스트 변환 완료</p>
                  <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={7} className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white" />
                  <p className="mt-3 text-sm font-black text-blue-100">샘플 저장 완료</p>
                  <p className="mt-1 text-xs leading-5 text-blue-100/80">실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-black text-blue-300">현장참여 4단계 현황</p>
              <div className="mt-4 space-y-3">
                {participation.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-sm font-black leading-6 text-slate-100">{item.label}</p>
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-black text-blue-200">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">미확인 근로자</p>
                <p className="mt-2 text-base font-black text-white">샘플근로자 D</p>
              </div>
              <button
                type="button"
                onClick={() => setParticipationChecked(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white hover:bg-blue-400"
              >
                참여현황 확인 완료
              </button>
              {participationChecked && <p className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 text-sm font-black text-blue-100">참여현황 확인 완료</p>}
            </div>
          )}

          {step === 2 && (
            <div>
              <article className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-5">
                <p className="text-sm font-black text-rose-200">제보접수 카드</p>
                <h2 className="mt-2 text-xl font-black text-white">안전난간 볼트 풀림</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">조치 전후 사진증빙 흐름을 체험하는 샘플 제보입니다.</p>
              </article>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-4 text-center">
                  <div className="flex h-24 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-slate-400">조치 전 사진</div>
                  <p className="mt-2 text-xs font-black text-slate-300">샘플 박스</p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/70 p-4 text-center">
                  <div className={`flex h-24 items-center justify-center rounded-xl text-xs font-black ${afterPhotoDone ? "bg-blue-500/20 text-blue-100" : "bg-slate-900 text-slate-400"}`}>{afterPhotoDone ? "업로드 완료" : "조치 후 사진"}</div>
                  <p className="mt-2 text-xs font-black text-slate-300">샘플 박스</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAfterPhotoDone(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white hover:bg-blue-400"
              >
                조치 후 사진 촬영(체험)
              </button>
              {afterPhotoDone && (
                <div className="mt-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                  <p className="text-sm font-black text-blue-100">조치 후 업로드 완료</p>
                  <p className="mt-1 text-sm font-black text-blue-100">화면상 조치이력 샘플이 기록되었습니다</p>
                  <p className="mt-2 text-sm font-black text-white">샘플 저장 완료</p>
                  <p className="mt-1 text-xs leading-5 text-blue-100/80">실제 파일 업로드는 없으며 실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-5">
                <p className="text-sm font-black text-blue-200">현장비서 요약 카드</p>
                <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-slate-100">
                  <li>• TBM 완료 · 참여 4명 전원</li>
                  <li>• 공유확인 3/4명 완료</li>
                  <li>• 제보 1건 · 조치완료</li>
                  <li>• 조치사진 1건 증빙 완료</li>
                </ul>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <p className="text-sm font-black text-amber-100">추천 조치</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-100">남은 공유확인 미완료자는 점심 전 재안내 권장</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="rounded-3xl border border-blue-500/30 bg-blue-950/20 p-5 text-center">
                <p className="text-sm font-black text-blue-200">현장관리자 체험 완료</p>
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
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 bg-slate-950/95 pb-3 pt-2">
          {step === 0 && (
            <button type="button" onClick={() => setStep(1)} disabled={!transcriptVisible} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">TBM 완료, 다음 단계</button>
          )}
          {step === 1 && (
            <button type="button" onClick={() => setStep(2)} disabled={!participationChecked} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">다음: 사진증빙</button>
          )}
          {step === 2 && (
            <button type="button" onClick={() => setStep(3)} disabled={!afterPhotoDone} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">다음: 현장비서</button>
          )}
          {step === 3 && (
            <button type="button" onClick={() => setStep(4)} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-400">체험 완료</button>
          )}
          {step === 4 && (
            <Link href="/partner-demo" className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-950/40 hover:bg-blue-400">다른 역할도 체험해보세요</Link>
          )}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
