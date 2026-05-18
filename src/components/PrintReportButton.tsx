"use client";

export default function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500"
    >
      PDF 저장 / 인쇄
    </button>
  );
}
