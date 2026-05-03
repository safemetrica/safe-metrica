import { NextResponse } from 'next/server'

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  source: string
  tag: string
  color: string
}

const RSS_SOURCES = [
  { name: '고용노동부 공지', url: 'https://www.moel.go.kr/rss/notice.do', tag: '공지', color: 'blue' },
  { name: '고용노동부 정책', url: 'https://www.moel.go.kr/rss/policy.do', tag: '정책', color: 'green' },
  { name: '입법·행정예고', url: 'https://www.moel.go.kr/rss/lawinfo.do', tag: '법령', color: 'red' },
]

function parseRSS(xml: string, source: typeof RSS_SOURCES[0]): NewsItem[] {
  const items: NewsItem[] = []
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
  for (const item of itemMatches.slice(0, 4)) {
    const title =
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
      item.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link =
      item.match(/<link>(.*?)<\/link>/)?.[1] ||
      item.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/)?.[1] || '#'
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
    if (title.trim()) {
      items.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
        link: link.trim(),
        pubDate,
        source: source.name,
        tag: source.tag,
        color: source.color,
      })
    }
  }
  return items
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      RSS_SOURCES.map(async (src) => {
        const res = await fetch(src.url, {
          next: { revalidate: 1800 },
          headers: { Accept: 'application/rss+xml, text/xml' },
        })
        const xml = await res.text()
        return parseRSS(xml, src)
      })
    )

    const allNews = results
      .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)

    return NextResponse.json({ news: allNews, fetchedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Safety news fetch error:', error)
    return NextResponse.json({ news: [], error: 'fetch failed' }, { status: 500 })
  }
}
