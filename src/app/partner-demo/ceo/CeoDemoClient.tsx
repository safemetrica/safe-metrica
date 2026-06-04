"use client";

import Link from "next/link";
import { useState } from "react";

const steps = ["대표 대시보드", "위험성평가표 샘플", "월간보고서", "완료"];
const kpis = [
  { label: "관리 현장", value: "3개소" },
  { label: "금월 TBM", value: "47회" },
  { label: "공유확인율", value: "94%" },
  { label: "미조치", value: "2건" },
];
const sites = [
  { name: "A동 신축공사", status: "정상", rate: "96%" },
  { name: "B동 리모델링", status: "정상", rate: "92%" },
  { name: "C동 기초공사", status: "주의", rate: "78%" },
];
const riskRows = [
  { factor: "추락", level: "상", action: "안전대", status: "완료" },
  { factor: "낙하물", level: "중", action: "방지망", status: "완료" },
  { factor: "감전", level: "중", action: "절연장갑", status: "완료" },
  { factor: "협착", level: "상", action: "방호장치", status: "진행" },
];
const bars = [
  { label: "1주차", value: "10회", width: "45%" },
  { label: "2주차", value: "14회", width: "64%" },
  { label: "3주차", value: "13회", width: "59%" },
  { label: "4주차", value: "10회", width: "45%" },
];

export default function CeoDemoClient() {
  const [step, setStep] = useState(0);
  const [outputNotice, setOutputNotice] = useState(false);
  const [reportNotice, setReportNotice] = useState(false);
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto w-full max-w-[430px]">
        <header className="rounded-[1.75rem] border border-amber-500/30 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/partner-demo" className="text-sm font-black text-amber-200">← 뒤로</Link>
            <span className="rounded-full border border-amber-400/30 bg-amber-950/40 px-3 py-1 text-xs font-black text-amber-200">대표</span>
            <Link href="/partner-demo" aria-label="Partner Demo 홈" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-lg">⌂</Link>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-400">STEP {step + 1} / {steps.length}</p>
          <h1 className="mt-1 text-2xl font-black text-white">{steps[step]}</h1>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-slate-700 bg-slate-900 p-5 shadow-xl">
          {step === 0 && (
            <div>
              <p className="text-sm font-black text-amber-300">대표 대시보드</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {kpis.map((kpi) => (
                  <article key={kpi.label} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs font-bold text-slate-400">{kpi.label}</p>
                    <p className="mt-2 text-2xl font-black text-white">{kpi.value}</p>
                  </article>
                ))}
              </div>
              <div className="mt-5 rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
                <p className="text-sm font-black text-amber-100">현장별 운영현황</p>
                <div className="mt-3 space-y-3">
                  {sites.map((site) => (
                    <div key={site.name} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-white">{site.name}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${site.status === "정상" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"}`}>{site.status}</span>
                      </div>
                      <p className="mt-2 text-xl font-black text-white">{site.rate}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
                <p className="text-sm font-black text-amber-100">위험성평가표 샘플 카드</p>
                <h2 className="mt-2 text-xl font-black text-white">SafeMetrica 샘플 현장</h2>
                <p className="mt-1 text-sm font-bold text-slate-300">2026년 6월</p>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700">
                <div className="grid grid-cols-4 bg-slate-800 text-center text-xs font-black text-slate-300">
                  <span className="p-3">위험요인</span>
                  <span className="p-3">위험도</span>
                  <span className="p-3">조치</span>
                  <span className="p-3">상태</span>
                </div>
                {riskRows.map((row) => (
                  <div key={row.factor} className="grid grid-cols-4 border-t border-slate-700 bg-slate-950/70 text-center text-xs font-bold text-slate-100">
                    <span className="p-3">{row.factor}</span>
                    <span className="p-3">{row.level}</span>
                    <span className="p-3">{row.action}</span>
                    <span className="p-3">{row.status}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOutputNotice(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500 px-5 py-4 text-base font-black text-slate-950 hover:bg-amber-400"
              >
                PDF/Excel 출력 지원(정식 도입 시)
              </button>
              {outputNotice && <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm font-black text-slate-200">실제 다운로드는 없습니다. 출력지원 형태를 보여주는 샘플입니다.</p>}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
                <p className="text-sm font-black text-amber-100">월간 안전운영 보고서 카드</p>
                <h2 className="mt-2 text-xl font-black text-white">TBM 실시 현황</h2>
                <div className="mt-4 space-y-3">
                  {bars.map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-xs font-black text-slate-300"><span>{bar.label}</span><span>{bar.value}</span></div>
                      <div className="mt-1 h-3 rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-400" style={{ width: bar.width }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <article className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">위험제보 및 조치</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">제보 12건 · 조치완료 10건 · 진행중 2건</p>
                </article>
                <article className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">공유확인 이력</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">총 근로자 12명 · 평균 공유확인율 94%</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-400">미확인 사유: 조기퇴근 2건, 현장이동 1건</p>
                </article>
                <article className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                  <p className="text-sm font-black text-white">사진증빙</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-300">조치 전후 사진 10세트 기록 완료</p>
                </article>
              </div>
              <button
                type="button"
                onClick={() => setReportNotice(true)}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500 px-5 py-4 text-base font-black text-slate-950 hover:bg-amber-400"
              >
                PDF 다운로드 지원(정식 도입 시)
              </button>
              {reportNotice && <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm font-black text-slate-200">실제 다운로드는 없습니다. 월간 안전운영 보고서 샘플입니다.</p>}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5 text-center">
                <p className="text-sm font-black text-amber-100">대표 체험 완료</p>
                <h2 className="mt-2 text-2xl font-black text-white">운영기록 확인 흐름을 완료했습니다</h2>
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-slate-950/50 p-4">
                  <p className="text-base font-black text-white">샘플 저장 완료</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-amber-100">실제 고객 DB에는 저장되지 않습니다.</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-sm font-black text-slate-200">대표가 확인할 수 있는 운영기록</p>
                <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-300">
                  <li>• 전체 현장 운영현황 대시보드</li>
                  <li>• 위험성평가표 출력지원 샘플</li>
                  <li>• 월간 안전운영 보고서</li>
                  <li>• 위험제보 및 조치이력 통계</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-0 mt-5 bg-slate-950/95 pb-3 pt-2">
          {step === 0 && <button type="button" onClick={() => setStep(1)} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-950/40 hover:bg-amber-400">다음: 위험성평가표 샘플</button>}
          {step === 1 && <button type="button" onClick={() => setStep(2)} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-950/40 hover:bg-amber-400">다음: 월간보고서 샘플</button>}
          {step === 2 && <button type="button" onClick={() => setStep(3)} className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-950/40 hover:bg-amber-400">체험 완료</button>}
          {step === 3 && <Link href="/partner-demo" className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-amber-500 px-5 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-950/40 hover:bg-amber-400">다른 역할도 체험해보세요</Link>}
          <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-center text-xs font-black text-amber-100">
            체험 모드 · 샘플 데이터 · 실제 고객 DB 미연결
          </p>
        </div>
      </div>
    </main>
  );
}
