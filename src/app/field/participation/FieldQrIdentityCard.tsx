"use client";

import { useEffect, useRef } from "react";

import type { FieldQrWorkerIdentity } from "./fieldQrCoreTypes";
import {
  clearFieldQrRememberedIdentity,
  readFieldQrRememberedIdentity,
  sanitizeFieldQrWorkerIdentity,
  writeFieldQrRememberedIdentity,
} from "./fieldQrRememberInfo";

export type FieldQrIdentityCardProps = {
  tenantCode: string;
  identity: FieldQrWorkerIdentity;
  onIdentityChange: (identity: FieldQrWorkerIdentity) => void;
  rememberInfo: boolean;
  onRememberInfoChange: (remember: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  title?: string;
  helperText?: string;
};

const DEFAULT_REMEMBER_HELPER =
  "공용 휴대폰이면 체크하지 마세요. 이름, 소속/작업조, 확인번호만 이 브라우저에 저장됩니다.";

function updateIdentityField(
  identity: FieldQrWorkerIdentity,
  field: keyof FieldQrWorkerIdentity,
  value: string
): FieldQrWorkerIdentity {
  return sanitizeFieldQrWorkerIdentity({
    ...identity,
    [field]: value,
  });
}

export function isFieldQrIdentityReady(
  identity: FieldQrWorkerIdentity
): boolean {
  const sanitizedIdentity = sanitizeFieldQrWorkerIdentity(identity);

  return (
    sanitizedIdentity.workerName.length > 0 &&
    sanitizedIdentity.workerTeam.length > 0 &&
    (sanitizedIdentity.workerPhoneLast4.length === 4 ||
      sanitizedIdentity.workerEmployeeNo.length > 0)
  );
}

export function FieldQrIdentityCard({
  tenantCode,
  identity,
  onIdentityChange,
  rememberInfo,
  onRememberInfoChange,
  required = false,
  disabled = false,
  title = "확인자 정보",
  helperText = DEFAULT_REMEMBER_HELPER,
}: FieldQrIdentityCardProps) {
  const hydratedRememberedIdentityRef = useRef(false);
  const ready = isFieldQrIdentityReady(identity);
  const validationText = ready
    ? "확인정보가 입력되었습니다."
    : "이름, 소속/작업조, 휴대폰 뒷4자리 또는 식별번호 중 하나가 필요합니다.";

  useEffect(() => {
    if (hydratedRememberedIdentityRef.current) {
      return;
    }

    hydratedRememberedIdentityRef.current = true;

    const rememberedIdentity = readFieldQrRememberedIdentity(tenantCode);

    if (rememberedIdentity) {
      onIdentityChange(rememberedIdentity);
      onRememberInfoChange(true);
    }
  }, [onIdentityChange, onRememberInfoChange, tenantCode]);

  useEffect(() => {
    if (!rememberInfo) {
      return;
    }

    writeFieldQrRememberedIdentity(tenantCode, identity);
  }, [identity, rememberInfo, tenantCode]);

  const handleIdentityChange = (
    field: keyof FieldQrWorkerIdentity,
    value: string
  ) => {
    onIdentityChange(updateIdentityField(identity, field, value));
  };

  const handleRememberInfoChange = (checked: boolean) => {
    onRememberInfoChange(checked);

    if (checked) {
      writeFieldQrRememberedIdentity(tenantCode, identity);
      return;
    }

    clearFieldQrRememberedIdentity(tenantCode);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="text-sm font-bold leading-6 text-slate-600">
          확인에 필요한 기본 정보를 입력해 주세요.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="block text-sm font-black text-slate-800">
          이름 또는 별칭
          <input
            type="text"
            value={identity.workerName}
            onChange={(event) =>
              handleIdentityChange("workerName", event.target.value)
            }
            maxLength={60}
            disabled={disabled}
            autoComplete="name"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>

        <label className="block text-sm font-black text-slate-800">
          소속 또는 작업조
          <input
            type="text"
            value={identity.workerTeam}
            onChange={(event) =>
              handleIdentityChange("workerTeam", event.target.value)
            }
            maxLength={80}
            disabled={disabled}
            autoComplete="organization"
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-black text-slate-800">
            휴대폰 뒷4자리
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={identity.workerPhoneLast4}
              onChange={(event) =>
                handleIdentityChange("workerPhoneLast4", event.target.value)
              }
              maxLength={4}
              disabled={disabled}
              autoComplete="off"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />
          </label>

          <label className="block text-sm font-black text-slate-800">
            사번 또는 현장 식별번호
            <input
              type="text"
              value={identity.workerEmployeeNo}
              onChange={(event) =>
                handleIdentityChange("workerEmployeeNo", event.target.value)
              }
              maxLength={40}
              disabled={disabled}
              autoComplete="off"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />
          </label>
        </div>
      </div>

      {required ? (
        <p
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black leading-6 ${
            ready
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {validationText}
        </p>
      ) : null}

      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
        <label className="flex items-start gap-3 text-sm font-black text-slate-800">
          <input
            type="checkbox"
            checked={rememberInfo}
            onChange={(event) => handleRememberInfoChange(event.target.checked)}
            disabled={disabled}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 disabled:cursor-not-allowed"
          />
          <span>이 기기에서 내 확인정보 기억하기</span>
        </label>
        <p className="mt-3 text-sm font-bold leading-6 text-teal-900">
          {helperText}
        </p>
      </div>
    </section>
  );
}
