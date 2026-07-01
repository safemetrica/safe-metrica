"use client";

import { useMemo, useState } from "react";
import HandwrittenSignaturePad from "./HandwrittenSignaturePad";

type RichiWorkerConfirmationFlowProps = {
  companyCode: string;
};

type FeedbackMode = "none" | "has";

const CONFIRMATION_ITEMS = [
  "개인위생 상태를 확인했습니다.",
  "위생복·장갑 등 필요한 보호구를 확인했습니다.",
  "이물혼입, 미끄럼, 절단·끼임 위험을 확인했습니다.",
];

const OPINION_TYPES = ["위생", "안전", "시설", "동선", "기타"];

function todayLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function buildDefaultContent(feedbackMode: FeedbackMode, opinionContent: string) {
  if (feedbackMode === "has") {
    return opinionContent.trim();
  }

  return "오늘 작업 전 확인사항을 읽고 확인했습니다. 별도 특이사항 없음.";
}

export default function RichiWorkerConfirmationFlow({ companyCode }: RichiWorkerConfirmationFlowProps) {
  const [step, setStep] = useState(1);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([false, false, false]);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>("none");
  const [opinionType, setOpinionType] = useState("위생");
  const [opinionTitle, setOpinionTitle] = useState("");
  const [opinionLocation, setOpinionLocation] = useState("");
  const [opinionContent, setOpinionContent] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerTeam, setWorkerTeam] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);

  const allChecked = checkedItems.every(Boolean);
  const hasOpinion = feedbackMode === "has";
  const identityReady = workerName.trim().length > 0 && workerTeam.trim().length > 0 && confirmCode.trim().length > 0;
  const opinionReady = !hasOpinion || opinionContent.trim().length > 0;
  const canSubmit = identityReady && opinionReady;

  const contentValue = useMemo(
    () => buildDefaultContent(feedbackMode, opinionContent),
    [feedbackMode, opinionContent]
  );

  const finalTitle = hasOpinion
    ? opinionTitle.trim() || "리치코리아 현장 특이사항"
    : "리치코리아 작업 전 확인기록";

  const finalLocation = hasOpinion
    ? opinionLocation.trim() || "식품가공 현장"
    : "식품가공 현장";

  function toggleCheck(index: number) {
    setCheckedItems((current) =>
      current.map((item, currentIndex) => (currentIndex === index ? !item : item))
    );
  }

  function goNextFromStep1() {
    if (!allChecked) return;
    setStep(2);
  }

  return (
    <main className="min-h-[100dvh] bg-white px-0 py-0 text-[#0B2742] sm:bg-[#EEF1F4] sm:px-3 sm:py-5">
      <form
        action="/api/field/participation/submit"
        method="post"
        encType="multipart/form-data"
        className="mx-auto flex min-h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white shadow-none sm:min-h-[calc(100dvh-40px)] sm:max-w-[430px] sm:rounded-[28px] sm:shadow-[0_18px_50px_rgba(11,39,66,0.14)]"
      >
        <input type="hidden" name="companyCode" value={companyCode} readOnly />
        <input type="hidden" name="submissionType" value={hasOpinion ? "quick_feedback" : "worker_qr_e_confirmation"} readOnly />
        <input type="hidden" name="confirmationType" value="food_factory_e_confirmation" readOnly />
        <input type="hidden" name="confirmation_type" value="food_factory_e_confirmation" readOnly />
        <input type="hidden" name="reportType" value={hasOpinion ? "개선제안" : "공유확인"} readOnly />
        <input type="hidden" name="type" value={hasOpinion ? opinionType : "공유확인"} readOnly />
        <input type="hidden" name="feedbackType" value={hasOpinion ? opinionType : "특이사항 없음"} readOnly />
        <input type="hidden" name="title" value={finalTitle} readOnly />
        <input type="hidden" name="reportTitle" value={finalTitle} readOnly />
        <input type="hidden" name="location" value={finalLocation} readOnly />
        <input type="hidden" name="content" value={contentValue} readOnly />
        <input type="hidden" name="submitter" value={workerName} readOnly />
        <input type="hidden" name="workerName" value={workerName} readOnly />
        <input type="hidden" name="department" value={workerTeam} readOnly />
        <input type="hidden" name="team" value={workerTeam} readOnly />
        <input type="hidden" name="workerTeam" value={workerTeam} readOnly />
        <input type="hidden" name="phoneLast4" value={confirmCode} readOnly />
        <input type="hidden" name="verificationCode" value={confirmCode} readOnly />
        <input type="hidden" name="workerPhoneLast4" value={confirmCode.replace(/\D/g, "").slice(0, 4)} readOnly />
        <input type="hidden" name="workerEmployeeNo" value={confirmCode} readOnly />
        <input type="hidden" name="identityMode" value="identified" readOnly />
        <input type="hidden" name="anonymous" value="false" readOnly />
        <input type="hidden" name="riskCheck" value={checkedItems[0] ? "true" : "false"} readOnly />
        <input type="hidden" name="riskAssessmentCheck" value={checkedItems[1] ? "true" : "false"} readOnly />
        <input type="hidden" name="safetyMeasureCheck" value={checkedItems[2] ? "true" : "false"} readOnly />
        <input type="hidden" name="source" value="richi_worker_confirmation_flow_v1" readOnly />
        <input type="hidden" name="siteName" value="식품가공 현장" readOnly />

        <header className="border-b border-[#E3E7EC] px-5 pb-4 pt-[max(18px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#EAF8F3] text-[#16A085]">
              <svg aria-hidden="true" viewBox="0 0 32 32" className="h-5 w-5" fill="none">
                <path d="M16 4.5c3.8 3.2 7.2 3.9 10.5 4.1v6.3c0 6.5-4.1 10.7-10.5 12.6C9.6 25.6 5.5 21.4 5.5 14.9V8.6C8.8 8.4 12.2 7.7 16 4.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M11.2 16.1l3.1 3.1 6.6-7.1" stroke="#0B2742" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-[13px] font-black leading-none text-[#0B2742]">SafeMetrica 세이프메트리카</p>
              <p className="mt-1 text-[11px] font-bold text-[#16A085]">(주)리치코리아 현장 QR</p>
            </div>
          </div>

          <h1 className="mt-4 text-[22px] font-black tracking-[-0.04em] text-[#0B2742]">
            작업 전 확인기록
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-[#64748B]">
            작업 전 확인사항을 확인하고 필요한 특이사항만 남겨주세요.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {["안내·확인", "특이사항·서명", "완료"].map((label, index) => {
              const itemStep = index + 1;
              const active = step === itemStep;
              const done = step > itemStep;

              return (
                <div key={label} className="min-w-0">
                  <div
                    className={[
                      "h-1.5 rounded-full",
                      active || done ? "bg-[#16A085]" : "bg-[#E3E7EC]",
                    ].join(" ")}
                  />
                  <p
                    className={[
                      "mt-2 truncate text-[11px] font-black",
                      active ? "text-[#0B2742]" : done ? "text-[#108469]" : "text-[#94A3B8]",
                    ].join(" ")}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-5">
          {step === 1 ? (
            <section>
              <p className="text-sm font-black text-[#64748B]">Step 1/3</p>
              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em] text-[#0B2742]">
                오늘 작업 전 확인사항
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-[#52606D]">
                내용을 확인한 뒤 아래 체크 항목을 완료해주세요.
              </p>

              <div className="mt-5 rounded-[20px] border border-[#BCE3D6] bg-[#EAF8F3] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black text-[#108469]">● 오늘 확인 요약</p>
                  <p className="shrink-0 text-xs font-bold text-[#64748B]">{todayLabel()}</p>
                </div>
                <h3 className="mt-3 text-[18px] font-black text-[#0B2742]">(주)리치코리아 식품가공 작업 전 확인</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#1C3A57]">
                  <li>· 손 씻기와 개인위생 상태를 확인해 주세요.</li>
                  <li>· 위생복·장갑 등 필요한 보호구 착용 상태를 확인해 주세요.</li>
                  <li>· 바닥 미끄럼, 절단·끼임, 이물혼입 위험을 작업 전 확인해 주세요.</li>
                </ul>
              </div>

              <div className="mt-4 rounded-[20px] border border-[#0B2742] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-[#0B2742] px-3 py-1 text-xs font-black text-white">
                    공유확인
                  </span>
                  <span className="text-xs font-bold text-[#64748B]">(주)리치코리아 확인기록</span>
                </div>
                <h3 className="mt-3 text-base font-black text-[#0B2742]">
                  작업 전 확인기록
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#3D5266]">
                  관리자가 공유한 작업 전 확인사항입니다. 본 화면은 회사 내부 확인기록으로 저장됩니다.
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm font-black text-[#0B2742]">아래 항목을 확인해주세요</p>
                <div className="mt-3 space-y-3">
                  {CONFIRMATION_ITEMS.map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleCheck(index)}
                      className={[
                        "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition",
                        checkedItems[index]
                          ? "border-[#16A085] bg-[#EAF8F3]"
                          : "border-[#E3E7EC] bg-white",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm font-black",
                          checkedItems[index]
                            ? "border-[#16A085] bg-[#16A085] text-white"
                            : "border-[#C7CFD8] bg-white text-transparent",
                        ].join(" ")}
                      >
                        ✓
                      </span>
                      <span className="text-[15px] font-black leading-6 text-[#0B2742]">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <p className="text-sm font-black text-[#64748B]">Step 2/3</p>
              <h2 className="mt-1 text-[24px] font-black tracking-[-0.04em] text-[#0B2742]">
                특이사항·확인서명
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-[#52606D]">
                작업 전 확인 중 특이사항이 있으면 확인기록에 함께 남겨주세요.
              </p>

              <div className="mt-5 grid grid-cols-2 rounded-full bg-[#EAF8F3] p-1">
                <button
                  type="button"
                  onClick={() => setFeedbackMode("none")}
                  className={[
                    "rounded-full px-4 py-3 text-sm font-black transition",
                    feedbackMode === "none" ? "bg-[#16A085] text-white" : "text-[#108469]",
                  ].join(" ")}
                >
                  특이사항 없음
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackMode("has")}
                  className={[
                    "rounded-full px-4 py-3 text-sm font-black transition",
                    feedbackMode === "has" ? "bg-[#0B2742] text-white" : "text-[#108469]",
                  ].join(" ")}
                >
                  특이사항 있음
                </button>
              </div>

              {hasOpinion ? (
                <div className="mt-5 rounded-[20px] border border-[#E3E7EC] bg-white p-4">
                  <label className="block text-sm font-black text-[#0B2742]">
                    특이사항 제목
                    <input
                      name="opinion_title_display"
                      value={opinionTitle}
                      onChange={(event) => setOpinionTitle(event.currentTarget.value)}
                      placeholder="예: 포장실 바닥이 미끄럽습니다"
                      className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
                    />
                  </label>

                  <div className="mt-4">
                    <p className="text-sm font-black text-[#0B2742]">유형</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {OPINION_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setOpinionType(type)}
                          className={[
                            "rounded-full border px-3 py-2 text-sm font-black",
                            opinionType === type
                              ? "border-[#0B2742] bg-[#0B2742] text-white"
                              : "border-[#E3E7EC] bg-white text-[#0B2742]",
                          ].join(" ")}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="mt-4 block text-sm font-black text-[#0B2742]">
                    위치
                    <input
                      name="opinion_location_display"
                      value={opinionLocation}
                      onChange={(event) => setOpinionLocation(event.currentTarget.value)}
                      placeholder="예: 포장실 입구 / 세척실 바닥"
                      className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
                    />
                  </label>

                  <label className="mt-4 block text-sm font-black text-[#0B2742]">
                    내용
                    <textarea
                      name="opinion_content_display"
                      value={opinionContent}
                      onChange={(event) => setOpinionContent(event.currentTarget.value)}
                      placeholder="특이사항 내용을 적어주세요"
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base leading-7 text-[#0B2742] outline-none focus:border-[#16A085]"
                    />
                  </label>

                  <label className="mt-4 block text-sm font-black text-[#0B2742]">
                    사진 첨부
                    <input
                      name="files"
                      type="file"
                      accept="image/*"
                      multiple
                      className="mt-2 w-full rounded-2xl border border-dashed border-[#C7CFD8] bg-white px-4 py-3 text-sm text-[#64748B]"
                    />
                  </label>


                </div>
              ) : (
                <div className="mt-5 rounded-[20px] border border-[#BCE3D6] bg-[#EAF8F3] p-4">
                  <h3 className="text-base font-black text-[#0B2742]">특이사항 없음</h3>
                  <p className="mt-2 text-sm leading-6 text-[#3D5266]">
                    특이사항이 없으면 확인기록으로 저장됩니다.
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-[20px] border border-[#E3E7EC] bg-white p-4">
                <h3 className="text-base font-black text-[#0B2742]">확인정보</h3>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">
                  이름, 소속, 확인번호가 필요합니다.
                </p>

                <label className="mt-4 block text-sm font-black text-[#0B2742]">
                  이름 또는 별칭 *
                  <input
                    name="worker_name_display"
                    value={workerName}
                    onChange={(event) => setWorkerName(event.currentTarget.value)}
                    placeholder="예: 홍길동"
                    className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
                  />
                </label>

                <label className="mt-4 block text-sm font-black text-[#0B2742]">
                  소속 또는 작업조 *
                  <input
                    name="worker_team_display"
                    value={workerTeam}
                    onChange={(event) => setWorkerTeam(event.currentTarget.value)}
                    placeholder="예: 포장팀 / 오전조"
                    className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
                  />
                </label>

                <label className="mt-4 block text-sm font-black text-[#0B2742]">
                  확인번호 *
                  <input
                    name="confirm_code_display"
                    value={confirmCode}
                    onChange={(event) => setConfirmCode(event.currentTarget.value)}
                    inputMode="numeric"
                    placeholder="휴대폰 뒷4자리 또는 사번"
                    className="mt-2 w-full rounded-2xl border border-[#E3E7EC] px-4 py-3 text-base text-[#0B2742] outline-none focus:border-[#16A085]"
                  />
                </label>

                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#E3E7EC] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(event) => setRememberDevice(event.currentTarget.checked)}
                    className="mt-1 h-5 w-5 accent-[#16A085]"
                  />
                  <span>
                    <span className="block text-sm font-black text-[#0B2742]">
                      이 기기에서 내 확인정보 기억하기
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#64748B]">
                      공용 휴대폰이면 체크하지 마세요. 현재 브라우저에만 저장됩니다.
                    </span>
                  </span>
                </label>
              </div>

              <HandwrittenSignaturePad enabled />

              {!canSubmit ? (
                <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#64748B]">
                  이름·소속·확인번호와 필요한 특이사항 내용을 입력하면 제출할 수 있습니다.
                </p>
              ) : null}
            </section>
          ) : null}

          {step === 3 ? (
            <section className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[#EAF8F3] text-5xl text-[#16A085]">
                ✓
              </div>
              <h2 className="mt-6 text-2xl font-black text-[#0B2742]">확인기록이 저장되었습니다</h2>
              <p className="mt-3 text-base leading-7 text-[#64748B]">
                현장 담당자가 확인 후 필요한 경우 조치합니다.
              </p>
            </section>
          ) : null}
        </div>

        <footer className="sticky bottom-0 border-t border-[#E3E7EC] bg-white/95 px-5 py-4 backdrop-blur">
          {step === 1 ? (
            <>
              <p
                className={[
                  "mb-3 text-center text-xs font-black",
                  allChecked ? "text-[#108469]" : "text-[#64748B]",
                ].join(" ")}
              >
                {allChecked ? "모두 확인했어요. 다음 단계로 진행할 수 있어요." : "3개 항목을 모두 확인하면 진행할 수 있어요."}
              </p>
              <button
                type="button"
                disabled={!allChecked}
                onClick={goNextFromStep1}
                className="w-full rounded-full bg-[#0B2742] px-5 py-4 text-base font-black text-white disabled:bg-[#C7CFD8] disabled:text-[#7A8795]"
              >
                다음 단계로
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-full bg-[#0B2742] px-5 py-4 text-base font-black text-white disabled:bg-[#C7CFD8] disabled:text-[#7A8795]"
              >
                {hasOpinion ? "확인기록 제출 →" : "특이사항 없음, 전자확인 제출 →"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-3 w-full rounded-full px-5 py-3 text-sm font-black text-[#64748B]"
              >
                이전 단계
              </button>
            </>
          ) : null}
        </footer>
      </form>
    </main>
  );
}
