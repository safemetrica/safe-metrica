import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    companyCode?: string;
    companyName?: string;
    sourceReceived?: string;
    shareItemsReady?: string;
    customerConfirmed?: string;
    versionLocked?: string;
    companyRegistered?: string;
  }>;
};

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function normalizeCompanyCode(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function cleanText(value?: string) {
  return (value ?? "").trim().slice(0, 80);
}

function isChecked(value?: string) {
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

function StatusBadge({ done }: { done: boolean }) {
  return (
    <span
      className={
        done
          ? "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200"
          : "rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200"
      }
    >
      {done ? "완료" : "대기"}
    </span>
  );
}

function ChecklistItem({
  title,
  description,
  done,
}: {
  title: string;
  description: string;
  done: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        </div>
        <StatusBadge done={done} />
      </div>
    </article>
  );
}

export default async function RiskShareActivationPage({ searchParams }: PageProps) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(params.companyCode);
  const companyName = cleanText(params.companyName);
  const sourceReceived = isChecked(params.sourceReceived);
  const shareItemsReady = isChecked(params.shareItemsReady);
  const customerConfirmed = isChecked(params.customerConfirmed);
  const versionLocked = isChecked(params.versionLocked);
  const companyRegistered = isChecked(params.companyRegistered);

  const qrReady =
    Boolean(companyCode) &&
    sourceReceived &&
    shareItemsReady &&
    customerConfirmed &&
    versionLocked &&
    companyRegistered;

  const activationStatus = qrReady ? "QR 활성화 가능" : "Hold";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <Link href="/owner" className="text-sm font-bold text-cyan-300 hover:text-cyan-200">
            ← Owner Console
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
          <h1 className="mt-2 text-3xl font-black">신규 고객 공유팩 활성화</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            신규 고객은 고객사 코드 생성만으로 바로 활성화하지 않습니다. 위험성평가 source 접수, 공유항목 정리,
            고객 확인, 버전 잠금, Companies DB 등록 이후 QR 링크를 활성화합니다.
          </p>
        </section>

        <form className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-300">신규 고객 코드 후보</span>
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
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["sourceReceived", "위험성평가 source 접수"],
              ["shareItemsReady", "공유 대상 위험요인 정리"],
              ["customerConfirmed", "고객 공유범위 확인"],
              ["versionLocked", "공유 버전 잠금"],
              ["companyRegistered", "Companies DB 등록 / active 확인"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm font-bold text-slate-200">
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={isChecked(params[name as keyof typeof params])}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"
          >
            활성화 상태 미리보기
          </button>
        </form>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-1">
            <p className="text-sm font-bold text-slate-400">Activation Status</p>
            <h2 className="mt-2 text-3xl font-black text-white">{activationStatus}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {qrReady
                ? "필수 조건이 충족되었습니다. 고객사 전용 QR 및 운영 화면 링크를 사용할 수 있습니다."
                : "아직 신규 고객 공유팩을 활성화할 수 없습니다. 미완료 항목을 먼저 닫아야 합니다."}
            </p>
          </article>

          <article className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
            <p className="text-sm font-bold text-cyan-300">Generated Links</p>
            <h2 className="mt-2 text-2xl font-black text-white">QR / 운영화면 링크 후보</h2>

            {companyCode ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <a
                  href={buildWorkerQrHref(companyCode)}
                  className="rounded-xl border border-blue-500/40 px-4 py-3 text-center text-sm font-black text-blue-100 hover:bg-blue-500/10"
                >
                  근로자 QR 화면
                </a>
                <a
                  href={buildRiskSummaryHref(companyCode)}
                  className="rounded-xl border border-blue-500/40 px-4 py-3 text-center text-sm font-black text-blue-100 hover:bg-blue-500/10"
                >
                  위험성평가 공유요약
                </a>
                <a
                  href={companyRegistered ? buildOwnerSelectHref(companyCode, "/manager/risk-share") : "#"}
                  className={
                    companyRegistered
                      ? "rounded-xl border border-cyan-500/40 px-4 py-3 text-center text-sm font-black text-cyan-100 hover:bg-cyan-500/10"
                      : "pointer-events-none rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-600"
                  }
                >
                  관리자 공유팩 홈
                </a>
                <a
                  href={companyRegistered ? buildOwnerSelectHref(companyCode, "/monthly-report/risk-share") : "#"}
                  className={
                    companyRegistered
                      ? "rounded-xl border border-cyan-500/40 px-4 py-3 text-center text-sm font-black text-cyan-100 hover:bg-cyan-500/10"
                      : "pointer-events-none rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-black text-slate-600"
                  }
                >
                  공유팩 월간보고서
                </a>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm font-bold text-amber-100">
                고객사 코드 후보를 입력하면 링크 후보가 표시됩니다.
              </p>
            )}

            <p className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">
              고객사 코드가 Companies DB에 등록되고 active 상태가 되기 전에는 관리자 보호 라우트와 제출 저장이 정상 동작하지 않을 수 있습니다.
              이 화면은 신규 고객 활성화 상태판이며, 법적 판단이나 위험성평가 작성 완료를 의미하지 않습니다.
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <ChecklistItem
            title="1. 위험성평가 source 접수"
            description="고객이 기존 위험성평가표 또는 평가결과지를 제공했는지 확인합니다."
            done={sourceReceived}
          />
          <ChecklistItem
            title="2. 공유 대상 위험요인 정리"
            description="근로자에게 QR로 공유할 핵심 위험요인과 안전조치 후보를 정리합니다."
            done={shareItemsReady}
          />
          <ChecklistItem
            title="3. 고객 공유범위 확인"
            description="고객 담당자가 공유 대상과 표현 범위를 확인합니다."
            done={customerConfirmed}
          />
          <ChecklistItem
            title="4. 공유 버전 잠금"
            description="근로자에게 배포할 위험성평가 공유 버전을 고정합니다."
            done={versionLocked}
          />
          <ChecklistItem
            title="5. Companies DB 등록"
            description="신규 고객 코드가 Tenant Config에 등록되고 active 상태인지 확인합니다."
            done={companyRegistered}
          />
          <ChecklistItem
            title="6. Go-Live"
            description="QR 배포, 관리자 홈, 월간보고서, Export 경로를 확인한 뒤 운영을 시작합니다."
            done={qrReady}
          />
        </section>
      </div>
    </main>
  );
}
