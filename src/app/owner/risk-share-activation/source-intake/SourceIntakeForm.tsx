"use client";

import { useMemo, useState } from "react";

type SubmitState =
  | {
      status: "idle";
      message: string;
      fileUrl?: string;
    }
  | {
      status: "success";
      message: string;
      fileUrl?: string;
      companyCode?: string;
      companyName?: string;
      sourceTitle?: string;
    }
  | {
      status: "error";
      message: string;
      fileUrl?: string;
    }
  | {
      status: "submitting";
      message: string;
    };

function getBuilderHref(companyCode: string, companyName: string, sourceTitle: string) {
  const query = new URLSearchParams();

  if (companyCode) query.set("companyCode", companyCode);
  if (companyName) query.set("companyName", companyName);
  if (sourceTitle) query.set("sourceTitle", sourceTitle);

  return `/owner/risk-share-activation/share-items?${query.toString()}`;
}

function getVersionLockHref(companyCode: string, companyName: string, sourceTitle: string) {
  const query = new URLSearchParams();

  if (companyCode) query.set("companyCode", companyCode);
  if (companyName) query.set("companyName", companyName);
  if (sourceTitle) query.set("sourceTitle", sourceTitle);

  query.set("sourceReceived", "on");

  return `/owner/risk-share-activation/version-lock?${query.toString()}`;
}

export default function SourceIntakeForm() {
  const [state, setState] = useState<SubmitState>({
    status: "idle",
    message: "고객 위험성평가 source 파일을 접수하면 AI 추출 대기 상태로 표시됩니다.",
  });

  const [companyCode, setCompanyCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");

  const builderHref = useMemo(
    () => getBuilderHref(companyCode, companyName, sourceTitle),
    [companyCode, companyName, sourceTitle]
  );

  const versionLockHref = useMemo(
    () => getVersionLockHref(companyCode, companyName, sourceTitle),
    [companyCode, companyName, sourceTitle]
  );

  const uploadedFileUrl = "fileUrl" in state ? state.fileUrl : undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setState({
      status: "submitting",
      message: "source 파일을 업로드하고 메타데이터를 저장하는 중입니다.",
    });

    try {
      const res = await fetch("/api/owner/risk-share-source-intake/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setState({
          status: "error",
          message: data?.message ?? "source 파일 접수 중 오류가 발생했습니다.",
          fileUrl: data?.fileUrl,
        });
        return;
      }

      setState({
        status: "success",
        message: data.message ?? "Risk Share source 파일이 접수되었습니다.",
        fileUrl: data.source?.fileUrl,
        companyCode: data.source?.companyCode,
        companyName: data.source?.companyName,
        sourceTitle: data.source?.sourceTitle,
      });

      setCompanyCode(data.source?.companyCode ?? companyCode);
      setCompanyName(data.source?.companyName ?? companyName);
      setSourceTitle(data.source?.sourceTitle ?? sourceTitle);
    } catch {
      setState({
        status: "error",
        message: "네트워크 또는 서버 오류로 source 파일 접수에 실패했습니다.",
      });
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-700 bg-slate-900 p-6 lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-300">고객 코드 후보</span>
            <input
              name="companyCode"
              value={companyCode}
              onChange={(event) => setCompanyCode(event.target.value)}
              placeholder="예: woogwang"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-300">고객명</span>
            <input
              name="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="예: ㈜우광개발"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-300">현장명</span>
            <input
              name="siteName"
              placeholder="예: 우광개발 본사 현장"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-300">Source 유형</span>
            <select
              name="sourceType"
              defaultValue="risk_assessment_pdf"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            >
              <option value="risk_assessment_pdf">위험성평가 PDF</option>
              <option value="risk_assessment_excel">위험성평가 Excel</option>
              <option value="risk_assessment_image">위험성평가 이미지</option>
              <option value="customer_document">고객 제공 문서</option>
              <option value="other">기타</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-black text-slate-300">Source 문서명</span>
            <input
              name="sourceTitle"
              value={sourceTitle}
              onChange={(event) => setSourceTitle(event.target.value)}
              placeholder="예: 우광개발 위험성평가표 2026"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
              required
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-black text-slate-300">위험성평가 source 파일</span>
            <input
              type="file"
              name="sourceFile"
              accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-slate-950"
              required
            />
            <p className="mt-2 text-xs leading-5 text-slate-400">
              PDF, Excel, CSV, 이미지 파일을 접수합니다. v1 기준 최대 20MB입니다.
            </p>
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-300">접수자</span>
            <input
              name="uploadedBy"
              placeholder="예: 내부 운영자"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-300">접수 메모</span>
            <input
              name="sourceNote"
              placeholder="예: 2026년 정기평가 최신본"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "submitting" ? "접수 중..." : "Source 파일 접수"}
        </button>
      </form>

      <aside className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <p className="text-sm font-bold text-cyan-300">Intake Status</p>
        <h2 className="mt-2 text-2xl font-black text-white">
          {state.status === "success" ? "AI 추출 대기" : state.status === "error" ? "확인 필요" : "Source 접수"}
        </h2>

        <p
          className={
            state.status === "error"
              ? "mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-100"
              : state.status === "success"
                ? "mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm font-bold leading-6 text-emerald-100"
                : "mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm font-bold leading-6 text-slate-300"
          }
        >
          {state.message}
        </p>

        {uploadedFileUrl ? (
          <a
            href={uploadedFileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-xl border border-blue-500/40 px-4 py-3 text-center text-sm font-black text-blue-100 hover:bg-blue-500/10"
          >
            업로드 파일 확인
          </a>
        ) : null}

        <div className="mt-5 grid gap-3">
          <a
            href={builderHref}
            className="rounded-xl border border-emerald-400/40 px-4 py-3 text-center text-sm font-black text-emerald-100 hover:bg-emerald-500/10"
          >
            Share Item Builder로 이동
          </a>
          <a
            href={versionLockHref}
            className="rounded-xl border border-amber-400/40 px-4 py-3 text-center text-sm font-black text-amber-100 hover:bg-amber-500/10"
          >
            Version Lock 체크로 이동
          </a>
        </div>

        <p className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">
          v1은 source 파일 접수와 메타데이터 저장까지입니다. AI 추출, 후보 검토, Version Lock 저장은 후속 PR에서 진행합니다.
        </p>
      </aside>
    </div>
  );
}
