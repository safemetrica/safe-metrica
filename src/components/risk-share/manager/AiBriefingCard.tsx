import { ACCENT_HEX } from "./managerColors";
import { SAMPLE_AI_RECOMMENDATION_ITEMS, SAMPLE_SAFETY_TICKER_ITEMS } from "./managerSampleData";

type AiBriefingCardProps = {
  summaryLine: string;
  focusLine: string;
  referenceLine: string;
  pills: string[];
  generatedAtLabel: string;
};

export default function AiBriefingCard({
  summaryLine,
  focusLine,
  referenceLine,
  pills,
  generatedAtLabel,
}: AiBriefingCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(20,30,55,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
            <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">AI</span>
            안전운영 브리핑
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {generatedAtLabel} 생성 · 사고사례 참고자료 기반
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-600">
          ✦ 관리자 확인 항목 {pills.length}건
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
            LIVE 참고정보
          </span>
          <ul className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
            {SAMPLE_SAFETY_TICKER_ITEMS.map((item) => (
              <li key={item.text} className="truncate">
                <b className="mr-1 text-slate-700">{item.tag}</b>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-3 space-y-2">
          {[summaryLine, focusLine, referenceLine].map((line) => (
            <li key={line} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-2.5 md:grid-cols-3">
          {SAMPLE_AI_RECOMMENDATION_ITEMS.map((item) => {
            const accent = ACCENT_HEX[item.accent];

            return (
              <div key={item.title} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                  style={{ backgroundColor: accent.bg, color: accent.fg }}
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-900">{item.title}</p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{ backgroundColor: accent.bg, color: accent.fg }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {pills.map((pill) => (
            <span key={pill} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
              {pill}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled
            aria-label="관리자 검토용 점검 후보로 저장 (준비 중)"
            className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-400"
          >
            <span aria-hidden="true">＋</span> 관리자 검토용 점검 후보로 저장
          </button>
          <p className="text-[11px] font-semibold leading-5 text-slate-400">
            최종 판단과 조치는 관리자 또는 사업주가 확인합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
