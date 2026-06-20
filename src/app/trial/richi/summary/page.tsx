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

type FoodFactoryWeeklyLedgerRow = {
  submission_type?: string | null;
  legacy_type?: string | null;
  status?: string | null;
  reported_date?: string | null;
  created_at?: string | null;
};

type FoodFactoryWeeklySnapshot = {
  status: "ok" | "not_configured" | "failed";
  confirmationCount: number;
  opinionCount: number;
  photoCandidateCount: number;
  reviewNeededCount: number;
  recentItems: FoodFactoryWeeklyLedgerRow[];
  periodLabel: string;
};

function getRecentSevenDayPeriod() {
  const end = new Date();
  const start = new Date(end);

  start.setDate(start.getDate() - 7);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: "최근 7일",
  };
}

function buildWeeklyPeriodFilter(startIso: string, endIso: string) {
  return [
    `and(created_at.gte.${startIso},created_at.lte.${endIso})`,
    `and(reported_date.gte.${startIso},reported_date.lte.${endIso})`,
  ].join(",");
}

function hasPhotoCandidate(row: FoodFactoryWeeklyLedgerRow) {
  const type = getFoodFactorySubmissionType(row).replace(/\s+/g, "");

  return (
    type.includes("사진") ||
    type.includes("개선") ||
    type.includes("위험") ||
    type.includes("아차")
  );
}

async function fetchFoodFactoryWeeklySnapshot(): Promise<FoodFactoryWeeklySnapshot> {
  const period = getRecentSevenDayPeriod();

  const query = new URLSearchParams({
    select: "submission_type,legacy_type,status,reported_date,created_at",
    tenant_code: `eq.${FOOD_FACTORY_PACK.companyCode}`,
    or: buildWeeklyPeriodFilter(period.startIso, period.endIso),
    order: "created_at.desc",
    limit: String(LEDGER_ROW_LIMIT),
  });

  try {
    const rows = await selectSupabaseExportRows<FoodFactoryWeeklyLedgerRow>(
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
      photoCandidateCount: rows.filter(hasPhotoCandidate).length,
      reviewNeededCount: reviewNeededRows.length,
      recentItems: reviewNeededRows.slice(0, 3),
      periodLabel: period.label,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      confirmationCount: 0,
      opinionCount: 0,
      photoCandidateCount: 0,
      reviewNeededCount: 0,
      recentItems: [],
      periodLabel: period.label,
    };
  }
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

function WeeklySummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <p className="text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

export default async function RichiTrialSummaryPage() {
  const snapshot = await fetchFoodFactoryWeeklySnapshot();

  const summaryItems = [
    ["작업 전 위생·안전 전자확인", `${snapshot.confirmationCount}건`],
    ["불편사항·개선의견", `${snapshot.opinionCount}건`],
    ["사진 첨부 후보", `${snapshot.photoCandidateCount}건`],
    ["관리자 후속 확인 필요", `${snapshot.reviewNeededCount}건`],
  ];

  const hasLedgerWarning = snapshot.status !== "ok";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-[760px]">
        <a href={FOOD_FACTORY_PACK.homeHref} className="text-sm font-black text-blue-700">
          ← 운영팩 홈
        </a>

        <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-black text-amber-700">Food Factory Weekly Summary Candidate</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">리치코리아 주간 요약 후보</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            전자확인 기록과 의견 접수 내용을 실제 원장 기준으로 모아 주간 운영요약 후보로 정리합니다.
          </p>
        </div>

        {hasLedgerWarning ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
            원장 연결 상태 확인이 필요합니다. 내부 설정 또는 조회 상태를 확인한 뒤 다시 검토하세요.
          </div>
        ) : null}

        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-500">{snapshot.periodLabel} 확인 요약</p>
              <h2 className="mt-2 text-xl font-black">운영기록 후보</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              실제 원장 기준
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {summaryItems.map(([label, value]) => (
              <WeeklySummaryItem key={label} label={label} value={value} />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-black text-blue-800">관리자 검토 후보</p>
          <h2 className="mt-2 text-xl font-black text-blue-950">
            이번 주 후속 확인 후보
          </h2>

          <div className="mt-4 grid gap-3">
            {snapshot.recentItems.length > 0 ? (
              snapshot.recentItems.map((item, index) => (
                <div
                  key={`${getFoodFactorySubmissionType(item)}-${item.created_at ?? index}`}
                  className="rounded-2xl border border-blue-100 bg-white/70 p-4"
                >
                  <p className="text-xs font-black text-blue-700">
                    {getFoodFactoryPublicTypeLabel(item)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-blue-950">
                    처리상태: {item.status || "접수"} · 접수일:{" "}
                    {formatPublicDate(item.reported_date || item.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-blue-950">
                현재 주간 요약 후보에 표시할 관리자 검토 후보가 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-black text-emerald-800">주간 요약 활용 기준</p>
          <p className="mt-2 text-sm leading-6 text-emerald-950">
            전자확인 건수, 의견 접수, 후속 확인 후보를 주간 단위로 모아 관리자 검토자료와 월간 운영보고 후보로 활용합니다.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
          이 화면은 주간 운영요약 후보입니다. 최종 판단과 조치 여부는 관리자 확인 후 결정합니다.
        </div>
      </section>
    </main>
  );
}
