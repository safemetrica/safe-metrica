import FieldParticipationFileInput from "./FieldParticipationFileInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;


const feedbackTypes = ["위험 제보", "아차사고", "개선 제안", "기타"];

type PageProps = {
  searchParams?: Promise<{
    company?: string;
    site?: string;
    source?: string;
  }>;
};

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export default async function FieldParticipationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const todayDateValue = getTodayDateValue();
  const companyCode = params.company ?? "";
  const siteValue = params.site ?? "";
  const sourceValue = params.source ?? "web";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black text-blue-700">SafeMetrica 현장참여</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">오늘 현장참여</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            오늘 작업의 위험요인을 확인하고, 현장 의견이나 아차사고를 남겨주세요.
            제보 내용은 안전관리자가 확인하고 필요한 조치 또는 위험성평가 반영 후보로 검토합니다.
          </p>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-black text-blue-700">위험성평가 공유 확인</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">오늘 작업 전 확인</h2>
          <div className="mt-4 space-y-3">
            {[
              "오늘 작업의 주요 위험요인을 확인했습니다.",
              "위험성평가 주요 내용을 공유받았습니다.",
              "필요한 안전조치와 주의사항을 확인했습니다.",
            ].map((label) => (
              <label key={label} className="flex gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-sm font-bold text-slate-800">
                <input
                  type="checkbox"
                  name={
                    label.includes("주요 위험요인")
                      ? "riskCheck"
                      : label.includes("위험성평가")
                        ? "riskAssessmentCheck"
                        : "safetyMeasureCheck"
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <form
          action="/api/field/participation/submit"
          method="post"
          encType="multipart/form-data"
          className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="companyCode" value={companyCode} />
          <input type="hidden" name="source" value={sourceValue} />

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="reportedDate">
              발생/확인일
            </label>
            <input
              id="reportedDate"
              name="reportedDate"
              type="date"
              defaultValue={todayDateValue}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="type">
              의견 유형
            </label>
            <select
              id="type"
              name="type"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {feedbackTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="location">
              위치/구역
            </label>
            <input
              id="location"
              name="location"
              placeholder="예: 상차장, 분리수거장, A구역, 차량 대기장"
              defaultValue={siteValue}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="title">
              제목
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="예: 상차장 바닥 미끄럼 위험"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700" htmlFor="content">
              상세 내용
            </label>
            <textarea
              id="content"
              name="content"
              required
              rows={5}
              placeholder="위험요인, 아차사고, 개선이 필요한 내용을 적어주세요."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base leading-6 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700" htmlFor="submitter">
                작성자
              </label>
              <input
                id="submitter"
                name="submitter"
                placeholder="이름 또는 소속"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 sm:mt-7">
              <input type="checkbox" name="anonymous" className="h-5 w-5 rounded border-slate-300" />
              익명으로 제출
            </label>
          </div>

          <FieldParticipationFileInput />

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-black text-amber-800">안내</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다.
              첨부 사진은 세메앱이 용량을 줄여 저장합니다.
            </p>
          </section>

          <button
            type="submit"
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-700 px-5 py-4 text-center text-base font-black text-white shadow-sm transition active:scale-95"
          >
            현장 의견·사진 제출하기
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          SafeMetrica는 현장 의견을 위험성평가 개선과 안전조치 검토 자료로 활용합니다.
        </p>
      </div>
    </main>
  );
}
