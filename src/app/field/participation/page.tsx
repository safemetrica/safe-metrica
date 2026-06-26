import { riskShareLinkCopy, riskShareLinkSubmissionTypeLabels } from "@/lib/risk-share-link/copy";
import FieldParticipationFileInput from "./FieldParticipationFileInput";
import FieldParticipationStepper from "./FieldParticipationStepper";
import { getOperatingFieldWorkerCopy } from "./operatingFieldWorkerCopy";
import { getFieldWorkerRiskSummary } from "./fieldWorkerRiskSummary";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;


const feedbackTypes = riskShareLinkSubmissionTypeLabels.filter(
  (type) => type !== riskShareLinkCopy.submissionTypes.shareConfirmation.label
);

type ParticipationIntent = "risk" | "share" | "report";

const intentInitialSteps: Record<ParticipationIntent, 1 | 2 | 3> = {
  risk: 1,
  share: 2,
  report: 3,
};

function getParticipationIntent(value?: string): ParticipationIntent | undefined {
  return value === "risk" || value === "share" || value === "report" ? value : undefined;
}

type FieldWeatherNotice = {
  level: "danger" | "warning" | "info";
  icon: string;
  title: string;
  message: string;
  ttsLine: string;
};

type PageProps = {
  searchParams?: Promise<{
    company?: string;
      flow?: string;
    intent?: string;
    site?: string;
    source?: string;
    weatherTest?: string;
    legacy?: string;
  }>;
};

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function buildFieldWeatherNotice(weather: {
  tmp?: number | null;
  feelsLike?: number | null;
  wsd?: number | null;
  pty?: string | null;
  pop?: number | null;
}): FieldWeatherNotice | null {
  const tmp = Number.isFinite(weather.tmp) ? Number(weather.tmp) : null;
  const feelsLike = Number.isFinite(weather.feelsLike) ? Number(weather.feelsLike) : tmp;
  const wsd = Number.isFinite(weather.wsd) ? Number(weather.wsd) : 0;
  const pty = weather.pty ?? "0";
  const pop = Number.isFinite(weather.pop) ? Number(weather.pop) : 0;

  if (wsd >= 10) {
    return {
      level: "danger",
      icon: "💨",
      title: "강풍주의",
      message: "외부작업, 고소작업, 날림물 위험을 확인하세요.",
      ttsLine: "오늘은 강풍주의가 필요합니다. 외부작업, 고소작업, 날림물 위험을 확인하세요.",
    };
  }

  if ((feelsLike ?? 0) >= 35 || (tmp ?? 0) >= 35) {
    return {
      level: "danger",
      icon: "🔥",
      title: "폭염위험",
      message: "물·휴식·그늘을 확인하고, 어지러움이나 두통이 있으면 즉시 보고하세요.",
      ttsLine: "오늘은 폭염위험이 있습니다. 물, 휴식, 그늘을 확인하고 어지러움이나 두통이 있으면 즉시 보고하세요.",
    };
  }

  if ((feelsLike ?? 0) >= 33 || (tmp ?? 0) >= 33) {
    return {
      level: "warning",
      icon: "☀️",
      title: "폭염주의",
      message: "수분섭취와 휴식 장소를 확인하고, 몸 상태 이상은 바로 공유하세요.",
      ttsLine: "오늘은 폭염주의가 필요합니다. 수분섭취와 휴식 장소를 확인하고 몸 상태 이상은 바로 공유하세요.",
    };
  }

  if ((feelsLike ?? 0) >= 30 || (tmp ?? 0) >= 30) {
    return {
      level: "info",
      icon: "🌡️",
      title: "더위주의",
      message: "작업 전 물을 마시고, 장시간 옥외작업 시 휴식 장소를 확인하세요.",
      ttsLine: "오늘은 더위주의가 필요합니다. 작업 전 물을 마시고 장시간 옥외작업 시 휴식 장소를 확인하세요.",
    };
  }

  if (pty !== "0" || pop >= 40) {
    return {
      level: "warning",
      icon: "🌧️",
      title: "우천주의",
      message: "바닥 미끄럼, 차량 이동, 시야저하 위험을 확인하세요.",
      ttsLine: "오늘은 우천주의가 필요합니다. 바닥 미끄럼, 차량 이동, 시야저하 위험을 확인하세요.",
    };
  }

  if ((tmp ?? 0) <= -10) {
    return {
      level: "warning",
      icon: "🥶",
      title: "한파주의",
      message: "방한보호구를 착용하고, 손발 저림 등 이상증상은 즉시 보고하세요.",
      ttsLine: "오늘은 한파주의가 필요합니다. 방한보호구를 착용하고 손발 저림 등 이상증상은 즉시 보고하세요.",
    };
  }

  return null;
}

