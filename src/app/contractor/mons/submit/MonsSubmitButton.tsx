"use client";

import { useFormStatus } from "react-dom";

export default function MonsSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-cyan-500 px-4 py-5 text-base font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition active:scale-95 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "제출 중입니다..." : "원청 확인 요청하기"}
    </button>
  );
}
