import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const tenants = [
  {
    code: "daedo",
    name: "㈜대도환경",
    industry: "생활폐기물",
    status: "운영중",
    desc: "TBM, EB, PTW, 위험성평가, 월간보고서 운영",
  },
  {
    code: "dongwoo",
    name: "동우환경",
    category: "생활폐기물",
    status: "운영중",
    description: "TBM, EB, PTW, 위험성평가, 현장참여, 월간보고서 운영",
  },
  {
    code: "hankookgreen",
    name: "한국그린환경",
    category: "생활폐기물",
    status: "운영중",
    description: "TBM, EB, PTW, 위험성평가, 현장참여, 월간보고서 운영",
  },
  {
    code: "demo",
    name: "데모 사업장",
    industry: "공통 데모",
    status: "데모",
    desc: "SafeMetrica 기본 화면 확인용",
  },
  {
    code: "bubblemon",
    name: "버블몬코리아",
    industry: "물류업 · 원청",
    status: "계약예정",
    desc: "원청·협력사 안전운영, TBM, 점검·교육, 위험성평가, 월간보고서 운영",
  },
];

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

export default async function OwnerConsolePage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  if (params.token) {
    redirect(`/api/owner/login?token=${encodeURIComponent(params.token)}`);
  }

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-blue-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-blue-300">SafeMetrica Owner Console</p>
          <h1 className="mt-2 text-3xl font-black">관리자 전체앱</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            고객사 전용 토큰을 매번 복사하지 않고, 관리자 권한으로 운영 고객사를 선택해 접속합니다.
            이 화면은 고객사 홈 메뉴에 노출되지 않습니다.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {tenants.map((tenant) => (
            <article key={tenant.code} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">{tenant.industry}</p>
                  <h2 className="mt-1 text-xl font-black">{tenant.name}</h2>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  {tenant.status}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">{tenant.desc}</p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <a
                  href={`/api/owner/select?code=${tenant.code}`}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-black hover:bg-blue-500"
                >
                  운영 홈 접속
                </a>
                <a
                  href={`/api/owner/select?code=${tenant.code}`}
                  className="rounded-xl border border-slate-600 px-4 py-3 text-center text-sm font-black text-slate-200 hover:bg-slate-800"
                >
                  고객사 선택
                </a>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <p className="text-sm font-bold text-amber-200">Principal · Contractor</p>
          <h2 className="mt-2 text-2xl font-black text-white">몬스 독립 테넌트 운영</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            몬스는 버블몬 협력사가 아니라 3개월 단기 독립 테넌트입니다. 현장참여와 TBM 중심으로
            TBM, 점검·교육, 위험성평가 공유, 교육증빙, 월간보고서 관리 범위를 확인합니다.
          </p>
          <div className="mt-5">
            <a
              href="/owner"
              className="inline-flex rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
            >
              물류업 계약 준비 화면 열기
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-500/30 bg-slate-900 p-5">
          <p className="text-sm font-bold text-blue-300">Partner Console</p>
          <h2 className="mt-2 text-2xl font-black text-white">SafeMetrica EduLink™</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            교육기관 제휴형 파트너 콘솔입니다. 가온에듀 지사와 파일럿 고객사의 교육이수증빙 운영 현황을 확인합니다.
            이 메뉴는 관리자 전체앱에만 표시되며 고객사 홈에는 노출되지 않습니다.
          </p>
          <div className="mt-5">
            <a
              href="/partner/gaon"
              className="inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-500"
            >
              가온에듀 파트너 콘솔 열기
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h2 className="text-lg font-black text-amber-200">운영 원칙</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            <li>• 고객사 일반 화면에는 전체 고객사 목록을 노출하지 않습니다.</li>
            <li>• 고객사는 기존 전용 보안 링크로만 접속합니다.</li>
            <li>• 관리자는 owner token으로만 전체앱에 접근합니다.</li>
            <li>• token 값은 GitHub, 채팅, 공개 문서에 남기지 않습니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
