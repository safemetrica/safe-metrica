import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ShareItem = {
  index: number;
  taskName: string;
  hazard: string;
  accidentType: string;
  riskLevel: string;
  safetyMeasure: string;
  workerVisible: boolean;
  customerConfirmed: boolean;
};

const SAMPLE_ITEMS: ShareItem[] = [
  {
    index: 1,
    taskName: "폐기물 상차 작업",
    hazard: "차량 후진, 적재함 주변 협착",
    accidentType: "협착·충돌",
    riskLevel: "상",
    safetyMeasure: "후진 유도자 배치, 작업반경 통제, 신호 확인 후 접근",
    workerVisible: true,
    customerConfirmed: false,
  },
  {
    index: 2,
    taskName: "분리수거장 정리",
    hazard: "날카로운 폐기물, 미끄러운 바닥",
    accidentType: "베임·넘어짐",
    riskLevel: "중",
    safetyMeasure: "절단방지장갑 착용, 바닥 이물질 제거, 젖은 구간 우회",
    workerVisible: true,
    customerConfirmed: false,
  },
  {
    index: 3,
    taskName: "현장 이동 및 차량 유도",
    hazard: "보행자와 차량 동선 혼재",
    accidentType: "충돌·전도",
    riskLevel: "중",
    safetyMeasure: "차량 동선 분리, 이동 전 주변 확인, 야간 반사조끼 착용",
    workerVisible: true,
    customerConfirmed: false,
  },
];

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function cleanText(value: string, max = 160) {
  return value.trim().slice(0, max);
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function isChecked(value: string) {
  return value === "on" || value === "true" || value === "1";
}

function getRiskLevelClass(level: string) {
  if (level === "상") return "border-red-400/40 bg-red-500/10 text-red-100";
  if (level === "중") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  if (level === "하") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  return "border-slate-600 bg-slate-950/60 text-slate-300";
}

function getShareItem(params: Record<string, string | string[] | undefined>, index: number): ShareItem {
  const sample = SAMPLE_ITEMS[index - 1];

  return {
    index,
    taskName: cleanText(readParam(params, `item${index}TaskName`) || sample.taskName),
    hazard: cleanText(readParam(params, `item${index}Hazard`) || sample.hazard),
    accidentType: cleanText(readParam(params, `item${index}AccidentType`) || sample.accidentType),
    riskLevel: cleanText(readParam(params, `item${index}RiskLevel`) || sample.riskLevel, 20),
    safetyMeasure: cleanText(readParam(params, `item${index}SafetyMeasure`) || sample.safetyMeasure, 220),
    workerVisible: isChecked(readParam(params, `item${index}WorkerVisible`) || (sample.workerVisible ? "on" : "")),
    customerConfirmed: isChecked(readParam(params, `item${index}CustomerConfirmed`) || (sample.customerConfirmed ? "on" : "")),
  };
}

function buildActivationHref(companyCode: string, companyName: string) {
  const query = new URLSearchParams();

  if (companyCode) query.set("companyCode", companyCode);
  if (companyName) query.set("companyName", companyName);

  query.set("sourceReceived", "on");
  query.set("shareItemsReady", "on");

  return `/owner/risk-share-activation?${query.toString()}`;
}

function buildWorkerRiskSummaryHref(companyCode: string) {
  return companyCode
    ? `/field/participation/risk-summary?company=${encodeURIComponent(companyCode)}`
    : "/field/participation/risk-summary";
}

function buildVersionLockHref(companyCode: string, companyName: string, sourceTitle: string, readyForVersionLock: boolean) {
  const query = new URLSearchParams();

  if (companyCode) query.set("companyCode", companyCode);
  if (companyName) query.set("companyName", companyName);
  if (sourceTitle) query.set("sourceTitle", sourceTitle);

  query.set("sourceReceived", "on");
  query.set("shareItemsReady", "on");
  query.set("workerVisibleChecked", "on");

  if (readyForVersionLock) {
    query.set("customerConfirmed", "on");
  }

  return `/owner/risk-share-activation/version-lock?${query.toString()}`;
}

export default async function RiskShareShareItemBuilderPage({ searchParams }: PageProps) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readParam(params, "companyCode"));
  const companyName = cleanText(readParam(params, "companyName"), 80);
  const sourceTitle = cleanText(readParam(params, "sourceTitle") || "고객 제공 위험성평가표", 120);

  const items = [1, 2, 3].map((index) => getShareItem(params, index));
  const visibleItems = items.filter((item) => item.workerVisible);
  const confirmedItems = items.filter((item) => item.customerConfirmed);
  const readyForCustomerReview = visibleItems.length > 0;
  const readyForVersionLock = visibleItems.length > 0 && visibleItems.length === confirmedItems.length;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link href="/owner/risk-share-activation" className="text-sm font-bold text-cyan-300 hover:text-cyan-200">
            ← 신규 고객 공유팩 활성화
          </Link>
          <Link href="/owner" className="text-sm font-bold text-slate-400 hover:text-slate-200">
            Owner Console
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
          <h1 className="mt-2 text-3xl font-black">공유항목 Builder v1</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            고객이 제공한 위험성평가 source에서 근로자에게 QR로 공유할 위험요인 항목을 정리합니다.
            이 화면은 정리·미리보기용이며, 위험성평가를 대신 작성하거나 법적 최종본을 확정하지 않습니다.
          </p>
        </section>

        <form className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-black text-slate-300">고객 코드 후보</span>
              <input
                name="companyCode"
                defaultValue={companyCode}
                placeholder="예: woogwang"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-300">고객명</span>
              <input
                name="companyName"
                defaultValue={companyName}
                placeholder="예: ㈜우광개발"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-300">Source 문서명</span>
              <input
                name="sourceTitle"
                defaultValue={sourceTitle}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="mt-6 space-y-5">
            {items.map((item) => (
              <section key={item.index} className="rounded-3xl border border-slate-700 bg-slate-950/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-cyan-300">공유항목 {item.index}</p>
                    <h2 className="mt-1 text-xl font-black text-white">근로자 공유 위험요인 후보</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskLevelClass(item.riskLevel)}`}>
                    {item.riskLevel || "등급 확인"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">작업명</span>
                    <input name={`item${item.index}TaskName`} defaultValue={item.taskName} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">사고유형</span>
                    <input name={`item${item.index}AccidentType`} defaultValue={item.accidentType} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">위험요인</span>
                    <input name={`item${item.index}Hazard`} defaultValue={item.hazard} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">위험등급</span>
                    <select name={`item${item.index}RiskLevel`} defaultValue={item.riskLevel} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                      <option value="상">상</option>
                      <option value="중">중</option>
                      <option value="하">하</option>
                      <option value="">확인 필요</option>
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-xs font-black text-slate-400">근로자가 확인할 안전조치</span>
                    <textarea name={`item${item.index}SafetyMeasure`} defaultValue={item.safetyMeasure} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm font-bold text-slate-200">
                    <input type="checkbox" name={`item${item.index}WorkerVisible`} defaultChecked={item.workerVisible} className="h-4 w-4" />
                    근로자 QR 화면에 표시
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm font-bold text-slate-200">
                    <input type="checkbox" name={`item${item.index}CustomerConfirmed`} defaultChecked={item.customerConfirmed} className="h-4 w-4" />
                    고객 공유범위 확인
                  </label>
                </div>
              </section>
            ))}
          </div>

          <button type="submit" className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">
            공유항목 미리보기
          </button>
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm font-bold text-slate-400">Share Item Status</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {readyForVersionLock ? "버전 잠금 후보" : readyForCustomerReview ? "고객 확인 필요" : "Hold"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              표시 항목 {visibleItems.length}건 / 고객 확인 {confirmedItems.length}건
            </p>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-bold text-emerald-300">Worker-facing Preview</p>
            <h2 className="mt-2 text-2xl font-black text-white">근로자 공유 화면 표시 후보</h2>

            <div className="mt-5 space-y-3">
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <div key={`preview-${item.index}`} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-blue-300">공유 위험 {item.index}</p>
                        <h3 className="mt-1 text-lg font-black text-white">{item.taskName}</h3>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskLevelClass(item.riskLevel)}`}>
                        {item.riskLevel || "확인 필요"}
                      </span>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                      <div>
                        <dt className="font-black text-slate-500">위험요인</dt>
                        <dd className="font-bold text-slate-200">{item.hazard || "-"}</dd>
                      </div>
                      <div>
                        <dt className="font-black text-slate-500">사고유형</dt>
                        <dd className="font-bold text-slate-200">{item.accidentType || "-"}</dd>
                      </div>
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                        <dt className="font-black text-emerald-200">확인할 안전조치</dt>
                        <dd className="font-bold text-emerald-50">{item.safetyMeasure || "-"}</dd>
                      </div>
                    </dl>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm font-bold text-amber-100">
                  근로자 QR 화면에 표시할 항목이 없습니다.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={buildWorkerRiskSummaryHref(companyCode)} className="rounded-xl border border-blue-500/40 px-4 py-3 text-sm font-black text-blue-100 hover:bg-blue-500/10">
                기존 근로자 공유요약 화면 확인
              </a>
              <a href={buildActivationHref(companyCode, companyName)} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400">
                활성화 화면으로 반영
              </a>
              <a href={buildVersionLockHref(companyCode, companyName, sourceTitle, readyForVersionLock)} className="rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-black text-amber-100 hover:bg-amber-500/10">
                Version Lock 체크
              </a>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h2 className="text-lg font-black text-amber-100">운영 주의</h2>
          <p className="mt-3 text-sm leading-6 text-amber-50">
            이 Builder는 고객 source를 근로자 공유용으로 정리하는 화면입니다. 저장 기능과 버전 잠금은 v2에서 구현합니다.
            위험성평가 작성 대행, 법적 의무 완료 보장, 조치완료 확정으로 표현하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
