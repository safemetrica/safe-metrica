import Sparkline from "./charts/Sparkline";
import { ACCENT_HEX, type AccentKey } from "./managerColors";
import { SAMPLE_STAT_SPARKS, SAMPLE_STAT_TRENDS } from "./managerSampleData";

type StatCardConfig = {
  key: keyof typeof SAMPLE_STAT_TRENDS;
  icon: string;
  accent: AccentKey;
  label: string;
  value: number;
};

type StatCardsSectionProps = {
  monthlyConfirmationCount: number;
  preworkConfirmationCount: number;
  anonymousFeedbackCount: number;
  visitorConfirmationCount: number;
  representativeTotalCount: number;
};

function TrendBadge({ trend }: { trend: (typeof SAMPLE_STAT_TRENDS)[keyof typeof SAMPLE_STAT_TRENDS] }) {
  const isWarn = trend.kind === "warn";

  return (
    <span
      className={
        isWarn
          ? "flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-600"
          : "flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-600"
      }
    >
      <span aria-hidden="true">{isWarn ? "●" : "▲"}</span>
      {trend.text}
    </span>
  );
}

function StatCard({ card }: { card: StatCardConfig }) {
  const accent = ACCENT_HEX[card.accent];
  const trend = SAMPLE_STAT_TRENDS[card.key];
  const spark = SAMPLE_STAT_SPARKS[card.key];

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(20,30,55,0.06)]">
      <div className="flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black"
          style={{ backgroundColor: accent.bg, color: accent.fg }}
        >
          {card.icon}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <div>
        <p className="text-xs font-extrabold text-slate-500">{card.label}</p>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-black tracking-tight text-slate-950">{card.value}</span>
          <span className="text-sm font-black text-slate-400">건</span>
        </p>
      </div>
      <Sparkline data={spark} colorHex={accent.fg} height={28} />
    </article>
  );
}

export default function StatCardsSection({
  monthlyConfirmationCount,
  preworkConfirmationCount,
  anonymousFeedbackCount,
  visitorConfirmationCount,
  representativeTotalCount,
}: StatCardsSectionProps) {
  const cards: StatCardConfig[] = [
    {
      key: "monthlyConfirmation",
      icon: "공",
      accent: "info",
      label: "위험성평가 공유확인",
      value: monthlyConfirmationCount,
    },
    {
      key: "preworkConfirmation",
      icon: "작",
      accent: "success",
      label: "작업 전 안전확인",
      value: preworkConfirmationCount,
    },
    {
      key: "anonymousFeedback",
      icon: "익",
      accent: "warning",
      label: "익명 의견함",
      value: anonymousFeedbackCount,
    },
    {
      key: "visitorConfirmation",
      icon: "외",
      accent: "purple",
      label: "외부인 확인",
      value: visitorConfirmationCount,
    },
    {
      key: "representativeConfirmation",
      icon: "대",
      accent: "danger",
      label: "근로자대표 확인",
      value: representativeTotalCount,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <StatCard key={card.key} card={card} />
      ))}
    </section>
  );
}
