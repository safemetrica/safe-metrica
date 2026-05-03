import Link from "next/link";

export function SafeNav({ company = "㈜대도환경" }: { company?: string }) {
  return (
    <nav className="sticky top-0 z-50 bg-[#0F2D5E] px-6 flex items-center justify-between h-14 shadow-md">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
        <span className="text-xl">🛡️</span>
        <div>
          <span className="text-white font-bold text-sm tracking-tight">SafeMetrica™</span>
          <span className="text-blue-300 text-xs ml-2">{company}</span>
        </div>
      </Link>
      <div className="flex gap-1">
        <Link href="/tbm"       className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">📋 TBM</Link>
        <Link href="/ebm"       className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">📚 EB</Link>
        <Link href="/ptw"       className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">🧾 PTW</Link>
        <Link href="/dashboard" className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">📊 대시</Link>
        <Link href="/field"     className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">👷 현장</Link>
        <Link href="/kosha"     className="px-3 py-1.5 text-xs bg-white/20 text-white hover:bg-white/30 rounded-lg transition font-semibold">🏅 KOSHA</Link>
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "조치 완료":      "bg-green-100 text-green-700 border border-green-200",
    "즉시 조치 완료": "bg-green-100 text-green-700 border border-green-200",
    "조치 필요":      "bg-red-100 text-red-700 border border-red-200",
    "확인 중":        "bg-yellow-100 text-yellow-700 border border-yellow-200",
    "허용":           "bg-green-100 text-green-700 border border-green-200",
    "금지":           "bg-red-100 text-red-700 border border-red-200",
    "승인":           "bg-blue-100 text-blue-700 border border-blue-200",
    "반려":           "bg-red-100 text-red-700 border border-red-200",
    "요청":           "bg-slate-100 text-slate-600 border border-slate-200",
    "완료":           "bg-green-100 text-green-700 border border-green-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {status}
    </span>
  );
}
