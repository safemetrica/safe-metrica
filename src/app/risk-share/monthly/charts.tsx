/**
 * Static SVG/HTML replacements for the reference monthly.html <canvas> +
 * Chart.js shapes (5-month trend area line, item-detail horizontal bars).
 * No Chart.js dependency; renders in place of the original <canvas id="...">
 * elements inside the same .chart-wrap wrappers from designer.css.
 * The item-mix and signature donuts reuse the manager route's <Donut>.
 */

type AreaTrendProps = {
  labels: readonly string[];
  data: readonly number[];
  colorVar: string;
};

export function AreaTrend({ labels, data, colorVar }: AreaTrendProps) {
  const width = 560;
  const height = 260;
  const padding = 24;
  const bottomAxis = 20;
  const max = Math.max(1, ...data);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding - bottomAxis;
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : plotWidth;
  const floorY = padding + plotHeight;

  const points = data.map((value, index) => ({
    x: padding + index * stepX,
    y: padding + plotHeight - (value / max) * plotHeight,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L${lastPoint.x.toFixed(1)},${floorY.toFixed(1)} L${firstPoint.x.toFixed(1)},${floorY.toFixed(1)} Z`;
  const gradientId = `monthly-area-trend-${colorVar.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`var(${colorVar})`} stopOpacity={0.35} />
          <stop offset="100%" stopColor={`var(${colorVar})`} stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={padding} y1={floorY} x2={width - padding} y2={floorY} stroke="var(--border)" strokeWidth={1} />
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={`var(${colorVar})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle key={labels[index]} cx={point.x} cy={point.y} r={4} fill={`var(${colorVar})`} />
      ))}
      {labels.map((label, index) => (
        <text key={label} x={points[index].x} y={height - 4} textAnchor="middle" fontSize="11" fill="var(--text-3)">
          {label}
        </text>
      ))}
    </svg>
  );
}

type HorizontalBarsItem = {
  label: string;
  value: number;
  colorVar: string;
};

type HorizontalBarsProps = {
  items: readonly HorizontalBarsItem[];
};

export function HorizontalBars({ items }: HorizontalBarsProps) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "16px", height: "100%" }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "grid", gridTemplateColumns: "92px 1fr 40px", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{item.label}</span>
          <span style={{ display: "block", height: "10px", borderRadius: "6px", background: "var(--border)", overflow: "hidden" }}>
            <span
              style={{
                display: "block",
                height: "100%",
                borderRadius: "6px",
                width: `${(item.value / max) * 100}%`,
                background: `var(${item.colorVar})`,
              }}
            />
          </span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-2)", textAlign: "right" }}>{item.value}건</span>
        </div>
      ))}
    </div>
  );
}
