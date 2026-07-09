type SidebarNavItem = {
  label: string;
  icon: string;
  href: string;
  badgeCount?: number;
  active?: boolean;
  featured?: boolean;
};

type ManagerSidebarProps = {
  companyLabel: string;
  managerHref: string;
  fieldHref: string;
  monthlyHref: string;
  monthlyConfirmationCount: number;
  preworkConfirmationCount: number;
  anonymousFeedbackCount: number;
};

function NavRow({ item }: { item: SidebarNavItem }) {
  return (
    <a
      href={item.href}
      className={
        item.active
          ? "flex items-center gap-3 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-extrabold text-white"
          : item.featured
            ? "flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
      }
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-black">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badgeCount ? (
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-black">
          {item.badgeCount}
        </span>
      ) : null}
    </a>
  );
}

export default function ManagerSidebar({
  companyLabel,
  managerHref,
  fieldHref,
  monthlyHref,
  monthlyConfirmationCount,
  preworkConfirmationCount,
  anonymousFeedbackCount,
}: ManagerSidebarProps) {
  return (
    <aside className="hidden w-[228px] shrink-0 flex-col bg-[#0E1F3D] px-3.5 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 text-sm font-black">
          S
        </span>
        <span className="text-base font-black tracking-tight">SafeMetrica</span>
      </div>

      <section className="mt-5 rounded-2xl bg-white/10 px-3 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">사업장</p>
        <p className="mt-1 text-sm font-black text-white">{companyLabel}</p>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-300">
          위험성평가 공유확인 안전운영
        </p>
      </section>

      <nav className="mt-5 flex-1 space-y-4 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            개요
          </p>
          <NavRow item={{ label: "대시보드", icon: "대", href: managerHref, active: true }} />
        </div>

        <div className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            안전운영
          </p>
          <NavRow
            item={{
              label: "위험성평가 공유확인",
              icon: "공",
              href: "#",
              badgeCount: monthlyConfirmationCount,
            }}
          />
          <NavRow
            item={{
              label: "작업 전 안전확인",
              icon: "작",
              href: "#",
              badgeCount: preworkConfirmationCount,
            }}
          />
          <NavRow
            item={{
              label: "익명 의견함",
              icon: "익",
              href: "#",
              badgeCount: anonymousFeedbackCount,
            }}
          />
          <NavRow item={{ label: "외부인 확인", icon: "외", href: "#" }} />
          <NavRow item={{ label: "근로자대표 확인", icon: "대", href: "#" }} />
          <NavRow
            item={{ label: "월간 안전운영 요약", icon: "월", href: monthlyHref, featured: true }}
          />
        </div>
      </nav>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-black text-white">
          <span aria-hidden="true">★</span> SafeMetrica 안전운영
        </p>
        <p className="mt-1.5 text-[11px] font-semibold leading-5 text-slate-300">
          위험성평가 공유확인 기록을 관리자 홈에서 확인합니다.
        </p>
        <a
          href={fieldHref}
          className="mt-2.5 block rounded-lg bg-white/15 px-3 py-1.5 text-center text-[11px] font-black text-white transition hover:bg-white/25"
        >
          현장 QR 입구
        </a>
      </section>
    </aside>
  );
}
