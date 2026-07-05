import "server-only";

export type FieldReferenceNewsItem = {
  title: string;
  link: string;
};

const SAFETY_NEWS_RSS_URL =
  "https://news.google.com/rss/search?q=안전보건+뉴스&hl=ko&gl=KR&ceid=KR:ko";

export const SAFETY_NEWS_MORE_LINK_URL =
  "https://news.google.com/search?q=안전보건+뉴스&hl=ko&gl=KR&ceid=KR:ko";

const SAFETY_NEWS_ITEM_LIMIT = 3;
const SAFETY_NEWS_FETCH_TIMEOUT_MS = 4000;

function isSafeExternalLink(value: string) {
  return value.startsWith("https://");
}

export async function fetchFieldReferenceSafetyNews(): Promise<FieldReferenceNewsItem[]> {
  try {
    const response = await fetch(SAFETY_NEWS_RSS_URL, {
      signal: AbortSignal.timeout(SAFETY_NEWS_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const rawItems = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    return rawItems
      .slice(0, SAFETY_NEWS_ITEM_LIMIT)
      .map((rawItem) => {
        const title =
          rawItem.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
          rawItem.match(/<title>(.*?)<\/title>/)?.[1] ??
          "";
        const link = rawItem.match(/<link>(.*?)<\/link>/)?.[1] ?? "";

        return {
          title: title.replace(/&amp;/g, "&").trim(),
          link: link.trim(),
        };
      })
      .filter((item) => item.title && isSafeExternalLink(item.link));
  } catch {
    return [];
  }
}

export type FieldReferenceWeatherInfo = {
  status: "live" | "fallback";
  headline: string | null;
  tags: string[];
};

export const KOSHA_SAFETY_MATERIAL_ARCHIVE_URL =
  "https://portal.kosha.or.kr/archive/cent-archive/master-arch";

export const KOSHA_SAFETY_MATERIAL_TAGS = ["추락", "끼임", "화재·폭발", "질식·중독"];

const DEFAULT_WEATHER_TAGS = ["온열질환 주의", "강풍 주의", "한파 주의", "강우 시 미끄럼 주의"];
const WEATHER_FETCH_TIMEOUT_MS = 4000;

function getWeatherFetchBaseUrl() {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://safe-metrica.vercel.app";
}

type WeatherApiResponse = {
  tmp?: number | null;
  wsd?: number | null;
  pty?: string | null;
};

function buildWeatherHeadlineAndTags(
  data: WeatherApiResponse,
): { headline: string; tags: string[] } | null {
  const tmp = Number.isFinite(data.tmp) ? Number(data.tmp) : null;
  const wsd = Number.isFinite(data.wsd) ? Number(data.wsd) : null;
  const hasRain = data.pty != null && data.pty !== "0";

  if (tmp === null && wsd === null) {
    return null;
  }

  const summaryParts: string[] = [];
  if (tmp !== null) summaryParts.push(`기온 ${tmp}°C`);
  if (wsd !== null) summaryParts.push(`풍속 ${wsd}m/s`);
  summaryParts.push(hasRain ? "강수 있음" : "강수 없음");

  const tags: string[] = [];
  if (wsd !== null && wsd >= 10) tags.push("강풍 주의");
  if (tmp !== null && tmp >= 33) tags.push("온열질환 주의");
  if (tmp !== null && tmp <= -10) tags.push("한파 주의");
  if (hasRain) tags.push("강우 시 미끄럼 주의");
  if (tags.length === 0) tags.push("특이 기상 없음");

  return { headline: summaryParts.join(" · "), tags };
}

export async function fetchFieldReferenceWeather(): Promise<FieldReferenceWeatherInfo> {
  try {
    const response = await fetch(`${getWeatherFetchBaseUrl()}/api/weather`, {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return { status: "fallback", headline: null, tags: DEFAULT_WEATHER_TAGS };
    }

    const data = (await response.json()) as WeatherApiResponse;
    const built = buildWeatherHeadlineAndTags(data);

    if (!built) {
      return { status: "fallback", headline: null, tags: DEFAULT_WEATHER_TAGS };
    }

    return { status: "live", headline: built.headline, tags: built.tags };
  } catch {
    return { status: "fallback", headline: null, tags: DEFAULT_WEATHER_TAGS };
  }
}
