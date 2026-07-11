import SignOutButton from "@/components/auth/SignOutButton";
import { Donut, StackedBars } from "@/app/risk-share/manager/charts";

/**
 * Pure presentation component for /risk-share/manager.
 * DOM structure, class names, and section order are a direct port of the
 * designer reference (docs/design/risk-share-ui-reference-2026-07-09/manager.html)
 * and rely on the shared `.rsx-shell` designer.css foundation. This component
 * does no data fetching, auth, or tenant logic of its own — every value is a
 * prop supplied by the route (src/app/risk-share/manager/page.tsx).
 *
 * Sections without a real data source yet (operations briefing, official
 * field reference info, day-by-day weekly trend, review-status aggregation,
 * recent-submission feed, safety resource feed) accept optional props and
 * render an explicit no-data state when omitted, instead of designer sample
 * numbers. The two chart sections (weekly trend, review status) still render
 * their real chart primitive (StackedBars / Donut) at an honest zero value so
 * the card doesn't collapse into a blank shell — same technique
 * MonthlyDesignerView already uses for its own no-data states.
 */

export type ManagerStatCounts = {
  monthly: number;
  prework: number;
  anonymous: number;
  visitor: number;
  representative: number;
};

export type ManagerRepresentativeSignature = {
  totalCount: number;
  signatureConfirmedCount: number;
  signatureNotSubmittedCount: number;
};

export type ManagerWeeklyTrendPoint = {
  label: string;
  monthly: number;
  prework: number;
  anonymous: number;
};

export type ManagerReviewStatusSegment = {
  label: string;
  value: number;
  colorVar: string;
};

export type ManagerRecentSubmission = {
  category: string;
  categoryBadgeClass: string;
  submitterLabel: string;
  detail: string;
  submittedAtLabel: string;
  statusLabel: string;
  statusBadgeClass: string;
};

export type ManagerSafetyResource = {
  title: string;
  sourceLabel: string;
  sourceClass: string;
  dateLabel: string;
  href: string;
};

export type ManagerDesignerViewProps = {
  companyLabel: string;
  managerHref: string;
  monthlyHref: string;
  fieldHref: string;
  monthLabel: string;
  todayLabel: string;
  counts: ManagerStatCounts;
  totalSubmissionCount: number;
  representative: ManagerRepresentativeSignature;
  userDisplayName: string;
  userEmail: string;
  avatarInitial: string;
  /** Absent when no operations-briefing source exists yet. */
  briefingSummary?: string[];
  /** Absent when no official field-reference source exists yet. */
  fieldReferenceSummary?: string[];
  /** Absent/empty when no day-by-day historical aggregation exists yet. */
  weeklyTrend?: ManagerWeeklyTrendPoint[];
  /** Absent/empty when no review-status aggregation exists yet. */
  reviewStatus?: ManagerReviewStatusSegment[];
  /** Absent/empty when no recent-submission feed exists yet. */
  recentSubmissions?: ManagerRecentSubmission[];
  /** Absent/empty when no safety-resource feed exists yet. */
  safetyResources?: ManagerSafetyResource[];
};

const EMPTY_WEEKLY_LABELS = ["", "", "", "", "", "", ""];
const EMPTY_WEEKLY_SERIES = [
  { colorVar: "--c1", data: [0, 0, 0, 0, 0, 0, 0] },
  { colorVar: "--c2", data: [0, 0, 0, 0, 0, 0, 0] },
  { colorVar: "--c3", data: [0, 0, 0, 0, 0, 0, 0] },
];

