import StackedBars from "./charts/StackedBars";
import { ACCENT_HEX, type AccentKey } from "./managerColors";
import { SAMPLE_WEEKLY_TREND } from "./managerSampleData";

const COLOR_VAR_TO_ACCENT: Record<string, AccentKey> = {
  c1: "info",
  c2: "success",
  c3: "warning",
};

export default function WeeklyTrendCard() {
  const series = SAMPLE_WEEKLY_TREND.series.map((item) => ({
    label: item.label,
    colorHex: ACCENT_HEX[COLOR_VAR_TO_ACCENT[item.colorVar] ?? "info"].fg,
    data: item.data,
  }));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-950">최근 7일 접수 흐름</h3>
          <p className="text-[11px] font-semibold text-slate-400">일자별 · 항목 누적 · 샘플 데이터</p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
          {series.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.colorHex }} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <StackedBars labels={SAMPLE_WEEKLY_TREND.labels} series={series} height={200} />
      </div>
    </article>
  );
}
