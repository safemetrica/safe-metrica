type ManagerPageHeadProps = {
  title: string;
  description: string;
  todayLabel: string;
  fieldHref: string;
};

export default function ManagerPageHead({ title, description, todayLabel, fieldHref }: ManagerPageHeadProps) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
          <span aria-hidden="true">📅</span>
          {todayLabel}
        </div>
        <button
          type="button"
          aria-label="내보내기 (준비 중)"
          disabled
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-400"
        >
          <span aria-hidden="true">⇩</span> 내보내기
        </button>
        <a
          href={fieldHref}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
        >
          <span aria-hidden="true">▦</span> 현장 QR 입구
        </a>
      </div>
    </section>
  );
}
