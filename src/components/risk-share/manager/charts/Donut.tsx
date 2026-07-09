type DonutSegment = {
  value: number;
  colorHex: string;
};

type DonutProps = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel: string;
};

export default function Donut({ segments, size = 128, strokeWidth = 14, centerValue, centerLabel }: DonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offsetSoFar = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eef2f8"
          strokeWidth={strokeWidth}
        />
        {total > 0
          ? segments.map((segment, index) => {
              const fraction = segment.value / total;
              const dash = fraction * circumference;
              const dashArray = `${dash} ${circumference - dash}`;
              const dashOffset = -offsetSoFar * circumference;
              offsetSoFar += fraction;

              return (
                <circle
                  key={`${segment.colorHex}-${index}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.colorHex}
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
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-lg font-black text-slate-950">{centerValue}</span>
        <span className="text-[11px] font-bold text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
}
