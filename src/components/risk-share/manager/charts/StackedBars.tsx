type StackedBarsSeries = {
  label: string;
  colorHex: string;
  data: readonly number[];
};

type StackedBarsProps = {
  labels: readonly string[];
  series: readonly StackedBarsSeries[];
  height?: number;
};

export default function StackedBars({ labels, series, height = 220 }: StackedBarsProps) {
  const totals = labels.map((_, index) =>
    series.reduce((sum, item) => sum + (item.data[index] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);

  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {labels.map((label, index) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 flex-col-reverse items-stretch overflow-hidden rounded-lg">
            {series.map((item) => {
              const value = item.data[index] ?? 0;
              const barHeight = value > 0 ? Math.max(6, (value / max) * (height - 24)) : 0;

              return value > 0 ? (
                <div
                  key={item.label}
                  className="w-full first:rounded-t-lg"
                  style={{ height: barHeight, backgroundColor: item.colorHex }}
                  title={`${item.label}: ${value}`}
                />
              ) : null;
            })}
          </div>
          <span className="text-[11px] font-bold text-slate-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
