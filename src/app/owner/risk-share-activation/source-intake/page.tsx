import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SourceIntakeForm from "./SourceIntakeForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

export default async function RiskShareSourceIntakePage() {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    redirect("/login?error=owner_required");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap gap-3">
          <Link href="/owner/risk-share-activation" className="text-sm font-bold text-cyan-300 hover:text-cyan-200">
            ← 신규 고객 공유팩 활성화
          </Link>
          <Link href="/owner" className="text-sm font-bold text-slate-400 hover:text-slate-200">
            Owner Console
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
          <p className="text-sm font-bold text-cyan-300">Risk Share Pack</p>
          <h1 className="mt-2 text-3xl font-black">Source File Intake v1</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            고객이 제공한 위험성평가표, 평가결과지, PDF, Excel, 이미지 자료를 접수합니다.
            원본 파일은 Blob에 저장하고, Supabase에는 source 메타데이터와 AI 추출 대기 상태를 기록합니다.
          </p>
        </section>

        <SourceIntakeForm />

        <section className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5">
          <h2 className="text-lg font-black text-amber-100">운영 주의</h2>
          <p className="mt-3 text-sm leading-6 text-amber-50">
            고객 위험성평가 원본 파일은 GitHub나 공개 문서에 저장하지 않습니다.
            AI 추출 결과는 후보이며, 운영자 검토와 고객 확인 후에만 Version Lock으로 이동합니다.
            이 화면은 위험성평가 대행 또는 법적 완료 판단을 의미하지 않습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
