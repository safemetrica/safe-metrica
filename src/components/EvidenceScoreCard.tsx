interface Props {
  score: number;
  breakdown: { label: string; ok: boolean; count: number }[];
}

export default function EvidenceScoreCard({ score, breakdown }: Props) {
  const status =
    score >= 80
      ? {
          label: "양호",
          tone: "text-emerald-700",
          badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
          bar: "bg-emerald-500",
          border: "border-emerald-200",
        }
      : score >= 50
        ? {
            label: "보완 필요",
            tone: "text-amber-700",
            badge: "bg-amber-50 text-amber-700 ring-amber-100",
            bar: "bg-amber-500",
            border: "border-amber-200",
          }
        : {
            label: "확인 필요",
            tone: "text-red-700",
            badge: "bg-red-50 text-red-700 ring-red-100",
            bar: "bg-red-500",
            border: "border-red-200",
          };

  return (
    <div className={`mb-4 rounded-3xl border ${status.border} bg-white p-5 shadow-sm`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-xl ring-1 ring-slate-200">
              🛡️
            </span>
            <div>
              <h3 className="text-base font-black text-slate-950">증거 완결성</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                TBM · 증빙 · 승인 기록 기준
              </p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-4xl font-black leading-none ${status.tone}`}>{score}점</div>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${status.badge}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${status.bar}`} style={{ width: `${Math.max(0, Math.min(score, 100))}%` }} />
      </div>

      <div className="space-y-2">
        {breakdown.map((b, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm font-semibold text-slate-600">{b.label}</span>
            <span className={b.ok ? "text-sm font-black text-emerald-700" : "text-sm font-black text-red-700"}>
              {b.ok ? "완료" : "확인"} · {b.count}건
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
