/**
 * Static SVG replacements for the reference manager.html <canvas> + Chart.js
 * shapes (stat sparklines, weekly stacked bars, status/signature donuts).
 * No Chart.js dependency; renders in place of the original <canvas id="...">
 * elements inside the same .stat__spark / .chart-wrap wrappers from designer.css.
 */

type SparklineProps = {
  data: readonly number[];
  colorVar: string;
};

export function Sparkline({ data, colorVar }: SparklineProps) {
  const width = 96;
  const height = 40;
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={`var(${colorVar})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StackedBarsSeries = {
  colorVar: string;
  data: readonly number[];
};

type StackedBarsProps = {
  labels: readonly string[];
  series: readonly StackedBarsSeries[];
};

export function StackedBars({ labels, series }: StackedBarsProps) {
  const width = 560;
  const height = 260;
  const barGap = 14;
  const barWidth = (width - barGap * (labels.length - 1)) / labels.length;
  const totals = labels.map((_, index) => series.reduce((sum, item) => sum + (item.data[index] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const plotHeight = height - 24;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {labels.map((label, index) => {
        const x = index * (barWidth + barGap);
        let yCursor = plotHeight;

        return (
          <g key={label}>
            {series.map((item) => {
              const value = item.data[index] ?? 0;
              const barHeight = value > 0 ? (value / max) * plotHeight : 0;
              yCursor -= barHeight;

              return value > 0 ? (
                <rect
                  key={item.colorVar}
                  x={x}
                  y={yCursor}
                  width={barWidth}
                  height={barHeight}
                  rx={5}
                  fill={`var(${item.colorVar})`}
                />
              ) : null;
            })}
            <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--text-3)">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type DonutSegment = {
  value: number;
  colorVar: string;
};

type DonutProps = {
  segments: DonutSegment[];
};

export function Donut({ segments }: DonutProps) {
  const size = 140;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offsetSoFar = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      {total > 0
        ? segments.map((segment, index) => {
            const fraction = segment.value / total;
            const dash = fraction * circumference;
            const dashArray = `${dash} ${circumference - dash}`;
            const dashOffset = -offsetSoFar * circumference;
            offsetSoFar += fraction;

            return (
              <circle
                key={`${segment.colorVar}-${index}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`var(${segment.colorVar})`}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })
        : null}
    </svg>
  );
}
