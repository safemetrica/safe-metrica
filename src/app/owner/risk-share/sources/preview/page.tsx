import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { readRiskShareSourcePrivateDescriptor } from "@/lib/risk-share/riskShareSourcePrivateRead";
import { readRiskShareSourceHeaderPreview } from "@/lib/risk-share/riskShareSourceHeaderPreview";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "위험성평가 원본 열 미리보기 | SafeMetrica",
  robots: {
    index: false,
    follow: false,
  },
};

type PageSearchParams = Record<string, string | string[] | undefined>;

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function parseSheetIndex(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

const DESCRIPTOR_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: "고객사 코드와 원본 식별자를 확인해 주세요.",
  source_not_found: "등록된 원본을 찾을 수 없습니다.",
  preview_unavailable: "이 원본은 열 미리보기를 지원하지 않습니다.",
  unsupported_file_type: "이번 단계에서는 XLSX와 CSV만 미리볼 수 있습니다.",
  file_too_large: "파일이 미리보기 크기 제한을 초과합니다.",
  lookup_failed: "원본 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

const PREVIEW_ERROR_MESSAGES: Record<string, string> = {
  storage_not_configured: "원본 저장소 설정을 확인할 수 없습니다.",
  blob_not_found: "원본 파일을 찾을 수 없습니다.",
  blob_read_failed: "원본 파일을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.",
  file_too_large: "파일이 미리보기 크기 제한을 초과합니다.",
  parse_failed: "파일 내용을 해석하지 못했습니다. 인코딩 또는 형식을 확인해 주세요.",
};

function ErrorScreen({ companyCode, message }: { companyCode: string; message: string }) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm leading-6 text-rose-100">
          <p className="text-lg font-black">열 미리보기를 열 수 없습니다.</p>
          <p className="mt-3">{message}</p>
        </div>
        <Link
          href={`/owner/risk-share/sources?companyCode=${encodeURIComponent(companyCode)}`}
          className="mt-6 inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
        >
          원본 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}

export default async function OwnerRiskShareSourcePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const companyCode = getSingleSearchParam(params.companyCode) ?? "";
  const sourceId = getSingleSearchParam(params.sourceId) ?? "";
  const sheetIndex = parseSheetIndex(getSingleSearchParam(params.sheet));

  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  const descriptorResult = await readRiskShareSourcePrivateDescriptor(companyCode, sourceId);

  if (!descriptorResult.ok) {
    return (
      <ErrorScreen
        companyCode={companyCode}
        message={DESCRIPTOR_ERROR_MESSAGES[descriptorResult.reason] ?? "요청을 처리하지 못했습니다."}
      />
    );
  }

  const descriptor = descriptorResult.descriptor;

  const h = await headers();
  const oidcToken = h.get("x-vercel-oidc-token")?.trim() ?? "";

  const previewResult = await readRiskShareSourceHeaderPreview(descriptor, {
    oidcToken,
    sheetIndex,
  });

  if (!previewResult.ok) {
    return (
      <ErrorScreen
        companyCode={companyCode}
        message={PREVIEW_ERROR_MESSAGES[previewResult.reason] ?? "요청을 처리하지 못했습니다."}
      />
    );
  }

  const preview = previewResult.preview;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 내부 운영자 전용 열 미리보기입니다. 아직 열 매핑이나 공유본 확정 상태가 아닙니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              내부 운영 · 위험성평가 원본
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">열 미리보기</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              {preview.source.title || "제목 없는 원본"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {preview.source.siteName || "사업장 미입력"} · {preview.source.fileName || "파일명 미표시"} · 기준일{" "}
              {preview.source.sourceDocumentDate || "미입력"}
            </p>
          </div>

          <Link
            href={`/owner/risk-share/sources?companyCode=${encodeURIComponent(companyCode)}`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            원본 목록으로 돌아가기
          </Link>
        </div>

        {preview.sheets.length > 1 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {preview.sheets.map((sheet) => (
              <Link
                key={sheet.index}
                href={`/owner/risk-share/sources/preview?companyCode=${encodeURIComponent(companyCode)}&sourceId=${encodeURIComponent(sourceId)}&sheet=${sheet.index}`}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black",
                  sheet.index === preview.selectedSheetIndex
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800",
                ].join(" ")}
              >
                {sheet.name}
              </Link>
            ))}
          </div>
        ) : null}

        {preview.warnings.length > 0 ? (
          <div className="mt-4 space-y-1 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
            {preview.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl">
          {preview.rows.length === 0 ? (
            <p className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              이 시트에서 표시할 데이터가 없습니다.
            </p>
          ) : (
            <table className="min-w-full border-collapse text-xs">
              <tbody>
                {preview.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={rowIndex === preview.suggestedHeaderRowIndex ? "bg-emerald-500/10" : undefined}
                  >
                    <td className="whitespace-nowrap border border-slate-800 px-2 py-1 text-slate-500">
                      {rowIndex + 1}
                      {rowIndex === preview.suggestedHeaderRowIndex ? (
                        <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-200">
                          헤더 후보
                        </span>
                      ) : null}
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-slate-800 px-2 py-1 text-slate-200">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
