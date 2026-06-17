"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";

type HomeRole = "worker" | "manager" | "ceo";

type RoleTask = {
  href?: string;
  disabled?: boolean;
  icon: string;
  title: string;
  description: string;
  status: string;
  badge?: string;
  accent: string;
  iconBg: string;
};

type RoleOption = {
  value: HomeRole;
  label: string;
  shortLabel: string;
};

type RoleContent = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  accent: string;
  tasks: RoleTask[];
};

type MenuItem = {
  href: string;
  icon: string;
  label: string;
  sub: string;
};

type HomeRoleShellProps = {
  initialRole: HomeRole;
  roleOptions: RoleOption[];
  roleContents: Record<HomeRole, RoleContent>;
  menus: MenuItem[];
  menuStatus: Record<string, string>;
  today: string;
  managerAction: ReactNode;
  roleExtras?: Partial<Record<HomeRole, ReactNode>>;
  children: ReactNode;
};

const menuAccentBorder: Record<string, string> = {
  "/tbm": "border-l-blue-500",
  "/field/voice": "border-l-emerald-500",
  "/ebm": "border-l-emerald-500",
  "/field": "border-l-teal-500",
  "/monthly-report": "border-l-sky-500",
  "/dashboard": "border-l-purple-500",
  "/risk": "border-l-red-500",
  "/ptw": "border-l-orange-500",
  "/inspection-education": "border-l-cyan-500",
  "/kosha": "border-l-amber-500",
};

