"use client";
import KoshaCompanyStatus from "@/components/KoshaCompanyStatus";
import Link from "next/link";
import { useMemo, useState } from "react";

type Status = "pass" | "fail" | null;

type AuditArea = {
  id: string;
  title: string;
  max: number;
  current: number;
  weight: number;
  weightLabel: string;
  note: string;
};

type Gate = {
  id: number;
  area: string;
  group: string;
  label: string;
  evidence: string;
  risk: "최고" | "높음" | "중" | "낮음";
  priority: "P1" | "P2" | "P3";
};

const PASS_SCORE = 90;

const AUDIT_AREAS: AuditArea[] = [
  {
    id: "owner",
    title: "Ⅰ. 사업주의 관심도",
    max: 100,
    current: 97,
    weight: 10,
    weightLabel: "10점 반영",
    note: "방침·목표, 조직 구성, 교육, 예산, 사업주 노력",
  },
  {
    id: "execution",
    title: "Ⅱ. 위험성평가 실행수준",
    max: 100,
    current: 80,
    weight: 60,
    weightLabel: "60점 반영",
    note: "계획 수립, 위험요인 파악, 감소대책, 이행확인, 정기·수시평가",
  },
  {
    id: "participation",
    title: "Ⅲ. 구성원의 참여 및 이해 수준",
    max: 100,
    current: 86,
    weight: 25,
    weightLabel: "25점 반영",
    note: "사업주·관리자·근로자 참여와 이해 수준",
  },
  {
    id: "accident",
    title: "Ⅳ. 재해발생 수준",
    max: 100,
    current: 100,
    weight: 5,
    weightLabel: "5점 반영",
    note: "동일 업종·규모 대비 재해율",
  },
];

const TOP_FIXES = [
  {
    title: "수립한 위험성 감소대책의 이행",
    area: "Ⅱ. 위험성평가 실행수준",
    reason: "(주)**기업 결과서에서 20점 중 10점으로 감점 폭이 큼",
    action: "완료 항목은 전사진·후사진·완료일을 연결",
    badge: "최우선",
  },
  {
    title: "정기·수시평가 실시",
    area: "Ⅱ. 위험성평가 실행수준",
    reason: "10점 중 5점으로 감점. 정비·수리 전 수시평가가 핵심",
    action: "프레스·기계설비 정비 전 수시평가 1건 생성",
    badge: "P1",
  },
  {
    title: "순회점검 시 해당 공정 근로자 동행",
    area: "Ⅱ. 위험성평가 실행수준",
    reason: "사업장 순회점검 기록에 근로자 동행 증빙 필요",
    action: "점검표에 동행자 이름·공정·서명 필드 추가",
    badge: "P1",
  },
  {
    title: "불참자 추가교육 기록",
    area: "Ⅰ. 사업주의 관심도",
    reason: "교육 실시 자체보다 불참자 보완교육 일지 보존이 중요",
    action: "불참자 명단 포함 추가교육 일지 1장 보존",
    badge: "P2",
  },
  {
    title: "개선 완료 후 유지점검",
    area: "Ⅲ. 구성원의 참여 및 이해 수준",
    reason: "개선사항이 유지되는지 반기 1회 이상 확인 필요",
    action: "반기 유지점검 체크 + 현장 사진 1장 연결",
    badge: "P2",
  },
];

