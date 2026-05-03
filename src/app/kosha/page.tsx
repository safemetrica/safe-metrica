"use client";
import { useState } from "react";
import Link from "next/link";

const GATES = [
  { id: 1, group: "A. 체계·교육", label: "안전보건관리담당자 지정 + 교육이수 증빙", evidence: "지정서 1장 + 교육이수 확인 1건", score: 20, risk: "중" },
  { id: 2, group: "A. 체계·교육", label: "위험성평가 교육 후 불참자 추가교육 기록", evidence: "추가교육 일지 1장 (불참자 체크 포함)", score: 20, risk: "중" },
  { id: 3, group: "A. 체계·교육", label: "위험성평가 방침·목표 대표 명의 서명 게시", evidence: "서명본 1장 + 게시 사진 1장", score: 15, risk: "중" },
  { id: 4, group: "B. 근로자 참여", label: "순회점검 시 해당 공정 근로자 1명 이상 동행 기록", evidence: "점검기록 1장 (동행자 필드 포함)", score: 15, risk: "중" },
  { id: 5, group: "B. 근로자 참여", label: "근로자 의견청취 기록 누적", evidence: "설문/면담/의견함 접수 내역 1건 이상", score: 15, risk: "중" },
  { id: 6, group: "C. 이행확인", label: "완료 처리된 감소대책 전/후 증빙(사진/점검표)", evidence: "전/후 사진 2장 또는 점검표 1장", score: 30, risk: "최고" },
  { id: 7, group: "C. 이행확인", label: "장기과제 잠정대책(임시 통제) 증빙", evidence: "잠정대책 공지/표지/가설물 사진 1장", score: 30, risk: "최고" },
  { id: 8, group: "C. 이행확인", label: "개선 완료 후 반기 1회 이상 유지점검 기록", evidence: "유지점검 체크 1건 + 현장 확인 사진 1장", score: 20, risk: "높음" },
  { id: 9, group: "D. 지속적 개선", label: "수시평가 트리거 발생 시 수시평가 기록", evidence: "수시평가 1건 (작업 전)", score: 20, risk: "높음" },
  { id: 10, group: "E. 현장 적합성", label: "외국인 근로자 다국어 표지/안내 부착 (해당 시)", evidence: "다국어 표지 부착 사진 1장", score: 15, risk: "낮음" },
  { id: 11, group: "E. 현장 적합성", label: "대표/임원 위험성평가 회의 연 1회 이상 참석 기록", evidence: "회의록 1장 + 대표 서명 또는 참석 확인", score: 15, risk: "높음" },
];

const RISK_COLOR: Record<string, string> = {
  "최고": "bg-red-950 text-red-400 border-red-800",
  "높음": "bg-orange-950 text-orange-400 border-orange-800",
  "중": "bg-yellow-950 text-yellow-400 border-yellow-800",
  "낮음": "bg-gray-800 text-gray-400 border-gray-700",
};

const GROUPS = [...new Set(GATES.map(g => g.group))];

export default function KoshaPage() {
  const [status, setStatus] = useState<Record<number, "pass" | "fail" | null>>(
    Object.fromEntries(GATES.map(g => [g.id, null]))
  );

  const toggle = (id: number) => {
    setStatus(prev => ({
      ...prev,
      [id]: prev[id] === "pass" ? "fail" : prev[id] === "fail" ? null : "pass",
    }));
  };

  const passed = GATES.filter(g => status[g.id] === "pass");
  const failed = GATES.filter(g => status[g.id] === "fail");
  const score = passed.reduce((s, g) => s + g.score, 0);
  const maxScore = GATES.reduce((s, g) => s + g.score, 0);
  const pct = Math.round((score / maxScore) * 100);
  const checked = passed.length + failed.length;

  return (
    <main className="min-h-screen bg-gray-950 pb-24">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-white transition text-lg">←</Link>
        <div>
          <h1 className="text-white font-bold text-base leading-tight">🏆 KOSHA 인정심사 체크리스트</h1>
          <p className="text-gray-500 text-xs">위험성평가 우수사업장 인정 · 11개 Gate</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className={`rounded-2xl p-4 border ${score >= 90 ? "bg-green-950 border-green-800" : score >= 70 ? "bg-yellow-950 border-yellow-800" : "bg-gray-900 border-gray-700"}`}>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">현재 예상 점수</p>
              <p className="text-white text-4xl font-black">{checked === 0 ? "--" : score}<span className="text-gray-500 text-lg font-normal">점</span></p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${score >= 90 ? "text-green-400" : score >= 70 ? "text-yellow-400" : "text-gray-400"}`}>
                {checked === 0 ? "체크 시작" : score >= 90 ? "✅ 인정 가능" : score >= 70 ? "⚠️ 보완 필요" : "❌ 미달"}
              </p>
              <p className="text-gray-600 text-xs mt-0.5">{checked}/{GATES.length} 항목 체크됨</p>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${score >= 90 ? "bg-green-500" : score >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${checked === 0 ? 0 : pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0점</span>
            <span className="text-yellow-600">70점</span>
            <span className="text-green-600">90점 (인정)</span>
          </div>
        </div>

        {failed.length > 0 && (
          <div className="mt-3 bg-red-950 border border-red-900 rounded-xl p-3">
            <p className="text-red-400 text-xs font-bold mb-1">🚨 FAIL {failed.length}개 — 즉시 보완 필요</p>
            {failed.map(g => (
              <p key={g.id} className="text-red-300 text-xs">· Gate {g.id}: {g.label}</p>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-4">
        {GROUPS.map(group => (
          <div key={group}>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">{group}</p>
            <div className="space-y-2">
              {GATES.filter(g => g.group === group).map(gate => {
                const s = status[gate.id];
                return (
                  <button
                    key={gate.id}
                    onClick={() => toggle(gate.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      s === "pass" ? "bg-green-950 border-green-800" :
                      s === "fail" ? "bg-red-950 border-red-800" :
                      "bg-gray-900 border-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                        s === "pass" ? "bg-green-500 border-green-400 text-white" :
                        s === "fail" ? "bg-red-500 border-red-400 text-white" :
                        "bg-gray-800 border-gray-600 text-gray-500"
                      }`}>
                        {s === "pass" ? "✓" : s === "fail" ? "✗" : gate.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium leading-relaxed mb-1">{gate.label}</p>
                        <p className="text-gray-500 text-xs">📎 {gate.evidence}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-white text-xs font-bold mb-1">{gate.score}점</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${RISK_COLOR[gate.risk]}`}>{gate.risk}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs leading-relaxed">
            💡 <strong className="text-white">사용법:</strong> 각 Gate를 탭 → PASS(초록) → FAIL(빨강) → 미체크 순으로 전환됩니다. 90점 이상이면 인정심사 통과 가능성이 높습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
