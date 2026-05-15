export const dynamic = "force-dynamic";

import Link from "next/link";
import { SafeNav } from "@/components/SafeLayout";
import { getCompanyConfig } from "@/lib/company";
import {
  filterRiskItems,
  getManagementTerm,
  getManagementTermReason,
  getRiskIntelligenceData,
  isActionNeededItem,
  isBudgetNeededItem,
  isHighRiskItem,
  isOwnerUnassignedItem,
  isReassessmentDueItem,
  type RiskFilter,
  type RiskIntelligenceData,
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
  { key: "short", label: "단기" },
  { key: "mid", label: "중기" },
  { key: "long", label: "장기" },
  { key: "action", label: "개선대책" },
  { key: "budget", label: "예산" },
  { key: "reassessment", label: "재평가" },
  { key: "unassigned", label: "담당 미지정" },
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
  tone: "red" | "yellow" | "orange" | "blue" | "purple" | "slate";
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
            : tone === "purple"
              ? "text-purple-200"
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
            : tone === "purple"
              ? "border-purple-500/35 bg-purple-950/20"
              : "border-slate-600/80 bg-slate-900/75";

  return (
    <div className={`rounded-2xl border p-4 shadow-lg ${toneClass}`}>
      <div className={`text-4xl font-black leading-none ${valueClass}`}>{value}</div>
      <div className="mt-3 text-sm font-bold text-white [word-break:keep-all]">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-400 [word-break:keep-all]">{hint}</div>
    </div>
  );
}


type ChartTone = "red" | "yellow" | "orange" | "blue" | "purple" | "emerald" | "slate";

type ChartDatum = {
  label: string;
  value: number;
  tone: ChartTone;
};

function getChartToneClass(tone: ChartTone): string {
  if (tone === "red") return "bg-red-400";
  if (tone === "yellow") return "bg-yellow-300";
  if (tone === "orange") return "bg-orange-300";
  if (tone === "blue") return "bg-blue-300";
  if (tone === "purple") return "bg-purple-300";
  if (tone === "emerald") return "bg-emerald-300";
  return "bg-slate-300";
}

function MiniBarChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ChartDatum[];
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white [word-break:keep-all]">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400 [word-break:keep-all]">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {data.map((item) => {
          const percent = Math.max(4, Math.round((item.value / maxValue) * 100));

          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-300 [word-break:keep-all]">{item.label}</span>
                <span className="shrink-0 font-black text-white">{item.value}건</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${getChartToneClass(item.tone)}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AverageRiskCard({ risk }: { risk: RiskIntelligenceData }) {
  const currentItems = risk.items.filter((item) => typeof item.riskScore === "number");
  const afterItems = risk.items.filter((item) => typeof item.afterRiskScore === "number");

  const currentAverage =
    currentItems.length > 0
      ? currentItems.reduce((sum, item) => sum + (item.riskScore ?? 0), 0) / currentItems.length
      : 0;

  const afterAverage =
    afterItems.length > 0
      ? afterItems.reduce((sum, item) => sum + (item.afterRiskScore ?? 0), 0) / afterItems.length
      : 0;

  const reductionRate =
    currentAverage > 0 && afterAverage > 0
      ? Math.max(0, Math.round(((currentAverage - afterAverage) / currentAverage) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4 shadow-lg">
      <h2 className="text-sm font-bold text-white">개선 전후 평균 위험도</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-400 [word-break:keep-all]">
        개선대책 반영 시 예상 위험도 감소 수준입니다.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-950/50 p-3">
          <div className="text-xs text-slate-500">개선 전</div>
          <div className="mt-1 text-2xl font-black text-red-200">
            {currentAverage ? currentAverage.toFixed(1) : "-"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3">
          <div className="text-xs text-slate-500">개선 후</div>
          <div className="mt-1 text-2xl font-black text-emerald-200">
            {afterAverage ? afterAverage.toFixed(1) : "-"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3">
          <div className="text-xs text-slate-500">감소율</div>
          <div className="mt-1 text-2xl font-black text-blue-200">
            {reductionRate ? `${reductionRate}%` : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

function countBy(items: RiskItemDetail[], selector: (item: RiskItemDetail) => string): Array<[string, number]> {
  const map = new Map<string, number>();

  items.forEach((item) => {
    const key = selector(item).trim() || "미지정";
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function RiskChartsSection({ risk }: { risk: RiskIntelligenceData }) {
  const riskLevelData: ChartDatum[] = [
    { label: "상", value: risk.items.filter((item) => item.riskLevel === "상").length, tone: "red" },
    { label: "중", value: risk.items.filter((item) => item.riskLevel === "중").length, tone: "yellow" },
    { label: "하", value: risk.items.filter((item) => item.riskLevel === "하").length, tone: "emerald" },
  ];

  const termData: ChartDatum[] = [
    { label: "단기", value: risk.shortTermCount, tone: "red" },
    { label: "중기", value: risk.midTermCount, tone: "blue" },
    { label: "장기", value: risk.longTermCount, tone: "purple" },
  ];

  const budgetData: ChartDatum[] = [
    { label: "예산 필요", value: risk.budgetNeededCount, tone: "orange" },
    { label: "예산 불필요", value: Math.max(risk.total - risk.budgetNeededCount, 0), tone: "slate" },
  ];

  const accidentData: ChartDatum[] = countBy(risk.items, (item) => item.accidentType)
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      value,
      tone: (["red", "orange", "yellow", "blue", "purple"] as ChartTone[])[index] ?? "slate",
    }));

  return (
    <section className="mt-5 rounded-3xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Risk Intelligence Charts</h2>
          <p className="text-xs leading-relaxed text-slate-400 [word-break:keep-all]">
            위험수준, 관리기간, 예산, 사고형태, 개선효과를 한눈에 확인합니다.
          </p>
        </div>
        <span className="inline-flex w-fit items-center whitespace-nowrap rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
          운영 분석 v0.1
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <MiniBarChart title="위험수준별 분포" subtitle="상·중·하 등급 기준" data={riskLevelData} />
        <MiniBarChart title="단기·중기·장기 관리 분포" subtitle="관리 우선순위 자동 분류" data={termData} />
        <MiniBarChart title="예산 필요 여부" subtitle="예산 수반 항목과 일반 항목 비교" data={budgetData} />
        <MiniBarChart title="사고형태 TOP 5" subtitle="Risk Items DB 사고형태 기준" data={accidentData} />
      </div>

      <div className="mt-3">
        <AverageRiskCard risk={risk} />
      </div>
    </section>
  );
}


function RiskItemCard({ item }: { item: RiskItemDetail }) {
  const term = getManagementTerm(item);

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
    isOwnerUnassignedItem(item) ? "담당 미지정" : null,
  ].filter((flag): flag is string => Boolean(flag));

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

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-xs font-semibold text-slate-500">관리구분</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-300 [word-break:keep-all]">
          <span className="font-bold text-white">{term} 관리</span>
          {" · "}
          {getManagementTermReason(item)}
        </p>
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

        <div className={`rounded-xl p-3 ${item.owner ? "bg-slate-950/60" : "border border-red-500/30 bg-red-950/20"}`}>
          <div className="text-xs text-slate-500">담당 / 기한</div>
          <div className={`mt-1 text-sm font-semibold [word-break:keep-all] ${item.owner ? "text-slate-200" : "text-red-200"}`}>
            {item.owner || "담당 미지정"} · {item.dueDate ? formatDate(item.dueDate) : "기한 미지정"}
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
              <SummaryCard label="담당 미지정" value={risk.unassignedOwnerCount} hint="담당자 지정 필요" tone="purple" />
            </section>

            <section className="mt-3 grid gap-3 sm:grid-cols-3">
              <SummaryCard label="단기 관리" value={risk.shortTermCount} hint="고위험·재평가·기한 임박" tone="red" />
              <SummaryCard label="중기 관리" value={risk.midTermCount} hint="개선대책 담당·기한 관리" tone="blue" />
              <SummaryCard label="장기 관리" value={risk.longTermCount} hint="예산·설비개선 반영" tone="purple" />
            </section>

            <RiskChartsSection risk={risk} />

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
