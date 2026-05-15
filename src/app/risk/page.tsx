export const dynamic = "force-dynamic";

import Link from "next/link";
import { SafeNav } from "@/components/SafeLayout";
import { getCompanyConfig } from "@/lib/company";
import {
  filterRiskItems,
  getManagementTerm,
  getRiskIntelligenceData,
  isActionNeededItem,
  isBudgetNeededItem,
  isHighRiskItem,
  isReassessmentDueItem,
  type RiskFilter,
  type RiskItemDetail,
} from "@/lib/risk";

type RiskPageProps = {
  searchParams?: Promise<{
    filter?: string | string[];
  }>;
};

const FILTERS: Array<{ key: RiskFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "high", label: "고위험" },
  { key: "action", label: "개선대책" },
  { key: "budget", label: "예산" },
  { key: "reassessment", label: "재평가" },
  { key: "open", label: "완료 전" },
];

function normalizeFilter(value: string | string[] | undefined): RiskFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  const allowed = FILTERS.map((item) => item.key);

  return allowed.includes(raw as RiskFilter) ? (raw as RiskFilter) : "all";
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  return value.replace(/-/g, ".");
}

function formatMoney(value: number | null): string {
  if (typeof value !== "number") {
    return "-";
  }

  if (value >= 10000) {
    return `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
  }

  return `${value.toLocaleString("ko-KR")}원`;
}

function RiskLevelBadge({ level }: { level: string }) {
  const className =
    level === "상"
      ? "border-red-500/40 bg-red-500/15 text-red-200"
      : level === "중"
        ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-200"
        : level === "하"
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
          : "border-slate-600 bg-slate-800 text-slate-300";

  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      위험 {level || "-"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "완료"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
      : status
        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
        : "border-slate-600 bg-slate-800 text-slate-300";

  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {status || "상태 미지정"}
    </span>
  );
}

function TermBadge({ item }: { item: RiskItemDetail }) {
  const term = getManagementTerm(item);

  const className =
    term === "단기"
      ? "border-red-500/40 bg-red-500/15 text-red-200"
      : term === "중기"
        ? "border-blue-500/40 bg-blue-500/15 text-blue-200"
        : "border-purple-500/40 bg-purple-500/15 text-purple-200";

  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {term}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "red" | "yellow" | "orange" | "blue" | "slate";
}) {
  const valueClass =
    tone === "red"
      ? "text-red-200"
      : tone === "yellow"
        ? "text-yellow-200"
        : tone === "orange"
          ? "text-orange-200"
          : tone === "blue"
            ? "text-blue-200"
            : "text-slate-100";

  const toneClass =
    tone === "red"
      ? "border-red-500/35 bg-red-950/25"
      : tone === "yellow"
        ? "border-yellow-500/35 bg-yellow-950/20"
        : tone === "orange"
          ? "border-orange-500/35 bg-orange-950/20"
          : tone === "blue"
            ? "border-blue-500/35 bg-blue-950/25"
            : "border-slate-600/80 bg-slate-900/75";

  return (
    <div className={`rounded-2xl border p-4 shadow-lg ${toneClass}`}>
      <div className={`text-4xl font-black leading-none ${valueClass}`}>{value}</div>
      <div className="mt-3 text-sm font-bold text-white [word-break:keep-all]">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-400 [word-break:keep-all]">{hint}</div>
    </div>
  );
}

function RiskItemCard({ item }: { item: RiskItemDetail }) {
  const cardTone =
    item.riskLevel === "상"
      ? "border-l-4 border-l-red-500 bg-red-950/10"
      : item.riskLevel === "중"
        ? "border-l-4 border-l-yellow-500 bg-yellow-950/10"
        : item.riskLevel === "하"
          ? "border-l-4 border-l-emerald-500 bg-emerald-950/10"
          : "border-l-4 border-l-slate-600 bg-slate-900/70";

  const flags = [
    isHighRiskItem(item) ? "고위험" : null,
    isActionNeededItem(item) ? "개선대책" : null,
    isBudgetNeededItem(item) ? "예산" : null,
    isReassessmentDueItem(item) ? "재평가" : null,
  ].filter(Boolean);

  return (
    <article className={`rounded-2xl border border-slate-700 p-4 shadow-lg ${cardTone}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-500">No. {item.no || "-"}</div>
          <h2 className="mt-1 text-lg font-black leading-snug text-white [word-break:keep-all]">
            {item.title || item.taskName || item.processName || "위험성평가 항목"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 [word-break:keep-all]">
            {item.processName || "공정 미지정"}
            {item.taskName ? ` · ${item.taskName}` : ""}
            {item.hazard ? ` · ${item.hazard}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TermBadge item={item} />
          <RiskLevelBadge level={item.riskLevel} />
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">사고형태</div>
          <div className="mt-1 text-sm font-semibold text-slate-200 [word-break:keep-all]">
            {item.accidentType || "-"}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">현재 위험도</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">
            R={item.riskScore ?? "-"} · F={item.frequency ?? "-"} · S={item.severity ?? "-"}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">개선 후 위험도</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">
            R={item.afterRiskScore ?? "-"} · {item.afterRiskLevel || "-"}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3">
          <div className="text-xs text-slate-500">담당 / 기한</div>
          <div className="mt-1 text-sm font-semibold text-slate-200 [word-break:keep-all]">
            {item.owner || "담당 미지정"} · {formatDate(item.dueDate)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs font-semibold text-slate-500">현재 안전조치</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-300 [word-break:keep-all]">
            {item.currentControls || "-"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs font-semibold text-slate-500">개선대책</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-300 [word-break:keep-all]">
            {item.improvementPlan || "-"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {flags.map((flag) => (
          <span key={flag} className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
            {flag}
          </span>
        ))}
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
          예산 {item.budgetRequired ? "필요" : "불필요"} · {formatMoney(item.estimatedCost)}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
          TBM 공유 {item.tbmLinked ? "연계" : "미연계"}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
          재평가 {formatDate(item.reassessmentDate)}
        </span>
      </div>
    </article>
  );
}

export default async function RiskPage({ searchParams }: RiskPageProps) {
  const params = searchParams ? await searchParams : {};
  const filter = normalizeFilter(params.filter);

  const company = await getCompanyConfig();
  const risk = await getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey);
  const visibleItems = filterRiskItems(risk.items, filter);

  return (
    <main className="min-h-screen bg-slate-950 pb-10 text-slate-100">
      <SafeNav company={company.name} />

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold text-blue-300 hover:text-blue-200">
              ← 대표 대시보드
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white [word-break:keep-all]">
              Risk Intelligence
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 [word-break:keep-all]">
              {company.name} Risk Items DB 기준으로 고위험, 개선대책, 예산, 재평가 항목을 상세 확인합니다.
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
            {risk.hasDb ? `DB 연동됨 · ${risk.total}건` : "DB 연결 필요"}
          </span>
        </div>

        {!risk.hasDb ? (
          <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold text-white">Risk Items DB 연결 필요</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 [word-break:keep-all]">
              Companies DB에 riskAssessmentDbId가 연결되면 이 화면에서 위험성평가 상세 항목을 확인할 수 있습니다.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard label="총 Risk Item" value={risk.total} hint="등록된 위험성평가 항목" tone="slate" />
              <SummaryCard label="고위험 관리 항목" value={risk.highRiskCount} hint="위험수준 상 + 완료 전" tone="red" />
              <SummaryCard label="개선대책 관리 필요" value={risk.actionNeededCount} hint="개선대책 있음 + 완료 전" tone="yellow" />
              <SummaryCard label="예산 검토 필요" value={risk.budgetNeededCount} hint="예산 수반 + 완료 전" tone="orange" />
              <SummaryCard label="재평가 예정" value={risk.reassessmentDueCount} hint="30일 이내 재확인" tone="blue" />
            </section>

            <section className="mt-5 rounded-3xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">상세 필터</h2>
                  <p className="mt-1 text-xs text-slate-400 [word-break:keep-all]">
                    현재 {visibleItems.length}건 표시 중 · 완료 전 {risk.openCount}건 · 완료 {risk.completedCount}건
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((item) => {
                    const active = filter === item.key;

                    return (
                      <Link
                        key={item.key}
                        href={`/risk?filter=${item.key}`}
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-950/40"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="mt-5 space-y-3">
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => <RiskItemCard key={item.id} item={item} />)
              ) : (
                <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-400">
                  현재 필터에 해당하는 Risk Item이 없습니다.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