export default function ManagerDesignerView({
  companyLabel,
  managerHref,
  monthlyHref,
  fieldHref,
  monthLabel,
  todayLabel,
  counts,
  totalSubmissionCount,
  representative,
  userDisplayName,
  userEmail,
  avatarInitial,
  briefingSummary,
  fieldReferenceSummary,
  weeklyTrend,
  reviewStatus,
  recentSubmissions,
  safetyResources,
}: ManagerDesignerViewProps) {
  const hasWeeklyTrend = Boolean(weeklyTrend && weeklyTrend.length > 0);
  const weeklyLabels = hasWeeklyTrend ? weeklyTrend!.map((point) => point.label) : EMPTY_WEEKLY_LABELS;
  const weeklySeries = hasWeeklyTrend
    ? [
        { colorVar: "--c1", data: weeklyTrend!.map((point) => point.monthly) },
        { colorVar: "--c2", data: weeklyTrend!.map((point) => point.prework) },
        { colorVar: "--c3", data: weeklyTrend!.map((point) => point.anonymous) },
      ]
    : EMPTY_WEEKLY_SERIES;

  const hasReviewStatus = Boolean(reviewStatus && reviewStatus.length > 0);
  const reviewSegments = hasReviewStatus
    ? reviewStatus!.map((segment) => ({ value: segment.value, colorVar: segment.colorVar }))
    : [{ value: 0, colorVar: "--border-strong" }];

  const hasRecentSubmissions = Boolean(recentSubmissions && recentSubmissions.length > 0);
  const hasSafetyResources = Boolean(safetyResources && safetyResources.length > 0);

  return (
    <div className="rsx-shell" aria-label={`${companyLabel} 안전운영 대시보드`}>
      <div className="app">
        {/* ================= Sidebar ================= */}
        <aside className="sidebar">
          <a className="sidebar__brand" href={managerHref}>
            <img className="logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" />
            <img className="logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
            <img className="brand-mark" src="https://www.safemetrica.com/brand/safemetrica-logo-mark.svg" alt="" />
          </a>

          <nav className="sidebar__nav">
            <div className="nav__section">
              <div className="nav__label">개요</div>
              <a className="nav__item is-active" href={managerHref} title="대시보드">
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
              <a className="nav__item nav__item--featured" href={monthlyHref} title="월간 안전운영 요약">
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
        <div className="overlay"></div>

        {/* ================= Main ================= */}
        <div className="main">
          <header className="header">
            <button className="iconbtn" id="sbToggle" aria-label="메뉴 열기/닫기">
              <iconify-icon icon="lucide:menu"></iconify-icon>
            </button>
            <div className="header__spacer"></div>
            <div className="searchbox">
              <iconify-icon icon="lucide:search"></iconify-icon>
              <input type="text" placeholder="접수 · 근로자 검색" />
            </div>
            <button className="iconbtn theme-toggle" aria-label="테마 전환">
              <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
              <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
            </button>
            <div className="dd">
              <button className="iconbtn dd__btn" aria-label="알림" aria-haspopup="true">
                <iconify-icon icon="lucide:bell"></iconify-icon>
              </button>
              <div className="dd__menu dd__menu--noti">
                <div className="dd__head">알림</div>
                <p style={{ color: "var(--text-3)", fontSize: "14px", padding: "10px 14px" }}>
                  표시할 알림이 없습니다.
                </p>
              </div>
            </div>
            <div className="dd">
              <button className="user-chip dd__btn" aria-haspopup="true">
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
                <h2>위험성평가 공유확인 현황</h2>
                <p>현장 QR로 들어온 확인·의견 흐름을 한 화면에서 봅니다. 상단 5개 카드가 이번 달의 핵심입니다.</p>
              </div>
              <div className="page-head__actions">
                <div className="date-chip" aria-label="오늘 날짜">
                  <iconify-icon icon="lucide:calendar-days"></iconify-icon>
                  <b id="dateChipDate">{todayLabel}</b>
                </div>
                <a className="btn btn--primary" href={fieldHref}>
                  <iconify-icon icon="lucide:qr-code"></iconify-icon> 현장 QR 입구
                </a>
              </div>
            </div>

            {/* ① 핵심 5카드 — 이번 달 실제 접수 건수 */}
            <section className="grid grid--stats">
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-blue">
                    <iconify-icon icon="lucide:share-2"></iconify-icon>
                  </div>
                </div>
                <div>
                  <div className="stat__label">위험성평가 공유확인</div>
                  <div className="stat__value">
                    {counts.monthly}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark" aria-hidden="true"></div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-green">
                    <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                  </div>
                </div>
                <div>
                  <div className="stat__label">작업 전 안전확인</div>
                  <div className="stat__value">
                    {counts.prework}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark" aria-hidden="true"></div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-orange">
                    <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                  </div>
                </div>
                <div>
                  <div className="stat__label">익명 의견함</div>
                  <div className="stat__value">
                    {counts.anonymous}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark" aria-hidden="true"></div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-purple">
                    <iconify-icon icon="lucide:door-open"></iconify-icon>
                  </div>
                </div>
                <div>
                  <div className="stat__label">외부인 확인</div>
                  <div className="stat__value">
                    {counts.visitor}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark" aria-hidden="true"></div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-red">
                    <iconify-icon icon="lucide:user-check"></iconify-icon>
                  </div>
                </div>
                <div>
                  <div className="stat__label">근로자대표 확인</div>
                  <div className="stat__value">
                    {counts.representative}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark" aria-hidden="true"></div>
              </article>
            </section>

            {/* ② 월간 안전운영 요약 — 상단 고정 배너 */}
            <section className="monthly-banner mt-18">
              <span className="monthly-banner__ic">
                <iconify-icon icon="lucide:calendar-check"></iconify-icon>
              </span>
              <div className="monthly-banner__txt">
                <h3>{monthLabel} 안전운영 요약</h3>
                <p>이번 달 기록이 월간 운영기록으로 정리되고 있습니다</p>
              </div>
              <div className="monthly-banner__prog">
                <div className="monthly-banner__prog-top">
                  <span>접수 {totalSubmissionCount}건</span>
                </div>
              </div>
              <a className="btn btn--white" href={monthlyHref}>
                월간 요약 보기 <iconify-icon icon="lucide:arrow-right"></iconify-icon>
              </a>
            </section>

            {/* ③ 안전운영 브리핑 + 현장 참고정보 */}
            <section className="grid grid--dash mt-18">
              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>안전운영 브리핑</h3>
                  </div>
                </div>
                <div className="card__body">
                  {briefingSummary && briefingSummary.length > 0 ? (
                    <p style={{ fontSize: "14px" }}>
                      {briefingSummary.map((line, index) => (
                        <span key={index}>
                          {line}
                          {index < briefingSummary.length - 1 ? <br /> : null}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p style={{ color: "var(--text-3)", fontSize: "14px" }}>
                      아직 생성된 운영 브리핑이 없습니다.
                      <br />
                      현장 기록과 관리자 검토 결과가 쌓이면 이 영역에 정리됩니다.
                    </p>
                  )}
                </div>
              </article>

              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>현장 참고정보</h3>
                  </div>
                </div>
                <div className="card__body">
                  {fieldReferenceSummary && fieldReferenceSummary.length > 0 ? (
                    <p style={{ fontSize: "14px" }}>
                      {fieldReferenceSummary.map((line, index) => (
                        <span key={index}>
                          {line}
                          {index < fieldReferenceSummary.length - 1 ? <br /> : null}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p style={{ color: "var(--text-3)", fontSize: "14px" }}>
                      공식 참고정보 연결 전입니다.
                      <br />
                      사업장 위치와 공식 출처가 확인된 정보만 표시할 예정입니다.
                    </p>
                  )}
                </div>
              </article>
            </section>

            {/* ④ 최근 7일 흐름 + 처리 현황 */}
            <section className="grid grid--dash mt-18">
              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>최근 7일 접수 흐름</h3>
                    <small>일자별 · 항목 누적</small>
                  </div>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "290px" }}>
                    <StackedBars labels={weeklyLabels} series={weeklySeries} />
                    {!hasWeeklyTrend ? (
                      <div className="donut-center">
                        <span style={{ fontSize: "14px", color: "var(--text-3)" }}>
                          최근 7일 접수 기록이 없습니다.
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>처리 현황</h3>
                  </div>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "180px" }}>
                    <Donut segments={reviewSegments} />
                    <div className="donut-center">
                      {hasReviewStatus ? (
                        <>
                          <b>{reviewStatus!.reduce((sum, segment) => sum + segment.value, 0)}</b>
                          <span>전체</span>
                        </>
                      ) : (
                        <span style={{ fontSize: "13px", color: "var(--text-3)", padding: "0 10px" }}>
                          검토 상태 집계 기능이 준비되지 않았습니다.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </section>

            {/* ⑤ 최근 접수 + 서명/흐름 */}
            <section className="grid grid--dash mt-18">
              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>최근 접수 내역</h3>
                    <small>QR로 접수되어 관리자 검토 대기 중</small>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="table table--r">
                    <thead>
                      <tr>
                        <th>구분</th>
                        <th>제출자</th>
                        <th>내용</th>
                        <th>접수 시각</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasRecentSubmissions ? (
                        recentSubmissions!.map((row, index) => (
                          <tr key={index}>
                            <td>
                              <span className={`badge ${row.categoryBadgeClass}`}>{row.category}</span>
                            </td>
                            <td>{row.submitterLabel}</td>
                            <td>{row.detail}</td>
                            <td>{row.submittedAtLabel}</td>
                            <td>
                              <span className={`badge ${row.statusBadgeClass}`}>{row.statusLabel}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ color: "var(--text-3)", textAlign: "center" }}>
                            최근 접수된 운영기록이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <article className="card card--pad">
                  <div className="sec-title">
                    <iconify-icon icon="lucide:signature"></iconify-icon> 근로자대표 서명 현황
                  </div>
                  <div className="chart-wrap" style={{ height: "145px" }}>
                    <Donut
                      segments={[
                        { value: representative.signatureConfirmedCount, colorVar: "--c2" },
                        { value: representative.signatureNotSubmittedCount, colorVar: "--border-strong" },
                      ]}
                    />
                    <div className="donut-center">
                      <b style={{ fontSize: "23px" }}>
                        {representative.signatureConfirmedCount}/{representative.totalCount}
                      </b>
                      <span>서명 확인</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "16px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>서명 확인
                      <b>{representative.signatureConfirmedCount}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--border-strong)" }}></span>선택 서명 미제출
                      <b>{representative.signatureNotSubmittedCount}건</b>
                    </li>
                  </ul>
                </article>

                <article className="card card--pad">
                  <div className="sec-title">
                    <iconify-icon icon="lucide:workflow"></iconify-icon> 처리 흐름
                  </div>
                  <div className="timeline">
                    <div className="tl-item done">
                      <b>현장 QR 접수</b>
                      <span>근로자·외부인이 로그인 없이 참여</span>
                    </div>
                    <div className="tl-item done">
                      <b>관리자 검토</b>
                      <span>접수 내용 확인 및 조치</span>
                    </div>
                    <div className="tl-item">
                      <b>월간 안전운영 요약 반영</b>
                      <span>검토 완료 항목 자동 집계</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            {/* ⑥ 안전보건공단 자료 · 안전보건 뉴스 (게시판 성격 — 최하단) */}
            <section className="card mt-18">
              <div className="card__head">
                <div>
                  <h3>안전보건 자료 · 뉴스</h3>
                </div>
              </div>
              {hasSafetyResources ? (
                <div className="card__body res-grid" style={{ paddingTop: "8px", paddingBottom: "10px" }}>
                  {safetyResources!.map((resource, index) => (
                    <a className="res" href={resource.href} key={index}>
                      <span className={`res__ic ${resource.sourceClass === "src--kosha" ? "i-green" : "i-blue"}`}>
                        <iconify-icon
                          icon={resource.sourceClass === "src--kosha" ? "lucide:file-down" : "lucide:newspaper"}
                        ></iconify-icon>
                      </span>
                      <div className="res__main">
                        <b>{resource.title}</b>
                        <span>
                          <em className={`src ${resource.sourceClass}`}>{resource.sourceLabel}</em>
                          {resource.dateLabel}
                        </span>
                      </div>
                      <iconify-icon
                        icon={resource.sourceClass === "src--kosha" ? "lucide:download" : "lucide:external-link"}
                        className="res__go"
                      ></iconify-icon>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="card__body">
                  <p style={{ color: "var(--text-3)", fontSize: "14px" }}>
                    공식 안전보건 참고자료 연결 전입니다.
                  </p>
                </div>
              )}
            </section>

            {/*
              global footer는 src/app/layout.tsx의 RootLayout이 모든 라우트에 이미
              렌더링하므로, manager.html의 <footer class="app-footer"> 섹션은 이
              direct port에서 의도적으로 생략합니다 (중복 생성 금지 지침).
            */}
          </main>
        </div>
      </div>
    </div>
  );
}
