"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { useDashboardShellInteractions } from "./useDashboardShellInteractions";

type CustomerStatus = "확인 필요" | "처리 중" | "처리 기록 완료";
type WorkType = "공유확인" | "작업 전 안전확인" | "익명 의견" | "외부인 확인" | "근로자대표 확인";
type Period = "today" | "week" | "month";

type PreviewItem = {
  key: string;
  type: WorkType;
  status: CustomerStatus;
  title: string;
  summary: string;
  submittedBy: string;
  place: string;
  receivedAt: string;
  ageLabel: string;
  period: Period;
  attention: "overdue" | "action" | "normal" | "complete";
  note?: string;
};

const SYNTHETIC_PREVIEW_DATA: PreviewItem[] = [
  {
    key: "loading-zone-overdue",
    type: "익명 의견",
    status: "확인 필요",
    title: "상차 구역 통로 정리 요청",
    summary: "오후 작업 시간에 적재물이 통로 일부를 가리고 있어 확인을 요청했습니다.",
    submittedBy: "익명",
    place: "상차 구역",
    receivedAt: "7월 20일 15:40",
    ageLabel: "24시간 이상 대기",
    period: "week",
    attention: "overdue",
  },
  {
    key: "forklift-action",
    type: "작업 전 안전확인",
    status: "처리 중",
    title: "지게차 이동 동선 확인 필요",
    summary: "오전 입고 작업 전 보행자 통로와 지게차 이동 구간의 겹침 여부를 남겼습니다.",
    submittedBy: "현장 작업자",
    place: "자재 입고장",
    receivedAt: "오늘 08:35",
    ageLabel: "처리 중",
    period: "today",
    attention: "action",
    note: "현장 관리자가 이동 동선을 확인하고 있습니다.",
  },
  {
    key: "new-share-check",
    type: "공유확인",
    status: "확인 필요",
    title: "7월 위험성평가 내용 확인",
    summary: "이번 달 공유된 작업별 위험요인과 안전수칙을 확인했습니다.",
    submittedBy: "생산 1팀 작업자",
    place: "생산 1팀",
    receivedAt: "오늘 09:12",
    ageLabel: "새 업무",
    period: "today",
    attention: "normal",
  },
  {
    key: "visitor-check",
    type: "외부인 확인",
    status: "확인 필요",
    title: "설비 점검 방문자 안전확인",
    summary: "설비 점검 전 출입 안내와 기본 안전수칙을 확인했습니다.",
    submittedBy: "방문 작업자",
    place: "설비실",
    receivedAt: "오늘 10:05",
    ageLabel: "새 업무",
    period: "today",
    attention: "normal",
  },
  {
    key: "representative-review",
    type: "근로자대표 확인",
    status: "처리 중",
    title: "작업장 개선 의견 확인",
    summary: "근로자 의견 반영 여부와 다음 공유 일정을 확인하고 있습니다.",
    submittedBy: "근로자대표",
    place: "전 사업장",
    receivedAt: "7월 19일 14:20",
    ageLabel: "확인 진행 중",
    period: "week",
    attention: "normal",
  },
  {
    key: "completed-guard",
    type: "작업 전 안전확인",
    status: "처리 기록 완료",
    title: "고소작업 구역 출입 확인",
    summary: "작업 전 출입 제한선과 보호구 준비 여부를 확인했습니다.",
    submittedBy: "시설관리팀",
    place: "창고 2층",
    receivedAt: "7월 18일 07:55",
    ageLabel: "처리 기록 완료",
    period: "week",
    attention: "complete",
    note: "현장 확인 결과를 기록하고 담당자에게 안내했습니다.",
  },
  {
    key: "completed-visitor",
    type: "외부인 확인",
    status: "처리 기록 완료",
    title: "납품 차량 기사 안전확인",
    summary: "하역 위치와 차량 대기 구역 안내를 확인했습니다.",
    submittedBy: "납품 차량 기사",
    place: "하역장",
    receivedAt: "7월 16일 11:30",
    ageLabel: "처리 기록 완료",
    period: "week",
    attention: "complete",
  },
  {
    key: "older-share",
    type: "공유확인",
    status: "처리 기록 완료",
    title: "6월 작업별 안전수칙 확인",
    summary: "지난달 공유 내용의 확인 기록을 검토했습니다.",
    submittedBy: "포장팀 작업자",
    place: "포장 구역",
    receivedAt: "7월 2일 16:10",
    ageLabel: "처리 기록 완료",
    period: "month",
    attention: "complete",
  },
];