const GATES: Gate[] = [
  {
    id: 1,
    area: "Ⅰ. 사업주의 관심도",
    group: "A. 체계·교육",
    label: "안전보건관리담당자 지정 + 교육이수 증빙",
    evidence: "지정서 1장 + 교육이수 확인 1건",
    risk: "중",
    priority: "P2",
  },
  {
    id: 2,
    area: "Ⅰ. 사업주의 관심도",
    group: "A. 체계·교육",
    label: "위험성평가 교육 후 불참자 추가교육 기록",
    evidence: "추가교육 일지 1장",
    risk: "중",
    priority: "P2",
  },
  {
    id: 3,
    area: "Ⅰ. 사업주의 관심도",
    group: "A. 체계·교육",
    label: "위험성평가 방침·목표 대표 명의 서명 게시",
    evidence: "서명본 1장 + 게시 사진 1장",
    risk: "중",
    priority: "P2",
  },
  {
    id: 4,
    area: "Ⅱ. 위험성평가 실행수준",
    group: "B. 근로자 참여",
    label: "순회점검 시 해당 공정 근로자 1명 이상 동행 기록",
    evidence: "동행자 필드가 있는 점검기록 1장",
    risk: "중",
    priority: "P1",
  },
  {
    id: 5,
    area: "Ⅲ. 구성원의 참여 및 이해 수준",
    group: "B. 근로자 참여",
    label: "근로자 의견청취 기록 누적",
    evidence: "설문·면담·현장 의견함 접수 내역 1건 이상",
    risk: "중",
    priority: "P3",
  },
  {
    id: 6,
    area: "Ⅱ. 위험성평가 실행수준",
    group: "C. 이행확인",
    label: "완료 처리된 감소대책 전/후 증빙",
    evidence: "전사진 1장 + 후사진 1장 또는 점검표 1장",
    risk: "최고",
    priority: "P1",
  },
  {
    id: 7,
    area: "Ⅱ. 위험성평가 실행수준",
    group: "C. 이행확인",
    label: "장기과제 잠정대책 증빙",
    evidence: "잠정대책 공지·표지·가설물 사진 1장",
    risk: "최고",
    priority: "P1",
  },
  {
    id: 8,
    area: "Ⅲ. 구성원의 참여 및 이해 수준",
    group: "C. 이행확인",
    label: "개선 완료 후 반기 1회 이상 유지점검 기록",
    evidence: "유지점검 체크 1건 + 현장 확인 사진 1장",
    risk: "높음",
    priority: "P2",
  },
  {
    id: 9,
    area: "Ⅱ. 위험성평가 실행수준",
    group: "D. 지속적 개선",
    label: "수시평가 트리거 발생 시 수시평가 기록",
    evidence: "정비·수리·설비변경 작업 전 수시평가 1건",
    risk: "높음",
    priority: "P1",
  },
  {
    id: 10,
    area: "Ⅲ. 구성원의 참여 및 이해 수준",
    group: "E. 현장 적합성",
    label: "외국인 근로자 다국어 표지·안내 부착",
    evidence: "주요 위험점 다국어 표지 부착 사진 1장",
    risk: "낮음",
    priority: "P3",
  },
  {
    id: 11,
    area: "Ⅰ. 사업주의 관심도",
    group: "F. 경영진 참여",
    label: "대표·임원 위험성평가 회의 연 1회 이상 참석 기록",
    evidence: "회의록 1장 + 대표 서명 또는 참석 확인",
    risk: "높음",
    priority: "P2",
  },
];

const GROUPS = Array.from(new Set(GATES.map((gate) => gate.group)));

const riskClass: Record<Gate["risk"], string> = {
  최고: "bg-red-100 text-red-700 border-red-200",
  높음: "bg-orange-100 text-orange-700 border-orange-200",
  중: "bg-yellow-100 text-yellow-700 border-yellow-200",
  낮음: "bg-slate-100 text-slate-600 border-slate-200",
};

const priorityClass: Record<Gate["priority"], string> = {
  P1: "bg-red-600 text-white",
  P2: "bg-orange-500 text-white",
  P3: "bg-slate-500 text-white",
};

