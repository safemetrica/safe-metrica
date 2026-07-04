type RiskShareHeroAction = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

type RiskShareOfficialHeroProps = {
  eyebrow: string;
  title: string;
  meta?: string;
  description?: string;
  actions: RiskShareHeroAction[];
};

export default function RiskShareOfficialHero({
  eyebrow,
  title,
  meta,
  description,
  actions,
}: RiskShareOfficialHeroProps) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-[1.7rem]">
            {title}
          </h1>
        </div>
        {meta ? (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
            {meta}
          </span>
        ) : null}
      </div>

      {description ? (
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-500">
          {description}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {actions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={
              action.variant === "primary"
                ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500"
                : "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            }
          >
            {action.label}
          </a>
        ))}
      </div>
    </header>
  );
}
