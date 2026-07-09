import { ACCENT_HEX } from "./managerColors";
import { SAMPLE_RECENT_SUBMISSIONS } from "./managerSampleData";

export default function RecentSubmissionsTable() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-950">최근 접수 내역</h3>
          <p className="text-[11px] font-semibold text-slate-400">QR로 접수되어 관리자 검토 대기 중 · 샘플 데이터</p>
        </div>
        <a href="#" className="text-xs font-bold text-slate-400 transition hover:text-slate-700">
          전체 보기 →
        </a>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-3">구분</th>
              <th className="py-2 pr-3">제출자</th>
              <th className="py-2 pr-3">내용</th>
              <th className="py-2 pr-3">접수 시각</th>
              <th className="py-2 pr-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_RECENT_SUBMISSIONS.map((row) => {
              const categoryAccent = ACCENT_HEX[row.accent];
              const statusAccent = ACCENT_HEX[row.statusAccent];

              return (
                <tr key={`${row.submittedAt}-${row.content}`} className="border-b border-slate-50 last:border-b-0">
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded-full px-2 py-1 text-[11px] font-black"
                      style={{ backgroundColor: categoryAccent.bg, color: categoryAccent.fg }}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2 font-bold text-slate-700">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: categoryAccent.fg }}
                      >
                        {row.avatarLabel}
                      </span>
                      {row.submitter}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-slate-600">{row.content}</td>
                  <td className="py-2.5 pr-3 font-semibold text-slate-400">{row.submittedAt}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded-full px-2 py-1 text-[11px] font-black"
                      style={{ backgroundColor: statusAccent.bg, color: statusAccent.fg }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
