import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
          <h1 className="mt-2 text-3xl font-black">고객사 온보딩 체크리스트</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            가온에듀 지사 파일럿 고객사가 들어왔을 때, SafeMetrica 고객사 테넌트 세팅과
            교육·위험성평가·TBM·증빙관리 운영을 시작하기 위한 확인 항목입니다.
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
