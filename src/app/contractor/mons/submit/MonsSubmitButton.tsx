"use client";

import { useFormStatus } from "react-dom";

export default function MonsSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-blue-700 px-4 py-5 text-base font-black text-white shadow-lg shadow-blue-900/20 transition active:scale-95 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "제출 중입니다..." : "제출하기"}
    </button>
  );
}
