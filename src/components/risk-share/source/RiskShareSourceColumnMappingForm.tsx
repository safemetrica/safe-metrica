import {
  RISK_SHARE_SOURCE_CANONICAL_FIELDS,
  RISK_SHARE_SOURCE_CANONICAL_FIELD_LABELS,
  type RiskShareSourceCanonicalField,
} from "@/lib/risk-share/riskShareSourceColumnMapping";

export type RiskShareSourceColumnMappingFormColumn = {
  index: number;
  header: string;
  samples: string[];
  suggestedField: RiskShareSourceCanonicalField | null;
};

export type RiskShareSourceColumnMappingFormHeaderRowOption = {
  index: number;
  label: string;
  href: string;
  selected: boolean;
};

export type RiskShareSourceColumnMappingFormSheetOption = {
  index: number;
  name: string;
  href: string;
  selected: boolean;
};

export type RiskShareSourceColumnMappingFormProps = {
  formAction: string;
  hiddenFields: Record<string, string>;
  sourceTitle: string;
  siteName: string | null;
  fileName: string | null;
  sheetOptions: RiskShareSourceColumnMappingFormSheetOption[];
  headerRowOptions: RiskShareSourceColumnMappingFormHeaderRowOption[];
  columns: RiskShareSourceColumnMappingFormColumn[];
  errorMessage: string | null;
  savedNotice: { status: "draft" | "confirmed"; version: number } | null;
};

export default function RiskShareSourceColumnMappingForm({
  formAction,
  hiddenFields,
  sourceTitle,
  siteName,
  fileName,
  sheetOptions,
  headerRowOptions,
  columns,
  errorMessage,
  savedNotice,
}: RiskShareSourceColumnMappingFormProps) {
  return (
    <section className="mt-6 space-y-5">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        원본 열을 SafeMetrica 운영 필드에 연결합니다. 추천값은 초안이며 저장 전 관리자가 확인해야
        합니다.
      </div>

      {savedNotice ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">
          열 연결 기준을 저장했습니다. ({savedNotice.status === "confirmed" ? "확정" : "임시 저장"}
          , 버전 {savedNotice.version})
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-bold text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
        <p className="text-sm font-black text-white">{sourceTitle || "제목 없는 원본"}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {siteName || "사업장 미입력"} · {fileName || "파일명 미표시"}
        </p>

        {sheetOptions.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {sheetOptions.map((sheet) => (
              <a
                key={sheet.index}
                href={sheet.href}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black",
                  sheet.selected
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800",
                ].join(" ")}
              >
                {sheet.name}
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-4">
          <p className="text-xs font-black text-slate-400">헤더 행 선택</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {headerRowOptions.map((option) => (
              <a
                key={option.index}
                href={option.href}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black",
                  option.selected
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800",
                ].join(" ")}
              >
                {option.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <form
        action={formAction}
        method="post"
        className="rounded-3xl border border-slate-800 bg-white p-6 text-slate-950"
      >
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <h2 className="text-xl font-black">열 연결</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-black text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2">원본 열</th>
                <th className="border-b border-slate-200 px-3 py-2">원본 헤더</th>
                <th className="border-b border-slate-200 px-3 py-2">샘플 값</th>
                <th className="border-b border-slate-200 px-3 py-2">표준 필드</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => (
                <tr key={column.index}>
                  <td className="border-b border-slate-100 px-3 py-3 text-xs text-slate-500">
                    {column.index + 1}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-sm font-bold text-slate-800">
                    {column.header || "(빈 헤더)"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-xs leading-5 text-slate-500">
                    {column.samples.length > 0 ? column.samples.join(" / ") : "샘플 없음"}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <select
                      name={`mapping_field_${column.index}`}
                      defaultValue={column.suggestedField ?? ""}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400 focus:bg-white"
                    >
                      <option value="">매핑 안 함</option>
                      {RISK_SHARE_SOURCE_CANONICAL_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {RISK_SHARE_SOURCE_CANONICAL_FIELD_LABELS[field]}
                          {column.suggestedField === field ? " (추천)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            name="saveIntent"
            value="draft"
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-100"
          >
            임시 저장
          </button>
          <button
            type="submit"
            name="saveIntent"
            value="confirm"
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
          >
            매핑 확정
          </button>
        </div>
      </form>
    </section>
  );
}
