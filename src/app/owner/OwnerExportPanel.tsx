"use client";

import { FormEvent, useState } from "react";

type ExportSummary = {
  fieldParticipationCount: number;
  tbmVoiceCount: number;
  evidenceCount: number;
};

type ExportResponse = {
  sources?: Partial<ExportSummary>;
};

type Notice = {
  tone: "success" | "error";
  message: string;
};

const COMPANY_EXAMPLES = ["hankookgreen", "bubblemon"] as const;

function getErrorMessage(status: number) {
  if (status === 400) {
    return "입력값과 조회 기간을 확인해 주세요.";
  }

  if (status === 403) {
    return "Owner 인증이 필요합니다. 다시 로그인해 주세요.";
  }

  if (status === 503) {
    return "Supabase 서버 설정 확인이 필요합니다.";
  }

  return "Export 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function getExportSummary(payload: ExportResponse): ExportSummary | null {
  const { sources } = payload;

  if (
    typeof sources?.fieldParticipationCount !== "number" ||
    typeof sources.tbmVoiceCount !== "number" ||
    typeof sources.evidenceCount !== "number"
  ) {
    return null;
  }

  return {
    fieldParticipationCount: sources.fieldParticipationCount,
    tbmVoiceCount: sources.tbmVoiceCount,
    evidenceCount: sources.evidenceCount,
  };
}

export default function OwnerExportPanel() {
  const [companyKey, setCompanyKey] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeNotionLinks, setIncludeNotionLinks] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [summary, setSummary] = useState<ExportSummary | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setSummary(null);

    const normalizedCompanyKey = companyKey.trim().toLowerCase();

    if (!normalizedCompanyKey || !startDate || !endDate || endDate < startDate) {
      setNotice({ tone: "error", message: "입력값과 조회 기간을 확인해 주세요." });
      return;
    }

    setIsDownloading(true);

    try {
      const query = new URLSearchParams({
        companyKey: normalizedCompanyKey,
        startDate,
        endDate,
        format: "json",
        includeEvidence: String(includeEvidence),
        includeNotionLinks: String(includeNotionLinks),
      });
      const response = await fetch(`/api/admin/export?${query.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        setNotice({ tone: "error", message: getErrorMessage(response.status) });
        return;
      }

      const payload = (await response.json()) as ExportResponse;
      setSummary(getExportSummary(payload));

      const exportText = JSON.stringify(payload, null, 2);
      const blob = new Blob([exportText], { type: "application/json;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `safemetrica-export-${normalizedCompanyKey}-${startDate}-${endDate}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);

      setCompanyKey(normalizedCompanyKey);
      setNotice({ tone: "success", message: "JSON Export 다운로드가 완료되었습니다." });
    } catch {
      setNotice({
        tone: "error",
        message: "Export 생성에 실패했습니다. 네트워크 상태를 확인해 주세요.",
      });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-slate-900 p-5 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-300">Supabase Export / 업체 백업</p>
          <h2 className="mt-2 text-2xl font-black text-white">Owner 내부 JSON Export</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            내부 운영자가 업체별 기간 데이터를 백업하는 전용 도구입니다. 고객용 화면에는 노출되지
            않으며, v1은 JSON만 지원합니다.
          </p>
        </div>
        <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">
          INTERNAL ONLY
        </span>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="export-company-key" className="text-sm font-bold text-slate-200">
            companyKey
          </label>
          <input
            id="export-company-key"
            name="companyKey"
            type="text"
            value={companyKey}
            onChange={(event) => setCompanyKey(event.target.value)}
            placeholder="hankookgreen"
            autoComplete="off"
            required
            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">빠른 선택</span>
            {COMPANY_EXAMPLES.map((company) => (
              <button
                key={company}
                type="button"
                onClick={() => setCompanyKey(company)}
                className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              >
                {company}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="export-start-date" className="text-sm font-bold text-slate-200">
              시작일
            </label>
            <input
              id="export-start-date"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <div>
            <label htmlFor="export-end-date" className="text-sm font-bold text-slate-200">
              종료일
            </label>
            <input
              id="export-end-date"
              name="endDate"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <input
              type="checkbox"
              checked={includeEvidence}
              onChange={(event) => setIncludeEvidence(event.target.checked)}
              className="mt-0.5 size-4 accent-cyan-500"
            />
            <span>
              <span className="block text-sm font-black text-white">증빙 목록 포함</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">includeEvidence</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
            <input
              type="checkbox"
              checked={includeNotionLinks}
              onChange={(event) => setIncludeNotionLinks(event.target.checked)}
              className="mt-0.5 size-4 accent-cyan-500"
            />
            <span>
              <span className="block text-sm font-black text-white">Notion 링크 포함</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">includeNotionLinks</span>
            </span>
          </label>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-xs leading-5 text-slate-400">
          파일 형식은 <strong className="text-slate-200">JSON</strong>으로 고정됩니다. 화면에는 원본
          데이터 대신 다운로드 결과 건수만 표시합니다.
        </div>

        <button
          type="submit"
          disabled={isDownloading}
          className="w-full rounded-xl bg-cyan-500 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:bg-slate-600 disabled:text-slate-300 sm:w-auto sm:min-w-56"
        >
          {isDownloading ? "Export 생성 중..." : "JSON Export 다운로드"}
        </button>
      </form>

      {notice ? (
        <div
          role="status"
          className={`mt-5 rounded-xl border p-4 text-sm font-bold ${
            notice.tone === "success"
              ? "border-emerald-400/30 bg-emerald-950/30 text-emerald-200"
              : "border-rose-400/30 bg-rose-950/30 text-rose-200"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {summary ? (
        <div className="mt-5">
          <p className="text-sm font-black text-white">최근 다운로드 요약</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <dt className="text-xs font-bold text-slate-400">현장참여</dt>
              <dd className="mt-1 text-2xl font-black text-cyan-200">
                {summary.fieldParticipationCount.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <dt className="text-xs font-bold text-slate-400">TBM 기록</dt>
              <dd className="mt-1 text-2xl font-black text-cyan-200">
                {summary.tbmVoiceCount.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <dt className="text-xs font-bold text-slate-400">증빙</dt>
              <dd className="mt-1 text-2xl font-black text-cyan-200">
                {summary.evidenceCount.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
