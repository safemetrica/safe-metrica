import {
  FOOD_FACTORY_PACK,
  getFoodFactoryPublicTypeLabel,
  getFoodFactorySubmissionType,
  isFoodFactoryConfirmation,
  isFoodFactoryReviewNeededStatus,
} from "@/lib/packs/foodFactoryPack";
import { selectSupabaseExportRows } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const LEDGER_ROW_LIMIT = 100;

type FoodFactoryLedgerRow = {
  submission_type?: string | null;
  legacy_type?: string | null;
  status?: string | null;
  reported_date?: string | null;
  created_at?: string | null;
};

type FoodFactoryLedgerSnapshot = {
  status: "ok" | "not_configured" | "failed";
  confirmationCount: number;
  opinionCount: number;
  reviewNeededCount: number;
  recentReviewItems: FoodFactoryLedgerRow[];
};

async function fetchFoodFactoryManagerSnapshot(): Promise<FoodFactoryLedgerSnapshot> {
  const query = new URLSearchParams({
    select: "submission_type,legacy_type,status,reported_date,created_at",
    tenant_code: `eq.${FOOD_FACTORY_PACK.companyCode}`,
    order: "created_at.desc",
    limit: String(LEDGER_ROW_LIMIT),
  });

  try {
    const rows = await selectSupabaseExportRows<FoodFactoryLedgerRow>(
      "field_participation_submissions",
      query,
    );

    const confirmationRows = rows.filter(isFoodFactoryConfirmation);
    const opinionRows = rows.filter((row) => !isFoodFactoryConfirmation(row));
    const reviewNeededRows = opinionRows.filter((row) =>
      isFoodFactoryReviewNeededStatus(row.status),
    );

    return {
      status: "ok",
      confirmationCount: confirmationRows.length,
      opinionCount: opinionRows.length,
      reviewNeededCount: reviewNeededRows.length,
      recentReviewItems: reviewNeededRows.slice(0, 3),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      confirmationCount: 0,
      opinionCount: 0,
      reviewNeededCount: 0,
      recentReviewItems: [],
    };
  }
}

function getToneClass(tone: string) {
  if (tone === "emerald") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (tone === "amber") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-blue-100 bg-blue-50 text-blue-700";
}

function formatPublicDate(value?: string | null) {
  if (!value) {
    return "일시 확인 필요";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "일시 확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function RichiTrialManagerPage() {
  const snapshot = await fetchFoodFactoryManagerSnapshot();

  const summaryRows = [
    {
      title: "전자확인",
      count: `${snapshot.confirmationCount}건`,
      desc: "작업 전 위생·안전 확인 기록",
      tone: "blue",
    },
    {
      title: "의견 접수",
      count: `${snapshot.opinionCount}건`,
      desc: "불편사항·개선의견 분리",
      tone: "emerald",
    },
    {
      title: "검토 필요",
      count: `${snapshot.reviewNeededCount}건`,
      desc: "관리자 후속 확인 후보",
      tone: "amber",
    },
  ];

  const hasLedgerWarning = snapshot.status !== "ok";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <a href={FOOD_FACTORY_PACK.homeHref} className="text-sm font-black text-blue-700">
          ← 운영팩 홈
        </a>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-blue-700">SafeMetrica Food Factory Pack</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            리치코리아 전자확인 관리자 화면
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            근로자가 남긴 전자확인과 의견을 실제 원장 기준으로 집계하고, 관리자 검토 후보만 공개 요약으로 표시합니다.
          </p>
        </div>

        {hasLedgerWarning ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
            원장 연결 상태 확인이 필요합니다. 내부 설정 또는 조회 상태를 확인한 뒤 다시 검토하세요.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {summaryRows.map((row) => (
            <div key={row.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-500">{row.title}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{row.count}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{row.desc}</p>
              <div className={["mt-4 h-1.5 rounded-full border", getToneClass(row.tone)].join(" ")} />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-500">관리자 검토 후보</p>
              <h2 className="mt-2 text-xl font-black">최근 확인할 항목</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              실제 원장 기준
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {snapshot.recentReviewItems.length > 0 ? (
              snapshot.recentReviewItems.map((item, index) => (
                <div
                  key={`${getFoodFactorySubmissionType(item)}-${item.created_at ?? index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-black text-blue-700">
                    {getFoodFactoryPublicTypeLabel(item)}
                  </p>
                  <h3 className="mt-1 text-base font-black text-slate-950">
                    관리자 검토 후보
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    처리상태: {item.status || "접수"} · 접수일:{" "}
                    {formatPublicDate(item.reported_date || item.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold leading-6 text-slate-600">
                  현재 공개 화면에 표시할 관리자 검토 후보가 없습니다.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">운영 메모</p>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            이 화면은 실제 원장 기반의 집계와 검토 후보만 표시합니다. 제출자 식별정보, 확인번호, 상세 원문, 자필서명 원본 등 내부 원장 세부값은 공개하지 않습니다.
            최종 검토와 조치 여부는 관리자가 확인합니다.
          </p>
        </div>

        <a
          href={FOOD_FACTORY_PACK.summaryHref}
          className="mt-5 block rounded-2xl bg-blue-700 px-5 py-4 text-center text-base font-black text-white shadow-sm"
        >
          주간 요약 후보 보기 →
        </a>
      </section>
    </main>
  );
}