export default function KoshaPage() {
  const [status, setStatus] = useState<Record<number, Status>>(
    Object.fromEntries(GATES.map((gate) => [gate.id, null]))
  );

  const toggle = (id: number) => {
    setStatus((prev) => ({
      ...prev,
      [id]: prev[id] === "pass" ? "fail" : prev[id] === "fail" ? null : "pass",
    }));
  };

  const passed = useMemo(
    () => GATES.filter((gate) => status[gate.id] === "pass"),
    [status]
  );

  const failed = useMemo(
    () => GATES.filter((gate) => status[gate.id] === "fail"),
    [status]
  );

  const checked = passed.length + failed.length;
  const passRate = checked === 0 ? 0 : Math.round((passed.length / checked) * 100);
  const totalScore = Math.round(AUDIT_AREAS.reduce((sum, a) => sum + (a.current * a.weight) / 100, 0));
  const gap = Math.max(PASS_SCORE - totalScore, 0);
  
  return (
    <main className="min-h-screen bg-[#F6F8FB] pb-16 text-slate-900">
      <header className="bg-[#0F2D5E] text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
          <Link
  href="/dashboard"
  className="rounded-lg px-2 py-1 text-blue-100 hover:bg-white/10"
>
  ←
</Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">KOSHA 인정심사 사전점검</h1>
            <p className="mt-0.5 text-xs text-blue-200">
              위험성평가 우수사업장 인정 · 공식 4대 심사영역 + 11 Gate
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-5">
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">(주)**기업 결과서 기준 예시</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-black text-slate-900">{totalScore}</span>
                  <span className="pb-1 text-sm font-medium text-slate-500">점 / 100점</span>
                </div>
              </div>
              <div className="rounded-xl bg-orange-50 px-4 py-3 text-right">
                <p className="text-xs font-semibold text-orange-700">인정 기준 90점</p>
                <p className="mt-1 text-2xl font-black text-orange-700">{gap}점 부족</p>
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${totalScore}%` }} />
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-400">
              <span>0점</span>
              <span className="font-semibold text-orange-500">현재 {totalScore}점</span>
              <span className="font-semibold text-green-600">90점 이상 인정</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              현재 예시는 인정 기준 90점에 6점 부족한 상태입니다. 특히
              <strong className="text-slate-900"> 위험성평가 실행수준</strong>과
              <strong className="text-slate-900"> 이행확인</strong> 항목을 우선 보완해야 합니다.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0F2D5E] p-5 text-white shadow-sm">
            <p className="text-xs font-semibold text-blue-200">체크 진행 현황</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-blue-200">PASS</p>
                <p className="mt-1 text-2xl font-black">{passed.length}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-blue-200">FAIL</p>
                <p className="mt-1 text-2xl font-black">{failed.length}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-blue-200">체크율</p>
                <p className="mt-1 text-2xl font-black">{passRate}%</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-blue-100">
              각 Gate를 클릭하면 PASS → FAIL → 미체크 순서로 전환됩니다. FAIL 항목은 Evidence Book 또는 실행 DB에서 증빙으로 닫아야 합니다.
            </p>
          </div>
        </div>

        <section className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-slate-700">공식 4대 심사영역</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {AUDIT_AREAS.map((area) => (
              <div key={area.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-500">{area.title}</p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-black text-slate-900">{area.current}</span>
                  <span className="pb-1 text-xs text-slate-400">/ {area.max}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-blue-700">{area.weightLabel} · 기여 {Math.round(area.current * area.weight / 100)}점</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{area.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">우선 보완 TOP 5</h2>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              90점 달성 핵심
            </span>
          </div>
          <div className="space-y-3">
            {TOP_FIXES.map((item, index) => (
              <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F2D5E] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.area} · {item.reason}</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">조치: {item.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-slate-700">11 Gate 원자단위 체크리스트</h2>

          <div className="space-y-5">
            {GROUPS.map((group) => (
              <div key={group}>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {group}
                </p>
                <div className="space-y-2">
                  {GATES.filter((gate) => gate.group === group).map((gate) => {
                    const current = status[gate.id];

                    return (
                      <button
                        key={gate.id}
                        onClick={() => toggle(gate.id)}
                        className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                          current === "pass"
                            ? "border-green-200 bg-green-50"
                            : current === "fail"
                            ? "border-red-200 bg-red-50"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              current === "pass"
                                ? "bg-green-600 text-white"
                                : current === "fail"
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {current === "pass" ? "✓" : current === "fail" ? "!" : gate.id}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-800">{gate.label}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityClass[gate.priority]}`}>
                                {gate.priority}
                              </span>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskClass[gate.risk]}`}>
                                {gate.risk}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{gate.area}</p>
                            <p className="mt-2 text-xs font-medium text-slate-700">최소 증빙: {gate.evidence}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-900">운영 원칙</p>
          <p className="mt-2 text-xs leading-relaxed text-blue-800">
            이 화면은 법률 자문이나 인정 취득 보장을 의미하지 않습니다. 목적은 현장심사 전 누락 항목을 조기에 발견하고,
            TBM·Evidence Book·PTW·유지점검 기록으로 PASS 증빙을 닫는 것입니다.
          </p>
        </section>
      </section>
    </main>
  );
}