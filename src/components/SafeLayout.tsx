import Link from "next/link";
import { getCompanyConfig } from "@/lib/company";

export async function SafeNav({ company }: { company?: string }) {
  let displayCompany = company ?? "회사 선택 필요";

  if (!company) {
    try {
      const config = await getCompanyConfig();
      displayCompany = config.name;
    } catch {
      displayCompany = "회사 선택 필요";
    }
  }

  return (
    <nav className="sticky top-0 z-50 flex max-w-full items-center justify-between gap-2 overflow-hidden border-b border-gray-700 bg-gray-900 px-2 py-2 sm:px-4 sm:py-3">
      <Link
        href="/home"
        className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3 hover:opacity-80 transition cursor-pointer"
      >
        <span className="text-xl sm:text-2xl shrink-0">🛡️</span>
        <div className="min-w-0">
          <div className="text-white font-bold text-xs sm:text-sm leading-tight truncate">
            SafeMetrica™
          </div>
          <div className="text-gray-400 text-[10px] sm:text-xs leading-tight truncate">
            {displayCompany}
          </div>
        </div>
      </Link>

      <div className="-mr-2 flex min-w-0 max-w-[calc(100vw-9rem)] shrink overflow-x-auto overscroll-x-contain pr-2 sm:mr-0 sm:max-w-none sm:shrink-0 sm:gap-1 sm:overflow-visible sm:pr-0">
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Link
          href="/tbm"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold sm:text-[15px]"><span className="text-base">📋</span><span>TBM</span></span>
        </Link>
        <Link
          href="/ebm"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold sm:text-[15px]"><span className="text-base">📚</span><span>EB</span></span>
        </Link>
        <Link
          href="/ptw"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold sm:text-[15px]"><span className="text-base">🧾</span><span>PTW</span></span>
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold sm:text-[15px]"><span className="text-base">📊</span><span className="hidden sm:inline">대시보드</span><span className="sm:hidden">대시</span></span>
        </Link>
        <Link
          href="/field"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold sm:text-[15px]"><span className="text-base">👷</span><span className="hidden sm:inline">현장비서</span><span className="sm:hidden">현장</span></span>
        </Link>

        <Link
          href="/monthly-report"
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-200 hover:text-white sm:text-[15px]"
        >
          <span className="text-base">📑</span>
          <span className="hidden sm:inline">월간보고서</span>
          <span className="sm:hidden">보고서</span>
        </Link>
        </div>
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "조치 완료": "bg-green-900 text-green-300 border border-green-700",
    "즉시 조치 완료": "bg-green-900 text-green-300 border border-green-700",
    "조치 필요": "bg-red-900 text-red-300 border border-red-700",
    "확인 중": "bg-yellow-900 text-yellow-300 border border-yellow-700",
    "허용": "bg-green-900 text-green-300 border border-green-700",
    "금지": "bg-red-900 text-red-300 border border-red-700",
    "승인": "bg-blue-900 text-blue-300 border border-blue-700",
    "반려": "bg-red-900 text-red-300 border border-red-700",
    "요청": "bg-gray-700 text-gray-300 border border-gray-600",
    "완료": "bg-green-900 text-green-300 border border-green-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-gray-700 text-gray-300 border border-gray-600"
      }`}
    >
      {status}
    </span>
  );
}