import Link from "next/link";
import { redirect } from "next/navigation";

import { getContractorSubmissionItemById } from "@/lib/contractorRelation";

type PageProps = {
  searchParams: Promise<{
    token?: string;
    item?: string;
    status?: string;
    message?: string;
    detail?: string;
  }>;
};

function isMonsContractorTokenValid(token?: string) {
  const expectedToken = process.env.MONS_CONTRACTOR_TOKEN;
  return Boolean(expectedToken && token === expectedToken);
}

export default async function MonsContractorSubmittedPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (!isMonsContractorTokenValid(params.token)) {
    redirect("/login?error=invalid_contractor_token");
  }

  const item = getContractorSubmissionItemById(params.item ?? "");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-xs font-bold text-emerald-300">㈜몬스 제출 결과</p>
          <h1 className="mt-2 text-2xl font-black">
            {params.status === "notion_error" ? "제출 저장 확인 필요" : "제출 접수 완료"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {item ? `${item.title} 항목이 접수되었습니다.` : "제출 항목이 접수되었습니다."}
          </p>

          {params.status === "saved" ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <p className="text-sm font-bold text-emerald-200">
                제출 내용이 저장되었습니다. 버블몬 원청 검토를 기다려 주세요.
              </p>
            </div>
          ) : params.status === "notion_error" ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-sm font-bold text-red-200">
                제출 저장소 설정 또는 Notion 속성 확인이 필요합니다.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                오류: {params.message ?? "unknown"} {params.detail ?? ""}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
              <p className="text-sm font-bold text-amber-200">
                제출 화면 접수는 완료되었습니다. 저장 DB 연결은 관리자 설정 후 활성화됩니다.
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link href={`/contractor/mons?token=${encodeURIComponent(params.token ?? "")}`} className="rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-black text-slate-950">
              제출 목록으로
            </Link>
            <Link href={`/contractor/mons/submit?item=${encodeURIComponent(params.item ?? "")}&token=${encodeURIComponent(params.token ?? "")}`} className="rounded-xl border border-slate-600 px-4 py-3 text-center text-sm font-black text-slate-200">
              같은 항목 추가 제출
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
