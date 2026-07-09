type SparklineProps = {
  data: readonly number[];
  colorHex: string;
  width?: number;
  height?: number;
};

export default function Sparkline({ data, colorHex, width = 96, height = 32 }: SparklineProps) {
  const max = Math.max(1, ...data);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={colorHex}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
