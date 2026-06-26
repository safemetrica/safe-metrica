"use client";

import HandwrittenSignaturePad from "./HandwrittenSignaturePad";

export type FieldQrSignatureCardProps = {
  enabled: boolean;
  required?: boolean;
  title?: string;
  helperText?: string;
  disabled?: boolean;
};

const DEFAULT_TITLE = "모바일 자필 확인서명";
const DEFAULT_HELPER_TEXT =
  "서명은 확인기록에 함께 저장됩니다. 공용 기기에서는 제출 후 화면을 닫아 주세요.";
const REQUIRED_HELPER_TEXT = "확인 제출 전 자필서명이 필요합니다.";

export function FieldQrSignatureCard({
  enabled,
  required = false,
  title = DEFAULT_TITLE,
  helperText = DEFAULT_HELPER_TEXT,
  disabled = false,
}: FieldQrSignatureCardProps) {
  if (!enabled) {
    return null;
  }

  const signaturePadEnabled = enabled && !disabled;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
          현장 확인서명
        </p>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="text-sm font-bold leading-6 text-slate-600">
          손가락으로 확인서명을 남겨 주세요.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
        <p className="text-sm font-black leading-6 text-teal-950">
          {helperText}
        </p>
        {required ? (
          <p className="mt-2 text-sm font-bold leading-6 text-teal-900">
            {REQUIRED_HELPER_TEXT}
          </p>
        ) : null}
      </div>

      {disabled ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black leading-6 text-slate-500">
          현재 단계에서는 서명을 입력할 수 없습니다.
        </p>
      ) : null}

      <div className="mt-4">
        {/*
          HandwrittenSignaturePad owns its hidden form fields and submit-time
          validation today. It does not expose completion state yet, so this
          card intentionally remains a safe presentational wrapper instead of
          inventing a separate submit API.
        */}
        <HandwrittenSignaturePad enabled={signaturePadEnabled} />
      </div>
    </section>
  );
}
