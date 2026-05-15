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
    <nav className="bg-gray-900 border-b border-gray-700 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sticky top-0 z-50">
      <Link
        href="/"
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

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Link
          href="/tbm"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          📋 TBM
        </Link>
        <Link
          href="/ebm"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          📚 EB
        </Link>
        <Link
          href="/ptw"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          🧾 PTW
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          📊 대시
        </Link>
        <Link
          href="/field"
          className="inline-flex items-center whitespace-nowrap px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs leading-none text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          👷 현장
        </Link>
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