function getFieldWeatherTestSnapshot(testMode?: string | null) {
  const mode = String(testMode ?? "").trim().toLowerCase();

  if (mode === "heat35" || mode === "heat") {
    return { tmp: 35, feelsLike: 36, wsd: 1.2, pty: "0", pop: 0 };
  }

  if (mode === "heat33") {
    return { tmp: 33, feelsLike: 34, wsd: 1.2, pty: "0", pop: 0 };
  }

  if (mode === "rain") {
    return { tmp: 24, feelsLike: 24, wsd: 2.1, pty: "1", pop: 80 };
  }

  if (mode === "wind") {
    return { tmp: 22, feelsLike: 22, wsd: 10, pty: "0", pop: 0 };
  }

  if (mode === "cold") {
    return { tmp: -10, feelsLike: -12, wsd: 2.5, pty: "0", pop: 0 };
  }

  return null;
}

async function getFieldWeatherNotice(weatherTest?: string | null): Promise<FieldWeatherNotice | null> {
  const testSnapshot = getFieldWeatherTestSnapshot(weatherTest);

  if (testSnapshot) {
    return buildFieldWeatherNotice(testSnapshot);
  }

  try {
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://safe-metrica.vercel.app";

    const res = await fetch(`${baseUrl}/api/weather`, {
      next: { revalidate: 7200 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      tmp?: number | null;
      wsd?: number | null;
      pty?: string | null;
      pop?: number | null;
    };

    return buildFieldWeatherNotice(data);
  } catch {
    return null;
  }
}


export default async function FieldParticipationPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  if (params.company === "mons" && params.legacy === "contractor-mons") {
    redirect("/contractor/mons");
  }

  const todayDateValue = getTodayDateValue();
  const companyCode = params.company ?? "";
  const flow = Array.isArray(params.flow) ? params.flow[0] ?? "" : params.flow ?? "";
  const intent = getParticipationIntent(params.intent);
  const initialStep = intent ? intentInitialSteps[intent] : 1;
  const workerCopy = getOperatingFieldWorkerCopy(companyCode);
  const riskSummary = await getFieldWorkerRiskSummary(companyCode);
  const siteValue = params.site ?? "";
  const sourceValue = params.source ?? "web";
  const weatherNotice = await getFieldWeatherNotice(params.weatherTest);

  if (!companyCode) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-black text-amber-700">SafeMetrica 현장근로자 QR</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">회사코드가 포함된 QR 링크가 필요합니다.</h1>
            <p className="mt-3 text-sm leading-6 text-amber-900">
              현장근로자 안전참여 화면은 고객사별 위험성평가 공유 항목과 연결됩니다.
              QR 링크는 반드시 <span className="font-black">/field/participation?company=업체코드</span> 형식으로 배포해 주세요.
            </p>
            <div className="mt-4 rounded-2xl border border-amber-300 bg-white p-4 text-sm font-bold text-slate-700">
              예: /field/participation?company=daedo
            </div>
            <a
              href="/home"
              className="mt-5 inline-flex rounded-2xl bg-amber-700 px-5 py-3 text-sm font-black text-white"
            >
              운영 홈으로 돌아가기
            </a>
          </section>
        </div>
      </main>
    );
  }

  if (riskSummary) {
    return (
      <FieldParticipationStepper
        companyCode={companyCode}
          flow={flow}
        initialStep={initialStep}
        entryIntent={intent ?? "default"}
        siteValue={siteValue}
        sourceValue={sourceValue}
        todayDateValue={todayDateValue}
        workerCopy={workerCopy}
        riskSummary={riskSummary}
        feedbackTypes={workerCopy?.feedbackTypes ?? feedbackTypes}
        weatherNotice={weatherNotice}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black text-blue-700">
            {workerCopy?.badge ?? "SafeMetrica 현장참여"}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            {workerCopy?.title ?? "오늘 현장참여"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {workerCopy?.description ??
              riskShareLinkCopy.worker.intro}
          </p>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-black text-blue-700">위험성평가 공유 확인</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">오늘 작업 전 확인</h2>
          <div className="mt-4 space-y-3">
            {[
              "오늘 작업의 주요 위험요인을 확인했습니다.",
              riskShareLinkCopy.worker.checks.riskAssessment,
              riskShareLinkCopy.worker.checks.safetyMeasure,
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
          <input type="hidden" name="sharedRiskSummary" value="" />

          {workerCopy ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
              {workerCopy.companyName} 현장근로자 전용 제출 화면입니다.
            </div>
          ) : null}
          {companyCode === "mons" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              ㈜몬스 현장참여
            </div>
          ) : null}

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
            <h2 className="text-sm font-black text-amber-800">
              {workerCopy?.noticeTitle ?? "안내"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {workerCopy?.noticeBody ??
                "제보 내용은 불이익 목적이 아니라 현장 위험을 줄이기 위한 안전 개선 자료로 활용됩니다."}
              첨부 사진은 세메앱이 용량을 줄여 저장합니다.
            </p>
          </section>

          <button
            type="submit"
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-700 px-5 py-4 text-center text-base font-black text-white shadow-sm transition active:scale-95"
          >
            {workerCopy?.submitButtonLabel ?? riskShareLinkCopy.worker.buttons.submitReport}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          SafeMetrica는 현장 의견을 위험성평가 개선과 안전조치 검토 자료로 활용합니다.
        </p>
      </div>
    </main>
  );
}
