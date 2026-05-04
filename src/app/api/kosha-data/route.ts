import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function notionQueryDatabase(params: { dbId: string; notionApiKey: string }) {
	const url = `https://api.notion.com/v1/databases/${params.dbId}/query`
	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${params.notionApiKey}`,
			"Notion-Version": "2022-06-28",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ page_size: 50 }),
		cache: "no-store",
	})

	const data = await res.json().catch(() => ({} as any))
	if (!res.ok) {
		// Notion API 에러를 숨기지 말고 그대로 노출(0건 착시 방지)
		throw new Error(`Notion query failed (${res.status}): ${JSON.stringify(data)}`)
	}
	return data
}

export async function GET() {
	try {
		const notionApiKey = process.env.NOTION_API_KEY
		const masterDbId = process.env.NOTION_KOSHA_MASTER_DB_ID
		const companyDbId = process.env.NOTION_KOSHA_COMPANY_DB_ID

		if (!notionApiKey || !masterDbId || !companyDbId) {
			return NextResponse.json(
				{
					error: "Missing env: NOTION_API_KEY / NOTION_KOSHA_MASTER_DB_ID / NOTION_KOSHA_COMPANY_DB_ID",
				},
				{ status: 500 },
			)
		}

		const [masterData, companyData] = await Promise.all([
			notionQueryDatabase({ dbId: masterDbId, notionApiKey }),
			notionQueryDatabase({ dbId: companyDbId, notionApiKey }),
		])

		const masterItems = (masterData.results ?? []).map((p: any) => ({
			id: p.id,
			질문: p.properties?.["질문"]?.title?.[0]?.plain_text ?? "",
			gate: p.properties?.["Gate"]?.select?.name ?? "",
			pass기준: p.properties?.["PASS 기준"]?.rich_text?.[0]?.plain_text ?? "",
			최소증빙: p.properties?.["최소 증빙"]?.rich_text?.[0]?.plain_text ?? "",
			must: p.properties?.["Must"]?.checkbox ?? false,
			배점: p.properties?.["배점"]?.number ?? 0,
			심사항목: p.properties?.["심사항목"]?.select?.name ?? "",
		}))

		const companyItems = (companyData.results ?? []).map((p: any) => ({
			id: p.id,
			항목: p.properties?.["항목"]?.title?.[0]?.plain_text ?? "",
			상태: p.properties?.["상태"]?.status?.name ?? "",
			passYn: p.properties?.["완료조건(PASS)"]?.formula?.string ?? "FAIL",
			must: p.properties?.["Must"]?.checkbox ?? false,
			기한: p.properties?.["기한"]?.date?.start ?? "",
			우선순위: p.properties?.["심사 우선순위"]?.select?.name ?? "",
		}))

		const failCount = companyItems.filter((i: any) => i.passYn === "FAIL").length
		const passCount = companyItems.filter((i: any) => i.passYn === "PASS").length
		const mustFail = companyItems.filter((i: any) => i.must && i.passYn === "FAIL")

		return NextResponse.json({
			masterItems,
			companyItems,
			summary: {
				total: companyItems.length,
				passCount,
				failCount,
				mustFailCount: mustFail.length,
			},
			mustFail,
			updatedAt: new Date().toISOString(),
		})
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
	}
}