const TYPE_OPTIONS: Array<"전체 유형" | WorkType> = [
  "전체 유형",
  "공유확인",
  "작업 전 안전확인",
  "익명 의견",
  "외부인 확인",
  "근로자대표 확인",
];
const STATUS_OPTIONS: Array<"전체 상태" | CustomerStatus> = ["전체 상태", "확인 필요", "처리 중", "처리 기록 완료"];

const TYPE_ICON: Record<WorkType, string> = {
  공유확인: "lucide:share-2",
  "작업 전 안전확인": "lucide:clipboard-check",
  "익명 의견": "lucide:message-circle-question",
  "외부인 확인": "lucide:door-open",
  "근로자대표 확인": "lucide:user-check",
};

const STATUS_CLASS: Record<CustomerStatus, string> = {
  "확인 필요": "b-orange",
  "처리 중": "b-blue",
  "처리 기록 완료": "b-green",
};

const PERIOD_RANK: Record<Period, number> = { today: 0, week: 1, month: 2 };

function WorkDetail({ item, mobile, onBack }: { item: PreviewItem; mobile?: boolean; onBack?: () => void }) {
  return (
    <section className={`workspace-detail${mobile ? " workspace-detail--mobile" : ""}`} aria-label="선택한 업무 상세">
      {mobile ? (
        <button className="workspace-back" type="button" onClick={onBack}>
          <iconify-icon icon="lucide:arrow-left"></iconify-icon>
          접수 목록
        </button>
      ) : null}

      <div className="workspace-detail__head">
        <div>
          <span className="workspace-type">
            <iconify-icon icon={TYPE_ICON[item.type]}></iconify-icon>
            {item.type}
          </span>
          <h2>{item.title}</h2>
        </div>
        <span className={`badge ${STATUS_CLASS[item.status]}`}>{item.status}</span>
      </div>

      {item.attention === "overdue" ? (
        <div className="workspace-alert workspace-alert--danger">
          <iconify-icon icon="lucide:clock-alert"></iconify-icon>
          <div><b>24시간 이상 대기 중입니다.</b><span>법정기한이나 위험도 표시가 아니라 접수 후 경과시간 안내입니다.</span></div>
        </div>
      ) : item.attention === "action" ? (
        <div className="workspace-alert workspace-alert--warning">
          <iconify-icon icon="lucide:triangle-alert"></iconify-icon>
          <div><b>처리가 진행 중입니다.</b><span>현재 진행 상황과 남길 기록을 확인해 주세요.</span></div>
        </div>
      ) : null}

      <dl className="workspace-facts">
        <div><dt>접수 시각</dt><dd>{item.receivedAt}</dd></div>
        <div><dt>보낸 사람</dt><dd>{item.submittedBy}</dd></div>
        <div><dt>관련 장소</dt><dd>{item.place}</dd></div>
        <div><dt>현재 상태</dt><dd>{item.status}</dd></div>
      </dl>

      <div className="workspace-detail__section">
        <h3>접수 내용</h3>
        <p>{item.summary}</p>
      </div>

      <div className="workspace-detail__section">
        <h3>관리자 메모</h3>
        <p>{item.note ?? "아직 작성된 메모가 없습니다."}</p>
      </div>

      <div className="workspace-next-action" aria-label="고객용 행동명 미리보기">
        <div>
          <span className="eyebrow">다음 행동</span>
          <p>고객 화면에서는 <b>확인 시작</b>과 <b>처리 기록 완료</b>라는 말을 사용합니다.</p>
          <small>접수함 처리 기록을 완료하는 기능이며, 안전조치의 적정성이나 법적 종결을 확정하지 않습니다.</small>
        </div>
        <div className="workspace-next-action__buttons">
          <button className="btn btn--outline" type="button" disabled>확인 시작</button>
          <button className="btn btn--primary" type="button" disabled>처리 기록 완료</button>
        </div>
      </div>
    </section>
  );
}

