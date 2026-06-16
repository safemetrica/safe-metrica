import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type LockCheck = {
  key: string;
  title: string;
  description: string;
  required: boolean;
};

type VersionLockRow = {
  id?: string;
  created_at?: string;
  company_code?: string;
  company_name?: string | null;
  site_name?: string | null;
  source_title?: string | null;
  lock_title?: string | null;
  lock_month?: string | null;
  item_count?: number | string | null;
  customer_confirmed_count?: number | string | null;
  worker_visible_count?: number | string | null;
  lock_status?: string | null;
  locked_by?: string | null;
  notes?: string | null;
};

type VersionLockResult = {
  status: "idle" | "ok" | "not_found" | "failed";
  lock: VersionLockRow | null;
};

const LOCK_CHECKS: LockCheck[] = [
  {
    key: "sourceReceived",
    title: "위험성평가 source 접수",
    description: "고객이 기존 위험성평가표 또는 평가결과지를 제공했는지 확인합니다.",
    required: true,
  },
  {
    key: "shareItemsReady",
    title: "공유항목 Builder 정리",
    description: "근로자에게 공유할 작업명, 위험요인, 사고유형, 안전조치가 정리됐는지 확인합니다.",
    required: true,
  },
  {
    key: "customerConfirmed",
    title: "고객 공유범위 확인",
    description: "고객 담당자가 근로자에게 공유될 항목과 표현 범위를 확인했는지 확인합니다.",
    required: true,
  },
  {
    key: "workerVisibleChecked",
    title: "근로자 표시 항목 확인",
    description: "근로자 QR 화면에 표시할 항목만 선택됐는지 확인합니다.",
    required: true,
  },
  {
    key: "representativeFlowChecked",
    title: "근로자대표 확인 흐름 확인",
    description: "근로자대표 참여확인 링크 생성·폐기·확인 관리 흐름을 사용할지 확인합니다.",
    required: false,
  },
  {
    key: "companiesDbRegistered",
    title: "Companies DB 등록 / active 확인",
    description: "신규 고객 코드가 Companies DB에 등록되고 active 상태인지 확인합니다.",
    required: true,
  },
  {
    key: "qrPosterReady",
    title: "QR 포스터 준비",
    description: "현장 게시용 QR 포스터와 근로자 안내문이 준비됐는지 확인합니다.",
    required: false,
  },
  {
    key: "exportChecked",
    title: "월간요약 / Export 경로 확인",
    description: "공유팩 월간보고서와 고객용 Export 경로를 확인합니다.",
    required: true,
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

function cleanText(value: string, max = 120) {
  return value.trim().slice(0, max);
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function formatKstDateTime(value?: string | null) {
  if (!value) {
    return "확인 필요";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16).replace("T", " ");
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

function buildOwnerSelectHref(companyCode: string, nextPath: string) {
  return `/api/owner/select?code=${encodeURIComponent(companyCode)}&next=${encodeURIComponent(nextPath)}`;
}

function buildWorkerQrHref(companyCode: string) {
  return `/field/participation?company=${encodeURIComponent(companyCode)}`;
}

function buildRiskSummaryHref(companyCode: string) {
  return `/field/participation/risk-summary?company=${encodeURIComponent(companyCode)}`;
}

function getCurrentKstMonth() {
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 7);
}

function getCheckStatus(params: Record<string, string | string[] | undefined>, key: string) {
  return isChecked(readParam(params, key));
}

async function fetchVersionLockResult(versionLockId: string, companyCode: string): Promise<VersionLockResult> {
  if (!versionLockId || !companyCode || !isUuid(versionLockId)) {
    return {
      status: "idle",
      lock: null,
    };
  }

  const query = new URLSearchParams({
    select:
      "id,created_at,company_code,company_name,site_name,source_title,lock_title,lock_month,item_count,customer_confirmed_count,worker_visible_count,lock_status,locked_by,notes",
    id: `eq.${versionLockId}`,
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  try {
    const rows = await selectSupabaseExportRows<VersionLockRow>("risk_share_version_locks", query);

    return {
      status: rows[0] ? "ok" : "not_found",
      lock: rows[0] ?? null,
    };
  } catch {
    return {
      status: "failed",
      lock: null,
    };
  }
}

function CheckBadge({ done, required }: { done: boolean; required: boolean }) {
  if (done) {
    return (
      <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
        완료
      </span>
    );
  }

  return (
    <span
      className={
        required
          ? "rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-xs font-black text-red-200"
          : "rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200"
      }
    >
      {required ? "필수 대기" : "선택 대기"}
    </span>
  );
}

export default async function RiskShareVersionLockPage({ searchParams }: PageProps) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readParam(params, "companyCode"));
  const companyName = cleanText(readParam(params, "companyName"), 80);
  const versionLabel = cleanText(readParam(params, "versionLabel") || "RSP-v1", 80);
  const sourceTitle = cleanText(readParam(params, "sourceTitle") || "고객 제공 위험성평가표", 120);
  const lockMonth = cleanText(readParam(params, "lockMonth") || getCurrentKstMonth(), 20);
  const versionLocked = readParam(params, "versionLocked") === "1";
  const versionLockId = cleanText(readParam(params, "versionLockId"), 80);
  const errorCode = cleanText(readParam(params, "error"), 80);
  const versionLockResult = await fetchVersionLockResult(versionLockId, companyCode);

  const requiredChecks = LOCK_CHECKS.filter((item) => item.required);
  const completedRequiredCount = requiredChecks.filter((item) => getCheckStatus(params, item.key)).length;
  const completedAllCount = LOCK_CHECKS.filter((item) => getCheckStatus(params, item.key)).length;
  const requiredReady = completedRequiredCount === requiredChecks.length;
  const hasCompanyCode = Boolean(companyCode);
  const goLiveReady = requiredReady && hasCompanyCode;

  const statusLabel = goLiveReady ? "Go-Live 가능" : requiredReady ? "코드 확인 필요" : "Version Lock 대기";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link href="/owner/risk-share-activation/share-items" className="text-sm font-bold text-cyan-300 hover:text-cyan-200">
            ← 공유항목 Builder
          </Link>
          <Link href="/owner/risk-share-activation" className="text-sm font-bold text-slate-400 hover:text-slate-200">
            신규 고객 공유팩 활성화
          </Link>
          <Link href="/owner" className="text-sm font-bold text-slate-400 hover:text-slate-200">
            Owner Console
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
          <h1 className="mt-2 text-3xl font-black">Version Lock / Go-Live Checklist v1</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            공유항목을 고객 확인 후 고정하고, QR 배포 전 필수 확인 상태를 점검합니다.
            이 화면은 운영 잠금 후보 상태를 확인하는 Owner 전용 체크리스트이며, 법적 적합성 또는 조치완료를 확정하지 않습니다.
          </p>
        </section>

        {versionLocked ? (
          <section className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-emerald-100">Version Lock 생성 완료</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50">
                  고객 확인 완료 항목이 Version Lock으로 고정되었습니다. 이제 근로자 QR 공유요약은 locked 조건을 만족하는 항목만 노출합니다.
                </p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                locked
              </span>
            </div>

            {versionLockResult.status === "ok" && versionLockResult.lock ? (
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  {
                    label: "Lock 제목",
                    value: versionLockResult.lock.lock_title || "제목 확인 필요",
                  },
                  {
                    label: "대상월",
                    value: versionLockResult.lock.lock_month || "월 확인 필요",
                  },
                  {
                    label: "Lock 항목",
                    value: `${readNumber(versionLockResult.lock.item_count)}건`,
                  },
                  {
                    label: "근로자 QR 노출",
                    value: `${readNumber(versionLockResult.lock.worker_visible_count)}건`,
                  },
                  {
                    label: "고객 확인",
                    value: `${readNumber(versionLockResult.lock.customer_confirmed_count)}건`,
                  },
                  {
                    label: "상태",
                    value: versionLockResult.lock.lock_status || "상태 확인 필요",
                  },
                  {
                    label: "생성시각",
                    value: formatKstDateTime(versionLockResult.lock.created_at),
                  },
                  {
                    label: "담당",
                    value: versionLockResult.lock.locked_by || "Owner",
                  },
                ].map((item) => (
                  <article key={item.label} className="rounded-2xl border border-emerald-300/20 bg-slate-950/40 p-4">
                    <p className="text-xs font-black text-emerald-200/80">{item.label}</p>
                    <p className="mt-2 text-sm font-black text-white">{item.value}</p>
                  </article>
                ))}
              </div>
            ) : versionLockResult.status === "not_found" ? (
              <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
                Lock ID는 전달됐지만 원장에서 조회되지 않았습니다. Supabase migration과 companyCode를 확인하세요.
              </p>
            ) : versionLockResult.status === "failed" ? (
              <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm font-bold text-rose-100">
                Version Lock 결과 원장 조회가 실패했습니다. 생성 결과가 고객·근로자 화면에 확정 표시되기 전 Supabase 상태를 확인하세요.
              </p>
            ) : versionLockId ? (
              <p className="mt-2 text-xs font-bold text-emerald-200">Lock ID: {versionLockId}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={companyCode ? buildRiskSummaryHref(companyCode) : "#"}
                className="rounded-xl border border-emerald-300/40 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-400/10"
              >
                근로자 공유요약 확인
              </Link>
              <Link
                href={companyCode ? buildOwnerSelectHref(companyCode, "/manager/risk-share") : "#"}
                className="rounded-xl border border-cyan-400/40 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-400/10"
              >
                관리자 월별 보관함 확인
              </Link>
            </div>
          </section>
        ) : null}

        {errorCode ? (
          <section className="mt-6 rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5">
            <h2 className="text-lg font-black text-rose-100">Version Lock 처리 확인 필요</h2>
            <p className="mt-2 text-sm leading-6 text-rose-50">
              오류 코드: {errorCode}. customer_confirmed 항목, Supabase migration 적용, 이미 locked 상태인지 확인하세요.
            </p>
          </section>
        ) : null}

        <form className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-4">
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
              <span className="text-sm font-black text-slate-300">공유 버전명</span>
              <input
                name="versionLabel"
                defaultValue={versionLabel}
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

            <label className="block">
              <span className="text-sm font-black text-slate-300">Lock 대상월</span>
              <input
                name="lockMonth"
                defaultValue={lockMonth}
                placeholder="YYYY-MM"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {LOCK_CHECKS.map((item) => (
              <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  name={item.key}
                  defaultChecked={getCheckStatus(params, item.key)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block text-white">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</span>
                </span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
          >
            Version Lock 상태 미리보기
          </button>
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <p className="text-sm font-bold text-slate-400">Version Lock Status</p>
            <h2 className="mt-2 text-3xl font-black text-white">{statusLabel}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              필수 {completedRequiredCount}/{requiredChecks.length}개 완료 · 전체 {completedAllCount}/{LOCK_CHECKS.length}개 완료
            </p>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-bold text-emerald-300">Locked Share Version Candidate</p>
            <h2 className="mt-2 text-2xl font-black text-white">{versionLabel}</h2>
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                <dt className="text-xs font-black text-slate-400">고객</dt>
                <dd className="mt-1 text-sm font-black text-white">{companyName || "고객명 입력 필요"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                <dt className="text-xs font-black text-slate-400">고객 코드</dt>
                <dd className="mt-1 text-sm font-black text-white">{companyCode || "코드 입력 필요"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 md:col-span-2">
                <dt className="text-xs font-black text-slate-400">Source</dt>
                <dd className="mt-1 text-sm font-black text-white">{sourceTitle}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <a
                href={companyCode ? buildWorkerQrHref(companyCode) : "#"}
                className={
                  companyCode
                    ? "rounded-xl border border-blue-500/40 px-4 py-3 text-center text-sm font-black text-blue-100 hover:bg-blue-500/10"
                    : "pointer-events-none rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-600"
                }
              >
                근로자 QR 화면
              </a>
              <a
                href={companyCode ? buildRiskSummaryHref(companyCode) : "#"}
                className={
                  companyCode
                    ? "rounded-xl border border-blue-500/40 px-4 py-3 text-center text-sm font-black text-blue-100 hover:bg-blue-500/10"
                    : "pointer-events-none rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-600"
                }
              >
                위험성평가 공유요약
              </a>
              <a
                href={companyCode && goLiveReady ? buildOwnerSelectHref(companyCode, "/manager/risk-share") : "#"}
                className={
                  companyCode && goLiveReady
                    ? "rounded-xl border border-cyan-500/40 px-4 py-3 text-center text-sm font-black text-cyan-100 hover:bg-cyan-500/10"
                    : "pointer-events-none rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-600"
                }
              >
                관리자 공유팩 홈
              </a>
              <a
                href={companyCode && goLiveReady ? buildOwnerSelectHref(companyCode, "/monthly-report/risk-share") : "#"}
                className={
                  companyCode && goLiveReady
                    ? "rounded-xl border border-cyan-500/40 px-4 py-3 text-center text-sm font-black text-cyan-100 hover:bg-cyan-500/10"
                    : "pointer-events-none rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-600"
                }
              >
                공유팩 월간보고서
              </a>
            </div>
          </article>
        </section>

        {goLiveReady ? (
          <section className="mt-6 rounded-3xl border border-emerald-400/30 bg-slate-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-300">Create Version Lock</p>
                <h2 className="mt-1 text-2xl font-black text-white">고객 확인 항목을 Version Lock으로 고정</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  이 버튼은 customer_check_status=confirmed, customer_confirmed=true, share_status=customer_confirmed,
                  version_lock_id가 없는 항목만 대상으로 Version Lock을 생성합니다. 생성 후 대상 항목은 locked 상태가 됩니다.
                </p>
              </div>
              <span className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                Owner only
              </span>
            </div>

            <form action="/api/owner/risk-share-version-locks/create" method="post" className="mt-5 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="companyCode" value={companyCode} />
              <input type="hidden" name="companyName" value={companyName} />
              <input type="hidden" name="sourceTitle" value={sourceTitle} />
              <input type="hidden" name="lockTitle" value={versionLabel} />
              <input type="hidden" name="lockMonth" value={lockMonth} />

              <label className="block">
                <span className="text-sm font-black text-slate-300">Lock 제목</span>
                <input
                  name="lockTitle"
                  defaultValue={versionLabel}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-300">Lock 대상월</span>
                <input
                  name="lockMonth"
                  defaultValue={lockMonth}
                  placeholder="YYYY-MM"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm font-bold text-slate-200 md:col-span-2">
                <input type="checkbox" name="workerVisible" defaultChecked className="mt-1 h-4 w-4" />
                <span>
                  <span className="block text-white">Version Lock 항목을 근로자 QR 공유요약에 표시</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    체크 시 locked 항목의 worker_visible이 true로 저장됩니다. 근로자 화면은 locked + customer_confirmed + worker_visible + version_lock_id 조건만 노출합니다.
                  </span>
                </span>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-black text-slate-300">Owner 메모</span>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="예: 고객 확인 완료 후 2026년 6월 공유 기준으로 잠금"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
                />
              </label>

              <button
                type="submit"
                className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 md:col-span-2"
              >
                Version Lock 생성
              </button>
            </form>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5">
            <h2 className="text-lg font-black text-amber-100">Version Lock 생성 전 확인 필요</h2>
            <p className="mt-2 text-sm leading-6 text-amber-50">
              필수 체크와 companyCode가 완료되어야 생성 API 버튼을 표시합니다. 고객 확인 전 항목이나 draft 항목은 Lock 대상이 아닙니다.
            </p>
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {LOCK_CHECKS.map((item) => (
            <article key={`status-${item.key}`} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                </div>
                <CheckBadge done={getCheckStatus(params, item.key)} required={item.required} />
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h2 className="text-lg font-black text-amber-100">운영 주의</h2>
          <p className="mt-3 text-sm leading-6 text-amber-50">
            Version Lock은 고객 확인이 끝난 공유항목을 운영상 고정하는 절차입니다.
            생성 API는 confirmed/customer_confirmed/share_status 조건을 만족하는 항목만 잠급니다.
            이 절차는 위험성평가 작성 대행, 법적 의무 완료, 사고 예방 보장을 의미하지 않습니다.
            실제 운영 전 Companies DB 등록, active 상태, QR 포스터, Export 경로를 다시 확인합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
