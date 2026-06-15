"use client";

import { useMemo, useState } from "react";

type RiskSharePackDataset =
  | "worker_share_confirmations"
  | "worker_reports"
  | "worker_representative_confirmations";

type Notice = {
  tone: "success" | "error";
  message: string;
};

const DATASETS: Array<{
  value: RiskSharePackDataset;
  label: string;
  description: string;
}> = [
  {
    value: "worker_share_confirmations",
    label: "근로자 공유확인 CSV",
    description: "위험성평가 공유확인, 위치/구역, 처리상태, 증빙 여부를 정리합니다.",
  },
  {
    value: "worker_reports",
    label: "위험제보·아차사고·개선제안 CSV",
    description: "근로자 제보, 아차사고, 개선제안, 조치 메모, 월간보고서 후보를 정리합니다.",
  },
  {
    value: "worker_representative_confirmations",
    label: "근로자대표 참여확인 CSV",
    description: "근로자대표 확인, 보완 의견, 검토상태, 현장명, 확인범위를 정리합니다.",
  },
];

function getKstDateString(date: Date) {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kstDate.toISOString().slice(0, 10);
}

function getDefaultPeriod() {
  const now = new Date();
  const today = getKstDateString(now);
  const firstDay = `${today.slice(0, 8)}01`;

  return { startDate: firstDay, endDate: today };
}

function getErrorMessage(status: number) {
  if (status === 400) {
    return "조회 기간을 확인해 주세요.";
  }

  if (status === 403) {
    return "내부 운영자 다운로드 권한이 필요합니다. Owner 권한으로 다시 확인해 주세요.";
  }

  if (status === 502) {
    return "원장 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (status === 503) {
    return "서버 설정 확인이 필요합니다.";
  }

  return "CSV 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";
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

export default function RiskSharePackExportPanel({
  companyCode,
}: {
  companyCode: string;
}) {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);
  const [downloadingDataset, setDownloadingDataset] =
    useState<RiskSharePackDataset | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function handleDownload(dataset: RiskSharePackDataset) {
    setNotice(null);

    if (!startDate || !endDate || endDate < startDate) {
      setNotice({ tone: "error", message: "조회 기간을 확인해 주세요." });
      return;
    }

    setDownloadingDataset(dataset);

    try {
      const query = new URLSearchParams({
        companyKey: companyCode,
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
        `safemetrica-risk-share-${dataset}-${companyCode}-${startDate}-${endDate}.csv`;

      downloadBlob(blob, filename);
      setNotice({ tone: "success", message: "CSV 다운로드가 완료되었습니다." });
    } catch {
      setNotice({
        tone: "error",
        message: "CSV 다운로드에 실패했습니다. 네트워크 상태를 확인해 주세요.",
      });
    } finally {
      setDownloadingDataset(null);
    }
  }

  return (
    <section id="risk-share-export-panel" className="rounded-3xl border border-cyan-500/25 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-300">고객 전달용 파일 준비</p>
          <h2 className="mt-1 text-xl font-black text-white">
            Risk Share Pack CSV 보관파일 준비
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            선택한 기간의 공유확인, 위험제보·개선의견, 근로자대표 참여확인 기록을
            내부 운영자가 확인한 뒤 고객 전달용 CSV로 정리합니다.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-400">
            시작일
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-xs font-bold text-slate-400">
            종료일
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </label>
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
            notice.tone === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/40 bg-amber-500/10 text-amber-100"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {DATASETS.map((dataset) => (
          <article
            key={dataset.value}
            className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
          >
            <div>
              <h3 className="text-base font-black text-white">{dataset.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {dataset.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(dataset.value)}
              disabled={downloadingDataset !== null}
              className="mt-4 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {downloadingDataset === dataset.value ? "다운로드 중..." : "고객 전달용 CSV 다운로드"}
            </button>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Export는 내부 운영자가 입력된 운영기록을 확인해 고객 전달자료로 정리하는 기능입니다. 법적 판단이나 조치완료 확정을 대신하지 않습니다.
      </p>
    </section>
  );
}