export default function ManagerInboxCustomerWorkspacePreview() {
  const {
    theme,
    toggleTheme,
    isSidebarOpen,
    isSidebarMini,
    handleSidebarToggleClick,
    closeSidebar,
  } = useDashboardShellInteractions();
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>("전체 유형");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("전체 상태");
  const [periodFilter, setPeriodFilter] = useState<Period>("month");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(SYNTHETIC_PREVIEW_DATA[0].key);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [moreRequested, setMoreRequested] = useState(false);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return SYNTHETIC_PREVIEW_DATA.filter((item) => {
      const periodMatches = PERIOD_RANK[item.period] <= PERIOD_RANK[periodFilter];
      const typeMatches = typeFilter === "전체 유형" || item.type === typeFilter;
      const statusMatches = statusFilter === "전체 상태" || item.status === statusFilter;
      const queryMatches = !normalizedQuery || `${item.title} ${item.summary} ${item.place}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
      return periodMatches && typeMatches && statusMatches && queryMatches;
    });
  }, [periodFilter, query, statusFilter, typeFilter]);

  const selectedItem = filteredItems.find((item) => item.key === selectedKey) ?? filteredItems[0] ?? SYNTHETIC_PREVIEW_DATA[0];

  function selectItem(key: string) {
    setSelectedKey(key);
    setMobileDetailOpen(true);
  }

  function resetFilters() {
    setTypeFilter("전체 유형");
    setStatusFilter("전체 상태");
    setPeriodFilter("month");
    setQuery("");
  }

  const summaryCards = [
    { label: "오늘 새로 들어온 업무", value: 6, icon: "lucide:sparkles", color: "i-blue" },
    { label: "확인할 업무", value: 12, icon: "lucide:inbox", color: "i-orange" },
    { label: "조치가 필요한 업무", value: 5, icon: "lucide:triangle-alert", color: "i-purple" },
    { label: "지연된 업무", value: 3, icon: "lucide:clock-alert", color: "i-red" },
    { label: "완료된 업무", value: 24, icon: "lucide:circle-check-big", color: "i-green" },
  ];

  return (
    <div className={`rsx-shell manager-workspace-preview${isSidebarMini ? " sb-mini" : ""}`} data-theme={theme}>
      <div className="app">
        <aside className={`sidebar${isSidebarOpen ? " open" : ""}`}>
          <button className="sidebar__brand" type="button" onClick={closeSidebar} aria-label="SafeMetrica 관리자 홈">
            <Image className="logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" width={1618} height={383} priority />
            <Image className="logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" width={1618} height={383} />
            <Image className="brand-mark" src="/brand/safemetrica-logo-mark.svg" alt="" width={256} height={256} />
          </button>

          <nav className="sidebar__nav" aria-label="고객사 관리자 메뉴">
            <div className="nav__section">
              <div className="nav__label">개요</div>
              <button className="nav__item" type="button" onClick={closeSidebar}>
                <iconify-icon icon="lucide:layout-dashboard"></iconify-icon>
                <span className="nav__txt">대시보드</span>
              </button>
            </div>
            <div className="nav__section">
              <div className="nav__label">안전운영</div>
              <button className="nav__item is-active" type="button" onClick={closeSidebar}>
                <iconify-icon icon="lucide:inbox"></iconify-icon>
                <span className="nav__txt">관리자 접수함</span>
                <span className="nav__badge">12</span>
              </button>
              <button className="nav__item" type="button" onClick={closeSidebar}>
                <iconify-icon icon="lucide:share-2"></iconify-icon>
                <span className="nav__txt">공유 내용 관리</span>
              </button>
              <button className="nav__item nav__item--featured" type="button" onClick={closeSidebar}>
                <iconify-icon icon="lucide:calendar-check"></iconify-icon>
                <span className="nav__txt">월간 안전운영 요약</span>
              </button>
            </div>
          </nav>

          <div className="sidebar__foot">
            <div className="workspace-role-card">
              <span>현재 사용자</span>
              <b>고객사 관리자</b>
              <p>현장 접수를 확인하고 처리 흐름을 관리합니다.</p>
            </div>
          </div>
        </aside>
        <div className={`overlay${isSidebarOpen ? " show" : ""}`} onClick={closeSidebar}></div>

        <div className="main">
          <header className="header">
            <button
              className="iconbtn"
              type="button"
              aria-label={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isSidebarOpen}
              onClick={handleSidebarToggleClick}
            >
              <iconify-icon icon="lucide:menu"></iconify-icon>
            </button>
            <div className="workspace-breadcrumb" aria-label="현재 위치">
              <span>안전운영</span><iconify-icon icon="lucide:chevron-right"></iconify-icon><b>관리자 접수함</b>
            </div>
            <div className="header__spacer"></div>
            <button className="iconbtn theme-toggle" type="button" aria-label="테마 전환" onClick={toggleTheme}>
              <iconify-icon icon="lucide:sun" className="sun"></iconify-icon>
              <iconify-icon icon="lucide:moon" className="moon"></iconify-icon>
            </button>
            <div className="user-chip" aria-label="현재 사용자 고객사 관리자">
              <div className="user-chip__av">관</div>
              <div className="user-chip__meta"><b>안전 담당자</b><span>고객사 관리자</span></div>
            </div>
          </header>

          <main className="content">
            <div className="workspace-preview-label">
              <iconify-icon icon="lucide:flask-conical"></iconify-icon>
              합성 데이터로 구성한 화면 구조 미리보기 · 어떤 정보도 저장되지 않습니다
            </div>

            <div className="page-head">
              <div>
                <p className="workspace-site-label">미리보기 사업장 · 고객사 관리자</p>
                <h1>관리자 접수함</h1>
                <p>오늘 들어온 현장 업무와 우선 확인할 항목을 한곳에서 관리합니다.</p>
              </div>
              <div className="workspace-status-guide" aria-label="고객용 상태 안내">
                <span>상태 기준</span>
                <b className="b-orange">확인 필요</b>
                <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                <b className="b-blue">처리 중</b>
                <iconify-icon icon="lucide:arrow-right"></iconify-icon>
                <b className="b-green">처리 기록 완료</b>
              </div>
            </div>

            <section className="workspace-summary" aria-label="오늘의 업무 요약">
              {summaryCards.map((card) => (
                <button className="workspace-summary__card" type="button" key={card.label}>
                  <span className={`stat__icon ${card.color}`}><iconify-icon icon={card.icon}></iconify-icon></span>
                  <span><small>{card.label}</small><strong>{card.value}<em>건</em></strong></span>
                </button>
              ))}
            </section>

            <section className="workspace-filter card" aria-label="접수함 필터">
              <div className="workspace-filter__search">
                <iconify-icon icon="lucide:search"></iconify-icon>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="업무 내용·장소 검색" aria-label="업무 검색" />
              </div>
              <label><span>유형</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as (typeof TYPE_OPTIONS)[number])}>{TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span>상태</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span>기간</span><select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as Period)}><option value="today">오늘</option><option value="week">최근 7일</option><option value="month">최근 30일</option></select></label>
              <button className="btn btn--outline btn--sm" type="button" onClick={resetFilters}>초기화</button>
            </section>

            <div className={`workspace-mobile-stage${mobileDetailOpen ? " is-detail" : ""}`}>
              <section className="workspace-board card" aria-label="처리할 업무 목록과 상세">
                <div className="workspace-list-column">
                  <div className="workspace-list-head">
                    <div><h2>처리할 업무</h2><p>24시간 이상 대기 → 처리 중 → 확인 필요 → 최근 완료 순서</p></div>
                    <span>{filteredItems.length}건 표시</span>
                  </div>
                  <div className="workspace-list" aria-live="polite">
                    {filteredItems.length ? filteredItems.map((item) => (
                      <button
                        className={`workspace-list-item${selectedItem.key === item.key ? " is-selected" : ""}`}
                        type="button"
                        key={item.key}
                        onClick={() => selectItem(item.key)}
                      >
                        <span className={`workspace-priority workspace-priority--${item.attention}`} aria-hidden="true"></span>
                        <span className="workspace-list-item__main">
                          <span className="workspace-list-item__top">
                            <span className="workspace-type"><iconify-icon icon={TYPE_ICON[item.type]}></iconify-icon>{item.type}</span>
                            <span className={`badge ${STATUS_CLASS[item.status]}`}>{item.status}</span>
                          </span>
                          <b>{item.title}</b>
                          <span className="workspace-list-item__meta">{item.place} · {item.receivedAt}</span>
                          <span className={`workspace-age workspace-age--${item.attention}`}>{item.ageLabel}</span>
                        </span>
                        <iconify-icon className="workspace-list-item__go" icon="lucide:chevron-right"></iconify-icon>
                      </button>
                    )) : (
                      <div className="workspace-empty"><iconify-icon icon="lucide:inbox"></iconify-icon><b>조건에 맞는 업무가 없습니다.</b><button type="button" onClick={resetFilters}>필터 초기화</button></div>
                    )}
                  </div>
                  <div className="workspace-more">
                    <button className="btn btn--outline" type="button" onClick={() => setMoreRequested(true)} disabled={moreRequested}>
                      {moreRequested ? "추가 업무를 불러온 상태입니다" : "다음 30건 보기"}
                    </button>
                    <span>한 번에 최대 30건씩 추가합니다.</span>
                  </div>
                </div>

                <div className="workspace-desktop-detail">
                  <WorkDetail item={selectedItem} />
                </div>
              </section>

              <div className="workspace-mobile-detail">
                <WorkDetail item={selectedItem} mobile onBack={() => setMobileDetailOpen(false)} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
