import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CUSTOMER_INTAKE_CSV_HEADERS,
  CUSTOMER_INTAKE_FORM_FIELDS,
  CUSTOMER_INTAKE_SAMPLE_ROW,
  getCustomerIntakeFormSummary,
} from "@/lib/customerIntakeForm";
import {
  CUSTOMER_SETUP_PIPELINE_STAGES,
  SAMPLE_CUSTOMER_SETUP_PIPELINE_RECORDS,
  getCustomerSetupPipelineSummary,
} from "@/lib/customerSetupPipeline";

const setupPipelineSummary = getCustomerSetupPipelineSummary(SAMPLE_CUSTOMER_SETUP_PIPELINE_RECORDS);
const intakeFormSummary = getCustomerIntakeFormSummary(CUSTOMER_INTAKE_FORM_FIELDS);

const onboardingSections = [
  {
    title: "1. 고객사 기본정보",
    items: [
      "회사명",
      "사업자등록번호",
      "업종",
      "현장 주소",
      "근로자 수",
      "주요 작업·공정",
    ],
  },
  {
    title: "2. 담당자 정보",
    items: [
      "대표자 또는 의사결정자",
      "안전관리 담당자",
      "교육 담당자",
      "연락처",
      "이메일",
    ],
  },
  {
    title: "3. 기존 안전자료",
    items: [
      "기존 위험성평가 자료",
      "위험성평가 실시일",
      "근로자 참여 기록",
      "위험성평가 결과 공유 여부",
      "개선대책 관리 여부",
    ],
  },
  {
    title: "4. 교육·이수증빙",
    items: [
      "법정교육 이수증 또는 수료증",
      "교육 출석부",
      "교육시간 기록",
      "불참자 보완교육 여부",
      "교육사진 또는 서명사진",
    ],
  },
  {
    title: "5. TBM·현장 증빙",
    items: [
      "TBM 운영 여부",
      "TBM 참석자 기록",
      "작업 전 안전활동 사진",
      "위험요인 공유 기록",
      "조치 전·후 사진",
    ],
  },
  {
    title: "6. SafeMetrica 세팅",
    items: [
      "고객사 코드 생성",
      "업종 Pack 선택",
      "고객사 보안 링크 발급",
      "점검·교육 화면 확인",
      "월간보고서 발행 준비",
    ],
  },
];

const pilotSteps = [
  "가온에듀 지사가 파일럿 고객사 후보를 추천합니다.",
  "SafeMetrica가 고객사 기본정보와 기존 자료를 확인합니다.",
  "고객사별 전용 운영 환경과 보안 링크를 세팅합니다.",
  "교육·위험성평가·TBM·증빙자료를 1개월간 운영합니다.",
  "월간보고서를 발행하고 가온에듀 지사와 결과를 공유합니다.",
];

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

