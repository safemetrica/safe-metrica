export const dynamic = "force-dynamic";
import { SafeNav } from "@/components/SafeLayout";
import Link from "next/link";
import FieldAiBrief from "@/components/FieldAiBrief";
import { getCompanyConfig } from "@/lib/company";
import { getRiskIntelligenceData } from "@/lib/risk";
const PTW_REQUIRED_TAGS = ["고소작업", "밀폐공간", "화학/MSDS", "용접/용단", "전기"];

async function getFieldData(): Promise<Record<string, any>> {
  const company = await getCompanyConfig();
  
  const headers = {
    Authorization: `Bearer ${company.notionApiKey}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
  const apiBase = "https://api.notion.com/v1/databases";
  
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const thisWeek = new Date(Date.now() + 9 * 3600000 - 7 * 86400000).toISOString().slice(0, 10);

  const [tbmRes, ptwRes] = await Promise.all([
    fetch(`${apiBase}/${company.tbmDbId}/query`, {
      method: "POST", headers,
      body: JSON.stringify({ page_size: 100, sorts: [{ property: "날짜", direction: "descending" }] }),
      cache: "no-store",
    }),
    fetch(`${apiBase}/${company.ptwDbId}/query`, {
      method: "POST", headers,
      body: JSON.stringify({ page_size: 20, sorts: [{ property: "작업일", direction: "descending" }] }),
      cache: "no-store",
    }),
  ]);

  const [tbmData, ptwData] = await Promise.all([tbmRes.json(), ptwRes.json()]);
  const risk = await getRiskIntelligenceData(company.riskAssessmentDbId, company.notionApiKey);

  const tbmRows = (tbmData.results ?? []).map((p: any) => ({
    id: p.id,
    작업명: p.properties["작업명"]?.title?.[0]?.plain_text ?? "",
    날짜: p.properties["날짜"]?.date?.start ?? "",
    특이사항: p.properties["특이사항"]?.checkbox ?? false,
    조치상태: p.properties["조치 상태"]?.select?.name ?? "",
    연결EB: p.properties["연결 EB"]?.relation?.length ?? 0,
    작업태그: p.properties["작업 태그"]?.multi_select?.map((t: any) => t.name) ?? [],
    주의사항: p.properties["오늘의 주의사항"]?.rich_text?.[0]?.plain_text ?? "",
  }));

  const ptwRows = (ptwData.results ?? []).map((p: any) => ({
    id: p.id,
    제목: p.properties["허가서 제목/번호 (예W-대도-20260324-고소-001)"]?.title?.[0]?.plain_text ?? "",
    작업일: p.properties["작업일"]?.date?.start ?? "",
    작업유형: p.properties["작업유형"]?.select?.name ?? "",
    승인상태: p.properties["승인상태"]?.select?.name ?? "",
    허용여부: p.properties["작업 허용 여부"]?.select?.name ?? "",
  }));

  const 오늘TBM = tbmRows.filter((r: any) => r.날짜 === today);
  const 이번주TBM = tbmRows.filter((r: any) => r.날짜 >= thisWeek);
  const EB누락 = tbmRows.filter((r: any) => r.특이사항 && r.연결EB === 0);
  const 조치필요 = tbmRows.filter((r: any) => r.조치상태 === "조치 필요");
  const PTW미승인 = ptwRows.filter((r: any) => r.승인상태 === "요청");
  const PTW위험 = ptwRows.filter((r: any) => r.허용여부 === "금지" || r.승인상태 === "반려");

  // 오늘 준비 현황
  const checklist = [
    { done: 오늘TBM.length > 0, text: "오늘 TBM 작성", href: "/tbm", urgent: true },
    { done: EB누락.length === 0, text: `EB 누락 없음${EB누락.length > 0 ? ` (${EB누락.length}건 미등록)` : ""}`, href: "/ebm", urgent: true },
    { done: 조치필요.length === 0, text: `조치 미완료 없음${조치필요.length > 0 ? ` (${조치필요.length}건)` : ""}`, href: "/tbm", urgent: false },
    { done: PTW미승인.length === 0, text: `PTW 승인 대기 없음${PTW미승인.length > 0 ? ` (${PTW미승인.length}건)` : ""}`, href: "/ptw", urgent: false },
    { done: PTW위험.length === 0, text: `PTW 금지/반려 없음${PTW위험.length > 0 ? ` (${PTW위험.length}건 위험)` : ""}`, href: "/ptw", urgent: true },
  ];

  // PTW 필요 감지 (오늘 TBM 기준)
  const PTW필요태그: string[] = [];
  오늘TBM.forEach((r: any) => {
    r.작업태그.forEach((t: string) => {
      if (PTW_REQUIRED_TAGS.includes(t) && !PTW필요태그.includes(t)) PTW필요태그.push(t);
    });
  });
  const 오늘PTW = ptwRows.filter((r: any) => r.작업일 === today);
  const PTW필요미제출 = PTW필요태그.length > 0 && 오늘PTW.length === 0;
  // 날씨 위험 감지
  type WeatherAlert = { type: string; message: string; level: 'danger' | 'warning' } | null;
  let weatherAlert: WeatherAlert = null;
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const nx = process.env.WEATHER_NX ?? '55';
    const ny = process.env.WEATHER_NY ?? '124';
    const base_date = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
    const wUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${apiKey}&numOfRows=50&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=0500&nx=${nx}&ny=${ny}`;
    const wRes = await fetch(wUrl, { cache: 'no-store' });
    const wJson = await wRes.json();
    const items: any[] = wJson?.response?.body?.items?.item ?? [];
    const wnd = items.find((i: any) => i.category === 'WSD');
    const tmp = items.find((i: any) => i.category === 'TMP');
    const pty = items.find((i: any) => i.category === 'PTY');
    if (wnd && parseFloat(wnd.fcstValue) >= 10)
      weatherAlert = { type: '강풍', message: `풍속 ${wnd.fcstValue}m/s — 고소작업 중단 기준 초과`, level: 'danger' };
    else if (tmp && parseFloat(tmp.fcstValue) >= 33)
      weatherAlert = { type: '폭염', message: `기온 ${tmp.fcstValue}°C — 온열질환 주의`, level: 'warning' };
    else if (tmp && parseFloat(tmp.fcstValue) <= -10)
      weatherAlert = { type: '혹한', message: `기온 ${tmp.fcstValue}°C — 저체온증 위험`, level: 'warning' };
    else if (pty && ['1','2','3','4'].includes(pty.fcstValue))
      weatherAlert = { type: '강수', message: '강수 예보 — 야외작업 주의', level: 'warning' };
  } catch { weatherAlert = null; }

  // 오늘 할 일 — TBM/EB/PTW/날씨 종합 우선순위 자동 생성
  type TodoItem = { priority: 'urgent' | 'check' | 'ok'; icon: string; title: string; desc: string; href: string };
  const 오늘할일: TodoItem[] = [];
  if (오늘TBM.length === 0)
    오늘할일.push({ priority: 'urgent', icon: '🔴', title: 'TBM 미작성', desc: '오늘 TBM을 작성하세요', href: '/tbm' });
  if (EB누락.length > 0)
    오늘할일.push({ priority: 'urgent', icon: '🔴', title: `EB 누락 ${EB누락.length}건`, desc: '특이사항 발생 건에 증빙 등록 필요', href: '/ebm' });
  if (PTW위험.length > 0)
    오늘할일.push({ priority: 'urgent', icon: '🚨', title: `PTW 금지/반려 ${PTW위험.length}건`, desc: '작업 즉시 중단 또는 재제출 필요', href: '/ptw' });
  if (PTW필요미제출)
    오늘할일.push({ priority: 'urgent', icon: '🚨', title: 'PTW 미제출', desc: `고위험 작업(${PTW필요태그.join(', ')}) PTW 제출 필요`, href: '/ptw' });
  if (weatherAlert?.level === 'danger')
    오늘할일.push({ priority: 'urgent', icon: '⛔', title: `기상 위험 — ${weatherAlert.type}`, desc: weatherAlert.message, href: '/field' });
  if (조치필요.length > 0)
    오늘할일.push({ priority: 'check', icon: '🟡', title: `조치 미완료 ${조치필요.length}건`, desc: '조치 상태 업데이트 필요', href: '/tbm' });
  if (PTW미승인.length > 0)
    오늘할일.push({ priority: 'check', icon: '🟡', title: `PTW 승인대기 ${PTW미승인.length}건`, desc: '승인 처리 필요', href: '/ptw' });
  if (weatherAlert?.level === 'warning')
    오늘할일.push({ priority: 'check', icon: '⚠️', title: `기상 주의 — ${weatherAlert.type}`, desc: weatherAlert.message, href: '/field' });
  if (오늘할일.length === 0)
    오늘할일.push({ priority: 'ok', icon: '✅', title: '이상 없음', desc: '오늘 현장 안전 상태 정상', href: '/field' });

  // 잘된 점 멘트
  const 칭찬멘트: string[] = [];
  if (이번주TBM.length >= 5) 칭찬멘트.push(`📅 이번 주 TBM ${이번주TBM.length}건 제출 — 꾸준한 안전 기록 수고하셨습니다!`);
  if (EB누락.length === 0 && tbmRows.filter((r: any) => r.특이사항).length > 0) 칭찬멘트.push("✅ 특이사항 발생 건 모두 EB 연결 완료 — 증거 완결성 우수!");
  if (조치필요.length === 0) 칭찬멘트.push("🟢 미조치 건 없음 — 현장 조치 대응 우수!");
  if (칭찬멘트.length === 0) 칭찬멘트.push("💪 오늘도 현장 안전 관리 함께 해주셔서 감사합니다!");

  // 산업안전 뉴스 RSS 직접 파싱
  type NewsItem = {title:string; link:string; source:string; tag:string; color:string};
  const NEWS_SOURCES = [
    { name: '고용노동부 공지', url: 'https://www.moel.go.kr/rss/notice.do', tag: '공지', color: 'blue' },
    { name: '고용노동부 정책', url: 'https://www.moel.go.kr/rss/policy.do', tag: '정책', color: 'green' },
    { name: '입법예고', url: 'https://www.moel.go.kr/rss/lawinfo.do', tag: '법령', color: 'red' },
  ];
  let safetyNews: NewsItem[] = [];
  try {
    const rssResults = await Promise.allSettled(
      NEWS_SOURCES.map(async (src) => {
        const res = await fetch(src.url);
        const xml = await res.text();
        const items: NewsItem[] = [];
        const matches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of matches.slice(0, 4)) {
          const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
          const l = item.match(/<link>(.*?)<\/link>/)?.[1] || '#';
          if (t.trim()) items.push({ title: t.replace(/&amp;/g,'&').trim(), link: l.trim(), source: src.name, tag: src.tag, color: src.color });
        }
        return items;
      })
    );
    safetyNews = rssResults
      .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
  } catch { safetyNews = []; }

  return {
    today, 오늘TBM, 이번주TBM, EB누락, 조치필요, PTW미승인, PTW위험,
    checklist, PTW필요태그, PTW필요미제출, 칭찬멘트, safetyNews, 오늘할일, weatherAlert,
    riskTbmShareNeededCount: risk.tbmShareNeededCount,
    riskTbmShareNeededItems: risk.tbmShareNeededItems,
    전체미완료: checklist.filter((c: {done: boolean; text: string; href: string; urgent: boolean}) => !c.done).length,
  };
}

