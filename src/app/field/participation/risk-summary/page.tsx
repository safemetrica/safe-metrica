import Link from "next/link";

import { getFieldWorkerRiskSummary } from "../fieldWorkerRiskSummary";
import { getOperatingFieldWorkerCopy } from "../operatingFieldWorkerCopy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{
    company?: string;
  }>;
};

function normalizeCompanyCode(value?: string | null) {
  const code = (value ?? "").trim().toLowerCase();

  if (
    code === "korea-green" ||
    code === "korea_green" ||
    code === "koreagreen" ||
    code === "greenkorea"
  ) {
    return "hankookgreen";
  }

  return code;
}

function getCompanyLabel(companyCode: string, copyCompanyName?: string) {
  if (copyCompanyName) return copyCompanyName;
  if (companyCode === "mons") return "㈜몬스";
  if (companyCode === "bubblemon") return "㈜버블몬코리아";
  if (companyCode === "daedo") return "㈜대도환경";
  if (companyCode === "dongwoo") return "㈜동우환경";
  if (companyCode === "hankookgreen") return "㈜한국그린환경";
  return "현장";
}

function getRiskBadgeClass(level: string) {
  if (level === "상") return "border-red-200 bg-red-50 text-red-800";
  if (level === "중") return "border-amber-200 bg-amber-50 text-amber-800";
  if (level === "하") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function FieldWorkerRiskSummaryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const companyCode = normalizeCompanyCode(params.company);
  const workerCopy = getOperatingFieldWorkerCopy(companyCode);
  const companyName = getCompanyLabel(companyCode, workerCopy?.companyName);
  const riskSummary = await getFieldWorkerRiskSummary(companyCode);

  const backHref = companyCode
    ? `/field/participation?company=${encodeURIComponent(companyCode)}`
    : "/field/participation";

  if (!companyCode) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
        <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica 위험성평가 공유요약</p>
          <h1 className="mt-2 text-2xl font-black text-amber-950">회사코드가 필요합니다.</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
            현장참여 QR 또는 회사코드가 포함된 링크로 다시 접속해 주세요.
          </p>
          <Link
            href="/field/participation"
            className="mt-5 block rounded-2xl bg-amber-700 px-4 py-3 text-center text-sm font-black text-white"
          >
            현장참여로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  if (!riskSummary || !riskSummary.hasDb || riskSummary.items.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black text-blue-700">SafeMetrica 위험성평가 공유요약</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{companyName} 공유요약</h1>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700">
            현재 근로자에게 공유할 위험성평가 요약 항목이 없습니다.
            {companyCode === "mons"
              ? " 몬스는 현재 3개월 단기 독립 테넌트로 현장참여와 TBM 중심으로 운영합니다."
              : " 현장관리자에게 위험성평가표 연결 상태를 확인해 주세요."}
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            이 화면은 근로자 공유용 요약 화면입니다. 관리자 메모, 내부 조치상태, 예산, Notion 원본 링크, 대표 확인 정보는 표시하지 않습니다.
          </div>

          <Link
            href={backHref}
            className="mt-5 block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-black text-white"
          >
            현장참여로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black text-blue-700">SafeMetrica 위험성평가 공유요약</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">{companyName} 핵심 위험요인</h1>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
          오늘 작업 전 근로자가 확인해야 할 주요 위험요인과 안전조치만 요약했습니다.
        </p>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          이 화면은 근로자 공유용 요약 화면입니다. 전체 위험성평가표, 관리자 메모, 예산, 내부 조치상태, 대표 확인 정보는 표시하지 않습니다.
        </div>

        <div className="mt-5 space-y-4">
          {riskSummary.items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-blue-700">공유 위험 {index + 1}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">{item.taskName}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskBadgeClass(item.riskLevel)}`}>
                  {item.riskLevel || "등급 없음"}
                </span>
              </div>

              <dl className="mt-4 space-y-3 text-sm leading-6">
                <div>
                  <dt className="font-black text-slate-500">위험요인</dt>
                  <dd className="mt-1 font-bold text-slate-800">{item.hazard || "-"}</dd>
                </div>
                <div>
                  <dt className="font-black text-slate-500">사고유형</dt>
                  <dd className="mt-1 font-bold text-slate-800">{item.accidentType || "-"}</dd>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                  <dt className="font-black text-emerald-700">확인할 안전조치</dt>
                  <dd className="mt-1 font-bold text-emerald-900">{item.improvementPlan || item.currentControls || "-"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        <Link
          href={backHref}
          className="mt-5 block rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white"
        >
          확인 후 현장참여로 돌아가기
        </Link>
      </section>
    </main>
  );
}
