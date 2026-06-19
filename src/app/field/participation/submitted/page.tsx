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

function getStatusCopy(status?: string, workerCopyCode?: string) {
  const isFoodFactoryTrial = workerCopyCode === "richi";

  if (status === "saved") {
    return {
      title: isFoodFactoryTrial ? "전자확인 저장 완료" : "현장참여 저장 완료",
      message: isFoodFactoryTrial
        ? "입력한 내용이 전자확인 기록으로 저장되었습니다."
        : "입력한 내용이 현장 의견 DB에 저장되었습니다.",
      tone: "emerald",
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
  const participationHref = params.company
    ? `/field/participation?company=${encodeURIComponent(params.company)}`
    : "/field/participation";

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
            {workerCopy?.badge ?? "SafeMetrica 현장참여"}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{copy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {workerCopy ? `${workerCopy.companyName} · ${copy.message}` : copy.message}
          </p>

          <div className={`mt-4 rounded-2xl border p-4 ${toneClass}`}>
            <p className="text-sm font-bold">
              {workerCopy?.submittedMessage ??
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
              다른 의견 남기기
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