export default async function FieldPage() {
  const d = await getFieldData();
  const now = new Date(Date.now() + 9 * 3600000);
  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <main className="min-h-screen bg-gray-950 pb-10">
      <SafeNav />

      <div className="mx-auto max-w-7xl px-4 py-5">
        {/* 헤더 */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">👷 현장 비서</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {dateStr} · {timeStr} · 관리감독자·안전담당자 전용
          </p>

          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-white">오늘 상태</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                TBM {d.오늘TBM.length > 0 ? "제출 완료" : "미제출"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  d.EB누락.length + d.조치필요.length > 0
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-emerald-500/10 text-emerald-200"
                }`}
              >
                미완료 {d.EB누락.length + d.조치필요.length}건
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  d.PTW미승인.length > 0
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-emerald-500/10 text-emerald-200"
                }`}
              >
                PTW 대기 {d.PTW미승인.length}건
              </span>
            </div>
          </div>
        </div>

        {/* AI 브리핑은 최상단 전체폭 */}
        <FieldAiBrief />

        {/* 실행 영역 / 상태 영역 */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {/* 왼쪽: 오늘 실행 */}
          <section className="space-y-4">
            {/* TBM 공유 필요 위험요인 */}
            {d.riskTbmShareNeededCount > 0 && (
              <div className="rounded-2xl border border-amber-700/70 bg-amber-950/35 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📣</span>
                      <span className="text-sm font-bold text-white">오늘 TBM 공유 항목</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-amber-200">
                      근로자에게 안내할 내용입니다. TBM에서 짧게 공유하고 필요한 경우 증빙을 남겨주세요.
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-amber-700 px-2.5 py-1 text-xs font-bold text-amber-50">
                    {d.riskTbmShareNeededCount}건
                  </span>
                </div>

                <div className="space-y-2">
                  {d.riskTbmShareNeededItems.map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-amber-800/60 bg-amber-900/30 p-3">
                      <div className="text-sm font-semibold text-white [word-break:keep-all]">
                        {item.title || item.taskName || item.processName || "위험성평가 항목"}
                      </div>
                      <div className="mt-1 text-xs text-amber-200 [word-break:keep-all]">
                        {item.processName || "공정 미지정"}
                        {item.accidentType ? ` · ${item.accidentType}` : ""}
                      </div>
                      <div className="mt-2 text-xs leading-relaxed text-amber-50 [word-break:keep-all]">
                        공유포인트: {item.hazard || item.improvementPlan || "작업 전 위험요인과 안전조치를 근로자에게 공유하세요."}
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/risk?filter=tbm-needed">
                  <div className="mt-3 rounded-lg bg-amber-700 p-2 text-center text-sm font-bold text-amber-50 transition hover:bg-amber-600">
                    항목 확인하기
                  </div>
                </Link>
              </div>
            )}

            {/* PTW 긴급 경고 */}
            {d.PTW필요미제출 && (
              <div className="rounded-2xl border border-red-700 bg-red-950 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">🚨</span>
                  <span className="text-sm font-bold text-red-300">PTW 미제출 — 작업 전 확인 필요</span>
                </div>
                <p className="text-xs text-red-200">
                  오늘 TBM에 고위험 작업 태그({d.PTW필요태그.join(", ")})가 있으나 PTW가 제출되지 않았습니다.
                </p>
                <Link href="/ptw">
                  <div className="mt-2 rounded-lg bg-red-800 p-2 text-center text-sm font-medium text-red-100 transition hover:bg-red-700">
                    PTW 제출하기
                  </div>
                </Link>
              </div>
            )}

            {/* 미조치 항목 */}
            {(d.EB누락.length > 0 || d.조치필요.length > 0) && (
              <div className="rounded-2xl border border-amber-700/70 bg-slate-900 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="text-sm font-bold text-white">미완료 조치</span>
                </div>
                <div className="space-y-2">
                  {d.EB누락.slice(0, 3).map((r: any) => (
                    <Link key={r.id} href={`/tbm/${r.id}`}>
                      <div className="rounded-lg bg-amber-900/35 p-3 transition hover:bg-amber-900/50">
                        <div className="text-sm font-medium text-white">{r.작업명}</div>
                        <div className="mt-0.5 text-xs text-amber-300">{r.날짜} · EB 미등록 — 등록 필요</div>
                      </div>
                    </Link>
                  ))}
                  {d.조치필요.slice(0, 3).map((r: any) => (
                    <Link key={r.id} href={`/tbm/${r.id}`}>
                      <div className="rounded-lg bg-amber-900/35 p-3 transition hover:bg-amber-900/50">
                        <div className="text-sm font-medium text-white">{r.작업명}</div>
                        <div className="mt-0.5 text-xs text-amber-300">{r.날짜} · 조치 상태 업데이트 필요</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 오늘 준비 현황 */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="text-sm font-bold text-white">오늘 준비 현황</span>
                </div>
                <span className={`text-sm font-bold ${d.전체미완료 > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                  {d.checklist.filter((c: { done: boolean; text: string; href: string; urgent: boolean }) => c.done).length}/{d.checklist.length} 완료
                </span>
              </div>
              <div className="space-y-2">
                {d.checklist.map((c: { done: boolean; text: string; href: string; urgent: boolean }, i: number) => (
                  <Link key={i} href={c.href}>
                    <div
                      className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:opacity-80 ${
                        c.done
                          ? "bg-slate-800"
                          : c.urgent
                            ? "border border-amber-700 bg-amber-950/35"
                            : "border border-amber-800 bg-amber-950/25"
                      }`}
                    >
                      <span className="text-lg">{c.done ? "✅" : c.urgent ? "🟡" : "🟠"}</span>
                      <span className={`text-sm ${c.done ? "text-gray-400 line-through" : "font-medium text-amber-200"}`}>
                        {c.text}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* 오른쪽: 현장 상태 */}
          <section className="space-y-4">
            {/* 오늘 TBM 현황 */}
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className="text-sm font-bold text-white">오늘 TBM</span>
                </div>
                <span className={`text-sm font-bold ${d.오늘TBM.length > 0 ? "text-blue-300" : "text-orange-300"}`}>
                  {d.오늘TBM.length > 0 ? `${d.오늘TBM.length}건 제출됨` : "미제출"}
                </span>
              </div>
              {d.오늘TBM.length > 0 ? (
                <div className="space-y-2">
                  {d.오늘TBM.map((r: any) => (
                    <Link key={r.id} href={`/tbm/${r.id}`}>
                      <div className="cursor-pointer rounded-lg bg-blue-950/55 p-3 transition hover:bg-blue-950/75">
                        <div className="text-sm font-medium text-white">{r.작업명}</div>
                        {r.작업태그.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.작업태그.map((t: string) => (
                              <span
                                key={t}
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  PTW_REQUIRED_TAGS.includes(t)
                                    ? "bg-amber-700 text-amber-100"
                                    : "bg-blue-800 text-blue-200"
                                }`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {r.특이사항 && r.연결EB === 0 && (
                          <p className="mt-1 text-xs text-red-300">⚠️ 특이사항 있음 — EB 등록 필요</p>
                        )}
                        {r.조치상태 === "조치 필요" && (
                          <p className="mt-1 text-xs text-yellow-300">🟡 조치 상태 업데이트 필요</p>
                        )}
                        {r.주의사항 && (
                          <p className="mt-1 text-xs text-blue-300">📌 {r.주의사항}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-sm text-orange-200">오늘 TBM이 아직 제출되지 않았습니다.</p>
                  <p className="mt-1 text-xs text-orange-300">Notion 폼에서 TBM을 작성하면 여기에 자동으로 반영됩니다.</p>
                </div>
              )}
            </div>

            {/* 현장 안전 현황 */}
            <div className="rounded-2xl border border-emerald-900/80 bg-slate-900 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-bold text-white">이번 주 현장 현황</span>
              </div>
              <div className="space-y-1">
                {d.칭찬멘트.map((m: string, i: number) => (
                  <p key={i} className="text-sm text-emerald-200">{m}</p>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-700 pt-3 text-xs text-emerald-300">
                <span>이번 주 TBM: {d.이번주TBM.length}건</span>
                <span>미조치: {d.EB누락.length + d.조치필요.length}건</span>
                <span>PTW 대기: {d.PTW미승인.length}건</span>
              </div>
            </div>

            {/* 바로가기 */}
            <div className="grid grid-cols-3 gap-2">
              <Link href="/tbm" className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center transition hover:border-blue-500">
                <div className="mb-1 text-xl">📋</div>
                <div className="text-xs font-medium text-white">TBM</div>
              </Link>
              <Link href="/ebm" className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center transition hover:border-emerald-500">
                <div className="mb-1 text-xl">📚</div>
                <div className="text-xs font-medium text-white">EB</div>
              </Link>
              <Link href="/ptw" className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center transition hover:border-orange-500">
                <div className="mb-1 text-xl">🧾</div>
                <div className="text-xs font-medium text-white">PTW</div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
