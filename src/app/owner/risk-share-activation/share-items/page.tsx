import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

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
  sourceType: "sample" | "stored";
  createdAt?: string;
  siteName?: string;
  shareStatus?: string;
  customerCheckStatus?: string;
  versionLockId?: string;
  ownerNote?: string;
};

type RiskShareItemRow = {
  id?: string;
  created_at?: string;
  company_code?: string;
  company_name?: string | null;
  site_name?: string | null;
  task_name?: string | null;
  hazard?: string | null;
  accident_type?: string | null;
  risk_level?: string | null;
  current_controls?: string | null;
  improvement_plan?: string | null;
  worker_share_summary?: string | null;
  share_status?: string | null;
  customer_check_status?: string | null;
  customer_confirmed?: boolean | null;
  worker_visible?: boolean | null;
  version_lock_id?: string | null;
  owner_note?: string | null;
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
    sourceType: "sample",
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
    sourceType: "sample",
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
    sourceType: "sample",
  },
];

const SHARE_STATUS_LABELS: Record<string, string> = {
  draft: "공유 준비",
  needs_customer_check: "고객 확인 필요",
  customer_confirmed: "고객 확인 완료",
  locked: "Version Lock 반영",
  excluded: "제외",
};

const CUSTOMER_CHECK_STATUS_LABELS: Record<string, string> = {
  not_requested: "요청 전",
  requested: "확인 요청",
  confirmed: "확인 완료",
  returned: "반려·보완",
};

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

function cleanText(value: unknown, maxOrFallback: number | string = 160, maybeMax = 160) {
  const fallback = typeof maxOrFallback === "string" ? maxOrFallback : "";
  const max = typeof maxOrFallback === "number" ? maxOrFallback : maybeMax;

  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
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

function getShareStatusClass(status?: string) {
  if (status === "locked") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  if (status === "customer_confirmed") return "border-blue-400/40 bg-blue-400/10 text-blue-100";
  if (status === "needs_customer_check") return "border-amber-400/40 bg-amber-400/10 text-amber-100";
  if (status === "excluded") return "border-slate-500/40 bg-slate-500/10 text-slate-200";
  return "border-cyan-400/40 bg-cyan-400/10 text-cyan-100";
}

function formatDate(value?: string) {
  if (!value) return "생성일 확인 필요";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16).replace("T", " ");
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
    sourceType: "sample",
  };
}

function mapRiskShareItemRow(row: RiskShareItemRow, index: number): ShareItem {
  return {
    index,
    taskName: cleanText(row.task_name, "작업명 확인 필요"),
    hazard: cleanText(row.hazard, "위험요인 확인 필요"),
    accidentType: cleanText(row.accident_type, "사고유형 확인 필요"),
    riskLevel: cleanText(row.risk_level, "등급 확인 필요", 20),
    safetyMeasure: cleanText(row.worker_share_summary || row.improvement_plan || row.current_controls, "안전조치 확인 필요", 220),
    workerVisible: Boolean(row.worker_visible),
    customerConfirmed: Boolean(row.customer_confirmed),
    sourceType: "stored",
    createdAt: row.created_at,
    siteName: cleanText(row.site_name, "", 80),
    shareStatus: cleanText(row.share_status, "draft", 40),
    customerCheckStatus: cleanText(row.customer_check_status, "not_requested", 40),
    versionLockId: cleanText(row.version_lock_id, "", 80),
    ownerNote: cleanText(row.owner_note, "", 180),
  };
}

