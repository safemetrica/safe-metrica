"use client";

import SignOutButton from "@/components/auth/SignOutButton";
import { Donut } from "@/app/risk-share/manager/charts";
import { AreaTrend, HorizontalBars } from "@/app/risk-share/monthly/charts";
import { useDashboardShellInteractions } from "@/components/risk-share/manager/useDashboardShellInteractions";

/**
 * Pure presentation component for /risk-share/monthly.
 * DOM structure, class names, and section order are a direct port of the
 * designer reference (monthly.html) and rely on the shared `.rsx-shell`
 * designer.css foundation. This component does no data fetching, auth, or
 * tenant logic of its own — every value is a prop supplied by the route.
 *
 * Sections without a real data source yet (month-over-month trend history,
 * reassessment candidates, activity notifications) accept optional props and
 * render an explicit no-data state when omitted, instead of designer sample
 * numbers.
 */

export type MonthlyKpiCounts = {
  monthly: number;
  prework: number;
  anonymous: number;
  visitor: number;
  representative: number;
  signatureConfirmed: number;
  signatureNotSubmitted: number;
};

export type MonthlyTrendPoint = {
  label: string;
  value: number;
};

export type MonthlyReassessmentCandidate = {
  icon: string;
  accent: "orange" | "blue" | "purple";
  title: string;
  detail: string;
  href: string;
};

export type MonthlyNotification = {
  icon: string;
  accent: "blue" | "orange" | "purple";
  title: string;
  detail: string;
  href: string;
};

export type MonthlyDesignerViewProps = {
  managerHref: string;
  monthlyHref: string;
  periodTitle: string;
  periodDescription: string;
  /** Short month label for the item-mix card subtitle, e.g. "7월". */
  monthLabel: string;
  todayLabel: string;
  userDisplayName: string;
  userEmail: string;
  avatarInitial: string;
  counts: MonthlyKpiCounts;
  /** Absent when no historical per-month aggregation exists yet. */
  monthlyTrend?: MonthlyTrendPoint[];
  /** Absent when no month-over-month comparison exists yet. */
  monthlyTrendDeltaLabel?: string;
  /** Absent when no reassessment-candidate computation exists yet. */
  reassessmentCandidates?: MonthlyReassessmentCandidate[];
  /** Absent when no activity-notification feed exists yet. */
  notifications?: MonthlyNotification[];
  /** Real last-5-month calendar labels (e.g. "3월".."7월"), computed by the route
   * via pure date math — used as the axis when no historical aggregation exists yet. */
  monthlyTrendFallbackLabels?: string[];
};

const DEFAULT_MONTHLY_TREND_LABELS = ["", "", "", "", ""];

function percentShare(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / total) * 100));
}

