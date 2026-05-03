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
export function SafeNav({ company = "\u338f\u5927\ub3c4\ud658\uacbd" }: { company?: string }) {
  return (
    <nav className="sticky top-0 z-50 bg-[#0F2D5E] px-6 flex items-center justify-between h-14 shadow-md">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
        <span className="text-xl">\U0001f6e1\ufe0f</span>
        <div>
          <span className="text-white font-bold text-sm tracking-tight">SafeMetrica\u2122</span>
          <span className="text-blue-300 text-xs ml-2">{company}</span>
        </div>
      </Link>
      <div className="flex gap-1">
        <Link href="/tbm"       className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">\U0001f4cb TBM</Link>
        <Link href="/ebm"       className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">\U0001f4da EB</Link>
        <Link href="/ptw"       className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">\U0001f9fe PTW</Link>
        <Link href="/dashboard" className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">\U0001f4ca \ub300\uc2dc</Link>
        <Link href="/field"     className="px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition">\U0001f477 \ud604\uc7a5</Link>
        <Link href="/kosha"     className="px-3 py-1.5 text-xs bg-white/20 text-white hover:bg-white/30 rounded-lg transition font-semibold">\U0001f3c5 KOSHA</Link>
      </div>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "\uc870\uce58 \uc644\ub8cc":      "bg-green-100 text-green-700 border border-green-200",
    "\uc989\uc2dc \uc870\uce58 \uc644\ub8cc": "bg-green-100 text-green-700 border border-green-200",
    "\uc870\uce58 \ud544\uc694":      "bg-red-100 text-red-700 border border-red-200",
    "\ud655\uc778 \uc911":        "bg-yellow-100 text-yellow-700 border border-yellow-200",
    "\ud5c8\uc6a9":           "bg-green-100 text-green-700 border border-green-200",
    "\uae08\uc9c0":           "bg-red-100 text-red-700 border border-red-200",
    "\uc2b9\uc778":           "bg-blue-100 text-blue-700 border border-blue-200",
    "\ubc18\ub824":           "bg-red-100 text-red-700 border border-red-200",
    "\uc694\uccad":           "bg-slate-100 text-slate-600 border border-slate-200",
    "\uc644\ub8cc":           "bg-green-100 text-green-700 border border-green-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
      {status}
    </span>
  );
}
