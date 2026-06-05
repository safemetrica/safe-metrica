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
    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-3">
      <button
        type="button"
        onClick={resetDemoState}
        className="min-h-11 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-black text-slate-300 shadow-sm transition-all duration-150 hover:border-slate-500 hover:bg-slate-800 active:scale-[0.98] active:translate-y-0.5"
      >
        체험 초기화
      </button>
      {resetNoticeVisible && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2">
          <p className="text-xs font-black text-amber-100">체험 상태가 초기화되었습니다.</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-300">실제 고객 DB에는 아무 영향이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
