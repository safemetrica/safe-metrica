"use client";

import { useState } from "react";

export default function CopyLinkButton({
  value,
}: {
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-cyan-400/50 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-400/10"
    >
      {copied ? "복사됨" : "링크 복사"}
    </button>
  );
}