export default function MonthlyDesignerView({
  managerHref,
  monthlyHref,
  periodTitle,
  periodDescription,
  monthLabel,
  todayLabel,
  userDisplayName,
  userEmail,
  avatarInitial,
  counts,
  monthlyTrend,
  monthlyTrendDeltaLabel,
  reassessmentCandidates,
  notifications,
  monthlyTrendFallbackLabels,
}: MonthlyDesignerViewProps) {
  const totalCount =
    counts.monthly + counts.prework + counts.anonymous + counts.visitor + counts.representative;
  const hasMonthlyTrend = Boolean(monthlyTrend && monthlyTrend.length > 0);
  const monthlyTrendLabels = hasMonthlyTrend
    ? monthlyTrend!.map((point) => point.label)
    : monthlyTrendFallbackLabels ?? DEFAULT_MONTHLY_TREND_LABELS;
  const monthlyTrendValues = hasMonthlyTrend ? monthlyTrend!.map((point) => point.value) : [0, 0, 0, 0, 0];

  const {
    theme,
    toggleTheme,
    isSidebarOpen,
    isSidebarMini,
    handleSidebarToggleClick,
    closeSidebar,
    openDropdownId,
    toggleDropdown,
  } = useDashboardShellInteractions();

  return (
    <div className={`rsx-shell${isSidebarMini ? " sb-mini" : ""}`} data-theme={theme}>
      <div className="app">
        {/* ================= Sidebar ================= */}
        <aside className={`sidebar${isSidebarOpen ? " open" : ""}`}>
          <a className="sidebar__brand" href={managerHref} onClick={closeSidebar}>
            <img className="logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" />
            <img className="logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
            <img className="brand-mark" src="https://www.safemetrica.com/brand/safemetrica-logo-mark.svg" alt="" />
          </a>

          <nav className="sidebar__nav">
            <div className="nav__section">
              <div className="nav__label">개요</div>
              <a className="nav__item" href={managerHref} title="대시보드" onClick={closeSidebar}>
                <iconify-icon icon="lucide:layout-dashboard"></iconify-icon>
                <span className="nav__txt">대시보드</span>
              </a>
            </div>

            <div className="nav__section">
              <div className="nav__label">안전운영</div>
              <div className="nav__item is-disabled" title="위험성평가 공유확인">
                <iconify-icon icon="lucide:share-2"></iconify-icon>
                <span className="nav__txt">위험성평가 공유확인</span>
                <span className="nav__badge">{counts.monthly}</span>
              </div>
              <div className="nav__item is-disabled" title="작업 전 안전확인">
                <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                <span className="nav__txt">작업 전 안전확인</span>
                <span className="nav__badge">{counts.prework}</span>
              </div>
              <div className="nav__item is-disabled" title="익명 의견함">
                <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                <span className="nav__txt">익명 의견함</span>
                <span className="nav__badge">{counts.anonymous}</span>
              </div>
              <div className="nav__item is-disabled" title="외부인 확인">
                <iconify-icon icon="lucide:door-open"></iconify-icon>
                <span className="nav__txt">외부인 확인</span>
                <span className="nav__badge">{counts.visitor}</span>
              </div>
              <div className="nav__item is-disabled" title="근로자대표 확인">
                <iconify-icon icon="lucide:user-check"></iconify-icon>
                <span className="nav__txt">근로자대표 확인</span>
                <span className="nav__badge">{counts.representative}</span>
              </div>
              <a
                className="nav__item nav__item--featured is-active"
                href={monthlyHref}
                title="월간 안전운영 요약"
                onClick={closeSidebar}
              >
                <iconify-icon icon="lucide:calendar-check"></iconify-icon>
                <span className="nav__txt">월간 안전운영 요약</span>
              </a>
            </div>
          </nav>

          <div className="sidebar__foot">
            <div className="plan-card">
              <h4>
                <iconify-icon icon="lucide:crown"></iconify-icon> 위험성평가 공유팩
              </h4>
              <p>공유확인 · 참여확인 · 월간 운영요약 흐름을 제공합니다.</p>
            </div>
          </div>
        </aside>
        <div className={`overlay${isSidebarOpen ? " show" : ""}`} onClick={closeSidebar}></div>

        {/* ================= Main ================= */}
        <div className="main">
          <header className="header">
            <button
              className="iconbtn"
              id="sbToggle"
              aria-label={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isSidebarOpen}
              onClick={handleSidebarToggleClick}
            >
              <iconify-icon icon="lucide:menu"></iconify-icon>
            </button>
            <div className="header__spacer"></div>
            <div className="searchbox">
              <iconify-icon icon="lucide:search"></iconify-icon>
              <input type="text" placeholder="기간 · 항목 검색" />
            </div>
            <button className="iconbtn theme-toggle" aria-label="테마 전환" onClick={toggleTheme}>
              <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
              <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
            </button>
            <div className={`dd${openDropdownId === "notifications" ? " open" : ""}`}>
              <button
                className="iconbtn dd__btn"
                aria-label="알림"
                aria-haspopup="true"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleDropdown("notifications");
                }}
              >
                <iconify-icon icon="lucide:bell"></iconify-icon>
                {notifications && notifications.length > 0 ? <span className="dot"></span> : null}
              </button>
              <div className="dd__menu dd__menu--noti">
                <div className="dd__head">
                  알림{" "}
                  <span className="badge b-blue">
                    {notifications && notifications.length > 0 ? `${notifications.length}건` : "0건"}
                  </span>
                </div>
                {notifications && notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <a className="noti" href={notification.href} key={notification.title}>
                      <span className={`noti__ic i-${notification.accent}`}>
                        <iconify-icon icon={notification.icon}></iconify-icon>
                      </span>
                      <div>
                        <b>{notification.title}</b>
                        <span>{notification.detail}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <p style={{ color: "var(--text-3)", fontSize: "14px", padding: "10px 14px" }}>
                    표시할 알림이 없습니다.
                  </p>
                )}
              </div>
            </div>
            <div className={`dd${openDropdownId === "user" ? " open" : ""}`}>
              <button
                className="user-chip dd__btn"
                aria-haspopup="true"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleDropdown("user");
                }}
              >
                <div className="user-chip__av">{avatarInitial}</div>
                <div className="user-chip__meta">
                  <b>{userDisplayName}</b>
                  <span>안전관리자</span>
                </div>
                <iconify-icon icon="lucide:chevron-down" className="user-chip__cv"></iconify-icon>
              </button>
              <div className="dd__menu">
                <div className="dd__userhead">
                  <div className="user-chip__av">{avatarInitial}</div>
                  <div>
                    <b>{userDisplayName}</b>
                    <span>안전관리자 · {userEmail}</span>
                  </div>
                </div>
                <hr className="dd__sep" />
                <div className="dd__item dd__item--danger">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </header>

          <main className="content">
            <div className="page-head">
              <div>
                <h2>{periodTitle}</h2>
                <p>{periodDescription}</p>
              </div>
              <div className="page-head__actions">
                <div className="date-chip" aria-label="오늘 날짜">
                  <iconify-icon icon="lucide:calendar-days"></iconify-icon>
                  <b id="dateChipDate">{todayLabel}</b>
                </div>
                <a className="btn btn--outline" href={managerHref}>
                  <iconify-icon icon="lucide:arrow-left"></iconify-icon> 대시보드
                </a>
                <button className="btn btn--outline">
                  <iconify-icon icon="lucide:file-down"></iconify-icon> PDF
                </button>
                <button className="btn btn--primary">
                  <iconify-icon icon="lucide:printer"></iconify-icon> 요약 출력
                </button>
              </div>
            </div>

            {/* KPI 5 */}
            <section className="grid grid--stats">
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-blue">
                    <iconify-icon icon="lucide:share-2"></iconify-icon>
                  </div>
                  <span className="stat__trend flat">
                    <iconify-icon icon="lucide:minus"></iconify-icon> —
                  </span>
                </div>
                <div>
                  <div className="stat__label">위험성평가 공유확인</div>
                  <div className="stat__value">
                    {counts.monthly}
                    <small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: `${percentShare(counts.monthly, totalCount)}%`, background: "var(--c1)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-green">
                    <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                  </div>
                  <span className="stat__trend flat">
                    <iconify-icon icon="lucide:minus"></iconify-icon> —
                  </span>
                </div>
                <div>
                  <div className="stat__label">작업 전 안전확인</div>
                  <div className="stat__value">
                    {counts.prework}
                    <small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: `${percentShare(counts.prework, totalCount)}%`, background: "var(--c2)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-orange">
                    <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                  </div>
                  <span className="stat__trend flat">
                    <iconify-icon icon="lucide:minus"></iconify-icon> —
                  </span>
                </div>
                <div>
                  <div className="stat__label">익명 의견 · 아차사고</div>
                  <div className="stat__value">
                    {counts.anonymous}
                    <small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: `${percentShare(counts.anonymous, totalCount)}%`, background: "var(--c3)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-purple">
                    <iconify-icon icon="lucide:door-open"></iconify-icon>
                  </div>
                  <span className="stat__trend flat">
                    <iconify-icon icon="lucide:minus"></iconify-icon> —
                  </span>
                </div>
                <div>
                  <div className="stat__label">외부인 출입 전 확인</div>
                  <div className="stat__value">
                    {counts.visitor}
                    <small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: `${percentShare(counts.visitor, totalCount)}%`, background: "var(--c4)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-red">
                    <iconify-icon icon="lucide:user-check"></iconify-icon>
                  </div>
                  <span className="stat__trend warn">
                    <iconify-icon icon="lucide:signature"></iconify-icon> 서명 {counts.signatureConfirmed}/{counts.representative}
                  </span>
                </div>
                <div>
                  <div className="stat__label">근로자대표 확인 · 의견</div>
                  <div className="stat__value">
                    {counts.representative}
                    <small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: `${percentShare(counts.representative, totalCount)}%`, background: "var(--c5)" }}></span>
                </div>
              </article>
            </section>

            {/* 추이 + 비중 */}
            <section className="grid grid--dash mt-18">
              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>월별 안전운영 접수 추이</h3>
                    <small>최근 5개월 · 총 접수 건수</small>
                  </div>
                  <span className="badge b-gray">{monthlyTrendDeltaLabel ?? "데이터 없음"}</span>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "290px" }}>
                    <AreaTrend labels={monthlyTrendLabels} data={monthlyTrendValues} colorVar="--c1" />
                    {!hasMonthlyTrend ? (
                      <div className="donut-center">
                        <span style={{ fontSize: "14px", color: "var(--text-3)", padding: "0 24px" }}>
                          월별 추이 기록이 없습니다. 이번 달 집계부터 표시됩니다.
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>항목별 비중</h3>
                    <small>{monthLabel} 총 {totalCount}건</small>
                  </div>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "190px" }}>
                    <Donut
                      segments={[
                        { value: counts.monthly, colorVar: "--c1" },
                        { value: counts.prework, colorVar: "--c2" },
                        { value: counts.anonymous, colorVar: "--c3" },
                        { value: counts.visitor, colorVar: "--c4" },
                        { value: counts.representative, colorVar: "--c5" },
                      ]}
                    />
                    <div className="donut-center">
                      <b>{totalCount}</b>
                      <span>총 접수</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "16px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c1)" }}></span>공유확인<b>{counts.monthly}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>작업 전 확인<b>{counts.prework}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c3)" }}></span>익명 의견<b>{counts.anonymous}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c4)" }}></span>외부인 확인<b>{counts.visitor}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c5)" }}></span>근로자대표<b>{counts.representative}건</b>
                    </li>
                  </ul>
                </div>
              </article>
            </section>

            {/* 항목 상세 + 서명/재검토 후보 */}
            <section className="grid grid--dash mt-18">
              <article className="card card--pad">
                <div className="sec-title">
                  <iconify-icon icon="lucide:list-checks"></iconify-icon> 항목별 접수 상세
                </div>
                <div className="chart-wrap" style={{ height: "250px" }}>
                  <HorizontalBars
                    items={[
                      { label: "공유확인", value: counts.monthly, colorVar: "--c1" },
                      { label: "작업 전 확인", value: counts.prework, colorVar: "--c2" },
                      { label: "익명 의견", value: counts.anonymous, colorVar: "--c3" },
                      { label: "외부인 확인", value: counts.visitor, colorVar: "--c4" },
                      { label: "근로자대표", value: counts.representative, colorVar: "--c5" },
                    ]}
                  />
                </div>
                <p style={{ color: "var(--text-3)", fontSize: "14px", marginTop: "12px" }}>
                  막대에 마우스를 올리면 항목별 설명을 확인할 수 있습니다.
                </p>
              </article>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <article className="card card--pad">
                  <div className="sec-title">
                    <iconify-icon icon="lucide:signature"></iconify-icon> 근로자대표 서명
                  </div>
                  <div className="chart-wrap" style={{ height: "140px" }}>
                    <Donut
                      segments={[
                        { value: counts.signatureConfirmed, colorVar: "--c2" },
                        { value: counts.signatureNotSubmitted, colorVar: "--border-strong" },
                      ]}
                    />
                    <div className="donut-center">
                      <b style={{ fontSize: "22px" }}>
                        {counts.signatureConfirmed}/{counts.representative}
                      </b>
                      <span>서명 확인</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "14px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>서명 확인<b>{counts.signatureConfirmed}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--border-strong)" }}></span>선택 서명 미제출
                      <b>{counts.signatureNotSubmitted}건</b>
                    </li>
                  </ul>
                </article>

                <article className="card card--pad">
                  <div className="sec-title">
                    <iconify-icon icon="lucide:refresh-ccw"></iconify-icon> 다음 위험성평가 재검토 후보
                  </div>
                  <div className="action-need" style={{ marginTop: 0 }}>
                    {reassessmentCandidates && reassessmentCandidates.length > 0 ? (
                      reassessmentCandidates.map((candidate) => (
                        <a className="action-item" href={candidate.href} key={candidate.title}>
                          <span className={`action-item__ic i-${candidate.accent}`}>
                            <iconify-icon icon={candidate.icon}></iconify-icon>
                          </span>
                          <div>
                            <b>{candidate.title}</b>
                            <span>{candidate.detail}</span>
                          </div>
                          <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                        </a>
                      ))
                    ) : (
                      <div className="empty-state" style={{ padding: "10px 4px" }}>
                        <div className="empty-state__icon">
                          <iconify-icon icon="lucide:refresh-ccw"></iconify-icon>
                        </div>
                        <div className="empty-state__title">표시할 재검토 후보가 없습니다.</div>
                        <div className="empty-state__desc">
                          관리자 검토 과정에서 재검토가 필요한 항목이 분류되면 표시됩니다.
                        </div>
                      </div>
                    )}
                  </div>
                </article>

                <article
                  className="card card--pad"
                  style={{ background: "var(--info-bg)", borderColor: "color-mix(in srgb, var(--info) 25%, transparent)" }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    <iconify-icon
                      icon="lucide:info"
                      style={{ color: "var(--info)", fontSize: "19px", marginTop: "2px", flexShrink: 0 }}
                    ></iconify-icon>
                    <p style={{ fontSize: "14px", color: "var(--text-2)" }}>
                      본 화면은 운영기록을 정리하는 요약 화면이며, 최종 판단과 조치는 관리자와 사업주가 검토합니다.
                    </p>
                  </div>
                </article>
              </div>
            </section>

            {/*
              global footer는 src/app/layout.tsx의 RootLayout이 모든 라우트에 이미
              렌더링하므로, monthly.html의 <footer class="app-footer"> 섹션은 이
              direct port에서 의도적으로 생략합니다 (manager direct port와 동일한
              중복 생성 금지 지침 적용).
            */}
          </main>
        </div>
      </div>
    </div>
  );
}
