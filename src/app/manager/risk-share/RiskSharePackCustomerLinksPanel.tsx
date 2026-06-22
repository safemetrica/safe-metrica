import Link from "next/link";

import CopyLinkButton from "./CopyLinkButton";

function buildFieldParticipationPath(companyCode: string) {
  return `/field/participation?company=${encodeURIComponent(companyCode)}`;
}

const INTERNAL_MANAGER_LINKS = [
  {
    title: "공유팩 관리자 홈",
    path: "/manager/risk-share",
    description:
      "공유확인, 현장 의견, 근로자대표 참여확인, Export, 월간요약을 확인합니다.",
  },
  {
    title: "공유팩 월간 운영요약",
    path: "/monthly-report/risk-share",
    description: "공유팩 전용 월간요약 및 인쇄/PDF 저장 화면입니다.",
  },
  {
    title: "근로자대표 참여확인 관리",
    path: "/manager/representative-confirmations",
    description:
      "근로자대표 확인 linkId 발급, 제출 현황, 폐기·만료 상태를 관리합니다.",
  },
];

const RICHI_INTERNAL_MANAGER_LINKS = [
  {
    title: "운영 관리자 홈",
    path: "/manager/risk-share",
    description:
      "현장 확인·의견, 근로자대표 참여확인, 전달자료 준비, 월간 운영기록을 확인합니다.",
  },
  {
    title: "월간 운영기록 요약",
    path: "/monthly-report/risk-share",
    description: "월간 운영기록 및 인쇄/PDF 저장 화면입니다.",
  },
  {
    title: "근로자대표 참여확인 관리",
    path: "/manager/representative-confirmations",
    description:
      "근로자대표 확인 링크 발급, 제출 현황, 폐기·만료 상태를 관리합니다.",
  },
];

export default function RiskSharePackCustomerLinksPanel({
  companyName,
  companyCode,
  isRichiFullOperation = false,
}: {
  companyName: string;
  companyCode: string;
  isRichiFullOperation?: boolean;
}) {
  const fieldParticipationPath = buildFieldParticipationPath(companyCode);
  const internalManagerLinks = isRichiFullOperation
    ? RICHI_INTERNAL_MANAGER_LINKS
    : INTERNAL_MANAGER_LINKS;

  return (
    <section className="rounded-3xl border border-emerald-500/25 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-300">고객별 링크 표</p>
          <h2 className="mt-1 text-xl font-black text-white">
            {isRichiFullOperation
              ? `${companyName} 운영 링크 확인`
              : `${companyName} 공유팩 링크 확인`}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {isRichiFullOperation
              ? "QR 배포와 고객 안내 전에 리치코리아 현장 운영 링크 구성을 확인합니다."
              : "QR 배포와 고객 안내 전에 현재 업체 코드가 포함된 링크인지 확인합니다. 현장 근로자용 링크에는 반드시 company query가 포함되어야 합니다."}
          </p>
        </div>

        <span className="w-fit rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-black text-slate-300">
          {isRichiFullOperation
            ? "리치코리아 운영 링크"
            : `company=${companyCode}`}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black text-cyan-100">
              {isRichiFullOperation
                ? "근로자 현장 확인·의견 배포 링크"
                : "근로자 공유확인·현장 의견 배포 링크"}
            </p>
            <p className="mt-2 break-all rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-bold text-slate-200">
              {fieldParticipationPath}
            </p>
            <p className="mt-2 text-xs leading-5 text-cyan-100/80">
              {isRichiFullOperation
                ? "QR 포스터에 우선 사용할 현장근로자용 링크입니다. 배포 전 운영 안내 문구를 확인합니다."
                : "QR 포스터에 우선 사용할 현장근로자용 링크입니다. 고객사 코드가 빠진 링크는 배포하지 않습니다."}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <CopyLinkButton value={fieldParticipationPath} />
            <Link
              href={fieldParticipationPath}
              className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300"
            >
              열기
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {internalManagerLinks.map((item) => (
          <article
            key={item.path}
            className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
          >
            <h3 className="text-base font-black text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {item.description}
            </p>
            <p className="mt-3 break-all rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300">
              {item.path}
            </p>
            <div className="mt-3 flex gap-2">
              <CopyLinkButton value={item.path} />
              <Link
                href={item.path}
                className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-black text-slate-200 hover:border-cyan-400 hover:text-cyan-100"
              >
                열기
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        {isRichiFullOperation
          ? "고객 전달자료에는 고객 확인 전 항목, 내부 운영 메모, 보안 민감정보를 포함하지 않습니다."
          : "근로자대표 참여확인 제출 링크는 고정 링크가 아니라 관리 화면에서 확인 범위와 만료일을 지정해 linkId 방식으로 발급합니다. 고객별 안내문에는 실제 고객 데이터, 내부 인증정보, 내부 원장 주소를 포함하지 않습니다."}
      </div>
    </section>
  );
}
