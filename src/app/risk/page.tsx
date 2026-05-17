import { buildRiskExecutionStatusSummary } from "@/lib/riskExecutionStatusSummary";
import { attachLinkedTbmsToRiskItems } from "@/lib/tbmRiskRelation";
import { attachRiskApprovalFieldsToItems } from "@/lib/riskApprovalFields";
import { RiskApprovalButtons } from "./RiskApprovalButtons";
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
  isTbmShareNeededItem,
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
  { key: "tbm-needed", label: "TBM 공유 필요" },
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

type DueStatus = {
  label: string;
  detail: string;
  tone: "red" | "amber" | "emerald" | "slate";
};

function getTodayKstDate(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(`${kst.toISOString().slice(0, 10)}T00:00:00+09:00`);
}

function formatDueStatus(dueDate: string, status: string): DueStatus {
  if (status === "완료") {
    return {
      label: "완료",
      detail: "완료된 항목입니다.",
      tone: "emerald",
    };
  }

  if (!dueDate) {
    return {
      label: "기한 미지정",
      detail: "담당자가 조치기한을 지정해야 합니다.",
      tone: "red",
    };
  }

  const today = getTodayKstDate();
  const due = new Date(`${dueDate}T00:00:00+09:00`);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = formatDate(dueDate);

  if (diffDays < 0) {
    return {
      label: `${formattedDate} · D+${Math.abs(diffDays)} 초과`,
      detail: "기한이 지난 항목입니다.",
      tone: "red",
    };
  }

  if (diffDays === 0) {
    return {
      label: `${formattedDate} · 오늘 마감`,
      detail: "오늘 조치 확인이 필요합니다.",
      tone: "amber",
    };
  }

  return {
    label: `${formattedDate} · D-${diffDays}`,
    detail: diffDays <= 7 ? "7일 이내 조치기한입니다." : "기한 관리 중입니다.",
    tone: diffDays <= 7 ? "amber" : "slate",
  };
}

function getDueToneClass(tone: DueStatus["tone"]): string {
  if (tone === "red") {
    return "border border-red-500/40 bg-red-950/20";
  }

  if (tone === "amber") {
    return "border border-amber-500/40 bg-amber-950/20";
  }

  if (tone === "emerald") {
    return "border border-emerald-500/40 bg-emerald-950/20";
  }

  return "bg-slate-950/60";
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

function toOptionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toOptionalBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, "").toLowerCase();
    return ["true", "yes", "y", "1", "필요", "있음", "완료"].some((token) =>
      normalized.includes(token)
    );
  }
  return Boolean(value);
}

