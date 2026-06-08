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

type CustomerCsvDataset =
  | "tbm_records"
  | "worker_share_confirmations"
  | "worker_reports"
  | "evidence_manifest";

type CustomerCsvDatasetOption = {
  value: CustomerCsvDataset;
  label: string;
  description: string;
};

const COMPANY_EXAMPLES = ["hankookgreen", "daedo", "dongwoo", "bubblemon"] as const;

const CUSTOMER_CSV_DATASETS: CustomerCsvDatasetOption[] = [
  {
    value: "tbm_records",
    label: "TBM 기록 CSV",
    description: "작업명, 작업유형, 주요 위험요인, 특이사항, 조치상태, 증빙 수",
  },
  {
    value: "worker_share_confirmations",
    label: "근로자 공유확인 CSV",
    description: "위험성평가 공유확인, 위치/구역, 처리상태, 증빙 여부",
  },
  {
    value: "worker_reports",
    label: "위험제보·아차사고·개선제안 CSV",
    description: "근로자 제보, 아차사고, 개선제안, 조치 메모, 월간보고서 후보",
  },
  {
    value: "evidence_manifest",
    label: "증빙목록 CSV",
    description: "증빙번호, 날짜, 관련 기록, 증빙유형, ZIP 내 경로 후보",
  },
];

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

function getFilenameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/filename="([^"]+)"/);

  return match?.[1] ?? null;
}

function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}

export default function OwnerExportPanel() {
  const [companyKey, setCompanyKey] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeNotionLinks, setIncludeNotionLinks] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [csvDownloadingDataset, setCsvDownloadingDataset] = useState<CustomerCsvDataset | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [summary, setSummary] = useState<ExportSummary | null>(null);

  function getValidatedExportInput() {
    const normalizedCompanyKey = companyKey.trim().toLowerCase();

    if (!normalizedCompanyKey || !startDate || !endDate || endDate < startDate) {
      setNotice({ tone: "error", message: "입력값과 조회 기간을 확인해 주세요." });
      return null;
    }

    return { normalizedCompanyKey, startDate, endDate };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setSummary(null);

    const validatedInput = getValidatedExportInput();

    if (!validatedInput) {
      return;
    }

    const { normalizedCompanyKey } = validatedInput;

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

      downloadBlob(
        blob,
        `safemetrica-export-${normalizedCompanyKey}-${startDate}-${endDate}.json`
      );

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

  async function handleCustomerCsvDownload(dataset: CustomerCsvDataset) {
    setNotice(null);
    setSummary(null);

    const validatedInput = getValidatedExportInput();

    if (!validatedInput) {
      return;
    }

    const { normalizedCompanyKey } = validatedInput;

    setCsvDownloadingDataset(dataset);

    try {
      const query = new URLSearchParams({
        companyKey: normalizedCompanyKey,
        startDate,
        endDate,
        dataset,
      });
      const response = await fetch(`/api/admin/export/customer-csv?${query.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "text/csv" },
      });

      if (!response.ok) {
        setNotice({ tone: "error", message: getErrorMessage(response.status) });
        return;
      }

      const blob = await response.blob();
      const filename =
        getFilenameFromContentDisposition(response.headers.get("content-disposition")) ??
        `safemetrica-customer-${dataset}-${normalizedCompanyKey}-${startDate}-${endDate}.csv`;

      downloadBlob(blob, filename);
      setCompanyKey(normalizedCompanyKey);
      setNotice({ tone: "success", message: "고객용 CSV 다운로드가 완료되었습니다." });
    } catch {
      setNotice({
        tone: "error",
        message: "CSV 다운로드에 실패했습니다. 네트워크 상태를 확인해 주세요.",
      });
    } finally {
      setCsvDownloadingDataset(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-slate-900 p-5 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-300">Supabase Export / 업체 백업</p>
          <h2 className="mt-2 text-2xl font-black text-white">Owner 내부 Export</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            내부 운영자가 업체별 기간 데이터를 백업하고, 고객 전달용 CSV를 생성하는 전용 도구입니다.
            고객용 화면에는 노출되지 않습니다.
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
          <p className="mt-3 text-xs leading-5 text-amber-200">
            몬스는 3개월 단기 독립 운영이며 현재 Supabase CSV Export 대상이 아닙니다.
          </p>
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

        <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">Owner 내부 JSON Export</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                내부 백업·복구·원장 검증용입니다. 고객에게 직접 전달하지 않습니다.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-600 px-2.5 py-1 text-[11px] font-black text-slate-300">
              JSON
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
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

          <button
            type="submit"
            disabled={isDownloading || csvDownloadingDataset !== null}
            className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:bg-slate-600 disabled:text-slate-300 sm:w-auto sm:min-w-56"
          >
            {isDownloading ? "Export 생성 중..." : "JSON Export 다운로드"}
          </button>
        </div>
      </form>

      <section className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-200">고객 전달용 CSV Export</p>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">
              고객에게 전달 가능한 컬럼으로 정제한 CSV입니다. 내부 JSON, raw payload, Notion URL,
              Supabase UUID, Owner 링크는 포함하지 않습니다.
            </p>
          </div>
          <span className="w-fit rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
            CUSTOMER CSV
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {CUSTOMER_CSV_DATASETS.map((dataset) => (
            <button
              key={dataset.value}
              type="button"
              onClick={() => void handleCustomerCsvDownload(dataset.value)}
              disabled={isDownloading || csvDownloadingDataset !== null}
              className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-950/20 disabled:cursor-wait disabled:border-slate-700 disabled:bg-slate-900/70"
            >
              <span className="block text-sm font-black text-white">
                {csvDownloadingDataset === dataset.value ? "CSV 생성 중..." : dataset.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{dataset.description}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-950/20 p-3 text-xs leading-5 text-amber-100">
          고객에게는 이 Owner 화면이나 API 링크를 공유하지 않습니다. 내려받은 CSV, 향후 Excel, PDF,
          증빙 ZIP만 별도 정제 후 전달합니다.
        </div>
      </section>

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
          <p className="text-sm font-black text-white">최근 JSON 다운로드 요약</p>
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
