interface Props {
  score: number;
  breakdown: { label: string; ok: boolean; count: number }[];
}

export default function EvidenceScoreCard({ score, breakdown }: Props) {
  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const borderColor = score >= 80 ? "border-green-700" : score >= 50 ? "border-yellow-700" : "border-red-700";
  const bgColor = score >= 80 ? "bg-green-950" : score >= 50 ? "bg-yellow-950" : "bg-red-950";
  const label = score >= 80 ? "🟢 증거 충분" : score >= 50 ? "🟡 보완 필요" : "🔴 증거 부족";

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-4 mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <span className="text-white font-bold text-sm">증거 완결성</span>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${color}`}>{score}점</span>
          <div className={`text-xs ${color}`}>{label}</div>
        </div>
      </div>
      <div className="space-y-1">
        {breakdown.map((b, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{b.label}</span>
            <span className={b.ok ? "text-green-400" : "text-red-400"}>
              {b.ok ? "✅" : "❌"} {b.count}건
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
