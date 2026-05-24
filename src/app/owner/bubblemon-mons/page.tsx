import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  SAMPLE_BUBBLEMON_MONS_RELATION,
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_MONS_CONTRACTOR_SUBMISSIONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorRelationSummary,
  getContractorSubmissionSummary,
} from "@/lib/contractorRelation";

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

const relation = SAMPLE_BUBBLEMON_MONS_RELATION;
const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;
const summary = getContractorRelationSummary(relation);
const submissionItems = SAMPLE_MONS_CONTRACTOR_SUBMISSIONS;
const submissionSummary = getContractorSubmissionSummary(submissionItems);

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
          <h1 className="mt-2 text-3xl font-black">버블몬 × 몬스 물류업 안전운영 계약 준비</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            ㈜버블몬코리아를 원청 고객사로, 몬스를 협력사로 두고 TBM, 점검·교육,
            위험성평가 공유기록, 교육·이수증빙, 조치 증빙, 월간보고서 운영 범위를 확인합니다.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <h2 className="text-lg font-black text-emerald-200">계약 구조 기준</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm font-black text-white">일반 고객사 계약</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                대도환경·동우환경·한국그린환경과 같은 SafeMetrica 고객사 운영 계약 구조입니다.
              </p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm font-black text-white">물류업 원청·협력사</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                버블몬은 원청, ㈜몬스는 협력사로 두고 물류업 안전운영 기록을 관리합니다.
              </p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-sm font-black text-white">EduLink와 별도</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                교육기관 제휴형 EduLink가 아니라, 모든 고객사 공통 기능을 적용하는 일반 SaaS 계약입니다.
              </p>
            </article>
          </div>
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


        <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-200">MONS Submit App</p>
              <h2 className="mt-1 text-xl font-black text-white">㈜몬스 작업자 제한 제출 앱</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                몬스에는 버블몬 전체 운영 홈을 제공하지 않고, 작업 제출 전용 링크만 제공합니다.
                실제 전달 링크는 MONS_CONTRACTOR_TOKEN 환경변수를 붙인 제한 링크로 발급합니다.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-slate-950 px-4 py-3 text-xs font-bold text-cyan-100">
              /contractor/mons?token=[환경변수]
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-cyan-200">MONS Partner Submission</p>
              <h2 className="mt-1 text-xl font-black text-white">몬스 제한 제출 현황</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                몬스에는 전체 운영 링크를 제공하지 않고, TBM·작업 전후 사진·교육증빙·위험성평가 공유확인·조치 전후 사진만
                제출할 수 있는 제한 제출 구조로 관리합니다.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-slate-950 px-4 py-3 text-sm text-cyan-100">
              제출률 {submissionSummary.submissionRate}%
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-6">
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">제출 항목</p>
              <p className="mt-2 text-2xl font-black text-white">{submissionSummary.totalItems}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">제출 완료</p>
              <p className="mt-2 text-2xl font-black text-emerald-300">{submissionSummary.submittedCount}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">제출 대기</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{submissionSummary.pendingCount}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">원청 확인</p>
              <p className="mt-2 text-2xl font-black text-emerald-300">{submissionSummary.reviewConfirmedCount}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">원청 미검토</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{submissionSummary.reviewPendingCount}</p>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">EB 필요</p>
              <p className="mt-2 text-2xl font-black text-blue-300">{submissionSummary.evidenceBookRequiredCount}</p>
            </article>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-slate-300">
                <tr>
                  <th className="px-4 py-3">제출 항목</th>
                  <th className="px-4 py-3">㈜몬스 제출</th>
                  <th className="px-4 py-3">버블몬 검토</th>
                  <th className="px-4 py-3">필요 증빙</th>
                  <th className="px-4 py-3">다음 조치</th>
                </tr>
              </thead>
              <tbody>
                {submissionItems.map((item) => (
                  <tr key={item.id} className="border-t border-slate-700 align-top">
                    <td className="px-4 py-3">
                      <p className="font-black text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                      {item.restrictedLinkOnly ? (
                        <p className="mt-2 inline-flex rounded-full border border-cyan-400/30 px-2 py-1 text-xs font-bold text-cyan-200">
                          제한 제출
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-300">{item.contractorSubmissionStatus}</td>
                    <td className="px-4 py-3 font-bold text-slate-200">{item.principalReviewStatus}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <ul className="space-y-1">
                        {item.requiredEvidence.map((evidence) => (
                          <li key={evidence}>• {evidence}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{item.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            기준: 협력사 제출상태와 원청 검토상태는 분리합니다. TBM 활동 증빙이 있어도 작업·조치 이행 증빙이 충분하다고 자동 확정하지 않습니다.
          </p>
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

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-xl font-black">모든 고객사 공통 적용 기능</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
            <li>• 점검·교육 기록관리</li>
            <li>• 위험성평가 실시·근로자 참여·결과 공유 기록</li>
            <li>• 법정교육 이수증·수료증·출석부 증빙관리</li>
            <li>• TBM 교육기록 및 작업 전 위험요인 공유 기록</li>
            <li>• Evidence Book 및 조치 전·후 사진 증빙</li>
            <li>• 월간 안전운영 보고서</li>
          </ul>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5">
          <h2 className="text-lg font-black text-blue-200">계약 전 확인 문구</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            SafeMetrica는 법정교육기관을 대체하지 않으며, 원청과 협력사의 안전운영 기록,
            위험성평가 공유기록, 교육·이수증빙, TBM, 조치 증빙, 월간보고서 관리를 체계화하도록 지원합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
