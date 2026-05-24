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

  const isSafetyMeetingForm = item.itemType === "TBM";
  const formTitle = isSafetyMeetingForm ? "안전회의 기록 제출" : item.title.replace("㈜몬스 ", "");
  const formDescription = isSafetyMeetingForm
    ? "작업 전 안전회의, 위험요인 공유, 보호구 확인, 참석 사진 또는 서명을 기록합니다."
    : item.description;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/contractor/mons?token=${encodeURIComponent(params.token ?? "")}`}
          className="text-sm font-bold text-blue-700 hover:text-blue-800"
        >
          ← 오늘 안전회의 화면으로
        </Link>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black text-blue-700">SafeMetrica 협력사 제출</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{formTitle}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{formDescription}</p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">필요 증빙</p>
            <ul className="mt-2 space-y-1 text-sm leading-5 text-slate-700">
              {item.requiredEvidence.map((evidence) => (
                <li key={evidence}>• {evidence}</li>
              ))}
            </ul>
          </div>
        </section>

        {params.error ? (
          <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">
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
          className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="token" value={params.token ?? ""} />
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="tenantCode" value="bubblemon" />
          <input type="hidden" name="principalCode" value={principal.code} />
          <input type="hidden" name="contractorCode" value={contractor.code} />

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="workDate">
              작업일
            </label>
            <input
              id="workDate"
              name="workDate"
              type="date"
              required
              defaultValue={todayDateValue}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-1 text-xs text-slate-500">오늘 날짜가 자동 입력됩니다. 필요할 때만 변경하세요.</p>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="workName">
              작업명
            </label>
            <input
              id="workName"
              name="workName"
              required
              placeholder="예: 입출고 작업 전 TBM, 적재장 정리, 조치사진 제출"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="siteArea">
              현장/구역
            </label>
            <input
              id="siteArea"
              name="siteArea"
              required
              placeholder="예: 버블몬 물류공장 A구역, 상차장, 출고장"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700" htmlFor="submitterName">
                제출자
              </label>
              <input
                id="submitterName"
                name="submitterName"
                required
                autoComplete="name"
                defaultValue={defaultSubmitterName}
                placeholder="성명"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700" htmlFor="contact">
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
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="submissionContent">
              제출 내용
            </label>
            <textarea
              id="submissionContent"
              name="submissionContent"
              required
              rows={5}
              placeholder="오늘 실시한 TBM, 작업 전후 상태, 교육·서명·출석, 조치 전후 내용 등을 간단히 적어주세요."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base leading-6 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <MonsEvidenceFileInput />

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="evidenceMemo">
              증빙 메모
            </label>
            <textarea
              id="evidenceMemo"
              name="evidenceMemo"
              rows={4}
              placeholder="예: 작업 전 사진 2장, 작업 후 사진 1장, 서명지 촬영 완료"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base leading-6 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-black text-amber-800">제출 전 확인</h2>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-900">
              <li>• TBM 활동 증빙과 조치 이행 증빙은 별도로 확인됩니다.</li>
              <li>• 제출자료는 ㈜버블몬코리아 원청 또는 SafeMetrica 관리자가 검토합니다.</li>
              <li>• 제출 후 보완 요청이 있을 수 있습니다.</li>
            </ul>
          </section>

          <MonsSubmitButton />
        </form>
      </div>
    </main>
  );
}
