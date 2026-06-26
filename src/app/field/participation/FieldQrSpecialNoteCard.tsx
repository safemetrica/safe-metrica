"use client";

import type React from "react";

export type FieldQrSpecialNoteMode = "none" | "has_note";

export type FieldQrSpecialNoteValue = {
  mode: FieldQrSpecialNoteMode;
  noteType: string;
  location: string;
  content: string;
};

export type FieldQrSpecialNoteOption = {
  value: string;
  label: string;
};

export type FieldQrSpecialNoteCardProps = {
  value: FieldQrSpecialNoteValue;
  onChange: (value: FieldQrSpecialNoteValue) => void;
  noteTypeOptions?: FieldQrSpecialNoteOption[];
  title?: string;
  helperText?: string;
  disabled?: boolean;
  requiredWhenHasNote?: boolean;
  evidenceSlot?: React.ReactNode;
};

export const DEFAULT_FIELD_QR_SPECIAL_NOTE_OPTIONS: FieldQrSpecialNoteOption[] =
  [
    { value: "위험제보", label: "위험제보" },
    { value: "아차사고", label: "아차사고" },
    { value: "개선제안", label: "개선제안" },
    { value: "동선·적재", label: "동선·적재" },
    { value: "상하차·지게차", label: "상하차·지게차" },
    { value: "기타", label: "기타" },
  ];

const DEFAULT_TITLE = "특이사항";
const DEFAULT_HELPER_TEXT =
  "특이사항이 없으면 그대로 진행하고, 필요한 경우에만 내용을 남겨 주세요.";
const NONE_OPTION_LABEL = "특이사항 없음";
const HAS_NOTE_OPTION_LABEL = "특이사항 있음";
const LOCATION_LABEL = "위치 또는 구역";
const LOCATION_PLACEHOLDER = "예: 상차장, 보관구역, A구역";
const CONTENT_LABEL = "내용";
const CONTENT_PLACEHOLDER =
  "예: 통로 바닥이 미끄럽습니다 / 적재 위치 조정이 필요합니다";
const REQUIRED_CONTENT_TEXT = "특이사항 내용을 입력해 주세요.";
const READY_CONTENT_TEXT = "특이사항이 입력되었습니다.";
const FALLBACK_NOTE_TYPE = "위험제보";

function limitText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

export function isFieldQrSpecialNoteReady(
  value: FieldQrSpecialNoteValue,
  requiredWhenHasNote = false,
): boolean {
  if (value.mode === "none") {
    return true;
  }

  if (!requiredWhenHasNote) {
    return true;
  }

  return value.content.trim().length > 0;
}

export function FieldQrSpecialNoteCard({
  value,
  onChange,
  noteTypeOptions = DEFAULT_FIELD_QR_SPECIAL_NOTE_OPTIONS,
  title = DEFAULT_TITLE,
  helperText = DEFAULT_HELPER_TEXT,
  disabled = false,
  requiredWhenHasNote = false,
  evidenceSlot,
}: FieldQrSpecialNoteCardProps) {
  const ready = isFieldQrSpecialNoteReady(value, requiredWhenHasNote);
  const showRequiredMessage = requiredWhenHasNote && value.mode === "has_note";
  const normalizedOptions = noteTypeOptions.map((option) => ({
    value: limitText(option.value, 40),
    label: option.label,
  }));
  const defaultNoteType =
    normalizedOptions.find((option) => option.value.trim().length > 0)?.value ??
    FALLBACK_NOTE_TYPE;

  const handleValueChange = (nextValue: Partial<FieldQrSpecialNoteValue>) => {
    onChange({
      ...value,
      ...nextValue,
    });
  };

  const handleModeChange = (mode: FieldQrSpecialNoteMode) => {
    if (mode === "has_note" && value.noteType.trim().length === 0) {
      handleValueChange({ mode, noteType: defaultNoteType });
      return;
    }

    handleValueChange({ mode });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
          현장 특이사항
        </p>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="text-sm font-bold leading-6 text-slate-600">
          {helperText}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleModeChange("none")}
          disabled={disabled}
          aria-pressed={value.mode === "none"}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value.mode === "none"
              ? "border-teal-300 bg-teal-50 text-teal-950 ring-2 ring-teal-100"
              : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
          }`}
        >
          <span className="block text-base font-black">
            {NONE_OPTION_LABEL}
          </span>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-500">
            남길 내용이 없으면 이 상태로 진행합니다.
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange("has_note")}
          disabled={disabled}
          aria-pressed={value.mode === "has_note"}
          className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value.mode === "has_note"
              ? "border-teal-300 bg-teal-50 text-teal-950 ring-2 ring-teal-100"
              : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
          }`}
        >
          <span className="block text-base font-black">
            {HAS_NOTE_OPTION_LABEL}
          </span>
          <span className="mt-1 block text-sm font-bold leading-6 text-slate-500">
            현장에서 공유할 내용을 간단히 남깁니다.
          </span>
        </button>
      </div>

      {value.mode === "has_note" ? (
        <div className="mt-5 grid gap-4">
          <label className="block text-sm font-black text-slate-800">
            유형
            <select
              value={limitText(value.noteType, 40)}
              onChange={(event) =>
                handleValueChange({
                  noteType: limitText(event.target.value, 40),
                })
              }
              disabled={disabled}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              {normalizedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-black text-slate-800">
            {LOCATION_LABEL}
            <input
              type="text"
              value={limitText(value.location, 80)}
              onChange={(event) =>
                handleValueChange({
                  location: limitText(event.target.value, 80),
                })
              }
              maxLength={80}
              disabled={disabled}
              placeholder={LOCATION_PLACEHOLDER}
              autoComplete="off"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />
          </label>

          <label className="block text-sm font-black text-slate-800">
            {CONTENT_LABEL}
            <textarea
              value={limitText(value.content, 500)}
              onChange={(event) =>
                handleValueChange({
                  content: limitText(event.target.value, 500),
                })
              }
              maxLength={500}
              disabled={disabled}
              placeholder={CONTENT_PLACEHOLDER}
              rows={5}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="mt-2 block text-right text-xs font-bold text-slate-500">
              {limitText(value.content, 500).length}/500
            </span>
          </label>

          {evidenceSlot ? (
            <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 p-4">
              {evidenceSlot}
            </div>
          ) : null}
        </div>
      ) : null}

      {showRequiredMessage ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black leading-6 ${
            ready
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {ready ? READY_CONTENT_TEXT : REQUIRED_CONTENT_TEXT}
        </p>
      ) : null}
    </section>
  );
}
