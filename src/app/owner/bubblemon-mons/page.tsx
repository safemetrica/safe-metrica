import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SAMPLE_BUBBLEMON_MONS_RELATION,
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorRelationSummary,
} from "@/lib/contractorRelation";

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

const relation = SAMPLE_BUBBLEMON_MONS_RELATION;
const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;
const summary = getContractorRelationSummary(relation);

const statusRows = [
  { label: "TBM 운영", value: relation.tbmStatus },
  { label: "점검·교육", value: relation.inspectionEducationStatus },
  { label: "위험성평가 공유", value: relation.riskAssessmentShareStatus },
  { label: "교육·이수증빙", value: relation.educationEvidenceStatus },
  { label: "조치 증빙", value: relation.actionEvidenceStatus },
  { label: "월간보고서", value: relation.monthlyReportStatus },
];

export default async function BubblemonMonsOwnerPage() {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <a href="/owner" className="text-sm font-bold text-blue-300 hover:text-blue-200">
          ← 관리자 전체앱으로
        </a>

        <section className="mt-4 rounded-3xl border border-blue-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-blue-300">Principal · Contractor</p>
          <h1 className="mt-2 text-3xl font-black">버블몬 × 몬스 원청·하청 계약 준비</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            버블몬코리아를 원청 고객사로, 몬스를 하청·협력업체로 두고 TBM, 점검·교육,
            위험성평가 공유기록, 교육·이수증빙, 조치 증빙, 월간보고서 운영 범위를 확인합니다.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-400">{principal.role}</p>
            <h2 className="mt-1 text-2xl font-black">{principal.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{principal.description}</p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs font-bold text-slate-400">{contractor.role}</p>
            <h2 className="mt-1 text-2xl font-black">{contractor.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{contractor.description}</p>
          </article>

          <article className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5">
            <p className="text-xs font-bold text-amber-200">계약 상태</p>
            <h2 className="mt-1 text-2xl font-black text-white">{relation.status}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              계약 예정일: {relation.contractExpectedDate ?? "확인 필요"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{relation.nextAction}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm font-bold text-slate-400">관리 항목</p>
            <p className="mt-2 text-3xl font-black">{summary.totalManagedItems}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm font-bold text-slate-400">확인</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{summary.confirmedCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm font-bold text-slate-400">대기</p>
            <p className="mt-2 text-3xl font-black text-amber-300">{summary.pendingCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-sm font-bold text-slate-400">보완 필요</p>
            <p className="mt-2 text-3xl font-black text-rose-300">{summary.followUpCount}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-black">운영 범위</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              {relation.workScope.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-black">관리 증빙 항목</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              {relation.managedSafetyItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-xl font-black">현재 상태</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-slate-300">
                <tr>
                  <th className="px-4 py-3">항목</th>
                  <th className="px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-700">
                    <td className="px-4 py-3 font-bold text-white">{row.label}</td>
                    <td className="px-4 py-3 text-amber-300">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5">
          <h2 className="text-lg font-black text-blue-200">계약 전 확인 문구</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            SafeMetrica는 법정교육기관을 대체하지 않으며, 원청과 협력업체의 안전운영 기록,
            위험성평가 공유기록, 교육·이수증빙, TBM, 조치 증빙, 월간보고서 관리를 체계화하도록 지원합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
