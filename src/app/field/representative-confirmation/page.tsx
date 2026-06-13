import type { Metadata } from "next";

import { fetchWorkerRepresentativeConfirmationLink } from "@/lib/workerRepresentativeConfirmationLinks";

import WorkerRepresentativeConfirmationForm from "./WorkerRepresentativeConfirmationForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "근로자대표 참여확인 | SafeMetrica",
  description: "공유받은 위험성평가와 안전조치를 확인하고 의견을 남기는 근로자대표 전용 화면",
};

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    companyCode?: string | string[];
    site?: string | string[];
    siteName?: string | string[];
    scope?: string | string[];
    confirmationScope?: string | string[];
    risk?: string | string[];
    riskAssessmentId?: string | string[];
    linkId?: string | string[];
  }>;
};

function readSearchParam(...values: Array<string | string[] | undefined>) {
  for (const value of values) {
    const candidate = Array.isArray(value) ? value[0] : value;

    if (candidate?.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

export default async function WorkerRepresentativeConfirmationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const linkId = readSearchParam(params.linkId);

  if (linkId) {
    const result = await fetchWorkerRepresentativeConfirmationLink(linkId);

    if (result.status !== "found") {
      const message =
        result.status === "inactive"
          ? "이 링크는 현재 사용할 수 없습니다."
          : result.status === "not_configured" || result.status === "failed"
            ? "링크 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
            : "요청한 참여확인 링크를 찾을 수 없습니다.";

      return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:py-16">
          <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <p className="text-sm font-black tracking-wide text-amber-700">
              링크 확인 필요
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">
              근로자대표 참여확인
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {message}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              링크를 공유한 관리자에게 확인해주세요.
            </p>
          </section>
        </main>
      );
    }

    return (
      <WorkerRepresentativeConfirmationForm
        linkId={result.link.linkId}
        initialCompanyCode=""
        initialSiteName={result.link.siteName}
        initialConfirmationScope={result.link.confirmationScope}
        initialRiskAssessmentId={result.link.riskAssessmentId ?? ""}
        isLinkLocked
      />
    );
  }

  return (
    <WorkerRepresentativeConfirmationForm
      linkId=""
      initialCompanyCode={readSearchParam(params.companyCode, params.company)}
      initialSiteName={readSearchParam(params.siteName, params.site)}
      initialConfirmationScope={readSearchParam(params.confirmationScope, params.scope)}
      initialRiskAssessmentId={readSearchParam(params.riskAssessmentId, params.risk)}
      isLinkLocked={false}
    />
  );
}
