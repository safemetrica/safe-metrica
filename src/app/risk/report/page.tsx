import Link from "next/link";
import PrintReportButton from "@/components/PrintReportButton";
import { getCompanyConfig } from "@/lib/company";
import {
  getRiskIntelligenceData,
  isActionNeededItem,
  isHighRiskItem,
  type RiskItemDetail,
} from "@/lib/risk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getRiskLevelClass(level: string) {
  if (level === "상") return "bg-red-100 text-red-800 border-red-300";
  if (level === "중") return "bg-amber-100 text-amber-900 border-amber-300";
  if (level === "하") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

function getStatusClass(status: string) {
  if (status.includes("완료")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (status.includes("진행") || status.includes("검토")) return "bg-blue-100 text-blue-800 border-blue-300";
  if (status.includes("필요") || status.includes("미완료") || status.includes("미조치")) return "bg-amber-100 text-amber-900 border-amber-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
}

function riskScoreText(item: RiskItemDetail) {
  const parts = [
    item.frequency !== null ? `빈도 ${item.frequency}` : "",
    item.severity !== null ? `강도 ${item.severity}` : "",
    item.riskScore !== null ? `위험도 ${item.riskScore}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "-";
}

function afterRiskScoreText(item: RiskItemDetail) {
  const parts = [
    item.afterFrequency !== null ? `빈도 ${item.afterFrequency}` : "",
    item.afterSeverity !== null ? `강도 ${item.afterSeverity}` : "",
    item.afterRiskScore !== null ? `위험도 ${item.afterRiskScore}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "-";
}

function hasPhotoEvidence(item: RiskItemDetail) {
  return item.beforePhotos.length > 0 || item.afterPhotos.length > 0;
}

function confirmationText(value: boolean) {
  return value ? "확인" : "미확인";
}

function getConfirmationClass(value: boolean) {
  return value
    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function StatBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

function PhotoEvidenceCard({ item }: { item: RiskItemDetail }) {
  const before = item.beforePhotos.slice(0, 2);
  const after = item.afterPhotos.slice(0, 2);

  return (
    <article className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-black text-slate-950">{item.processName || item.taskName || item.title || "위험요인"}</p>
        <p className="text-xs leading-5 text-slate-600">{item.hazard || item.accidentType || "-"}</p>
      </div>

      {item.actionMemo ? (
        <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs leading-5 text-slate-600">
          조치 메모: {item.actionMemo}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-black text-slate-500">개선 전 사진 {item.beforePhotos.length}장</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {before.length > 0 ? (
              before.map((file) => (
                <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="h-24 w-full rounded-xl border border-slate-200 object-cover print:h-20"
                  />
                </a>
              ))
            ) : (
              <div className="col-span-2 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                개선 전 사진 없음
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-black text-slate-500">개선 후 사진 {item.afterPhotos.length}장</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {after.length > 0 ? (
              after.map((file) => (
                <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="block">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="h-24 w-full rounded-xl border border-slate-200 object-cover print:h-20"
                  />
                </a>
              ))
            ) : (
              <div className="col-span-2 rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                개선 후 사진 없음
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function RiskReportRow({ item, index }: { item: RiskItemDetail; index: number }) {
  return (
    <tr className="break-inside-avoid border-t border-slate-200 align-top">
      <td className="px-2 py-3 text-center text-xs font-bold text-slate-600">
        {item.no || index + 1}
      </td>
      <td className="px-2 py-3 text-xs leading-5 text-slate-800">
        <p className="font-black text-slate-950">{item.processName || "공정 미지정"}</p>
        <p className="mt-1 text-slate-600">{item.taskName || "-"}</p>
      </td>
      <td className="px-2 py-3 text-xs leading-5 text-slate-800">
        <p className="font-bold text-slate-950">{item.hazard || item.title || "-"}</p>
        <p className="mt-1 text-slate-600">{item.accidentType || "-"}</p>
      </td>
      <td className="px-2 py-3 text-xs leading-5 text-slate-800">
        {item.currentControls || "-"}
      </td>
      <td className="px-2 py-3 text-center text-xs text-slate-800">
        <p>{riskScoreText(item)}</p>
        <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${getRiskLevelClass(item.riskLevel)}`}>
          {item.riskLevel || "등급 없음"}
        </span>
      </td>
      <td className="px-2 py-3 text-xs leading-5 text-slate-800">
        {item.improvementPlan || "-"}
      </td>
      <td className="px-2 py-3 text-center text-xs text-slate-800">
        <p>{afterRiskScoreText(item)}</p>
        <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${getRiskLevelClass(item.afterRiskLevel)}`}>
          {item.afterRiskLevel || "예상 없음"}
        </span>
      </td>
      <td className="px-2 py-3 text-xs leading-5 text-slate-800">
        <p className="font-bold">{item.owner || "담당자 지정 필요"}</p>
        <p className="mt-1 text-slate-500">예정: {item.improvementPlannedDate || item.dueDate || "-"}</p>
        <p className="mt-1 text-slate-500">완료: {item.improvementCompletedDate || item.completedDate || "-"}</p>
      </td>
      <td className="px-2 py-3 text-xs leading-5 text-slate-800">
        <p className="font-bold">전 {item.beforePhotos.length} / 후 {item.afterPhotos.length}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getConfirmationClass(item.adminConfirmed)}`}>
            관리자 {confirmationText(item.adminConfirmed)}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getConfirmationClass(item.representativeConfirmed)}`}>
            대표 {confirmationText(item.representativeConfirmed)}
          </span>
        </div>
        {item.actionMemo ? (
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            메모: {item.actionMemo}
          </p>
        ) : null}
      </td>
      <td className="px-2 py-3 text-center">
        <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black ${getStatusClass(item.status)}`}>
          {item.status || "상태 미지정"}
        </span>
      </td>
    </tr>
  );
}

export default async function RiskAssessmentReportPage() {
  const company = await getCompanyConfig();
  const risk = await getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey);

  const items = risk.items;
  const actionNeededCount = items.filter(isActionNeededItem).length;
  const highRiskCount = items.filter(isHighRiskItem).length;
  const completedCount = risk.completedCount;
  const openCount = risk.openCount;
  const beforePhotoCount = items.reduce((sum, item) => sum + item.beforePhotos.length, 0);
  const afterPhotoCount = items.reduce((sum, item) => sum + item.afterPhotos.length, 0);
  const photoEvidenceItems = items.filter(hasPhotoEvidence);
  const adminConfirmedCount = items.filter((item) => item.adminConfirmed).length;
  const representativeConfirmedCount = items.filter((item) => item.representativeConfirmed).length;

  const todayLabel = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  const reportYear =
    items.find((item) => item.assessmentYear)?.assessmentYear || String(new Date().getFullYear());
  const assessmentType =
    items.find((item) => item.assessmentType)?.assessmentType || "정기/수시 위험성평가";
  const sourceDoc =
    items.find((item) => item.sourceDoc)?.sourceDoc || "SafeMetrica 위험성평가 DB";
  const assessmentMethod = "빈도 × 강도 입력값 기준(관리자 확인 필요)";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:px-0 print:py-0">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .risk-print-table {
            font-size: 9.5px;
          }
          .risk-print-table th,
          .risk-print-table td {
            padding: 6px 5px !important;
            line-height: 1.4 !important;
          }
          .risk-report-title {
            font-size: 22px !important;
          }
          .print-hidden {
            display: none !important;
          }
          table {
            break-inside: auto;
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-5 print:max-w-none print:space-y-3">
        <section className="print-section rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-blue-700">SafeMetrica 위험성평가표 출력지원 v2</p>
              <h1 className="risk-report-title mt-2 text-3xl font-black text-slate-950">
                {reportYear}년 {company.name} 위험성평가표 출력지원 검토본
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                위험성평가 DB 기준 · 사업장 확인용 출력지원 화면 · {assessmentType}
              </p>
            </div>

            <div className="print-hidden flex flex-wrap gap-2">
              <Link
                href="/risk"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                위험성평가 관리
              </Link>
              <Link
                href="/home"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                홈
              </Link>
              <PrintReportButton />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            본 화면은 세메앱에 기록된 위험요인, 개선대책, 조치상태를 기준으로 위험성평가표 검토본 출력을 지원하는 화면입니다.
            본 자료는 위험성평가의 자동 확정 또는 법정의무 완료를 의미하지 않으며, 최종 확정·승인·보관은 사업장 관리 기준에 따라 사업주 또는 관리자가 확인해야 합니다.
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-slate-200">
                  <th className="w-32 bg-slate-100 px-3 py-2 text-left font-black text-slate-700">사업장명</th>
                  <td className="px-3 py-2 font-bold text-slate-950">{company.name}</td>
                  <th className="w-32 bg-slate-100 px-3 py-2 text-left font-black text-slate-700">평가연도</th>
                  <td className="px-3 py-2 text-slate-800">{reportYear}년</td>
                  <th className="w-32 bg-slate-100 px-3 py-2 text-left font-black text-slate-700">출력일</th>
                  <td className="px-3 py-2 text-slate-800">{todayLabel}</td>
                </tr>
                <tr>
                  <th className="bg-slate-100 px-3 py-2 text-left font-black text-slate-700">평가유형</th>
                  <td className="px-3 py-2 text-slate-800">{assessmentType}</td>
                  <th className="bg-slate-100 px-3 py-2 text-left font-black text-slate-700">평가방법</th>
                  <td className="px-3 py-2 text-slate-800">{assessmentMethod}</td>
                  <th className="bg-slate-100 px-3 py-2 text-left font-black text-slate-700">자료출처</th>
                  <td className="px-3 py-2 text-slate-800">{sourceDoc}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800">
              하: 낮은 위험
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-center text-sm font-black text-amber-900">
              중: 관리 필요
            </div>
            <div className="rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-center text-sm font-black text-red-800">
              상: 우선 관리
            </div>
          </div>
        </section>

        {!risk.hasDb ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-black text-red-900">위험성평가 DB 연결 필요</h2>
            <p className="mt-2 text-sm leading-6 text-red-800">
              Companies DB에 riskAssessmentDbId가 연결되면 이 화면에서 출력용 위험성평가표 검토본을 생성할 수 있습니다.
            </p>
          </section>
        ) : (
          <>
            <section className="print-section grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <StatBox label="전체 위험요인" value={`${risk.total}건`} hint="위험성평가 DB 전체 항목" />
              <StatBox label="고위험" value={`${highRiskCount}건`} hint="위험수준 상 기준" />
              <StatBox label="개선대책 필요" value={`${actionNeededCount}건`} hint="개선대책 입력 항목" />
              <StatBox label="조치완료" value={`${completedCount}건`} hint="상태 완료 기준" />
              <StatBox label="관리중" value={`${openCount}건`} hint="완료 전 항목" />
            </section>

            <section className="print-section grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatBox label="개선 전 사진" value={`${beforePhotoCount}장`} hint="Risk DB 개선 전 사진 기준" />
              <StatBox label="개선 후 사진" value={`${afterPhotoCount}장`} hint="Risk DB 개선 후 사진 기준" />
              <StatBox label="관리자 확인" value={`${adminConfirmedCount}/${items.length}`} hint="관리자 확인 체크 기준" />
              <StatBox label="대표 확인" value={`${representativeConfirmedCount}/${items.length}`} hint="대표/사업주 확인 체크 기준" />
            </section>

            <section className="print-section rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:border-slate-300 print:shadow-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-950">위험성평가표</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    빈도·강도·위험도는 입력값 또는 연결된 산식 결과 기준입니다. 개선 후 위험성은 예상 또는 목표값으로 표시하며, 개선 전·후 사진 증빙은 후속 버전에서 TBM/EB 연결자료와 함께 반영합니다.
                  </p>
                </div>
                <p className="text-xs font-bold text-slate-500">
                  총 {items.length}개 위험요인
                </p>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="risk-print-table min-w-[1600px] w-full border-collapse text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="w-14 px-2 py-3 text-center text-xs">No.</th>
                      <th className="w-44 px-2 py-3 text-xs">작업공정</th>
                      <th className="w-56 px-2 py-3 text-xs">유해·위험요인 / 사고형태</th>
                      <th className="w-64 px-2 py-3 text-xs">현재 안전조치</th>
                      <th className="w-36 px-2 py-3 text-center text-xs">현재 위험성</th>
                      <th className="w-72 px-2 py-3 text-xs">개선대책</th>
                      <th className="w-36 px-2 py-3 text-center text-xs">개선 후 위험성</th>
                      <th className="w-40 px-2 py-3 text-xs">담당자 / 일정</th>
                      <th className="w-44 px-2 py-3 text-xs">개선사진 / 확인</th>
                      <th className="w-28 px-2 py-3 text-center text-xs">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item, index) => (
                        <RiskReportRow key={item.id} item={item} index={index} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                          출력할 위험성평가 항목이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {photoEvidenceItems.length > 0 ? (
              <section className="print-section rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">개선 전·후 사진 증빙</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Risk DB의 개선 전 사진, 개선 후 사진 Files 속성에 등록된 자료입니다. 화면에는 항목별 최대 2장씩 표시합니다.
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    사진 등록 항목 {photoEvidenceItems.length}건
                  </p>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {photoEvidenceItems.slice(0, 8).map((item) => (
                    <PhotoEvidenceCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ) : (
              <section className="print-section rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm print:border-slate-300 print:shadow-none">
                개선 전·후 사진이 등록된 위험요인은 아직 없습니다. 후속 운영에서 TBM/EB 사진과 연결해 보완할 수 있습니다.
              </section>
            )}

            <section className="print-section grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
                <h2 className="text-lg font-black text-slate-950">관리자 확인</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-500">확인자</p>
                    <div className="mt-8 border-b border-slate-400" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-500">확인일</p>
                    <div className="mt-8 border-b border-slate-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:border-slate-300 print:shadow-none">
                <h2 className="text-lg font-black text-slate-950">사업주/대표 확인</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-500">확인자</p>
                    <div className="mt-8 border-b border-slate-400" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-500">확인일</p>
                    <div className="mt-8 border-b border-slate-400" />
                  </div>
                </div>
              </div>
            </section>

            <section className="print-section rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-600 shadow-sm print:border-slate-300 print:shadow-none">
              <h2 className="text-sm font-black text-slate-950">출력 및 보관 참고사항</h2>
              <ul className="mt-2 space-y-1">
                <li>• 본 자료는 SafeMetrica에 기록된 위험성평가 DB를 출력 양식으로 정리한 초안입니다.</li>
                <li>• 개선 후 위험성은 입력값 또는 목표값 기준이며, 실제 조치 완료 후 재확인이 필요합니다.</li>
                <li>• 개선 전·후 사진은 Risk DB 표준 Files 필드 기준으로 표시되며, TBM/EB 사진 자동 연결은 후속 버전에서 지원합니다.</li>
                <li>• 최종 위험성평가의 확정, 승인, 보관 책임은 사업장 관리 기준에 따라 사업주 또는 관리자가 확인해야 합니다.</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
