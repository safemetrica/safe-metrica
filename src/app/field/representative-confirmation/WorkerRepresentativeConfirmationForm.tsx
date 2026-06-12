"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  initialCompanyCode: string;
  initialSiteName: string;
  initialConfirmationScope: string;
  initialRiskAssessmentId: string;
};

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "submitted"; message: string };

type SubmitResponse = {
  ok?: boolean;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClassName = "text-sm font-black text-slate-800";

function createClientSubmissionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `representative:${crypto.randomUUID()}`;
  }

  return `representative:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function getDefaultConfirmedAt() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function focusField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);

  if (field instanceof HTMLElement) {
    field.focus();
  }
}

function getErrorMessage(response: SubmitResponse, status: number) {
  const code = response.error?.code;

  if (code === "invalid_representative_confirmation" || status === 400) {
    return "필수 항목과 입력 형식을 확인해주세요. 이견이 있으면 상세 내용도 입력해야 합니다.";
  }

  if (code === "representative_confirmation_tenant_invalid" || status === 403) {
    return "근로자대표 참여확인 대상 사업장을 확인할 수 없습니다. 회사 코드와 확인 대상을 확인해주세요.";
  }

  if (
    code === "representative_confirmation_storage_failed" ||
    code === "representative_confirmation_storage_not_configured" ||
    code === "representative_confirmation_tenant_validation_failed" ||
    status >= 500
  ) {
    return "기록을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  return response.error?.message || "제출 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

export default function WorkerRepresentativeConfirmationForm({
  initialCompanyCode,
  initialSiteName,
  initialConfirmationScope,
  initialRiskAssessmentId,
}: Props) {
  const [hasObjection, setHasObjection] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [clientSubmissionId] = useState(createClientSubmissionId);
  const [confirmedAt] = useState(getDefaultConfirmedAt);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const riskAssessmentId = String(formData.get("riskAssessmentId") ?? "").trim();
    const confirmationScope = String(formData.get("confirmationScope") ?? "").trim();
    const objectionDetail = String(formData.get("objectionDetail") ?? "").trim();

    if (!riskAssessmentId && !confirmationScope) {
      setSubmission({
        status: "error",
        message: "확인 범위 또는 위험성평가 식별정보 중 하나를 입력해주세요.",
      });
      focusField(form, "confirmationScope");
      return;
    }

    if (hasObjection && !objectionDetail) {
      setSubmission({ status: "error", message: "이견이 있으면 이견 상세 내용을 입력해주세요." });
      focusField(form, "objectionDetail");
      return;
    }

    if (!consentChecked) {
      setSubmission({ status: "error", message: "개인정보 수집·이용 안내를 확인하고 동의해주세요." });
      focusField(form, "consentChecked");
      return;
    }

    const confirmedAtValue = String(formData.get("confirmedAt") ?? "");
    const confirmedAtDate = new Date(confirmedAtValue);

    if (!confirmedAtValue || Number.isNaN(confirmedAtDate.getTime())) {
      setSubmission({ status: "error", message: "확인 일시를 확인해주세요." });
      return;
    }

    setSubmission({ status: "submitting" });

    const payload = {
      companyCode: String(formData.get("companyCode") ?? "").trim(),
      siteName: String(formData.get("siteName") ?? "").trim(),
      riskAssessmentId: riskAssessmentId || null,
      confirmationScope: confirmationScope || null,
      representativeName: String(formData.get("representativeName") ?? "").trim(),
      representativeDepartment:
        String(formData.get("representativeDepartment") ?? "").trim() || null,
      representativeRole: String(formData.get("representativeRole") ?? "").trim(),
      confirmedAt: confirmedAtDate.toISOString(),
      opinion: String(formData.get("opinion") ?? "").trim() || null,
      hasObjection,
      objectionDetail: hasObjection ? objectionDetail : null,
      consentChecked,
      clientSubmissionId,
    };

    try {
      const response = await fetch("/api/worker-representative/confirmation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as SubmitResponse;

      if (!response.ok || !result.ok) {
        setSubmission({ status: "error", message: getErrorMessage(result, response.status) });
        return;
      }

      setSubmission({
        status: "submitted",
        message: result.message || "근로자대표 참여확인 기록이 접수되었습니다.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmission({
        status: "error",
        message: "네트워크 연결을 확인한 뒤 잠시 후 다시 시도해주세요.",
      });
    }
  }

  if (submission.status === "submitted") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:py-16">
        <section className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl" aria-hidden="true">
            ✓
          </div>
          <p className="mt-6 text-sm font-black tracking-wide text-emerald-700">접수 완료</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">참여확인이 접수되었습니다</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{submission.message}</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left text-sm leading-6 text-slate-600">
            제출된 내용은 담당자가 확인합니다. 의견 또는 이견에 대한 검토 결과와 후속 조치는 별도로 관리될 수 있습니다.
          </div>
        </section>
      </main>
    );
  }

  const isSubmitting = submission.status === "submitting";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <div className="inline-flex rounded-full bg-blue-500/20 px-3 py-1 text-xs font-black text-blue-200">
            근로자대표 전용
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">근로자대표 참여확인</h1>
          <p className="mt-3 text-base leading-7 text-slate-200">
            위험성평가 공유 및 의견 확인 기록을 남기는 화면입니다.
          </p>
          <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-6 text-slate-300">
            입력한 의견과 이견은 담당자의 검토 자료로 사용됩니다. 확인 기록과 후속 조치 판단은 서로 구분됩니다.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate={false}>
          <input type="hidden" name="clientSubmissionId" value={clientSubmissionId} />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">1</span>
              <div>
                <h2 className="text-lg font-black">확인 대상</h2>
                <p className="mt-1 text-sm text-slate-500">회사, 현장 및 확인할 위험성평가 범위를 확인해주세요.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="companyCode">회사 코드 <span className="text-red-600">*</span></label>
                <input id="companyCode" name="companyCode" required maxLength={50} defaultValue={initialCompanyCode} autoComplete="organization" placeholder="예: company-code" className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName} htmlFor="siteName">현장명 <span className="text-red-600">*</span></label>
                <input id="siteName" name="siteName" required maxLength={200} defaultValue={initialSiteName} autoComplete="organization-title" placeholder="예: 물류센터 A동" className={inputClassName} />
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClassName} htmlFor="riskAssessmentId">위험성평가 식별정보</label>
              <input id="riskAssessmentId" name="riskAssessmentId" maxLength={200} defaultValue={initialRiskAssessmentId} placeholder="전용 링크에 포함된 경우 자동 표시됩니다." className={inputClassName} />
              <p className="mt-2 text-xs leading-5 text-slate-500">내부 식별번호나 공유받은 위험성평가 번호가 있으면 입력해주세요.</p>
            </div>

            <div className="mt-5">
              <label className={labelClassName} htmlFor="confirmationScope">확인 범위 <span className="text-red-600">*</span></label>
              <textarea id="confirmationScope" name="confirmationScope" maxLength={2000} rows={4} defaultValue={initialConfirmationScope} placeholder="예: 2026년 6월 정기 위험성평가 중 상차·하역 작업 항목" className={`${inputClassName} resize-y leading-6`} />
              <p className="mt-2 text-xs leading-5 text-slate-500">식별정보가 없다면 확인한 기간·버전·작업·항목 범위를 반드시 적어주세요. 불필요한 개인정보는 입력하지 마세요.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">2</span>
              <div>
                <h2 className="text-lg font-black">근로자대표 정보</h2>
                <p className="mt-1 text-sm text-slate-500">확인을 수행한 분의 정보를 입력해주세요.</p>
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClassName} htmlFor="representativeName">성명 <span className="text-red-600">*</span></label>
              <input id="representativeName" name="representativeName" required maxLength={100} autoComplete="name" placeholder="성명을 입력해주세요." className={inputClassName} />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="representativeDepartment">소속 / 작업조</label>
                <input id="representativeDepartment" name="representativeDepartment" maxLength={200} autoComplete="organization-title" placeholder="예: 생산1팀 / 주간조" className={inputClassName} />
              </div>
              <div>
                <label className={labelClassName} htmlFor="representativeRole">직책 / 역할 <span className="text-red-600">*</span></label>
                <input id="representativeRole" name="representativeRole" required maxLength={200} placeholder="예: 근로자대표, 작업조 대표" className={inputClassName} />
              </div>
            </div>
            <div className="mt-5">
              <label className={labelClassName} htmlFor="confirmedAt">확인 일시 <span className="text-red-600">*</span></label>
              <input id="confirmedAt" name="confirmedAt" type="datetime-local" required defaultValue={confirmedAt} className={inputClassName} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">3</span>
              <div>
                <h2 className="text-lg font-black">의견 및 이견</h2>
                <p className="mt-1 text-sm text-slate-500">확인한 내용에 대한 의견과 이견 여부를 남겨주세요.</p>
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClassName} htmlFor="opinion">의견</label>
              <textarea id="opinion" name="opinion" maxLength={5000} rows={5} placeholder="공유받은 내용에 대한 의견이나 추가 검토가 필요한 사항을 적어주세요." className={`${inputClassName} resize-y leading-6`} />
            </div>

            <fieldset className="mt-5">
              <legend className={labelClassName}>이견 여부 <span className="text-red-600">*</span></legend>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-black transition ${!hasObjection ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600"}`}>
                  <input type="radio" name="hasObjection" value="false" checked={!hasObjection} onChange={() => setHasObjection(false)} className="h-4 w-4 accent-blue-700" />
                  이견 없음
                </label>
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-black transition ${hasObjection ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-100" : "border-slate-200 bg-white text-slate-600"}`}>
                  <input type="radio" name="hasObjection" value="true" checked={hasObjection} onChange={() => setHasObjection(true)} className="h-4 w-4 accent-amber-700" />
                  이견 있음
                </label>
              </div>
            </fieldset>

            {hasObjection ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <label className="text-sm font-black text-amber-950" htmlFor="objectionDetail">이견 상세 <span className="text-red-600">*</span></label>
                <textarea id="objectionDetail" name="objectionDetail" required maxLength={5000} rows={5} placeholder="동의하기 어려운 항목과 이유, 추가 검토가 필요한 내용을 구체적으로 적어주세요." className={`${inputClassName} border-amber-300 resize-y leading-6`} />
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">4</span>
              <h2 className="text-lg font-black">개인정보 수집·이용 안내</h2>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              참여확인 기록의 접수와 담당자 검토를 위해 성명, 소속·작업조, 직책·역할, 의견 및 확인 일시를 수집·이용합니다. 입력 정보는 해당 기록의 관리 목적 범위에서 처리됩니다.
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-bold leading-6 text-slate-800">
              <input type="checkbox" name="consentChecked" required checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-700" />
              <span>개인정보 수집·이용 안내를 확인했으며 이에 동의합니다. <span className="text-red-600">(필수)</span></span>
            </label>
          </section>

          {submission.status === "error" ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-800">
              {submission.message}
            </div>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="flex min-h-16 w-full items-center justify-center rounded-2xl bg-blue-700 px-6 py-4 text-base font-black text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-400">
            {isSubmitting ? "접수 중입니다..." : "참여확인 제출"}
          </button>
          <p className="px-2 text-center text-xs leading-5 text-slate-500">
            제출 후 담당자가 기록과 의견을 확인합니다. 중요한 내용은 제출 전에 다시 확인해주세요.
          </p>
        </form>
      </div>
    </main>
  );
}
