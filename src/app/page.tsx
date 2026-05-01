import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-4xl font-bold mb-2">SafeMetrica™</h1>
          <p className="text-gray-400 text-lg">산업안전 통합 관리 플랫폼</p>
          <p className="text-gray-600 text-sm mt-1">㈜대도환경 파일럿</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mt-4">
          <Link href="/tbm" className="bg-blue-600 hover:bg-blue-500 rounded-xl p-6 text-center transition">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold">TBM 현황</div>
            <div className="text-sm text-blue-200 mt-1">실시간 목록</div>
          </Link>
          <Link href="/ebm" className="bg-green-700 hover:bg-green-600 rounded-xl p-6 text-center transition">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-semibold">Evidence Book</div>
            <div className="text-sm text-green-200 mt-1">증빙 현황</div>
          </Link>
          <Link href="/ptw" className="bg-orange-700 hover:bg-orange-600 rounded-xl p-6 text-center transition">
            <div className="text-3xl mb-2">🧾</div>
            <div className="font-semibold">PTW</div>
            <div className="text-sm text-orange-200 mt-1">작업허가서</div>
          </Link>
          <Link href="/dashboard" className="bg-purple-700 hover:bg-purple-600 rounded-xl p-6 text-center transition">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold">대시보드</div>
            <div className="text-sm text-purple-200 mt-1">통계 요약</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
