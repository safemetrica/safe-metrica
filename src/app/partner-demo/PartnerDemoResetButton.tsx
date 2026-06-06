"use client";

import { useState } from "react";
import { defaultDemoState, demoStateKey, writeDemoState } from "./demoState";

export default function PartnerDemoResetButton() {
  const [resetNoticeVisible, setResetNoticeVisible] = useState(false);

  const resetDemoState = () => {
    window.localStorage.removeItem(demoStateKey);
    writeDemoState(defaultDemoState);
    setResetNoticeVisible(true);
  };

  return (
    <div className="mt-2 flex flex-col items-center">
      <button
        type="button"
        onClick={resetDemoState}
        className="rounded-full px-3 py-1.5 text-[0.68rem] font-semibold text-slate-600 underline decoration-slate-700 underline-offset-4 transition-colors duration-300 hover:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 active:text-slate-300"
      >
        체험 초기화
      </button>
      {resetNoticeVisible && (
        <p role="status" className="mt-1 text-[0.68rem] font-semibold text-teal-400/80">
          체험 상태가 초기화되었습니다.
        </p>
      )}
    </div>
  );
}
