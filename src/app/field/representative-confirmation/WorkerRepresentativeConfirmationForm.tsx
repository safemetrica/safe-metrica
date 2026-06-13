"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  linkId: string;
  initialCompanyCode: string;
  initialSiteName: string;
  initialConfirmationScope: string;
  initialRiskAssessmentId: string;
  isLinkLocked: boolean;
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

const opinionExamples = [
  "보행자 통로 표시 보완 필요",
  "지게차 이동구역 구분 필요",
  "작업 전 공유 한 번 더 필요",
  "보호구 착용 안내 필요",
  "바닥 미끄럼 주의 표시 필요",
  "야간/조명 확인 필요",
];

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
    return "필수 항목과 입력 형식을 확인해주세요. 보완 의견이 있으면 내용도 입력해야 합니다.";
  }

  if (code === "representative_confirmation_link_invalid") {
    return "이 참여확인 링크는 현재 사용할 수 없습니다. 관리자에게 문의해주세요.";
  }

  if (code === "representative_confirmation_tenant_invalid" || status === 403) {
    return "참여확인 대상 사업장을 확인할 수 없습니다. 공유받은 링크를 확인하거나 관리자에게 문의해주세요.";
  }

  if (
    code === "representative_confirmation_link_storage_failed" ||
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
  linkId,
  initialCompanyCode,
  initialSiteName,
  initialConfirmationScope,
  initialRiskAssessmentId,
  isLinkLocked,
}: Props) {
  const [siteName, setSiteName] = useState(initialSiteName);
  const [confirmationScope, setConfirmationScope] = useState(initialConfirmationScope || "오늘 공유받은 위험성평가와 안전조치");
  const [hasObjection, setHasObjection] = useState(false);
  const [opinion, setOpinion] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [clientSubmissionId] = useState(createClientSubmissionId);
  const [confirmedAt] = useState(getDefaultConfirmedAt);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const riskAssessmentId = String(formData.get("riskAssessmentId") ?? "").trim();
    const siteNameValue = String(formData.get("siteName") ?? "").trim();
    const confirmationScope = String(formData.get("confirmationScope") ?? "").trim();
    const opinionValue = opinion.trim();

    if (!siteNameValue) {
      setSubmission({ status: "error", message: "현장명을 확인해주세요." });
      const editor = document.getElementById("confirmationTargetEditor");
      if (editor instanceof HTMLDetailsElement) editor.open = true;
      focusField(form, "editSiteName");
      return;
    }

    if (!riskAssessmentId && !confirmationScope) {
      setSubmission({
        status: "error",
        message: "오늘 확인할 내용을 입력해주세요.",
      });
      const editor = document.getElementById("confirmationTargetEditor");
      if (editor instanceof HTMLDetailsElement) editor.open = true;
      focusField(form, "editConfirmationScope");
      return;
    }

    if (hasObjection && !opinionValue) {
      setSubmission({ status: "error", message: "보완 의견 내용을 입력해주세요." });
      focusField(form, "opinion");
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
      linkId: linkId || null,
      ...(isLinkLocked
        ? {}
        : {
            companyCode: String(formData.get("companyCode") ?? "").trim(),
            siteName: siteNameValue,
            riskAssessmentId: riskAssessmentId || null,
            confirmationScope: confirmationScope || null,
          }),
      representativeName: String(formData.get("representativeName") ?? "").trim(),
      representativeDepartment:
        String(formData.get("representativeDepartment") ?? "").trim() || null,
      representativeRole: String(formData.get("representativeRole") ?? "").trim(),
      confirmedAt: confirmedAtDate.toISOString(),
      opinion: opinionValue || null,
      hasObjection,
      objectionDetail: hasObjection ? opinionValue : null,
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
        message: "관리자가 제출 내용을 확인할 수 있습니다.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmission({
        status: "error",
        message: "네트워크 연결을 확인한 뒤 잠시 후 다시 시도해주세요.",
      });
    }
  }

  function addOpinionExample(example: string) {
    setHasObjection(true);
    setOpinion((current) => {
      const trimmed = current.trim();

      if (!trimmed) {
        return example;
      }

      return `${trimmed}${trimmed.endsWith(".") ? "" : "."} ${example}`;
    });
  }

  if (submission.status === "submitted") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:py-16">
        <section className="mx-auto max-w-xl rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl" aria-hidden="true">
            ✓
          </div>
          <p className="mt-6 text-sm font-black tracking-wide text-emerald-700">접수 완료</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">참여확인이 접수되었습니다.</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{submission.message}</p>
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
            관리자가 공유한 위험성평가와 안전조치 내용을 확인하고, 의견이 있으면 남겨주세요.
          </p>
          <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-6 text-slate-300">
            이 기록은 공유·확인 및 의견 검토를 돕기 위한 운영기록입니다.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate={false}>
          <input type="hidden" name="clientSubmissionId" value={clientSubmissionId} />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">1</span>
              <div>
                <h2 className="text-lg font-black">확인 대상</h2>
                <p className="mt-1 text-sm text-slate-500">공유받은 현장과 오늘 확인할 내용을 확인해주세요.</p>
              </div>
            </div>

            {!isLinkLocked ? (
              <>
                <input type="hidden" name="companyCode" value={initialCompanyCode} />
                <input type="hidden" name="riskAssessmentId" value={initialRiskAssessmentId} />
                <input type="hidden" name="siteName" value={siteName} />
                <input type="hidden" name="confirmationScope" value={confirmationScope} />
              </>
            ) : null}

            <dl className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/70">
              <div className="border-b border-blue-100 px-4 py-4 sm:px-5">
                <dt className="text-xs font-black tracking-wide text-blue-700">현장명</dt>
                <dd className="mt-1 text-base font-black leading-6 text-slate-950">{siteName || "현장명을 확인해주세요."}</dd>
              </div>
              <div className="px-4 py-4 sm:px-5">
                <dt className="text-xs font-black tracking-wide text-blue-700">오늘 확인할 내용</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-800">{confirmationScope || "확인할 내용을 확인해주세요."}</dd>
              </div>
            </dl>

            <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
              {isLinkLocked
                ? "공유받은 내용이 다르면 제출 전에 관리자에게 문의해주세요."
                : "공유받은 내용이 다르면 수정하거나 관리자에게 문의해주세요."}
            </p>

            {!isLinkLocked ? (
              <details id="confirmationTargetEditor" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <summary className="cursor-pointer font-bold text-slate-700">내용이 다르면 수정하기</summary>
                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                  <div>
                    <label className={labelClassName} htmlFor="editSiteName">현장명 <span className="text-red-600">*</span></label>
                    <input id="editSiteName" maxLength={200} value={siteName} onChange={(event) => setSiteName(event.target.value)} autoComplete="organization-title" placeholder="예: 물류센터 A동" className={inputClassName} />
                  </div>
                  <div>
                    <label className={labelClassName} htmlFor="editConfirmationScope">오늘 확인할 내용 <span className="text-red-600">*</span></label>
                    <textarea id="editConfirmationScope" maxLength={2000} rows={4} value={confirmationScope} onChange={(event) => setConfirmationScope(event.target.value)} placeholder="예: 상하차 작업 위험성평가 및 안전조치" className={`${inputClassName} resize-y leading-6`} />
                  </div>
                </div>
              </details>
            ) : null}
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
            <div className="mt-5">
              <label className={labelClassName} htmlFor="representativeDepartment">소속 / 작업조</label>
              <input id="representativeDepartment" name="representativeDepartment" maxLength={200} autoComplete="organization-title" placeholder="예: 생산1팀 / 주간조" className={inputClassName} />
            </div>
            <details className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-bold text-slate-700">역할과 확인 일시는 자동 입력됩니다.</summary>
              <div className="mt-3 grid gap-4 border-t border-slate-200 pt-3 sm:grid-cols-2">
                <div>
                  <label className={labelClassName} htmlFor="representativeRole">직책 / 역할</label>
                  <input id="representativeRole" name="representativeRole" required maxLength={200} defaultValue="근로자대표" placeholder="예: 근로자대표, 작업조 대표" className={inputClassName} />
                </div>
                <div>
                  <label className={labelClassName} htmlFor="confirmedAt">확인 일시</label>
                  <input id="confirmedAt" name="confirmedAt" type="datetime-local" required defaultValue={confirmedAt} className={inputClassName} />
                </div>
              </div>
            </details>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">3</span>
              <div>
                <h2 className="text-lg font-black">확인 의견</h2>
                <p className="mt-1 text-sm text-slate-500">추가로 전달할 내용이 있는지만 선택해주세요.</p>
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className={labelClassName}>추가 의견 <span className="text-red-600">*</span></legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${!hasObjection ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600"}`}>
                  <input type="radio" name="hasObjection" value="false" checked={!hasObjection} onChange={() => setHasObjection(false)} className="mt-1 h-4 w-4 shrink-0 accent-blue-700" />
                  <span>
                    <span className="block text-sm font-black">별도 의견 없음</span>
                    <span className="mt-1 block text-xs font-medium leading-5">공유된 내용을 확인했고, 현재 추가 의견은 없습니다.</span>
                  </span>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${hasObjection ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-100" : "border-slate-200 bg-white text-slate-600"}`}>
                  <input type="radio" name="hasObjection" value="true" checked={hasObjection} onChange={() => setHasObjection(true)} className="mt-1 h-4 w-4 shrink-0 accent-amber-700" />
                  <span>
                    <span className="block text-sm font-black">보완 의견 있음</span>
                    <span className="mt-1 block text-xs font-medium leading-5">현장에서 보완하거나 다시 확인했으면 하는 내용이 있습니다.</span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className={`mt-5 rounded-2xl border p-4 ${hasObjection ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
              <label className={hasObjection ? "text-sm font-black text-amber-950" : labelClassName} htmlFor="opinion">
                {hasObjection ? "보완 의견" : "의견"} {hasObjection ? <span className="text-red-600">*</span> : <span className="font-medium text-slate-500">(선택)</span>}
              </label>
              <textarea id="opinion" name="opinion" required={hasObjection} maxLength={5000} rows={5} value={opinion} onChange={(event) => setOpinion(event.target.value)} placeholder={hasObjection ? "보완하거나 다시 확인했으면 하는 내용을 적어주세요." : "추가로 전달할 내용이 있다면 적어주세요."} className={`${inputClassName} resize-y leading-6 ${hasObjection ? "border-amber-300" : ""}`} />
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-600">예시를 누르면 보완 의견으로 선택되고 입력칸에 추가됩니다.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {opinionExamples.map((example) => (
                    <button key={example} type="button" onClick={() => addOpinionExample(example)} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800">
                      + {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-black text-white">4</span>
              <h2 className="text-lg font-black">개인정보 수집·이용 안내</h2>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              제출 내용 확인과 관리자 검토를 위해 입력한 정보를 기록합니다.
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
