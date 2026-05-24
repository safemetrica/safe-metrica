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
import {
  extractEvidenceUrls,
  fetchContractorSubmissionRecords,
  getContractorSubmissionRecordSummary,
  getEvidenceMemoWithoutUrls,
} from "@/lib/contractorSubmissionRecords";

export const dynamic = "force-dynamic";

const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;
const relation = SAMPLE_BUBBLEMON_MONS_RELATION;
const submissionItems = SAMPLE_MONS_CONTRACTOR_SUBMISSIONS;
const summary = getContractorSubmissionSummary(submissionItems);

type PageProps = {
  searchParams: Promise<{
    review?: string;
    status?: string;
    detail?: string;
  }>;
};

export default async function ContractorStatusPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const company = await getCompanyConfig().catch(() => null);
  const submissionStore = await fetchContractorSubmissionRecords();
  const recordSummary = getContractorSubmissionRecordSummary(submissionStore.records);

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
          <p className="text-xs font-bold text-cyan-300">Principal · Partner Status</p>
          <h1 className="mt-2 text-2xl font-black">협력사 제출현황</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
            {principal.name} 원청 운영 화면에서 {contractor.name}의 TBM·사진·교육증빙·조치사진 제출상태를 확인합니다.
          </p>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-5">
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">제출 항목</p>
            <p className="mt-2 text-3xl font-black">{summary.totalItems}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">최근 접수</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{recordSummary.total}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">원청 미검토</p>
            <p className="mt-2 text-3xl font-black text-amber-300">{recordSummary.principalPendingCount}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">원청 확인</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{recordSummary.principalConfirmedCount}</p>
          </article>
          <article className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
            <p className="text-xs font-bold text-gray-400">보완요청</p>
            <p className="mt-2 text-3xl font-black text-rose-300">{recordSummary.followUpCount}</p>
          </article>
        </section>

        {params.review === "updated" ? (
          <section className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="text-sm font-black text-emerald-200">
              원청 검토 상태가 반영되었습니다.
            </p>
          </section>
        ) : params.review === "notion_error" ? (
          <section className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 p-4">
            <p className="text-sm font-black text-red-200">
              원청 검토 상태 반영 중 오류가 발생했습니다.
            </p>
            <p className="mt-2 text-xs leading-5 text-gray-400">
              {params.status ?? ""} {params.detail ?? ""}
            </p>
          </section>
        ) : params.review === "invalid" ? (
          <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
            <p className="text-sm font-black text-amber-200">
              검토 요청값을 확인해 주세요.
            </p>
          </section>
        ) : null}

        <section className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black">최근 제출자료</h2>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                ㈜몬스가 제출한 자료를 ㈜버블몬코리아 현장관리감독자가 확인하거나 보완요청합니다.
              </p>
            </div>
            <span className="rounded-full border border-cyan-400/30 px-3 py-1 text-xs font-bold text-cyan-200">
              원청 검토
            </span>
          </div>

          {!submissionStore.configured ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
              <p className="text-sm font-bold text-amber-200">
                제출 DB 환경변수 설정 전입니다. NOTION_CONTRACTOR_SUBMISSIONS_DB_ID 설정 후 최근 제출자료가 표시됩니다.
              </p>
            </div>
          ) : submissionStore.errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-sm font-bold text-red-200">제출 DB 조회 확인 필요</p>
              <p className="mt-2 text-xs leading-5 text-gray-400">{submissionStore.errorMessage}</p>
            </div>
          ) : submissionStore.records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-950 p-4">
              <p className="text-sm font-bold text-gray-300">아직 접수된 ㈜몬스 제출자료가 없습니다.</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                몬스가 제출 전용 링크에서 자료를 제출하면 이 영역에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {submissionStore.records.map((record) => (
                <article key={record.id} className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-black text-white">{record.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-400">
                        {record.workDate || "작업일 미입력"} · {record.siteArea || "구역 미입력"} · 제출자 {record.submitterName || "미입력"}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-gray-300">{record.submissionContent}</p>
                      {record.evidenceMemo ? (
                        <div className="mt-2 rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs leading-5 text-gray-300">
                          {getEvidenceMemoWithoutUrls(record.evidenceMemo) ? (
                            <p>증빙 메모: {getEvidenceMemoWithoutUrls(record.evidenceMemo)}</p>
                          ) : (
                            <p className="text-gray-500">증빙 메모 없음</p>
                          )}

                          {extractEvidenceUrls(record.evidenceMemo).length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {extractEvidenceUrls(record.evidenceMemo).map((file, index) => (
                                <a
                                  key={`${file.url}-${index}`}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-gray-950 transition active:scale-95"
                                >
                                  첨부파일 {index + 1} 보기
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-emerald-200">
                          제출: {record.submissionStatus}
                        </span>
                        <span className="rounded-full border border-amber-400/30 px-2 py-1 text-amber-200">
                          원청 검토: {record.principalReviewStatus}
                        </span>
                        <span className="rounded-full border border-blue-400/30 px-2 py-1 text-blue-200">
                          {record.itemType || "제출항목"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
                      <form action="/api/contractor/submissions/review" method="post">
                        <input type="hidden" name="submissionPageId" value={record.id} />
                        <input type="hidden" name="reviewStatus" value="확인" />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-emerald-500 px-4 py-4 text-base font-black text-gray-950 shadow-lg shadow-emerald-950/30 transition active:scale-95"
                        >
                          원청 확인
                        </button>
                      </form>

                      <form action="/api/contractor/submissions/review" method="post">
                        <input type="hidden" name="submissionPageId" value={record.id} />
                        <input type="hidden" name="reviewStatus" value="보완요청" />
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-rose-400/50 px-4 py-4 text-base font-black text-rose-200 shadow-lg shadow-rose-950/20 transition active:scale-95"
                        >
                          보완요청
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-gray-500">
            기준: ㈜몬스 제출완료는 자료 접수이며, 버블몬 원청 확인과 분리됩니다.
          </p>
        </section>


        <section className="mt-4 rounded-2xl border border-gray-700 bg-gray-900 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black">㈜몬스 제출 항목</h2>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                협력사 제출상태와 원청 검토상태는 분리해서 봅니다.
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
                        ㈜몬스 제출: {item.contractorSubmissionStatus}
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
            ㈜몬스는 별도 고객사 테넌트가 아니라 {principal.name} 테넌트 안에서 관리되는 협력사입니다.
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
