import { NextResponse } from "next/server";

function getBaseDateTime() {
  const now = new Date();
  now.setHours(now.getHours() + 9); // KST
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hour = now.getHours();
  const times = [2, 5, 8, 11, 14, 17, 20, 23];
  const base = times.filter(t => t <= hour).pop() ?? 23;
  const baseDate = base === 23 && hour < 23 ? 
    new Date(now.getTime() - 86400000).toISOString().slice(0, 10).replace(/-/g, "") : date;
  return { baseDate, baseTime: String(base).padStart(2, "0") + "00" };
}

export async function GET() {
  try {
    const { baseDate, baseTime } = getBaseDateTime();
    const nx = process.env.WEATHER_NX ?? "60";
    const ny = process.env.WEATHER_NY ?? "127";
    const key = process.env.WEATHER_API_KEY!;
    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    const items = data?.response?.body?.items?.item ?? [];
    const get = (cat: string) => items.find((i: any) => i.category === cat)?.fcstValue;
    const tmp = parseFloat(get("TMP") ?? "20");
    const wsd = parseFloat(get("WSD") ?? "0");
    const pty = get("PTY") ?? "0";
    const pcp = get("PCP") ?? "강수없음";

    const alerts: string[] = [];
    if (wsd >= 10) alerts.push(`🚨 강풍 ${wsd}m/s — 고소작업 중단 의무`);
    if (tmp >= 33) alerts.push(`☀️ 폭염 ${tmp}°C — 온열질환 주의`);
    if (tmp <= -10) alerts.push(`🥶 한파 ${tmp}°C — 저체온증 위험`);
    if (pty !== "0") alerts.push(`🌧️ 강수 감지 — 야외작업 주의`);

    return NextResponse.json({ tmp, wsd, pty, pcp, alerts, baseDate, baseTime });
  } catch (e) {
    return NextResponse.json({ error: "날씨 조회 실패", alerts: [] });
  }
}
