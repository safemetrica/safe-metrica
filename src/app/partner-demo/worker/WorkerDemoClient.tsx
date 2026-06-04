"use client";

import Link from "next/link";
import { useState } from "react";

const steps = ["음성 TBM 참여", "위험성평가 공유확인", "위험제보", "완료"];
const risks = [
  { title: "지게차 후진 중 보행자 충돌", control: "보행 통로 분리, 후진 경고음 확인, 신호수와 눈 맞춤" },
  { title: "적재물 낙하", control: "적재 높이 확인, 결속 상태 점검, 하부 접근 제한" },
  { title: "폭염 시 온열질환", control: "물 섭취, 휴식 시간 준수, 어지러움 발생 시 즉시 알림" },
];
const reportTypes = ["위험제보", "아차사고", "개선제안"];

export default function WorkerDemoClient() {
  const [step, setStep] = useState(0);
  const [tbmConfirmed, setTbmConfirmed] = useState(false);
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [reportType, setReportType] = useState(reportTypes[0]);
  const [location, setLocation] = useState("창고 출입구 앞 보행 통로");
  const [content, setContent] = useState("지게차 이동 구역 주변 적재물을 정리하면 보행자 동선 확인이 더 쉬울 것 같습니다.");

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="rounded-[1.75rem] border border-emerald-500/30 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-emerald-200">← 뒤로</Link>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-950/40 px-3 py-1 text-xs font-black text-emerald-200">근로자</span>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg">⌂</Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-400">STEP {step + 1} / {steps.length}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{steps[step]}</h1>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5 shadow-xl">
          {step === 0 && (
            <div>
              <p className="text-sm font-black text-emerald-300">오늘의 TBM 카드</p>
              <div className="mt-4 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5">
                <p className="text-xs font-black text-slate-400">샘플 현장명</p>
                <h2 className="mt-1 text-xl font-black text-white">SafeMetrica 샘플 현장</h2>
                <p className="mt-4 text-xs font-black text-slate-400">샘플 작업</p>
                <p className="mt-1 text-base font-bold leading-7 text-slate-100">창고 입출고 및 지게차 상하차</p>
              </div>
              <button
                type="button"
                onClick={() => setTbmConfirmed(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-white hover:bg-emerald-400"
              >
                음성 TBM 듣기
              </button>
              {tbmConfirmed && (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <p className="text-sm font-black text-emerald-100">음성 안내 확인 완료</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/80">실제 오디오 재생 없이 화면 상태로만 확인됩니다.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm font-black text-emerald-300">주요 위험요인 3개</p>
              <div className="mt-4 space-y-3">
                {risks.map((risk, index) => (
                  <article key={risk.title} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
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
                onClick={() => setShareConfirmed(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-white hover:bg-emerald-400"
              >
                공유확인 완료하기
              </button>
              {shareConfirmed && (
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <p className="text-sm font-black text-emerald-100">전자확인 완료</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-100/80">샘플 서명 상태가 화면에만 표시됩니다.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-sm font-black text-emerald-300">현장 의견 샘플 입력</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {reportTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReportType(type)}
                    className={`rounded-full border px-4 py-2 text-sm font-black ${reportType === type ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-700 bg-slate-950 text-slate-300"}`}
                  >
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
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                <p className="text-sm font-black text-emerald-200">근로자 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black text-white">샘플 공유확인이 완료되었습니다.</h2>
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-slate-950/50 p-4">
                  <p className="text-base font-black text-white">샘플 저장 완료</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-emerald-100">실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">생성된 운영기록</p>
                <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-300">
                  <li>• TBM 확인 기록</li>
                  <li>• 위험성평가 공유확인 기록</li>
                  <li>• 현장 의견 샘플</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 bg-slate-950/95 pb-3 pt-2">
          {step < 2 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !tbmConfirmed : !shareConfirmed}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              다음 단계
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-400"
            >
              제보 제출하기
            </button>
          )}
          {step === 3 && (
            <Link href="/partner-demo" className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-400">
              다른 역할도 체험해보세요
            </Link>
          )}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
