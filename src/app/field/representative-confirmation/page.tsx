import type { Metadata } from "next";

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

  return (
    <WorkerRepresentativeConfirmationForm
      initialCompanyCode={readSearchParam(params.companyCode, params.company)}
      initialSiteName={readSearchParam(params.siteName, params.site)}
      initialConfirmationScope={readSearchParam(params.confirmationScope, params.scope)}
      initialRiskAssessmentId={readSearchParam(params.riskAssessmentId, params.risk)}
    />
  );
}
