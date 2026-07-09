import Donut from "./charts/Donut";
import { ACCENT_HEX, BORDER_STRONG } from "./managerColors";

type RepresentativeSignatureCardProps = {
  totalCount: number;
  signatureConfirmedCount: number;
  signatureNotSubmittedCount: number;
};

export default function RepresentativeSignatureCard({
  totalCount,
  signatureConfirmedCount,
  signatureNotSubmittedCount,
}: RepresentativeSignatureCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
        <span aria-hidden="true">✎</span> 근로자대표 서명현황
      </h3>

      <div className="mt-3 flex items-center justify-center">
        <Donut
          segments={[
            { value: signatureConfirmedCount, colorHex: ACCENT_HEX.success.fg },
            { value: signatureNotSubmittedCount, colorHex: BORDER_STRONG },
          ]}
          centerValue={`${signatureConfirmedCount}/${totalCount}`}
          centerLabel="서명 확인"
          size={140}
        />
      </div>

      <ul className="mt-4 space-y-2 text-xs font-bold text-slate-600">
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT_HEX.success.fg }} />
            서명 확인
          </span>
          {signatureConfirmedCount}건
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BORDER_STRONG }} />
            선택 서명 미제출
          </span>
          {signatureNotSubmittedCount}건
        </li>
      </ul>
    </article>
  );
}
