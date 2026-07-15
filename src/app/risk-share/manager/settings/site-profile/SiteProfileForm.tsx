"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveSiteProfileAction, type SiteProfileActionState } from "./actions";

type SiteProfileFormProps = {
  companyCode: string;
  lang: string;
  managerHref: string;
  initialState: SiteProfileActionState;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn--primary" type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "저장 중" : "저장"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p style={{ marginTop: "8px", color: "var(--danger)", fontSize: "13px", fontWeight: 800 }}>{message}</p>;
}

export default function SiteProfileForm({ companyCode, lang, managerHref, initialState }: SiteProfileFormProps) {
  const action = saveSiteProfileAction.bind(null, companyCode, lang);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card card--pad" style={{ display: "grid", gap: "18px", maxWidth: "860px" }}>
      {state.formError ? (
        <div className="notice notice--warn" role="alert">
          {state.formError}
        </div>
      ) : null}

      <section style={{ display: "grid", gap: "14px" }}>
        <div>
          <h3>기본 정보</h3>
          <p className="muted">사업장명, 업종, 근로자 규모를 입력합니다.</p>
        </div>
        <label className="form-field">
          <span>사업장명</span>
          <input name="siteName" defaultValue={state.values.siteName} maxLength={160} required />
          <FieldError message={state.fieldErrors.siteName} />
        </label>
        <label className="form-field">
          <span>업종</span>
          <input name="industryProfile" defaultValue={state.values.industryProfile} maxLength={80} required />
          <FieldError message={state.fieldErrors.industryProfile} />
        </label>
        <label className="form-field">
          <span>근로자 규모</span>
          <input name="workerCountBand" defaultValue={state.values.workerCountBand} maxLength={40} required />
          <FieldError message={state.fieldErrors.workerCountBand} />
        </label>
      </section>

      <section style={{ display: "grid", gap: "14px" }}>
        <div>
          <h3>현장 운영 정보</h3>
          <p className="muted">쉼표 또는 줄바꿈으로 구분해 주세요.</p>
        </div>
        <label className="form-field">
          <span>주요 공정</span>
          <textarea name="majorProcesses" defaultValue={state.values.majorProcesses} rows={4} required />
          <FieldError message={state.fieldErrors.majorProcesses} />
        </label>
        <label className="form-field">
          <span>주요 설비</span>
          <textarea name="majorEquipment" defaultValue={state.values.majorEquipment} rows={4} required />
          <FieldError message={state.fieldErrors.majorEquipment} />
        </label>
      </section>

      <section style={{ display: "grid", gap: "14px" }}>
        <div>
          <h3>운영 여부</h3>
          <p className="muted">예 또는 아니오를 명시적으로 선택해 주세요.</p>
        </div>
        <fieldset className="form-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>외부 인력 운영 여부</legend>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
            <label><input type="radio" name="usesExternalWorkforce" value="yes" defaultChecked={state.values.usesExternalWorkforce === "yes"} /> 예</label>
            <label><input type="radio" name="usesExternalWorkforce" value="no" defaultChecked={state.values.usesExternalWorkforce === "no"} /> 아니오</label>
          </div>
          <FieldError message={state.fieldErrors.usesExternalWorkforce} />
        </fieldset>
        <fieldset className="form-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>근로자대표 운영 여부</legend>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
            <label><input type="radio" name="hasWorkerRepresentative" value="yes" defaultChecked={state.values.hasWorkerRepresentative === "yes"} /> 예</label>
            <label><input type="radio" name="hasWorkerRepresentative" value="no" defaultChecked={state.values.hasWorkerRepresentative === "no"} /> 아니오</label>
          </div>
          <FieldError message={state.fieldErrors.hasWorkerRepresentative} />
        </fieldset>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <a className="btn btn--outline" href={managerHref}>관리자 홈으로 돌아가기</a>
        <SubmitButton />
      </div>
    </form>
  );
}
