import Link from "next/link";
import { redirect } from "next/navigation";

import { getCompanyConfig } from "@/lib/company";
import {
  SAMPLE_BUBBLEMON_MONS_RELATION,
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_MONS_CONTRACTOR_SUBMISSIONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorSubmissionSummary,
} from "@/lib/contractorRelation";

export const dynamic = "force-dynamic";

const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;
const relation = SAMPLE_BUBBLEMON_MONS_RELATION;
const submissionItems = SAMPLE_MONS_CONTRACTOR_SUBMISSIONS;
const summary = getContractorSubmissionSummary(submissionItems);

export default async function ContractorStatusPage() {
  const company = await getCompanyConfig().catch(() => null);

  if (!company) {
    redirect("/login?error=tenant_required");
  }

  if (company.code !== "bubblemon") {
    redirect("/home");
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/home" className="text-sm font-bold text-blue-300 hover:text-blue-200">
          ← 운영 홈으로
        </Link>

        <section className="mt-4 rounded-3xl border border-cyan-500/30 bg-gray-900 p-5 shadow-2xl">
          <p className="text-xs font-bold text-cyan-300">Principal · Contractor Status</p>
          <h1 className="mt-2 text-2xl font-black">하청 제출현황</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
            {principal.name} 원청 운영 화면에서 {contractor.name}의 TBM, 작업 전후 사진,
            교육·서명·출석, 위험성평가 공유 확인, 조치 전후 사진 제출상태를 확인합니다.
          </p>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-5">
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">제출 항목</p>
            <p className="mt-2 text-3xl font-black">{summary.totalItems}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">제출 완료</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{summary.submittedCount}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">제출 대기</p>
            <p className="mt-2 text-3xl font-black text-amber-300">{summary.pendingCount}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">원청 미검토</p>
            <p className="mt-2 text-3xl font-black text-amber-300">{summary.reviewPendingCount}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">EB 필요</p>
            <p className="mt-2 text-3xl font-black text-blue-300">{summary.evidenceBookRequiredCount}</p>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-700 bg-gray-900 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black">몬스 제출 항목</h2>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                하청 제출상태와 원청 검토상태는 분리해서 봅니다.
              </p>
            </div>
            <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs font-bold text-cyan-200">
              제출률 {summary.submissionRate}%
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {submissionItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-base font-black text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">{item.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full border border-amber-400/30 px-2 py-1 text-amber-200">
                        몬스 제출: {item.contractorSubmissionStatus}
                      </span>
                      <span className="rounded-full border border-slate-500/40 px-2 py-1 text-slate-300">
                        버블몬 검토: {item.principalReviewStatus}
                      </span>
                      {item.evidenceBookRequired ? (
                        <span className="rounded-full border border-blue-400/30 px-2 py-1 text-blue-200">
                          EB 연결 대상
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 md:w-72">
                    <p className="text-xs font-bold text-gray-500">필요 증빙</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-gray-300">
                      {item.requiredEvidence.map((evidence) => (
                        <li key={evidence}>• {evidence}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
          <h2 className="text-base font-black text-amber-200">운영 기준</h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">
            몬스는 별도 고객사 테넌트가 아니라 {principal.name} 테넌트 안에서 관리되는 하청·협력업체입니다.
            몬스에는 전체 운영 홈이 아니라 제한 제출 앱만 제공합니다.
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            관계 ID: {relation.id}
          </p>
        </section>
      </div>
    </main>
  );
}
