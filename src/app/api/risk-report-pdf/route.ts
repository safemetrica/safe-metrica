import { NextResponse } from "next/server"
import React from "react"
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"

export const runtime = "nodejs"

const styles = StyleSheet.create({
	page: { padding: 24, fontSize: 11, fontFamily: "Helvetica" },
	title: { fontSize: 16, marginBottom: 10 },
	subtitle: { fontSize: 12, marginBottom: 12, color: "#333" },

	section: { marginBottom: 12 },
	row: { flexDirection: "row", marginBottom: 6 },
	cellLabel: { width: 120, color: "#555" },
	cellValue: { flex: 1 },

	table: { borderWidth: 1, borderColor: "#DDD" },
	tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEE" },
	th: { flex: 1, padding: 6, backgroundColor: "#F6F6F6", fontSize: 10 },
	td: { flex: 1, padding: 6 },
})

function RiskReportPdfDoc(props: { companyName?: string; siteName?: string; date?: string }) {
	const companyName = props.companyName ?? "—"
	const siteName = props.siteName ?? "—"
	const date = props.date ?? new Date().toISOString().slice(0, 10)

	// .ts 파일이므로 JSX 없이 createElement로 구성
	return React.createElement(
		Document,
		null,
		React.createElement(
			Page,
			{ size: "A4", style: styles.page },
			React.createElement(Text, { style: styles.title }, "위험성평가 결과 기록부"),
			React.createElement(Text, { style: styles.subtitle }, "SafeMetrica™ 자동 생성"),

			React.createElement(
				View,
				{ style: styles.section },
				React.createElement(
					View,
					{ style: styles.row },
					React.createElement(Text, { style: styles.cellLabel }, "사업장(업체)"),
					React.createElement(Text, { style: styles.cellValue }, companyName),
				),
				React.createElement(
					View,
					{ style: styles.row },
					React.createElement(Text, { style: styles.cellLabel }, "현장명"),
					React.createElement(Text, { style: styles.cellValue }, siteName),
				),
				React.createElement(
					View,
					{ style: styles.row },
					React.createElement(Text, { style: styles.cellLabel }, "작성일"),
					React.createElement(Text, { style: styles.cellValue }, date),
				),
			),

			React.createElement(
				View,
				{ style: [styles.section, styles.table] },
				React.createElement(
					View,
					{ style: styles.tr },
					React.createElement(Text, { style: styles.th }, "작업(공정)"),
					React.createElement(Text, { style: styles.th }, "유해·위험요인"),
					React.createElement(Text, { style: styles.th }, "현재 대책"),
					React.createElement(Text, { style: styles.th }, "추가 대책"),
				),
				React.createElement(
					View,
					{ style: styles.tr },
					React.createElement(Text, { style: styles.td }, "샘플 작업"),
					React.createElement(Text, { style: styles.td }, "샘플 위험요인"),
					React.createElement(Text, { style: styles.td }, "보호구 착용"),
					React.createElement(Text, { style: styles.td }, "관리감독자 확인"),
				),
			),

			React.createElement(
				View,
				{ style: styles.section },
				React.createElement(Text, null, "비고"),
				React.createElement(Text, null, "- 본 문서는 SafeMetrica™가 입력/연동 데이터 기반으로 생성합니다."),
			),
		),
	)
}

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url)
		const companyName = searchParams.get("companyName") ?? undefined
		const siteName = searchParams.get("siteName") ?? undefined
		const date = searchParams.get("date") ?? undefined

		const doc = RiskReportPdfDoc({ companyName, siteName, date })
		const buffer = await renderToBuffer(doc)

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": 'inline; filename="risk-report.pdf"',
				"Cache-Control": "no-store",
			},
		})
	} catch (e: any) {
		const msg = e?.stack || e?.message || String(e)
		return NextResponse.json({ error: msg }, { status: 500 })
	}
}
