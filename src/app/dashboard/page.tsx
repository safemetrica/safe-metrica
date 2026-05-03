export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";

const TAG_RISK_MAP: Record<string, { factor: string; S: number; L: number }> = {
  "고소작업": { factor: "추락", S: 5, L: 3 },
  "밀폐공간": { factor: "산소결핍", S: 5, L: 2 },
  "중장비": { factor: "협착/충돌", S: 4, L: 3 },
  "전기작업": { factor: "감전", S: 4, L: 2 },
  "화학물질": { factor: "중독/화재", S: 4, L: 2 },
  "굴착": { factor: "토사붕괴", S: 4, L: 3 },
  "차량운행": { factor: "교통사고", S: 3, L: 3 },
  "용접": { factor: "화재/폭발", S: 3, L: 3 },
  "야간작업": { factor: "조명불량", S: 3, L: 2 },
  "폐기물처리": { factor: "유해물질", S: 3, L: 2 },
};

async function getDashboardData() {
  const apiBase = "https://api.notion.com/v1/databases";
  const res = await fetch(`${apiBase}/${process.env.NOTION_TBM_DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100, sorts: [{ property: "날짜", direction: "descending" }] }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "error");

  const rows = data.results.map((p: any) => ({
    id: p.id,
    작업명: p.properties["작업명"]?.title?.[0]?.plain_text ?? "(작업명 없음)",
    날짜: p.properties["날짜"]?.date?.start ?? "",
    특이사항: p.properties["특이사항"]?.checkbox ?? false,
    조치상태: p.properties["조치 상태"]?.select?.name ?? "",
    연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
    실시자: p.properties["실시자(현장총괄)"]?.people?.[0]?.name ?? "",
    작업태그: p.properties["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
  }));

  const today = new Date().toISOString().slice(0, 7);
  const EB누락목록 = rows.filter((r: any) => r.특이사항 && r.연결EB === 0);
  const 조치필요목록 = rows.filter((r: any) => r.조치상태 === "조치 필요");

  // 대표 에스컬레이션: 작업태그 기반 최대 R값 1건
  let 최악건: any = null;
  let 최악R = 0;
  for (const row of rows) {
    for (const tag of row.작업태그) {
      const m = TAG_RISK_MAP[tag];
      if (m) {
        const R = m.S * m.L;
        if (R > 최악R) {
          최악R = R;
          최악건 = { ...row, 위험요인: m.factor, S: m.S, L: m.L, R };
        }
      }
    }
  }
  const 에스컬레이션 = 최악건 && (최악R >= 16 || (최악R >= 8 && 최악건.S === 5));

  return {
    전체: rows.length,
    이번달: rows.filter((r: any) => r.날짜?.startsWith(today)).length,
    특이사항: rows.filter((r: any) => r.특이사항).length,
    EB누락: EB누락목록.length,
    조치필요: 조치필요목록.length,
    리스크점수: Math.min(100, EB누락목록.length * 20 + 조치필요목록.length * 10),
    EB누락목록: EB누락목록.slice(0, 3),
    조치필요목록: 조치필요목록.slice(0, 3),
    최악건,
    최악R,
    에스컬레이션,
  };
}

export default async function DashboardPage() {
  const s = await getDashboardData();
  const 리스크색 = s.리스크점수 >= 60 ? "text-red-400" : s.리스크점수 >= 30 ? "text-yellow-400" : "text-green-400";
  const 리스크라벨 = s.리스크점수 >= 60 ? "🔴 위험" : s.리스크점수 >= 30 ? "🟡 주의" : "🟢 안전";

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4 mt-2">
          <h1 className="text-white text-xl font-bold">📊 대시보드</h1>
          <span className="text-gray-400 text-xs">{new Date().toLocaleDateString("ko-KR")}</span>
        </div>

        {/* 리스크 지수 */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4 flex items-center justify-between">
          <div>
            <div className="text-gray-400 text-xs mb-1">현장 리스크 지수</div>
            <div className={`text-4xl font-bold ${리스크색}`}>{s.리스크점수}점</div>
            <div className={`text-sm font-medium mt-1 ${리스크색}`}>{리스크라벨}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-xs">EB누락 ×20 + 조치필요 ×10</div>
            <div className="text-gray-500 text-xs mt-1">100점 = 최고 위험</div>
          </div>
        </div>

        {/* 요약 카운트 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{s.전체}</div>
            <div className="text-blue-400 text-sm mt-1">전체 TBM</div>
          </div>
          <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{s.이번달}</div>
            <div className="text-emerald-400 text-sm mt-1">이번 달 TBM</div>
          </div>
          <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{s.특이사항}</div>
            <div className="text-yellow-400 text-sm mt-1">특이사항 발생</div>
          </div>
          <div className={`rounded-xl p-4 border ${s.EB누락 > 0 ? "bg-red-950 border-red-800" : "bg-gray-800 border-gray-700"}`}>
            <div className="text-3xl font-bold text-white">{s.EB누락}</div>
            <div className={`text-sm mt-1 ${s.EB누락 > 0 ? "text-red-400" : "text-gray-400"}`}>🔴 EB 누락</div>
          </div>
        </div>

        {/* 카드 1: EB 누락 */}
        <div className={`rounded-2xl border p-4 mb-3 ${s.EB누락 > 0 ? "bg-red-950 border-red-800" : "bg-gray-900 border-gray-700"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔴</span>
              <span className="text-white font-bold">EB 누락</span>
            </div>
            <span className={`text-2xl font-bold ${s.EB누락 > 0 ? "text-red-400" : "text-gray-400"}`}>{s.EB누락}건</span>
          </div>
          {s.EB누락목록.length > 0 ? (
            <div className="space-y-2">
              {s.EB누락목록.map((r: any) => (
                <Link key={r.id} href={`/tbm/${r.id}`}>
                  <div className="bg-red-900/40 rounded-lg p-3 hover:bg-red-900/60 transition cursor-pointer">
                    <div className="text-white text-sm font-medium">{r.작업명}</div>
                    <div className="text-red-300 text-xs mt-0.5">{r.날짜}{r.실시자 ? ` · ${r.실시자}` : ""}</div>
                  </div>
                </Link>
              ))}
              {s.EB누락 > 3 && (
                <Link href="/tbm"><div className="text-red-400 text-xs text-center pt-1 hover:underline">+ {s.EB누락 - 3}건 더 보기</div></Link>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">누락 없음 ✅</div>
          )}
        </div>

        {/* 카드 2: 조치 필요 */}
        <div className={`rounded-2xl border p-4 mb-3 ${s.조치필요 > 0 ? "bg-yellow-950 border-yellow-800" : "bg-gray-900 border-gray-700"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🟡</span>
              <span className="text-white font-bold">조치 필요</span>
            </div>
            <span className={`text-2xl font-bold ${s.조치필요 > 0 ? "text-yellow-400" : "text-gray-400"}`}>{s.조치필요}건</span>
          </div>
          {s.조치필요목록.length > 0 ? (
            <div className="space-y-2">
              {s.조치필요목록.map((r: any) => (
                <Link key={r.id} href={`/tbm/${r.id}`}>
                  <div className="bg-yellow-900/40 rounded-lg p-3 hover:bg-yellow-900/60 transition cursor-pointer">
                    <div className="text-white text-sm font-medium">{r.작업명}</div>
                    <div className="text-yellow-300 text-xs mt-0.5">{r.날짜}{r.실시자 ? ` · ${r.실시자}` : ""}</div>
                  </div>
                </Link>
              ))}
              {s.조치필요 > 3 && (
                <Link href="/tbm"><div className="text-yellow-400 text-xs text-center pt-1 hover:underline">+ {s.조치필요 - 3}건 더 보기</div></Link>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">조치 필요 없음 ✅</div>
          )}
        </div>

        {/* 카드 3: 대표 에스컬레이션 */}
        <div className={`rounded-2xl border p-4 mb-4 ${s.에스컬레이션 ? "bg-red-950 border-red-700" : "bg-gray-900 border-gray-700"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚫</span>
              <span className="text-white font-bold">대표 에스컬레이션</span>
            </div>
            {s.최악건 && (
              <span className={`text-xl font-bold ${s.에스컬레이션 ? "text-red-400" : "text-gray-400"}`}>R={s.최악R}</span>
            )}
          </div>
          {s.최악건 ? (
            <Link href={`/tbm/${s.최악건.id}`}>
              <div className={`rounded-lg p-3 hover:opacity-80 transition cursor-pointer ${s.에스컬레이션 ? "bg-red-900/50" : "bg-gray-800"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {s.에스컬레이션 && <span className="px-2 py-0.5 text-xs rounded-full bg-red-700 text-white">대표 보고 필요</span>}
                </div>
                <div className="text-white text-sm font-medium">{s.최악건.작업명}</div>
                <div className="text-gray-400 text-xs mt-0.5">{s.최악건.날짜} · 위험요인: {s.최악건.위험요인} · S={s.최악건.S} L={s.최악건.L}</div>
              </div>
            </Link>
          ) : (
            <div className="text-gray-500 text-sm">작업 태그 매핑 없음</div>
          )}
        </div>

        {/* 바로가기 */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/tbm" className="bg-gray-900 border border-gray-700 hover:border-blue-600 rounded-xl p-4 text-center transition">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-white text-sm font-medium">TBM 목록</div>
          </a>
          <a href="/ebm" className="bg-gray-900 border border-gray-700 hover:border-emerald-600 rounded-xl p-4 text-center transition">
            <div className="text-2xl mb-1">📚</div>
            <div className="text-white text-sm font-medium">EB 목록</div>
          </a>
        </div>
      </div>
    </main>
  );
}
