import Link from "next/link";

const FILE_CABINET_ITEMS = [
  {
    label: "근로자 공유확인 CSV",
    status: "Owner 준비",
    description: "공유확인 제출 기록을 고객 전달 가능한 컬럼으로 정리하는 보관파일 후보입니다.",
  },
  {
    label: "위험제보·아차사고·개선제안 CSV",
    status: "Owner 준비",
    description: "공유확인을 제외한 검토대상 의견과 조치 메모를 월별 접수대장 형태로 정리합니다.",
  },
  {
    label: "근로자대표 참여확인 CSV",
    status: "Owner 준비",
    description: "근로자대표 확인, 보완 의견, 검토상태를 고객 전달용 운영기록으로 정리합니다.",
  },
  {
    label: "증빙목록 CSV",
    status: "후속 연결",
    description: "사진과 첨부파일은 Evidence Manifest 기준으로 목록화하고 ZIP 패키지와 연결합니다.",
  },
];

export default function RiskSharePackExportPanel({
  companyCode,
}: {
  companyCode: string;
}) {
  return (
    <section
      id="risk-share-export-panel"
      className="rounded-3xl border border-cyan-500/25 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/30"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-300">월별 보관파일 준비 현황</p>
          <h2 className="mt-1 text-xl font-black text-white">
            Risk Share Pack 고객 전달자료
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            이 영역은 고객사 관리자에게 다운로드 버튼을 직접 제공하지 않고, 내부 운영자가
            Owner Export Center에서 확인·생성 후 고객에게 전달할 파일 구성을 안내합니다.
          </p>
        </div>

        <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">
          대상 업체: {companyCode}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        {FILE_CABINET_ITEMS.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-black text-white">{item.label}</h3>
              <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <Link
          href="/monthly-report/risk-share"
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
        >
          공유팩 월간보고서 확인
        </Link>
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100">
          실제 CSV 다운로드는 Owner Export Center에서 내부 운영자가 수행합니다. 고객에게는
          이 관리자 화면이나 내부 API 링크를 공유하지 않습니다.
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        월별 보관파일은 운영기록을 정리해 확인자료로 활용하기 위한 보조 흐름입니다.
        법적 판단, 면책, 조치완료 확정을 대신하지 않습니다.
      </p>
    </section>
  );
}
