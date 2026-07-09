import Donut from "./charts/Donut";
import { ACCENT_HEX } from "./managerColors";
import { SAMPLE_REVIEW_STATUS } from "./managerSampleData";

type ReviewStatusCardProps = {
  monthLabel: string;
  signatureNotSubmittedCount: number;
};

export default function ReviewStatusCard({ monthLabel, signatureNotSubmittedCount }: ReviewStatusCardProps) {
  const { unreviewed, inReview, reviewed } = SAMPLE_REVIEW_STATUS;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-black text-slate-950">처리 현황</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400">
          샘플 데이터
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center">
        <Donut
          segments={[
            { value: unreviewed, colorHex: ACCENT_HEX.warning.fg },
            { value: inReview, colorHex: ACCENT_HEX.info.fg },
            { value: reviewed, colorHex: ACCENT_HEX.success.fg },
          ]}
          centerValue={String(unreviewed)}
          centerLabel="미검토"
          size={140}
        />
      </div>

      <ul className="mt-4 space-y-2 text-xs font-bold text-slate-600">
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT_HEX.warning.fg }} />
            미검토
          </span>
          {unreviewed}건
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT_HEX.info.fg }} />
            검토 중
          </span>
          {inReview}건
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT_HEX.success.fg }} />
            검토 완료
          </span>
          {reviewed}건
        </li>
      </ul>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <a
          href="#"
          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition hover:border-rose-200"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-black text-rose-600">
            !
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-slate-900">지게차 동선 개선 제안</span>
            <span className="block text-[11px] font-semibold text-slate-400">익명 의견 · 미검토(샘플)</span>
          </span>
        </a>
        <a
          href="#"
          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition hover:border-amber-200"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-[10px] font-black text-amber-600">
            서명
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-slate-900">
              근로자대표 서명 {signatureNotSubmittedCount}건 대기
            </span>
            <span className="block text-[11px] font-semibold text-slate-400">{monthLabel} 공유확인 서명 요청</span>
          </span>
        </a>
      </div>
    </article>
  );
}
