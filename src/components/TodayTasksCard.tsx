import Link from "next/link";

interface Task {
  icon: string;
  text: string;
  href: string;
  urgent: boolean;
}

interface Props {
  tasks: Task[];
  limit?: number;
}

export default function TodayTasksCard({ tasks, limit = 3 }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-200">
          <span aria-hidden="true">✅</span>
          <span>오늘 추가로 확인할 운영 항목이 없습니다.</span>
        </div>
      </div>
    );
  }

  const visibleTasks = tasks.slice(0, limit);
  const remainingCount = Math.max(0, tasks.length - visibleTasks.length);

  return (
    <div>
      <div className="space-y-2">
        {visibleTasks.map((task) => (
          <Link
            key={`${task.href}-${task.text}`}
            href={task.href}
            className="block"
          >
            <div
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:bg-slate-800 ${
                task.urgent
                  ? "border-rose-500/35 bg-rose-500/10"
                  : "border-amber-500/25 bg-amber-500/10"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true">{task.icon}</span>
                <span className="text-sm font-medium leading-5 text-slate-100 [word-break:keep-all]">
                  {task.text}
                </span>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-400">
                확인 →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {remainingCount > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          외 {remainingCount}건은 관련 상세 메뉴에서 확인할 수 있습니다.
        </p>
      )}
    </div>
  );
}
