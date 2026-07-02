import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
  }>;
};

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function isRiskSharePackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

const VISIT_PURPOSES = ["일반 방문", "납품", "상하차", "협력업체 작업", "점검·정비", "기타"];

const SAFETY_NOTICES = [
  {
    icon: "🚶",
    title: "지정 통로로만 이동",
    body: "노란 보행선 밖은 지게차 동선입니다. 안내자 없이 작업 구역에 들어가지 마세요.",
  },
  {
    icon: "🚛",
    title: "하역장 후진 차량 주의",
    body: "차량 후진 시 유도자 신호를 따라 주세요. 차량 뒤편 대기 금지.",
  },
  {
    icon: "🚨",
    title: "비상시 집결 장소",
    body: "비상벨이 울리면 정문 앞 주차장으로 이동해 주세요.",
  },
];

export default async function RiskShareVisitorPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const companyLabel = tenant?.name || companyCode || "현장";
  const companyMark = companyLabel.trim().charAt(0) || "현";
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const returnHref = `/risk-share/field?company=${encodeURIComponent(companyCode)}`;

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
            <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
                SafeMetrica
              </div>
              <h1 className="mt-5 text-2xl font-black leading-tight tracking-tight">
                현장 QR 확인 중
              </h1>
            </div>
            <div className="p-4">
              <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-5 text-sm font-bold leading-7 text-amber-950">
                이 안내 화면은 지정된 현장 QR에서만 열립니다. 현장 담당자에게 최신 QR 링크를
                요청해 주세요.
              </div>
              {companyCode ? (
                <a
                  href={returnHref}
                  className="mt-4 block rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
                >
                  현장 QR 입구로 돌아가기
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF4F8] px-4 py-5 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md flex-col justify-center">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="bg-gradient-to-br from-[#083A6B] via-[#0B5EA8] to-[#19B7A4] p-6 text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.68rem] font-black tracking-tight text-white/90">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[0.6rem] font-black text-[#0B5EA8]">
                  {companyMark}
                </span>
                {companyLabel}
              </span>
              <span className="text-[0.68rem] font-black tracking-tight text-white/70">
                SafeMetrica
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span aria-hidden="true" className="text-sm">🌐</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-black text-[#0B5EA8]">한국어</span>
              <span className="rounded-full border border-white/25 bg-white/5 px-2.5 py-1 text-[0.65rem] font-black text-white/70">English</span>
              <span className="rounded-full border border-white/25 bg-white/5 px-2.5 py-1 text-[0.65rem] font-black text-white/70">Tiếng Việt</span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[0.6rem] font-bold text-white/35">中文</span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[0.6rem] font-bold text-white/35">ไทย</span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[0.6rem] font-bold text-white/35">Bahasa</span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[0.6rem] font-bold text-white/35">Русский</span>
            </div>

            <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight">
              방문자
              <br />
              출입 전 안전 안내
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/85">
              출입 전에 아래 안내를 확인해 주세요. 약 1분.
            </p>
          </div>

          <div className="space-y-4 p-4">
            <fieldset>
              <legend className="text-sm font-black text-slate-800">방문 목적</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {VISIT_PURPOSES.map((purpose, index) => (
                  <label
                    key={purpose}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-800 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="radio"
                      name="visitPurpose"
                      defaultChecked={index === 1}
                      className="h-4 w-4 shrink-0 border-slate-300 text-blue-600"
                    />
                    {purpose}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-black text-slate-800">
              소속(업체명)
              <input
                name="visitorCompany"
                placeholder="예: 한빛물류"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
              />
            </label>

            <label className="block text-sm font-black text-slate-800">
              확인자 이름 <span className="font-bold text-slate-400">· 이름만 받습니다</span>
              <input
                name="visitorName"
                placeholder="예: 김확인"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400"
              />
            </label>

            <div>
              <p className="text-sm font-black text-slate-800">출입 전 주요 주의사항</p>
              <div className="mt-2 space-y-2">
                {SAFETY_NOTICES.map((notice) => (
                  <div key={notice.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <h4 className="text-sm font-black text-slate-900">
                      {notice.icon} {notice.title}
                    </h4>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{notice.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold leading-5 text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
              위 안전 안내를 확인했습니다.
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                disabled
                className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-300 px-5 text-sm font-black text-slate-600"
              >
                확인하고 출입하기
              </button>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                제출 기능은 준비 중입니다. 운영자 확인 후 이 화면에서 바로 연결될 예정입니다.
              </p>
            </div>

            <p className="text-center text-xs font-bold leading-5 text-slate-500">
              확인 내용은 출입 안전확인 기록으로만 사용될 예정입니다. 확인이 어려우면 현장
              담당자에게 문의해 주세요.
            </p>

            <a
              href={returnHref}
              className="block rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-600"
            >
              현장 QR 입구로 돌아가기
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
