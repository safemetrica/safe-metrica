const TIMELINE_STEPS = [
  { title: "현장 QR 접수", description: "근로자·외부인이 로그인 없이 참여", done: true },
  { title: "관리자 검토", description: "접수 내용 확인 및 조치", done: true },
  { title: "월간 안전운영 요약 반영", description: "검토 완료 항목이 반영됩니다", done: false },
] as const;

export default function WorkflowTimelineCard() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
        <span aria-hidden="true">⇄</span> 처리 흐름
      </h3>

      <ol className="mt-3 space-y-4">
        {TIMELINE_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={
                step.done
                  ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white"
                  : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 text-[11px] font-black text-slate-400"
              }
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div>
              <p className="text-xs font-black text-slate-900">{step.title}</p>
              <p className="text-[11px] font-semibold text-slate-400">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