function RiskExecutionStatusPanel({
  summary,
}: {
  summary: ReturnType<typeof buildRiskExecutionStatusSummary>;
}) {
  const toneClassMap = {
    green: "border-emerald-500/40 bg-emerald-500/10",
    amber: "border-amber-500/40 bg-amber-500/10",
    blue: "border-blue-500/40 bg-blue-500/10",
    red: "border-red-500/40 bg-red-500/10",
    slate: "border-slate-500/40 bg-slate-500/10",
  } as const;

  const toneClass = toneClassMap[summary.overallTone] ?? toneClassMap.slate;

  return (
    <div className={`mt-4 rounded-xl border p-3 ${toneClass}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-bold text-white">
          실행상태
        </span>
        <span className="text-sm font-bold text-white">
          {summary.overallLabel}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-300">
        {summary.overallMessage}
      </p>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <div className="text-[11px] font-semibold text-slate-400">
            TBM 공유상태
          </div>
          <div className="mt-1 text-sm font-bold text-white">
            {summary.tbmShare.label}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            연결 TBM {summary.tbmShare.linkedTbmCount}건
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <div className="text-[11px] font-semibold text-slate-400">
            개선대책 판정
          </div>
          <div className="mt-1 text-sm font-bold text-white">
            {summary.completionCandidate.label}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {summary.completionCandidate.missingEvidence.length > 0
              ? `보완 ${summary.completionCandidate.missingEvidence.length}건`
              : "보완 항목 없음"}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
          <div className="text-[11px] font-semibold text-slate-400">
            승인·반영상태
          </div>
          <div className="mt-1 text-sm font-bold text-white">
            {summary.approval.approvalStatus === "approvalReady"
              ? "승인 대기"
              : summary.approval.approvalStatus === "approved"
                ? "승인 완료"
                : summary.approval.approvalStatus === "rejected"
                  ? "반려"
                  : summary.approval.approvalStatus === "moreEvidenceRequired"
                    ? "보완 요청"
                    : "관리자 확인 필요"}
          </div>
          <div
            className={
              summary.riskDbReflectionTone === "green"
                ? "mt-1 text-[11px] text-emerald-200"
                : "mt-1 text-[11px] text-amber-200"
            }
          >
            {summary.riskDbReflectionLabel || "Risk DB 미반영"}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
        TBM 공유 완료는 교육·공유 이행 근거이며, 개선대책 완료와 구분됩니다.
        {summary.riskDbReflectionStatus === "반영 완료"
          ? " Risk DB 반영 완료 상태가 Notion 승인 필드에서 확인되었습니다."
          : " Risk DB 상태는 관리자 승인 전까지 자동 변경되지 않습니다."}
      </div>

      {summary.postActionReflection ||
      summary.actionReflectionType ||
      summary.actionReflectionDate ||
      summary.actionReflectionEvidence ? (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-100">
              조치 후 반영내용
            </span>
            <span className="text-xs text-emerald-200">
              최초·정기·수시·상시평가 내용과 분리 기록
            </span>
          </div>

          {summary.postActionReflection ? (
            <div className="text-sm font-bold leading-relaxed text-white">
              {summary.postActionReflection}
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {summary.actionReflectionType ? (
              <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  반영유형
                </div>
                <div className="mt-1 text-xs font-bold text-white">
                  {summary.actionReflectionType}
                </div>
              </div>
            ) : null}

            {summary.actionReflectionDate ? (
              <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  반영일
                </div>
                <div className="mt-1 text-xs font-bold text-white">
                  {summary.actionReflectionDate}
                </div>
              </div>
            ) : null}

            {summary.actionReflectionEvidence ? (
              <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  반영 근거
                </div>
                <div className="mt-1 text-xs font-bold text-white">
                  {summary.actionReflectionEvidence}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!summary.postActionReflection &&
      summary.postActionReflectionCandidate?.hasCandidate ? (
        <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-bold text-cyan-100">
              AI 반영 후보
            </span>
            <span className="text-xs text-cyan-200">
              TBM·사진·조치상태·완료조건 기반 자동 생성
            </span>
          </div>

          <div className="text-sm font-bold leading-relaxed text-white">
            {summary.postActionReflectionCandidate.content}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
              <div className="text-[11px] font-semibold text-slate-400">반영유형 후보</div>
              <div className="mt-1 text-xs font-bold text-white">
                {summary.postActionReflectionCandidate.types.join(", ") || "분류 없음"}
              </div>
            </div>

            <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
              <div className="text-[11px] font-semibold text-slate-400">반영일 후보</div>
              <div className="mt-1 text-xs font-bold text-white">
                {summary.postActionReflectionCandidate.date || "날짜 미확인"}
              </div>
            </div>

            <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-2">
              <div className="text-[11px] font-semibold text-slate-400">반영 근거 후보</div>
              <div className="mt-1 text-xs font-bold text-white">
                {summary.postActionReflectionCandidate.evidence}
              </div>
            </div>
          </div>

          <div className="mt-2 text-[11px] leading-relaxed text-cyan-100/80">
            이 내용은 자동 후보이며, 승인 완료 처리 시 Risk Items DB의 조치 후 반영내용으로 기록됩니다.
          </div>
        </div>
      ) : null}

      <RiskApprovalButtons
        riskItemId={summary.riskItemId}
        canApprove={
          summary.completionCandidate.isCompletionCandidate &&
          summary.approval.approvalStatus === "approvalReady"
        }
        isApproved={summary.approval.approvalStatus === "approved"}
        postActionReflectionCandidate={summary.postActionReflectionCandidate}
      />
    </div>
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
      <div className="flex items-center gap-2">
        <div className={`text-4xl font-black leading-none ${valueClass}`}>{value}</div>
        {value === 0 ? (
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
            해당 없음
          </span>
        ) : null}
      </div>
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
          <h2 className="text-base font-bold text-white">위험관리 분석 차트</h2>
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
  const dueStatus = formatDueStatus(item.dueDate, item.status);
  const riskRecord = item as unknown as Record<string, unknown>;
  const executionSummary = buildRiskExecutionStatusSummary({
    riskItem: {
      id: toOptionalText(riskRecord.id),
      riskItemId: toOptionalText(riskRecord.id),
      processName: toOptionalText(riskRecord.processName),
      taskName: toOptionalText(riskRecord.taskName),
      hazard: toOptionalText(riskRecord.hazard),
      accidentType: toOptionalText(riskRecord.accidentType),
      status: toOptionalText(riskRecord.status),
      actionStatus: toOptionalText(riskRecord.actionStatus),
      improvementStatus: toOptionalText(riskRecord.improvementStatus),
      riskLevel: toOptionalText(riskRecord.riskLevel),
      tbmLinked: toOptionalBoolean(riskRecord.tbmLinked),
      tbmShared: toOptionalBoolean(riskRecord.tbmShared),
      tbmSharedDate: toOptionalText(riskRecord.tbmSharedDate),
      tbmSharedBy: toOptionalText(riskRecord.tbmSharedBy),
      tbmSharedRole: toOptionalText(riskRecord.tbmSharedRole),
      linkedTbmId: toOptionalText(riskRecord.linkedTbmId),
      linkedTbmTitle: toOptionalText(riskRecord.linkedTbmTitle),
      linkedTbms: Array.isArray(riskRecord.linkedTbms)
        ? riskRecord.linkedTbms
        : [],
      budgetRequired: toOptionalBoolean(riskRecord.budgetRequired),
      estimatedCost: toOptionalNumber(riskRecord.estimatedCost),
    },
  });

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
    isTbmShareNeededItem(item) ? "TBM 공유 필요" : null,
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <div className="text-xs text-slate-500">담당자</div>
          <div className={`mt-1 text-sm font-bold [word-break:keep-all] ${item.owner ? "text-slate-100" : "text-red-200"}`}>
            {item.owner || "담당자 지정 필요"}
          </div>
        </div>

        <div className={`rounded-xl p-3 ${getDueToneClass(dueStatus.tone)}`}>
          <div className="text-xs text-slate-500">기한</div>
          <div className="mt-1 text-sm font-bold text-slate-100 [word-break:keep-all]">
            {dueStatus.label}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 [word-break:keep-all]">
            {dueStatus.detail}
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

          <RiskExecutionStatusPanel summary={executionSummary} />

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {flags.map((flag) => (
          <span key={flag} className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
            {flag}
          </span>
        ))}
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
          {item.budgetRequired
            ? `예산 필요 · ${typeof item.estimatedCost === "number" ? formatMoney(item.estimatedCost) : "금액 미정"}`
            : "예산 불필요"}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
          TBM 공유 {item.tbmLinked ? "연계" : "미연계"}
        </span>
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-300">
          재평가 {item.reassessmentDate ? formatDate(item.reassessmentDate) : "미지정"}
        </span>
      </div>
    </article>
  );
}

export default async function RiskPage({ searchParams }: RiskPageProps) {
  const params = searchParams ? await searchParams : {};
  const filter = normalizeFilter(params.filter);

  const company = await getCompanyConfig();
  const companyRecord = company as unknown as Record<string, unknown>;
  const tbmDatabaseId = [
    companyRecord.tbmDatabaseId,
    companyRecord.tbmDbId,
    companyRecord.tbmDatabaseID,
    companyRecord.tbmLogDbId,
    companyRecord.tbmDatabase,
    companyRecord.tbmDb,
  ].find((value) => typeof value === "string" && value.length > 0) as string | undefined;

  const riskBase = await getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey);
  const linkedRiskItems = await attachLinkedTbmsToRiskItems(riskBase.items, {
    tbmDatabaseId,
    notionApiKey: company.notionApiKey,
  });
  const approvedRiskItems = await attachRiskApprovalFieldsToItems(linkedRiskItems, {
    riskDatabaseId: company.riskAssessmentDbId,
    notionApiKey: company.notionApiKey,
  });
  const risk = {
    ...riskBase,
    items: approvedRiskItems,
  };
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
              Risk Intelligence · 위험성평가 관리현황
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 [word-break:keep-all]">
              {company.name} 위험성평가 DB 기준으로 고위험, 개선대책, 예산, 재평가 항목을 상세 확인합니다.
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
            {risk.hasDb ? `DB 연동됨 · ${risk.total}건` : "DB 연결 필요"}
          </span>
        </div>

        {!risk.hasDb ? (
          <section className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold text-white">위험성평가 DB 연결 필요</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 [word-break:keep-all]">
              Companies DB에 riskAssessmentDbId가 연결되면 이 화면에서 위험성평가 상세 항목을 확인할 수 있습니다.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard label="전체 위험항목" value={risk.total} hint="등록된 위험항목" tone="slate" />
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
