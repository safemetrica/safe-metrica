import "server-only";

export type FieldReferenceNewsItem = {
  title: string;
  link: string;
};

const SAFETY_NEWS_RSS_URL =
  "https://news.google.com/rss/search?q=안전보건+뉴스&hl=ko&gl=KR&ceid=KR:ko";

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
