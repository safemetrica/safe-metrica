import { redirect } from "next/navigation";

import {
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_MONS_CONTRACTOR_SUBMISSIONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorSubmissionSummary,
} from "@/lib/contractorRelation";

type PageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

function isMonsContractorTokenValid(token?: string) {
  const expectedToken = process.env.MONS_CONTRACTOR_TOKEN;
  return Boolean(expectedToken && token === expectedToken);
}

const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;
const submissionItems = SAMPLE_MONS_CONTRACTOR_SUBMISSIONS;
const submissionSummary = getContractorSubmissionSummary(submissionItems);

function getSubmitButtonLabel(itemType: string) {
  if (itemType === "TBM") return "TBM 제출";
  if (itemType === "작업 전후 사진") return "사진 제출";
  if (itemType === "교육·서명·출석") return "교육증빙 제출";
  if (itemType === "위험성평가 공유 확인") return "공유 확인";
  if (itemType === "조치 전후 사진") return "조치사진 제출";
  return "제출";
}

export default async function MonsContractorSubmitPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (!isMonsContractorTokenValid(params.token)) {
    redirect("/login?error=invalid_contractor_token");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-5 shadow-2xl">
          <p className="text-xs font-bold text-cyan-300">SafeMetrica Contractor Submit</p>
          <h1 className="mt-2 text-2xl font-black">몬스 작업 제출</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {contractor.name}는 {principal.name} 현장의 하청·협력업체로서 작업 전 TBM, 작업 전후 사진,
            교육·서명·출석, 위험성평가 공유 확인, 조치 전후 사진만 제출합니다.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-sm font-bold text-slate-300">오늘 제출 현황</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">전체</p>
                <p className="mt-1 text-2xl font-black">{submissionSummary.totalItems}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">완료</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{submissionSummary.submittedCount}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">대기</p>
                <p className="mt-1 text-2xl font-black text-amber-300">{submissionSummary.pendingCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {submissionItems.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-sm font-black text-cyan-200">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>

                  <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
                    <p className="text-xs font-bold text-slate-400">필요 증빙</p>
                    <ul className="mt-2 space-y-1 text-sm leading-5 text-slate-300">
                      {item.requiredEvidence.map((evidence) => (
                        <li key={evidence}>• {evidence}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full border border-amber-400/30 px-2 py-1 text-amber-200">
                      몬스: {item.contractorSubmissionStatus}
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

                  <button
                    type="button"
                    className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30"
                  >
                    {getSubmitButtonLabel(item.itemType)}
                  </button>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    실제 파일 업로드 저장은 다음 단계에서 연결합니다. 현재 화면은 몬스 제한 제출 앱 구조 확인용입니다.
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
          <h2 className="text-base font-black text-amber-200">제출 기준</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            TBM 활동 증빙이 있어도 작업·조치 이행 증빙이 충분하다고 자동 확정하지 않습니다.
            제출자료는 버블몬 원청 또는 SafeMetrica 관리자가 확인합니다.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="text-base font-black">제한 앱 안내</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <li>• 이 화면은 몬스 제출 전용 화면입니다.</li>
            <li>• 버블몬 전체 운영 홈, 위험성평가표, 월간보고서, Evidence Book 전체 목록은 제공하지 않습니다.</li>
            <li>• 제출 항목은 버블몬 원청의 확인 대상입니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