export default async function GaonEduLinkOnboardingPage() {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <a href="/partner/gaon" className="text-sm font-bold text-blue-700 hover:text-blue-600">
          ← EduLink 콘솔로
        </a>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-blue-700">EduLink Onboarding</p>
          <h1 className="mt-2 text-3xl font-black">내부 고객사 세팅 체크리스트</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            가온에듀 지사 파일럿 고객사를 세팅할 때, SafeMetrica 내부 운영자가 고객사 테넌트 세팅과
            교육·위험성평가·TBM·증빙관리 운영을 시작하기 위해 확인하는 내부 운영 항목입니다.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-black text-blue-950">내부 사용 기준</h2>
          <p className="mt-2 text-sm leading-6 text-blue-950">
            이 화면은 SafeMetrica 내부 운영자가 사용하는 세팅 체크리스트입니다.
            고객사 및 외부 파트너에게 상시 공유하는 화면이 아니며,
            파일럿 고객사 자료 수집과 초기 세팅 확인 목적으로 사용합니다.
          </p>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-black text-amber-950">운영 원칙</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
            <li>• 고객사는 대도환경처럼 개별 SafeMetrica 고객사 테넌트로 관리합니다.</li>
            <li>• 가온에듀 지사는 고객사 접점과 교육자료 연계를 담당합니다.</li>
            <li>• SafeMetrica는 교육기관을 대체하지 않고, 교육 이후 증빙관리와 월간보고를 지원합니다.</li>
            <li>• 위험성평가는 “이수”가 아니라 실시·근로자 참여·결과 공유 기록으로 관리합니다.</li>
          </ul>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">Customer Intake</p>
              <h2 className="text-xl font-black">고객사 접수 양식 v1</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                가온에듀 지사 또는 내부 영업을 통해 고객사 후보가 들어왔을 때, 테넌트 세팅 전에 반드시 확인할 접수 항목입니다.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              필수 {intakeFormSummary.required} · 권장 {intakeFormSummary.recommended} · 선택 {intakeFormSummary.optional}
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-3">항목</th>
                  <th className="px-3 py-3">구분</th>
                  <th className="px-3 py-3">설명</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMER_INTAKE_FORM_FIELDS.map((field) => (
                  <tr key={field.key} className="border-t border-slate-200">
                    <td className="px-3 py-3 font-black text-slate-900">{field.label}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {field.requirement}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-black">CSV 헤더 예시</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {CUSTOMER_INTAKE_CSV_HEADERS.join(", ")}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-black">샘플 입력값</h3>
              <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                {Object.entries(CUSTOMER_INTAKE_SAMPLE_ROW).slice(0, 6).map(([key, value]) => (
                  <p key={key}>
                    <span className="font-bold text-slate-900">{key}</span>: {value}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-blue-700">Setup Pipeline</p>
              <h2 className="text-xl font-black">고객사 세팅 파이프라인</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                고객사 접수부터 자료확인, 테넌트 세팅, 보안링크 발급, 월간보고서 발행까지 내부 진행 상태를 관리합니다.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              내부 운영용
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">접수 고객사</p>
              <p className="mt-2 text-3xl font-black">{setupPipelineSummary.total}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">세팅 가능 후보</p>
              <p className="mt-2 text-3xl font-black">{setupPipelineSummary.readyForTenantSetupCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">보완 필요</p>
              <p className="mt-2 text-3xl font-black">{setupPipelineSummary.blockedCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">보안링크 발급</p>
              <p className="mt-2 text-3xl font-black">{setupPipelineSummary.secureLinkIssuedCount}</p>
            </article>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-black">진행 단계</h3>
              <div className="mt-3 space-y-2">
                {CUSTOMER_SETUP_PIPELINE_STAGES.map((item, index) => (
                  <div key={item.stage} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                    <p className="font-black text-slate-900">
                      {index + 1}. {item.stage}
                    </p>
                    <p className="mt-1 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-black">파일럿 후보 현황</h3>
              <div className="mt-3 space-y-3">
                {SAMPLE_CUSTOMER_SETUP_PIPELINE_RECORDS.map((record) => (
                  <div key={record.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{record.customerName}</p>
                        <p className="mt-1 text-slate-600">
                          {record.industry} · 근로자 {record.workerCount ?? 0}명
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {record.currentStage}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-700">다음 조치: {record.nextAction}</p>
                    {record.blockedReasons.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {record.blockedReasons.map((reason) => (
                          <span key={reason} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {onboardingSections.map((section) => (
            <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">파일럿 진행 순서</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-5">
            {pilotSteps.map((step, index) => (
              <li key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-blue-700">STEP {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">고객사 전달 링크 기준</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-black">고객사 운영 홈</p>
              <p className="mt-2 text-sm text-slate-600">고객사 전용 보안 링크로 접속합니다.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-black">점검·교육</p>
              <p className="mt-2 text-sm text-slate-600">교육·이수증빙, 위험성평가 공유기록을 확인합니다.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-black">월간보고서</p>
              <p className="mt-2 text-sm text-slate-600">교육·참여·증빙 요약과 다음 달 운영계획을 확인합니다.</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            파트너 콘솔 링크는 고객사에 전달하지 않습니다. 고객사는 개별 고객사 운영 화면으로만 접속합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
