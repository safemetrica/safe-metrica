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

  const safetyMeetingItem = (submissionItems.find((item) => item.itemType === "TBM") ?? submissionItems[0])!;
  const additionalEvidenceItems = submissionItems.filter((item) => item.id !== safetyMeetingItem.id);
  const safetyMeetingSubmitHref = `/contractor/mons/submit?item=${encodeURIComponent(safetyMeetingItem.id)}&token=${encodeURIComponent(params.token ?? "")}`;

  if (!isMonsContractorTokenValid(params.token)) {
    redirect("/login?error=invalid_contractor_token");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-blue-700">SafeMetrica 협력사 제출</p>
              <h1 className="mt-2 text-2xl font-black text-slate-950">오늘 안전회의 기록</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {principal.name} 현장에서 작업 전 안전회의와 필요한 증빙을 남깁니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">협력사: {contractor.name}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">㈜버블몬코리아 현장</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">기록 항목</p>
              <p className="mt-1 text-xl font-black text-slate-950">{submissionSummary.totalItems}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">최근 제출</p>
              <p className="mt-1 text-xl font-black text-emerald-700">{recordSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">원청 확인</p>
              <p className="mt-1 text-xl font-black text-emerald-700">{recordSummary.principalConfirmedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">보완요청</p>
              <p className="mt-1 text-xl font-black text-rose-600">{recordSummary.followUpCount}</p>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black text-amber-800">오늘 원청 공유사항</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">작업 전 꼭 확인하세요</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {sharedSafetyBriefing.fieldHeadline}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-800">
                  {sharedSafetyBriefing.statusLabel}
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-800">
                {partnerSharedMessages.map((message) => (
                  <li key={message} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{message}</span>
                  </li>
                ))}
              </ul>
            </section>

            {hasFollowUpRequest ? (
              <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black text-rose-700">보완요청</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">보완요청이 있습니다</h2>
                    <p className="mt-2 text-sm leading-6 text-rose-900">
                      원청 요청 내용을 확인하고 보완 제출해 주세요.
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">
                    {recordSummary.followUpCount}건
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {followUpReviewRecords.map((record) => (
                    <article key={record.id} className="rounded-2xl border border-rose-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-black text-slate-950">{record.title}</p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {record.workDate || "작업일 미입력"} · {record.siteArea || "구역 미입력"}
                          </p>
                          <p className="mt-2 text-sm leading-5 text-rose-700">
                            {getPrincipalReviewMessage(record.principalReviewStatus)}
                          </p>
                        </div>
                        <Link
                          href={`/contractor/mons/submit?item=${encodeURIComponent(record.submissionItemId)}&token=${encodeURIComponent(params.token ?? "")}`}
                          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-center text-sm font-black text-white transition active:scale-95 sm:w-40"
                        >
                          보완 제출하기
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-sm font-black text-emerald-800">현재 보완요청은 없습니다.</p>
                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  오늘 작업 전 안전회의를 기록하고 필요한 사진·서명 증빙을 남기면 됩니다.
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-blue-700">오늘 기록</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">안전회의 기록하기</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                작업 전 안전회의, 위험공유, 보호구 확인, 참석 사진 또는 서명을 한 번에 기록합니다.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["작업 전 안전회의 실시", "TBM 또는 작업 전 조회를 진행합니다."],
                  ["오늘 주의사항·위험요인 공유", "차량·보행 혼재, 후진 충돌 등 주요 위험을 공유합니다."],
                  ["관리적 대책 안내", "유도자 배치, 작업순서, 출입통제 등 관리대책을 설명합니다."],
                  ["보호구 착용 확인", "안전모·안전화 등 필요한 보호구 착용을 확인합니다."],
                  ["참석 사진 또는 서명", "모인 직원 사진, 참석자 확인, 서명을 남깁니다."],
                  ["작업허가 필요 여부 확인", partnerPtwMessage],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-blue-900">위험성평가 공유 확인 포함</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-blue-900">
                  <li>• 오늘 작업의 주요 위험요인을 공유받았습니다.</li>
                  <li>• 원청 공유사항과 작업 전 주의사항을 확인했습니다.</li>
                  <li>• 필요한 안전조치와 관리적 대책을 확인했습니다.</li>
                </ul>
              </div>

              <Link
                href={safetyMeetingSubmitHref}
                className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-700 px-5 py-4 text-center text-base font-black text-white shadow-sm transition active:scale-95"
              >
                안전회의 기록 제출하기
              </Link>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                제출자료는 ㈜버블몬코리아 원청 또는 SafeMetrica 관리자가 확인합니다.
              </p>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-slate-500">오늘 확인할 위험</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">고위험 주의</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{partnerSifFocus}</p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-slate-500">추가 증빙</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">필요할 때만 추가 제출</h2>
              <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {additionalEvidenceItems.map((item) => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">
                          {item.title.replace("㈜몬스 ", "")}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {formatContractorSubmissionStatus(item.contractorSubmissionStatus)} · {formatPrincipalReviewStatus(item.principalReviewStatus)}
                        </p>
                      </div>
                      <Link
                        href={`/contractor/mons/submit?item=${encodeURIComponent(item.id)}&token=${encodeURIComponent(params.token ?? "")}`}
                        className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"
                      >
                        추가 제출
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-slate-500">제출 기준</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">자동 확정 아님</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                TBM 활동 증빙만으로 작업·조치 이행이 자동 확정되지는 않습니다.
                제출자료는 원청 또는 SafeMetrica 관리자가 확인합니다.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-slate-500">제한 앱 안내</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">협력사 제출 전용</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                이 화면은 ㈜몬스 제출 전용 화면입니다. 제출 항목은 ㈜버블몬코리아 원청의 확인 대상입니다.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
