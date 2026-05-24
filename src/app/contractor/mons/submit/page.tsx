import Link from "next/link";
import { redirect } from "next/navigation";

import MonsEvidenceFileInput from "./MonsEvidenceFileInput";
import MonsSubmitButton from "./MonsSubmitButton";

import {
  SAMPLE_CONTRACTOR_COMPANY_MONS,
  SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON,
  getContractorSubmissionItemById,
} from "@/lib/contractorRelation";

type PageProps = {
  searchParams: Promise<{
    token?: string;
    item?: string;
    error?: string;
  }>;
};

function isMonsContractorTokenValid(token?: string) {
  const expectedToken = process.env.MONS_CONTRACTOR_TOKEN;
  return Boolean(expectedToken && token === expectedToken);
}

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

const principal = SAMPLE_PRINCIPAL_COMPANY_BUBBLEMON;
const contractor = SAMPLE_CONTRACTOR_COMPANY_MONS;

export default async function MonsContractorSubmitFormPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const todayDateValue = getTodayDateValue();
  const defaultSubmitterName = process.env.MONS_DEFAULT_SUBMITTER_NAME ?? "몬스 현장관리자";
  const defaultContact = process.env.MONS_DEFAULT_CONTACT ?? "";

  if (!isMonsContractorTokenValid(params.token)) {
    redirect("/login?error=invalid_contractor_token");
  }

  const item = getContractorSubmissionItemById(params.item ?? "");

  if (!item) {
    redirect(`/contractor/mons?token=${encodeURIComponent(params.token ?? "")}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/contractor/mons?token=${encodeURIComponent(params.token ?? "")}`}
          className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
        >
          ← ㈜몬스 제출 목록으로
        </Link>

        <section className="mt-4 rounded-3xl border border-cyan-500/30 bg-slate-900 p-5 shadow-2xl">
          <p className="text-xs font-bold text-cyan-300">MONS Submit Form</p>
          <h1 className="mt-2 text-2xl font-black">{item.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>

          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-xs font-bold text-slate-400">필요 증빙</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-slate-300">
              {item.requiredEvidence.map((evidence) => (
                <li key={evidence}>• {evidence}</li>
              ))}
            </ul>
          </div>
        </section>

        {params.error ? (
          <section className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 p-4">
            <p className="text-sm font-bold text-red-200">
              {params.error === "file_too_large"
                ? "첨부파일 용량이 큽니다. 사진을 다시 선택하거나 5장 이하로 줄여 제출해 주세요."
                : "필수 입력값이 부족합니다. 작업명, 현장/구역, 제출 내용을 확인해 주세요."}
            </p>
          </section>
        ) : null}

        <form
          action="/api/contractor/mons/submit"
          method="post"
          encType="multipart/form-data"
          className="mt-4 space-y-4 rounded-3xl border border-slate-700 bg-slate-900 p-5"
        >
          <input type="hidden" name="token" value={params.token ?? ""} />
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="tenantCode" value="bubblemon" />
          <input type="hidden" name="principalCode" value={principal.code} />
          <input type="hidden" name="contractorCode" value={contractor.code} />

          <div>
            <label className="text-sm font-bold text-slate-200" htmlFor="workDate">
              작업일
            </label>
            <input
              id="workDate"
              name="workDate"
              type="date"
              required
              defaultValue={todayDateValue}
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
            />
            <p className="mt-1 text-xs text-slate-500">오늘 날짜가 자동 입력됩니다. 필요할 때만 변경하세요.</p>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-200" htmlFor="workName">
              작업명
            </label>
            <input
              id="workName"
              name="workName"
              required
              placeholder="예: 입출고 작업 전 TBM, 적재장 정리, 조치사진 제출"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-200" htmlFor="siteArea">
              현장/구역
            </label>
            <input
              id="siteArea"
              name="siteArea"
              required
              placeholder="예: 버블몬 물류공장 A구역, 상차장, 출고장"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-200" htmlFor="submitterName">
                제출자
              </label>
              <input
                id="submitterName"
                name="submitterName"
                required
                autoComplete="name"
                defaultValue={defaultSubmitterName}
                placeholder="성명"
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-200" htmlFor="contact">
                연락처
              </label>
              <input
                id="contact"
                name="contact"
                required
                inputMode="tel"
                autoComplete="tel"
                defaultValue={defaultContact}
                placeholder="연락 가능한 번호"
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-200" htmlFor="submissionContent">
              제출 내용
            </label>
            <textarea
              id="submissionContent"
              name="submissionContent"
              required
              rows={5}
              placeholder="오늘 실시한 TBM, 작업 전후 상태, 교육·서명·출석, 조치 전후 내용 등을 간단히 적어주세요."
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base leading-6 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <MonsEvidenceFileInput />

          <div>
            <label className="text-sm font-bold text-slate-200" htmlFor="evidenceMemo">
              증빙 메모
            </label>
            <textarea
              id="evidenceMemo"
              name="evidenceMemo"
              rows={4}
              placeholder="예: 작업 전 사진 2장, 작업 후 사진 1장, 서명지 촬영 완료"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-4 text-base leading-6 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>

          <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
            <h2 className="text-sm font-black text-amber-200">제출 전 확인</h2>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
              <li>• TBM 활동 증빙과 조치 이행 증빙은 별도로 확인됩니다.</li>
              <li>• 제출자료는 버블몬 원청 또는 SafeMetrica 관리자가 검토합니다.</li>
              <li>• 제출 후 보완 요청이 있을 수 있습니다.</li>
            </ul>
          </section>

          <MonsSubmitButton />
        </form>
      </div>
    </main>
  );
}
