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

  const visibleReviewRecords = [...submissionStore.records]
    .sort((a, b) => {
      const aNeedsFollowUp = a.principalReviewStatus === "보완요청" ? 1 : 0;
      const bNeedsFollowUp = b.principalReviewStatus === "보완요청" ? 1 : 0;
      return bNeedsFollowUp - aNeedsFollowUp;
    })
    .slice(0, 5);

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
          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
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

        <section className="mt-5 rounded-3xl border border-cyan-500/40 bg-cyan-950/20 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-cyan-300">㈜버블몬코리아 원청 공유</p>
              <h2 className="mt-1 text-2xl font-black text-white">오늘 원청 공유사항</h2>
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

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

        <section className="mt-5 rounded-3xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black">보완요청 먼저 확인</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                보완요청이 있으면 먼저 보완 제출하고, 없으면 오늘 필요한 증빙만 제출하세요.
              </p>
            </div>
            {hasFollowUpRequest ? (
              <span className="rounded-full border border-rose-400/40 bg-rose-950/30 px-3 py-1 text-xs font-black text-rose-200">
                보완 필요
              </span>
            ) : (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-950/30 px-3 py-1 text-xs font-black text-emerald-200">
                보완 없음
              </span>
            )}
          </div>

          {!submissionStore.configured ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
              <p className="text-sm font-bold text-amber-200">
                제출자료 연결 전입니다. 제출 후 원청 확인 결과가 이곳에 표시됩니다.
              </p>
            </div>
          ) : submissionStore.errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-sm font-bold text-red-200">원청 검토 결과 조회 확인 필요</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{submissionStore.errorMessage}</p>
            </div>
          ) : submissionStore.records.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm font-bold text-slate-300">아직 제출자료가 없습니다.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                아래 오늘 제출할 항목에서 자료를 제출하면 원청 확인 결과가 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visibleReviewRecords.map((record) => (
                <article key={record.id} className={`rounded-2xl border p-4 ${record.principalReviewStatus === "보완요청" ? "border-rose-400/40 bg-rose-950/20" : "border-slate-700 bg-slate-950"}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-black text-white">{record.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {record.workDate || "작업일 미입력"} · {record.siteArea || "구역 미입력"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {getPrincipalReviewMessage(record.principalReviewStatus)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-emerald-200">
                          제출: {record.submissionStatus}
                        </span>
                        <span className={`rounded-full border px-2 py-1 ${getPrincipalReviewBadgeClass(record.principalReviewStatus)}`}>
                          원청 검토: {record.principalReviewStatus}
                        </span>
                        <span className="rounded-full border border-blue-400/30 px-2 py-1 text-blue-200">
                          {record.itemType || "제출항목"}
                        </span>
                      </div>
                    </div>

                    {record.principalReviewStatus === "보완요청" ? (
                      <Link
                        href={`/contractor/mons/submit?item=${encodeURIComponent(record.submissionItemId)}&token=${encodeURIComponent(params.token ?? "")}`}
                        className="flex min-h-14 items-center justify-center rounded-2xl bg-rose-500 px-5 py-4 text-center text-base font-black text-white shadow-lg shadow-rose-950/30 transition active:scale-95 md:w-48"
                      >
                        보완 제출하기
                      </Link>
                    ) : record.principalReviewStatus === "확인" ? (
                      <div className="rounded-xl border border-emerald-400/40 bg-emerald-950/20 px-4 py-4 text-center text-sm font-black text-emerald-200 md:w-44">
                        확인 완료
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-950/20 px-4 py-4 text-center text-sm font-black text-amber-200 md:w-44">
                        검토 대기
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 space-y-3">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
            <p className="text-xs font-black text-cyan-300">오늘 할 일</p>
            <h2 className="mt-1 text-2xl font-black text-white">오늘 제출할 항목</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              해당되는 항목만 선택해 사진·서명·교육·조치 증빙을 제출하세요.
            </p>
          </div>

          {submissionItems.map((item, index) => (
            <article key={item.id} className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
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

                  <Link
                    href={`/contractor/mons/submit?item=${encodeURIComponent(item.id)}&token=${encodeURIComponent(params.token ?? "")}`}
                    className="mt-4 block w-full rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/30"
                  >
                    {getSubmitButtonLabel(item.itemType)}
                  </Link>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    제출 화면에서 작업일, 작업명, 현장구역, 제출자, 내용, 증빙 메모를 입력합니다.
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
            <li>• 이 화면은 ㈜몬스 제출 전용 화면입니다.</li>
            <li>• 버블몬 전체 운영 홈, 위험성평가표, 월간보고서, Evidence Book 전체 목록은 제공하지 않습니다.</li>
            <li>• 제출 항목은 버블몬 원청의 확인 대상입니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
