import Link from "next/link";
import { redirect } from "next/navigation";

import {
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_MONS_CONTRACTOR_SUBMISSIONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorSubmissionSummary,
} from "@/lib/contractorRelation";
import {
  fetchContractorSubmissionRecords,
  getContractorSubmissionRecordSummary,
} from "@/lib/contractorSubmissionRecords";
import { buildDailySafetyBriefing } from "@/lib/dailySafetyBriefing";

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

function getPrincipalReviewBadgeClass(status: string) {
  if (status === "확인") {
    return "border-emerald-400/40 bg-emerald-950/30 text-emerald-200";
  }

  if (status === "보완요청") {
    return "border-rose-400/40 bg-rose-950/30 text-rose-200";
  }

  if (status === "검토중") {
    return "border-blue-400/40 bg-blue-950/30 text-blue-200";
  }

  return "border-amber-400/40 bg-amber-950/30 text-amber-200";
}

function getPrincipalReviewMessage(status: string) {
  if (status === "확인") {
    return "버블몬 원청 확인이 완료되었습니다.";
  }

  if (status === "보완요청") {
    return "버블몬 원청에서 보완요청한 자료입니다. 같은 항목으로 보완 제출해 주세요.";
  }

  if (status === "검토중") {
    return "버블몬 원청 검토가 진행 중입니다.";
  }

  return "버블몬 원청 검토 대기 중입니다.";
}

function getSubmitButtonLabel(itemType: string) {
  if (itemType === "TBM") return "TBM 제출";
  if (itemType === "작업 전후 사진") return "사진 제출";
  if (itemType === "교육·서명·출석") return "교육증빙 제출";
  if (itemType === "위험성평가 공유 확인") return "공유 확인";
  if (itemType === "조치 전후 사진") return "조치사진 제출";
  return "제출";
}

function formatContractorSubmissionStatus(status: string) {
  if (status === "제출대기") return "제출 전";
  if (status === "제출완료") return "제출 완료";
  if (status === "미제출") return "미제출";
  return status;
}

function formatPrincipalReviewStatus(status: string) {
  if (status === "미검토") return "원청 확인 전";
  if (status === "검토중") return "원청 확인 중";
  if (status === "확인") return "원청 확인 완료";
  if (status === "보완요청") return "보완요청";
  return status;
}

