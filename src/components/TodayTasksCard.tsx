import Link from "next/link";

interface Task {
  icon: string;
  text: string;
  href: string;
  urgent: boolean;
}

interface Props {
  tasks: Task[];
}

export default function TodayTasksCard({ tasks }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="mb-4 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-xl ring-1 ring-emerald-100">
            ✅
          </span>
          <div>
            <h3 className="text-base font-black text-slate-950">오늘 할 일</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">조치·증빙·승인 확인</p>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          모든 항목 완료 — 오늘도 안전한 하루!
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-xl ring-1 ring-red-100">
            📌
          </span>
          <div>
            <h3 className="text-base font-black text-slate-950">오늘 할 일</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">오늘 처리해야 할 관리 항목</p>
          </div>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700 ring-1 ring-red-100">
          {tasks.length}건
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((t, i) => (
          <Link key={i} href={t.href} className="block">
            <div
              className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm ${
                t.urgent
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className={`text-sm font-black [word-break:keep-all] ${
                t.urgent ? "text-red-800" : "text-amber-800"
              }`}>
                {t.text}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
