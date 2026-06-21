import { riskShareLinkCopy } from "@/lib/risk-share-link/copy";
import Link from "next/link";
import { getOperatingFieldWorkerCopy } from "../operatingFieldWorkerCopy";

export const dynamic = "force-dynamic";
export const revalidate = 0;


type PageProps = {
  searchParams?: Promise<{
    status?: string;
    company?: string;
    message?: string;
    detail?: string;
  }>;
};

type StatusCopy = {
  title: string;
  message: string;
  tone: "emerald" | "red" | "amber";
  badge?: string;
  completionMessage?: string;
};

function getStatusCopy(status?: string, workerCopyCode?: string): StatusCopy {
  const isFoodFactoryTrial = workerCopyCode === "richi";

  if (status === "saved") {
    return {
      title: isFoodFactoryTrial ? "전자확인 저장 완료" : "현장참여 저장 완료",
      message: isFoodFactoryTrial
        ? "입력한 내용이 작업 전 확인기록으로 저장되었습니다."
        : "입력한 내용이 현장 의견 DB에 저장되었습니다.",
      tone: "emerald",
      badge: isFoodFactoryTrial ? "㈜리치코리아 현장 전자확인" : undefined,
      completionMessage: isFoodFactoryTrial
        ? "관리자가 작업 전 확인기록과 특이사항을 확인하고 필요한 경우 개선 검토 자료로 활용합니다."
        : undefined,
    };
  }

  if (status === "anonymous_feedback_received") {
    return {
      title: "익명 의견 접수 완료",
      message: isFoodFactoryTrial
        ? "입력한 의견이 식별정보·서명 없이 접수되었습니다."
        : "입력한 의견이 익명 의견으로 접수되었습니다.",
      tone: "emerald",
      badge: isFoodFactoryTrial ? "㈜리치코리아 익명 의견" : "SafeMetrica 익명 의견",
      completionMessage: isFoodFactoryTrial
        ? "제출 내용은 관리자 확인자료로 분류되며, 이름·소속·확인번호·서명 없이 저장됩니다."
        : "제출 내용은 익명 의견으로 접수되었습니다.",
    };
  }

  if (status === "supabase_error") {
    return {
      title: "저장 확인 필요",
      message: "PostgreSQL 원장 저장 중 오류가 발생했습니다. 관리자 확인이 필요합니다.",
      tone: "red",
    };
  }

  if (status === "notion_error") {
    return {
      title: "저장 확인 필요",
      message: "현장 의견 DB 저장 중 오류가 발생했습니다. 관리자 확인이 필요합니다.",
      tone: "red",
    };
  }

  if (status === "missing_required") {
    return {
      title: "필수 입력값 확인 필요",
      message: "제목과 상세 내용을 입력한 뒤 다시 제출해 주세요.",
      tone: "amber",
    };
  }

  if (status === "missing_field_voice_db") {
    return {
      title: "현장 의견 DB 연결 필요",
      message: "해당 회사의 fieldVoiceDbId 설정을 확인해 주세요.",
      tone: "amber",
    };
  }

  if (status === "tenant_required" || status === "unknown_company" || status === "company_error") {
    return {
      title: "회사 연결 확인 필요",
      message: "회사 코드 또는 접속 정보를 확인해 주세요.",
      tone: "amber",
    };
  }

  return {
    title: "현장참여 접수 완료",
    message: "입력한 내용이 접수되었습니다.",
    tone: "emerald",
  };
}

export default async function FieldParticipationSubmittedPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const workerCopy = getOperatingFieldWorkerCopy(params.company);
  const copy = getStatusCopy(params.status, workerCopy?.code);
  const isAnonymousFeedbackReceived = params.status === "anonymous_feedback_received";
  const participationHref = params.company
    ? isAnonymousFeedbackReceived
      ? `/field/anonymous-feedback?company=${encodeURIComponent(params.company)}`
      : `/field/participation?company=${encodeURIComponent(params.company)}`
    : "/field/participation";
  const primaryActionLabel = isAnonymousFeedbackReceived ? "다른 익명 의견 남기기" : "다른 의견 남기기";

  const toneClass =
    copy.tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : copy.tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black text-blue-700">
            {copy.badge ?? workerCopy?.badge ?? "SafeMetrica 현장참여"}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{copy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {workerCopy ? `${workerCopy.companyName} · ${copy.message}` : copy.message}
          </p>

          <div className={`mt-4 rounded-2xl border p-4 ${toneClass}`}>
            <p className="text-sm font-bold">
              {copy.completionMessage ??
                workerCopy?.submittedMessage ??
                riskShareLinkCopy.worker.completion.report}
            </p>
            {params.message ? (
              <p className="mt-2 text-xs leading-5">
                오류: {params.message} {params.detail ?? ""}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href={participationHref}
              className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white"
            >
              {primaryActionLabel}
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-700"
            >
              홈으로
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
