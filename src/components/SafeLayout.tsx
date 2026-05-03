import Link from "next/link";

export function SafeNav({ company = "㈜대도환경" }: { company?: string }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#1E3A5F] bg-[#0D1B2A]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
        <span className="text-2xl">🛡️</span>
        <div>
          <div className="text-white font-bold text-sm leading-tight tracking-tight">SafeMetrica™</div>
          <div className="text-[#0EA5E9] text-xs">{company}</div>
        </div>
      </Link>
      <div className="flex gap-1">
        <Link href="/tbm"       className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition">📋 TBM</Link>
        <Link href="/ebm"       className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition">📚 EB</Link>
        <Link href="/ptw"       className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition">🧾 PTW</Link>
        <Link href="/dashboard" className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition">📊 대시</Link>
        <Link href="/field"     className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition">👷 현장</Link>
        <Link href="/kosha"     className="px-3 py-1.5 text-xs text-[#0EA5E9] hover:text-white hover:bg-[#1E3A5F] rounded-lg transition font-medium">🏅 KOSHA</Link>
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "조치 완료":      "bg-green-950 text-green-400 border border-green-800",
    "즉시 조치 완료": "bg-green-950 text-green-400 border border-green-800",
    "조치 필요":      "bg-red-950 text-red-400 border border-red-800",
    "확인 중":        "bg-yellow-950 text-yellow-400 border border-yellow-800",
    "허용":           "bg-green-950 text-green-400 border border-green-800",
    "금지":           "bg-red-950 text-red-400 border border-red-800",
    "승인":           "bg-blue-950 text-blue-400 border border-blue-800",
    "반려":           "bg-red-950 text-red-400 border border-red-800",
    "요청":           "bg-slate-800 text-slate-300 border border-slate-700",
    "완료":           "bg-green-950 text-green-400 border border-green-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-slate-800 text-slate-300 border border-slate-700"}`}>
      {status}
    </span>
  );
}
