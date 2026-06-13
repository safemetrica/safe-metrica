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
  mobileLimit?: number;
}

export default function TodayTasksCard({
  tasks,
  limit = 3,
  mobileLimit = 2,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 md:rounded-2xl md:p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-200">
          <span aria-hidden="true">✅</span>
          <span>오늘 추가로 확인할 운영 항목이 없습니다.</span>
        </div>
      </div>
    );
  }

  const visibleTasks = tasks.slice(0, limit);
  const mobileVisibleCount = Math.min(mobileLimit, visibleTasks.length);
  const mobileRemainingCount = Math.max(0, tasks.length - mobileVisibleCount);
  const remainingCount = Math.max(0, tasks.length - visibleTasks.length);

  return (
    <div>
      <div className="space-y-2">
        {visibleTasks.map((task, index) => (
          <Link
            key={`${task.href}-${task.text}`}
            href={task.href}
            className={
              index >= mobileVisibleCount ? "hidden md:block" : "block"
            }
          >
            <div
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition hover:bg-slate-800 md:gap-3 md:p-3 ${
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

      {mobileRemainingCount > 0 && (
        <p className="mt-2 text-xs text-slate-400 md:hidden">
          외 {mobileRemainingCount}건은 관련 상세 메뉴에서 확인할 수 있습니다.
        </p>
      )}
      {remainingCount > 0 && (
        <p className="mt-3 hidden text-xs text-slate-400 md:block">
          외 {remainingCount}건은 관련 상세 메뉴에서 확인할 수 있습니다.
        </p>
      )}
    </div>
  );
}
