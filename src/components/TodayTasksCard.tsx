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
      <div className="rounded-2xl border border-green-700 bg-green-950 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">✅</span>
          <span className="text-white font-bold text-sm">오늘 할 일</span>
        </div>
        <p className="text-green-300 text-sm">모든 항목 완료 — 오늘도 안전한 하루!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-700 bg-orange-950 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <span className="text-white font-bold text-sm">오늘 할 일</span>
        </div>
        <span className="text-orange-400 text-sm font-bold">{tasks.length}건</span>
      </div>
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <Link key={i} href={t.href} className="block">
            <div className={`rounded-lg p-3 flex items-center gap-2 hover:opacity-80 transition cursor-pointer ${t.urgent ? "bg-red-900/50 border border-red-700" : "bg-orange-900/40"}`}>
              <span>{t.icon}</span>
              <span className={`text-sm ${t.urgent ? "text-red-200 font-medium" : "text-orange-100"}`}>{t.text}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
