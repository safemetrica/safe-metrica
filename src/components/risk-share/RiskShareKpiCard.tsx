type RiskShareKpiCardProps = {
  label: string;
  value: number;
  description: string;
  footnote?: string;
};

export default function RiskShareKpiCard({ label, value, description, footnote }: RiskShareKpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{label}</p>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tight text-slate-900">{value}</span>
        <span className="text-sm font-bold text-slate-400">건</span>
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{description}</p>
      {footnote ? (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-semibold leading-5 text-slate-500">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