export default async function MonsContractorSubmitPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const submissionStore = await fetchContractorSubmissionRecords();
  const recordSummary = getContractorSubmissionRecordSummary(submissionStore.records);
  const hasFollowUpRequest = recordSummary.followUpCount > 0;

  const sharedSafetyBriefing = buildDailySafetyBriefing({
    companyName: "㈜버블몬코리아",
    todayTbmCount: 0,
    ebMissingCount: 0,
    actionNeededCount: 0,
    ptwPendingCount: 0,
    ptwBlockedCount: 0,
    ptwRequiredMissingCount: 0,
    highRiskCount: 0,
    riskActionNeededCount: 0,
    partnerFollowUpCount: recordSummary.followUpCount,
    partnerPendingCount: recordSummary.principalPendingCount,
  });

  const partnerSifFocus = sharedSafetyBriefing.sifFocus[0].includes("별도")
    ? "차량·보행 혼재, 후진 충돌, 상하차 끼임 주의"
    : sharedSafetyBriefing.sifFocus[0];

  const partnerPtwMessage = sharedSafetyBriefing.ptwMessages[0].includes("없음")
    ? "고위험 작업 전 원청 승인 필요 여부 확인"
    : sharedSafetyBriefing.ptwMessages[0];

  const partnerSharedMessages = [
    "작업 전 TBM에서 차량·보행 혼재, 후진 충돌, 상하차 주변 정리상태를 확인해 주세요.",
    ...sharedSafetyBriefing.partnerMessages.filter((message) => !message.includes("신호 없음")),
    "작업 전·후 사진과 필요한 서명·교육 증빙은 세메앱으로 제출해 주세요.",
  ].slice(0, 4);

  const followUpReviewRecords = submissionStore.records
    .filter((record) => record.principalReviewStatus === "보완요청")
    .slice(0, 3);

  if (!isMonsContractorTokenValid(params.token)) {
    redirect("/login?error=invalid_contractor_token");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-5 shadow-2xl">
          <p className="text-xs font-bold text-cyan-300">SafeMetrica 협력사 제출</p>
          <h1 className="mt-2 text-2xl font-black">㈜몬스 작업 제출</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {contractor.name}는 {principal.name} 현장에서 오늘 공유사항을 확인하고,
            필요한 증빙만 세메앱으로 제출합니다.
          </p>
          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-3 sm:p-4">
            <p className="text-sm font-bold text-slate-300">제출·검토 현황</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">기준항목</p>
                <p className="mt-1 text-2xl font-black">{submissionSummary.totalItems}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">최근 제출</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{recordSummary.total}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">원청 확인</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{recordSummary.principalConfirmedCount}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="text-xs text-slate-400">보완요청</p>
                <p className="mt-1 text-2xl font-black text-rose-300">{recordSummary.followUpCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-cyan-500/40 bg-cyan-950/20 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-cyan-300">㈜버블몬코리아 원청 공유</p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">오늘 원청 공유사항</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                오늘 작업 전 확인할 내용입니다. 읽고 아래 필요한 증빙만 제출하세요.
              </p>
            </div>
            <span className="w-fit rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-black text-cyan-200">
              {sharedSafetyBriefing.statusLabel}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-sm font-black text-cyan-100">{sharedSafetyBriefing.fieldHeadline}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
              {partnerSharedMessages.map((message) => (
                <li key={message}>• {message}</li>
              ))}
            </ul>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs font-bold text-slate-400">고위험 주의</p>
              <p className="mt-2 text-xs leading-5 text-slate-200">
                {partnerSifFocus}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs font-bold text-slate-400">작업허가 확인</p>
              <p className="mt-2 text-xs leading-5 text-slate-200">
                {partnerPtwMessage}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-xs font-bold text-slate-400">제출 증빙</p>
              <p className="mt-2 text-xs leading-5 text-slate-200">
                작업 전후 사진·교육·서명·조치사진을 필요한 항목별로 제출
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black text-cyan-300">오늘 할 일</p>
                <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">오늘 제출할 항목</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  해당되는 항목만 선택해 증빙을 제출하세요.
                </p>
              </div>
              <span className="w-fit rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-black text-cyan-200">
                5개 항목
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-700/70 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              {submissionItems.map((item, index) => {
                const contractorStatus = formatContractorSubmissionStatus(item.contractorSubmissionStatus);
                const principalStatus = formatPrincipalReviewStatus(item.principalReviewStatus);
                const needsAttention =
                  item.contractorSubmissionStatus !== "제출완료" ||
                  item.principalReviewStatus === "보완요청";
                const evidenceSummary = item.requiredEvidence.slice(0, 2).join(", ");
                const remainingEvidenceCount = item.requiredEvidence.length - 2;

                return (
                  <article
                    key={item.id}
                    className={`p-4 ${needsAttention ? "bg-slate-900/40" : "bg-slate-950"}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              needsAttention
                                ? "bg-cyan-500/20 text-cyan-200"
                                : "bg-emerald-500/20 text-emerald-200"
                            }`}
                          >
                            {needsAttention ? index + 1 : "✓"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-base font-black leading-6 text-white">
                                {item.title.replace("㈜몬스 ", "")}
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs font-bold">
                                <span
                                  className={`rounded-full border px-2 py-1 ${
                                    needsAttention
                                      ? "border-amber-400/30 text-amber-200"
                                      : "border-emerald-400/30 text-emerald-200"
                                  }`}
                                >
                                  상태: {contractorStatus}
                                </span>
                                <span className="rounded-full border border-slate-500/40 px-2 py-1 text-slate-300">
                                  원청: {principalStatus}
                                </span>
                                {item.evidenceBookRequired ? (
                                  <span className="rounded-full border border-blue-400/30 px-2 py-1 text-blue-200">
                                    증빙 보관
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <p className="mt-1 text-sm leading-5 text-slate-400">
                              {evidenceSummary}
                              {remainingEvidenceCount > 0 ? ` 외 ${remainingEvidenceCount}개` : ""}
                            </p>

                            <details className="mt-2 text-sm text-slate-300">
                              <summary className="cursor-pointer text-xs font-black text-cyan-200">
                                필요 증빙 보기
                              </summary>
                              <ul className="mt-2 grid gap-1 leading-5">
                                {item.requiredEvidence.map((evidence) => (
                                  <li key={evidence}>• {evidence}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/contractor/mons/submit?item=${encodeURIComponent(item.id)}&token=${encodeURIComponent(params.token ?? "")}`}
                        className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition active:scale-95 sm:w-40"
                      >
                        {getSubmitButtonLabel(item.itemType)}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              제출자료는 ㈜버블몬코리아 원청 또는 SafeMetrica 관리자가 확인합니다.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
            <h2 className="text-base font-black text-amber-200">제출 기준</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              TBM 활동 증빙만으로 작업·조치 이행이 자동 확정되지는 않습니다.
              제출자료는 원청 또는 SafeMetrica 관리자가 확인합니다.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-base font-black">제한 앱 안내</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              <li>• 이 화면은 ㈜몬스 제출 전용 화면입니다.</li>
              <li>• 제출 항목은 ㈜버블몬코리아 원청의 확인 대상입니다.</li>
            </ul>
          </article>
        </section>

      </div>
    </main>
  );
}