export default function HomeRoleShell({
  initialRole,
  roleOptions,
  roleContents,
  menus,
  menuStatus,
  today,
  managerAction,
  roleExtras,
  children,
}: HomeRoleShellProps) {
  const [activeRole, setActiveRole] = useState<HomeRole>(initialRole);
  const activeRoleContent = roleContents[activeRole];
  const showSecondaryMenu = false;
  const primarySectionCopy: Record<HomeRole, { eyebrow: string; title: string; helper: string }> = {
    worker: {
      eyebrow: "작업 전 확인",
      title: "오늘 확인할 내용",
      helper: "작업 전 확인하고, 의견이 있으면 남겨 주세요.",
    },
    manager: {
      eyebrow: "현장 운영",
      title: "오늘 운영 확인",
      helper: "작성·접수·조치가 필요한 흐름을 먼저 확인합니다.",
    },
    ceo: {
      eyebrow: "운영 기록",
      title: "대표 운영 확인",
      helper: "미조치 신호, 제보·조치 흐름, 월별 자료를 먼저 확인합니다.",
    },
  };
  const primaryCopy = primarySectionCopy[activeRole];

  function handleRoleChange(nextRole: HomeRole) {
    setActiveRole(nextRole);

    const nextUrl = `/home?role=${nextRole}`;
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <>
      <nav className="border-b border-slate-800 bg-slate-950 px-4 py-3" aria-label="홈 역할 보기">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1.5 sm:flex sm:w-fit">
            {roleOptions.map((option) => {
              const isActive = option.value === activeRole;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRoleChange(option.value)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-black transition ${
                    isActive
                      ? "bg-white text-slate-950 shadow-lg"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            역할 보기는 홈 구성을 전환합니다. 실제 메뉴 이용 범위는 고객사와 사용자 권한 설정을 따릅니다.
          </p>
        </div>
      </nav>

      <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-5 lg:px-6 lg:py-7 ${showSecondaryMenu ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
        <aside className={showSecondaryMenu ? "hidden lg:block" : "hidden"} aria-label="전체 기능 보조 내비게이션">
          <div className="sticky top-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/10">
            <p className="text-xs font-black text-blue-300">2차 메뉴</p>
            <h2 className="mt-1 text-lg font-black">전체 기능</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">기존 조회·기록·보고 메뉴를 모두 이용할 수 있습니다.</p>
            <div className="mt-4 space-y-1.5">
              {menus.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`group flex items-center gap-3 rounded-xl border border-slate-800 border-l-4 px-3 py-2.5 transition hover:border-slate-700 hover:bg-slate-800 ${menuAccentBorder[menu.href] ?? "border-l-slate-700"}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg group-hover:bg-slate-700" aria-hidden="true">
                    {menu.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-200">{menu.label}</span>
                      {menuStatus[menu.href] ? (
                        <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
                          {menuStatus[menu.href]}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">{menu.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <section className={`rounded-3xl border bg-gradient-to-br p-5 shadow-2xl shadow-black/20 sm:p-6 ${activeRoleContent.accent}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-black text-slate-200">
                    {roleOptions.find((option) => option.value === activeRole)?.label}
                  </span>
                  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                    {activeRoleContent.badge}
                  </span>
                </div>
                <p className="mt-5 text-xs font-black tracking-wide text-blue-300">{activeRoleContent.eyebrow}</p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">{activeRoleContent.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{activeRoleContent.description}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 sm:text-right">
                <p className="text-xs font-semibold text-slate-500">오늘 기준</p>
                <p className="mt-1 text-sm font-bold text-slate-100">{today}</p>
              </div>
            </div>
          </section>

          <section className="mt-6" aria-labelledby="today-tasks-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black text-blue-300">{primaryCopy.eyebrow}</p>
                <h2 id="today-tasks-title" className="mt-1 text-xl font-black sm:text-2xl">{primaryCopy.title}</h2>
              </div>
              <p className="text-right text-xs leading-5 text-slate-500">{primaryCopy.helper}</p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {activeRoleContent.tasks.map((task) => {
                const cardContent = (
                  <>
                    <div className="flex items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${task.iconBg}`} aria-hidden="true">
                        {task.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-white">{task.title}</span>
                          {task.badge ? (
                            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-black text-slate-300">
                              {task.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-300">{task.description}</span>
                      </span>
                    </div>
                    <span className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <span className="text-xs font-bold text-slate-400">{task.status}</span>
                      <span className="text-sm font-black text-white transition group-hover:translate-x-0.5">
                        {task.disabled ? "관리자에게 링크 요청" : "확인하기 →"}
                      </span>
                    </span>
                  </>
                );

                return task.href && !task.disabled ? (
                  <Link key={task.title} href={task.href} className={`group rounded-2xl border border-l-4 p-4 transition hover:-translate-y-0.5 hover:border-white/30 ${task.accent}`}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={task.title} aria-disabled="true" className={`cursor-not-allowed rounded-2xl border border-l-4 p-4 opacity-70 ${task.accent}`}>
                    {cardContent}
                  </div>
                );
              })}
            </div>

            {activeRole === "manager" ? <div className="mt-3">{managerAction}</div> : null}
          </section>

          <details className={showSecondaryMenu ? "mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 lg:hidden" : "hidden"}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-xs font-black text-blue-300">2차 메뉴</span>
                <span className="mt-0.5 block font-black">전체 기능 보기</span>
              </span>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">열기</span>
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-3">
              {menus.map((menu) => (
                <Link key={menu.href} href={menu.href} className={`relative rounded-xl border border-slate-800 border-l-4 bg-slate-950/70 p-3 transition active:scale-[0.98] ${menuAccentBorder[menu.href] ?? "border-l-slate-700"}`}>
                  {menuStatus[menu.href] ? (
                    <span className="absolute right-2 top-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
                      {menuStatus[menu.href]}
                    </span>
                  ) : null}
                  <span className="text-2xl" aria-hidden="true">{menu.icon}</span>
                  <span className="mt-2 block text-sm font-black">{menu.label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">{menu.sub}</span>
                </Link>
              ))}
            </div>
          </details>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-xs leading-5 text-slate-400">
              현재 고객사의 실제 운영 환경입니다. 홈의 상태 문구는 완료 판정이 아니며 실제 기록과 처리 상태는 각 메뉴에서 확인하세요.
            </p>
          </div>

          {roleExtras?.[activeRole] ?? null}
          {children}
        </div>
      </div>
    </>
  );
}