async function fetchRiskShareItems(companyCode: string) {
  if (!companyCode) return [];

  const query = new URLSearchParams({
    select:
      "id,created_at,company_code,company_name,site_name,task_name,hazard,accident_type,risk_level,current_controls,improvement_plan,worker_share_summary,share_status,customer_check_status,customer_confirmed,worker_visible,version_lock_id,owner_note",
    company_code: `eq.${companyCode}`,
    order: "created_at.desc",
    limit: "100",
  });

  const rows = await selectSupabaseExportRows<RiskShareItemRow>("risk_share_items", query);
  return rows.map((row, index) => mapRiskShareItemRow(row, index + 1));
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

  let storedItems: ShareItem[] = [];
  let loadFailed = false;

  try {
    storedItems = await fetchRiskShareItems(companyCode);
  } catch {
    loadFailed = true;
  }

  const items = storedItems.length > 0 ? storedItems : [1, 2, 3].map((index) => getShareItem(params, index));
  const usingStoredItems = storedItems.length > 0;
  const usingSampleFallback = !usingStoredItems;
  const previewItems = items.filter((item) => item.workerVisible || item.sourceType === "sample");
  const confirmedItems = items.filter((item) => item.customerConfirmed);
  const lockedItems = items.filter((item) => item.shareStatus === "locked" && item.versionLockId);
  const readyForCustomerReview = items.length > 0;
  const readyForVersionLock = usingStoredItems
    ? items.length > 0 && items.length === confirmedItems.length
    : previewItems.length > 0 && previewItems.length === confirmedItems.length;

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
            companyCode가 있으면 Supabase risk_share_items 원장의 공유 준비 항목을 먼저 조회하고,
            저장된 항목이 없을 때만 샘플 Builder를 표시합니다.
          </p>
        </section>

        {readParam(params, "created") === "1" ? (
          <section className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm font-bold text-emerald-100">
            후보가 공유 준비 항목으로 전환되었습니다. 아직 고객 확인과 Version Lock 전이므로 근로자 QR 확정 노출값은 아닙니다.
          </section>
        ) : null}

        {readParam(params, "created") === "already_exists" ? (
          <section className="mt-6 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm font-bold text-amber-100">
            이미 공유 준비 항목으로 전환된 후보입니다. 아래 원장 항목을 확인하세요.
          </section>
        ) : null}

        {loadFailed ? (
          <section className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5">
            <h2 className="text-lg font-black text-rose-100">risk_share_items 원장 조회 실패</h2>
            <p className="mt-2 text-sm leading-6 text-rose-50">
              Supabase 설정, Owner 권한, risk_share_items migration 적용 여부를 확인하세요. 조회 실패 시 고객·근로자 화면에 확정값으로 노출하지 않습니다.
            </p>
          </section>
        ) : null}

        {companyCode && usingSampleFallback && !loadFailed ? (
          <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-black text-white">저장된 공유 준비 항목 없음</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              현재 companyCode 기준 risk_share_items 원장 항목이 없습니다. 아래는 기존 SAMPLE_ITEMS 기반 미리보기입니다.
              accepted 또는 edited 후보를 먼저 공유 준비 항목으로 전환하세요.
            </p>
          </section>
        ) : null}

        {usingStoredItems ? (
          <section className="mt-6 rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-200">Supabase 원장 조회</p>
                <h2 className="mt-1 text-2xl font-black text-white">risk_share_items 공유 준비 항목 {items.length}건</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/85">
                  이 항목은 accepted/edited 후보에서 전환된 공유 준비 원장입니다. 고객 확인과 Version Lock 전에는 근로자 QR 확정 노출값이 아닙니다.
                </p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                stored ledger
              </span>
            </div>
          </section>
        ) : null}

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
              <section key={`${item.sourceType}-${item.index}`} className="rounded-3xl border border-slate-700 bg-slate-950/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <p className="text-xs font-black text-cyan-300">공유항목 {item.index}</p>
                      {item.sourceType === "stored" ? (
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getShareStatusClass(item.shareStatus)}`}>
                          {SHARE_STATUS_LABELS[item.shareStatus ?? "draft"] ?? item.shareStatus}
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-[11px] font-black text-slate-300">
                          sample fallback
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 text-xl font-black text-white">근로자 공유 위험요인 후보</h2>
                    {item.sourceType === "stored" ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        생성일 {formatDate(item.createdAt)} · 고객확인 {CUSTOMER_CHECK_STATUS_LABELS[item.customerCheckStatus ?? "not_requested"] ?? item.customerCheckStatus}
                        {item.siteName ? ` · 현장 ${item.siteName}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskLevelClass(item.riskLevel)}`}>
                    {item.riskLevel || "등급 확인"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">작업명</span>
                    <input name={`item${item.index}TaskName`} defaultValue={item.taskName} readOnly={item.sourceType === "stored"} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">사고유형</span>
                    <input name={`item${item.index}AccidentType`} defaultValue={item.accidentType} readOnly={item.sourceType === "stored"} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">위험요인</span>
                    <input name={`item${item.index}Hazard`} defaultValue={item.hazard} readOnly={item.sourceType === "stored"} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black text-slate-400">위험등급</span>
                    <select name={`item${item.index}RiskLevel`} defaultValue={item.riskLevel} disabled={item.sourceType === "stored"} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-100">
                      <option value="상">상</option>
                      <option value="중">중</option>
                      <option value="하">하</option>
                      <option value="">확인 필요</option>
                      <option value="등급 확인 필요">등급 확인 필요</option>
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-xs font-black text-slate-400">근로자가 확인할 안전조치</span>
                    <textarea name={`item${item.index}SafetyMeasure`} defaultValue={item.safetyMeasure} rows={3} readOnly={item.sourceType === "stored"} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white" />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm font-bold text-slate-200">
                    <input type="checkbox" name={`item${item.index}WorkerVisible`} defaultChecked={item.workerVisible} readOnly className="h-4 w-4" />
                    근로자 QR 표시 후보
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm font-bold text-slate-200">
                    <input type="checkbox" name={`item${item.index}CustomerConfirmed`} defaultChecked={item.customerConfirmed} readOnly className="h-4 w-4" />
                    고객 공유범위 확인
                  </div>
                </div>

                {item.sourceType === "stored" ? (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">
                    risk_share_items draft는 공유 준비 원장입니다. customer_confirmed=true라도 Version Lock 전에는 최종 공유 항목이 아닙니다.
                    {item.ownerNote ? <p className="mt-2 text-amber-50">Owner 메모: {item.ownerNote}</p> : null}
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          {!usingStoredItems ? (
            <button type="submit" className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">
              공유항목 미리보기
            </button>
          ) : null}
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm font-bold text-slate-400">Share Item Status</p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {readyForVersionLock ? "버전 잠금 후보" : readyForCustomerReview ? "고객 확인 필요" : "Hold"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              공유 준비 {items.length}건 / 고객 확인 {confirmedItems.length}건 / Lock 반영 {lockedItems.length}건
            </p>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-bold text-emerald-300">Worker-facing Preview</p>
            <h2 className="mt-2 text-2xl font-black text-white">근로자 공유 화면 표시 후보</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              이 미리보기는 Owner 내부 확인용입니다. Worker QR 최종 노출은 customer_confirmed, worker_visible, version_lock_id, share_status=locked 조건을 후속 PR에서 분리 확인해야 합니다.
            </p>

            <div className="mt-5 space-y-3">
              {previewItems.length > 0 ? (
                previewItems.map((item) => (
                  <div key={`preview-${item.sourceType}-${item.index}`} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
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
                  현재 근로자 QR 화면에 표시할 확정 항목은 없습니다. draft 항목은 고객 확인과 Version Lock 전까지 내부 준비 항목입니다.
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
            이 Builder는 고객 source를 근로자 공유용으로 정리하는 Owner 내부 화면입니다.
            accepted candidate는 고객 확인 완료가 아니고, risk_share_items draft는 worker QR 확정 노출값이 아닙니다.
            customer_confirmed는 Version Lock과 다르며, Version Lock 전 항목은 최종 공유 항목으로 표현하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
