import SignOutButton from "@/components/auth/SignOutButton";
import { ACCENT_HEX } from "./managerColors";
import { SAMPLE_NOTIFICATIONS } from "./managerSampleData";

type ManagerHeaderProps = {
  companyLabel: string;
  monthLabel: string;
  userDisplayName: string;
  userEmail: string;
  userRoleLabel: string;
};

export default function ManagerHeader({
  companyLabel,
  monthLabel,
  userDisplayName,
  userEmail,
  userRoleLabel,
}: ManagerHeaderProps) {
  const avatarInitial = userDisplayName.trim().slice(0, 1) || "관";

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-7">
      <button
        type="button"
        aria-label="메뉴 열기/닫기"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 lg:hidden"
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
        <span>{monthLabel}</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{companyLabel}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400 sm:flex">
          <span aria-hidden="true">⌕</span>
          <input
            type="text"
            placeholder="접수 · 근로자 검색"
            aria-label="접수 · 근로자 검색 (준비 중)"
            className="w-36 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none"
            disabled
          />
        </label>

        <button
          type="button"
          aria-label="테마 전환 (준비 중)"
          disabled
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400"
        >
          <span aria-hidden="true">☀︎</span>
        </button>

        <details className="group relative">
          <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 text-slate-500 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true">🔔</span>
            <span
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: ACCENT_HEX.danger.fg }}
            />
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_36px_rgba(20,30,55,0.12)]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-black text-slate-950">알림</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400">
                샘플
              </span>
            </div>
            {SAMPLE_NOTIFICATIONS.map((item) => (
              <div key={item.title} className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                  style={{ backgroundColor: ACCENT_HEX[item.accent].bg, color: ACCENT_HEX[item.accent].fg }}
                >
                  ●
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900">{item.title}</p>
                  <p className="text-[11px] font-semibold text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </details>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 [&::-webkit-details-marker]:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
              {avatarInitial}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-black text-slate-900">{userDisplayName}</span>
              <span className="block text-[11px] font-semibold text-slate-400">{userRoleLabel}</span>
            </span>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_36px_rgba(20,30,55,0.12)]">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-2 pb-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                {avatarInitial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-900">{userDisplayName}</p>
                <p className="truncate text-[11px] font-semibold text-slate-400">{userEmail}</p>
              </div>
            </div>
            <a href="#" className="block rounded-xl px-2.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
              프로필 정보
            </a>
            <a href="#" className="block rounded-xl px-2.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">
              계정 설정
            </a>
            <div className="mt-1 border-t border-slate-100 px-2.5 pt-2">
              <SignOutButton />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
