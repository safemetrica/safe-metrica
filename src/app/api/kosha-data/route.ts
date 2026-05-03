import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const headers = {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    const [masterRes, companyRes] = await Promise.all([
      fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_KOSHA_MASTER_DB_ID}/query`, {
        method: "POST", headers,
        body: JSON.stringify({ page_size: 50 }),
        cache: "no-store",
      }),
      fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_KOSHA_COMPANY_DB_ID}/query`, {
        method: "POST", headers,
        body: JSON.stringify({ page_size: 50 }),
        cache: "no-store",
      }),
    ]);

    const [masterData, companyData] = await Promise.all([masterRes.json(), companyRes.json()]);

    const masterItems = (masterData.results ?? []).map((p: any) => ({
      id: p.id,
      질문: p.properties["질문"]?.title?.[0]?.plain_text ?? "",
      gate: p.properties["Gate"]?.select?.name ?? "",
      pass기준: p.properties["PASS 기준"]?.rich_text?.[0]?.plain_text ?? "",
      최소증빙: p.properties["최소 증빙"]?.rich_text?.[0]?.plain_text ?? "",
      must: p.properties["Must"]?.checkbox ?? false,
      배점: p.properties["배점"]?.number ?? 0,
      심사항목: p.properties["심사항목"]?.select?.name ?? "",
    }));

    const companyItems = (companyData.results ?? []).map((p: any) => ({
      id: p.id,
      항목: p.properties["항목"]?.title?.[0]?.plain_text ?? "",
      상태: p.properties["상태"]?.status?.name ?? "",
      passYn: p.properties["완료조건(PASS)"]?.formula?.string ?? "FAIL",
      must: p.properties["Must"]?.checkbox ?? false,
      기한: p.properties["기한"]?.date?.start ?? "",
      우선순위: p.properties["심사 우선순위"]?.select?.name ?? "",
    }));

    const failCount = companyItems.filter((i: any) => i.passYn === "FAIL").length;
    const passCount = companyItems.filter((i: any) => i.passYn === "PASS").length;
    const mustFail = companyItems.filter((i: any) => i.must && i.passYn === "FAIL");

    return NextResponse.json({
      masterItems,
      companyItems,
      summary: { total: companyItems.length, passCount, failCount, mustFailCount: mustFail.length },
      mustFail,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
