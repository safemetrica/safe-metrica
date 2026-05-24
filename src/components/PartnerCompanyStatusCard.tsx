import Link from "next/link";

import { getCompanyConfig } from "@/lib/company";
import {
  fetchContractorSubmissionRecords,
  getContractorSubmissionRecordSummary,
} from "@/lib/contractorSubmissionRecords";

type PartnerCompanyStatusCardProps = {
  className?: string;
};

export default async function PartnerCompanyStatusCard({ className = "" }: PartnerCompanyStatusCardProps) {
  const company = await getCompanyConfig().catch(() => null);

  if (!company || company.code !== "bubblemon") {
    return null;
  }

  const submissionStore = await fetchContractorSubmissionRecords();
  const summary = getContractorSubmissionRecordSummary(submissionStore.records);
  const hasFollowUp = summary.followUpCount > 0;
  const hasPending = summary.principalPendingCount > 0;

  const statusLabel = hasFollowUp ? "보완 필요" : hasPending ? "검토 필요" : "정상";
  const statusClass = hasFollowUp
    ? "border-rose-400/40 bg-rose-950/30 text-rose-200"
    : hasPending
      ? "border-amber-400/40 bg-amber-950/30 text-amber-200"
      : "border-emerald-400/40 bg-emerald-950/30 text-emerald-200";

  return (
    <Link
      href="/contractor-status"
      className={`block rounded-2xl border border-cyan-500/40 bg-cyan-950/20 p-4 shadow-lg transition-all duration-200 active:scale-95 ${className}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <span className="text-white text-sm font-black">협력사 이행현황</span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 text-gray-300 text-xs leading-relaxed">
            몬스 제출자료의 원청 확인, 보완요청, 미검토 상태를 확인합니다.
          </p>
          {submissionStore.errorMessage ? (
            <p className="mt-2 text-[11px] leading-5 text-amber-200">
              제출자료 조회 확인이 필요합니다.
            </p>
          ) : null}
        </div>

        <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-gray-950">
          상세 보기
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] text-slate-400">최근 접수</p>
          <p className="mt-1 text-xl font-black text-emerald-300">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] text-slate-400">미검토</p>
          <p className="mt-1 text-xl font-black text-amber-300">{summary.principalPendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] text-slate-400">확인</p>
          <p className="mt-1 text-xl font-black text-emerald-300">{summary.principalConfirmedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <p className="text-[11px] text-slate-400">보완</p>
          <p className="mt-1 text-xl font-black text-rose-300">{summary.followUpCount}</p>
        </div>
      </div>

      {hasFollowUp ? (
        <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-950/20 p-3 text-xs font-bold leading-5 text-rose-200">
          보완요청 항목이 있습니다. 버블몬 현장관리감독자의 확인이 필요합니다.
        </p>
      ) : hasPending ? (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-950/20 p-3 text-xs font-bold leading-5 text-amber-200">
          아직 원청 미검토 제출자료가 있습니다. 확인 후 원청 확인 또는 보완요청으로 처리하세요.
        </p>
      ) : (
        <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-3 text-xs font-bold leading-5 text-emerald-200">
          현재 협력사 제출자료는 원청 확인 상태입니다.
        </p>
      )}
    </Link>
  );
}
