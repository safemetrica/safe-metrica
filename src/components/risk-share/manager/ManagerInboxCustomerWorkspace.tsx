"use client";

import Image from "next/image";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { useDashboardShellInteractions } from "./useDashboardShellInteractions";

export type InboxWorkspaceType = "monthly" | "prework" | "anonymous" | "visitor" | "representative";
export type InboxWorkspaceStatus = "unreviewed" | "in_review" | "completed";
export type InboxWorkspaceAttention = "overdue" | "action" | "normal" | "complete";

export type InboxWorkspaceItem = {
  id: string;
  type: InboxWorkspaceType;
  title: string;
  content: string;
  location: string;
  submitterLabel: string;
  createdAtLabel: string;
  status: InboxWorkspaceStatus;
  actionNote: string;
  canTransition: boolean;
  attention: InboxWorkspaceAttention;
  ageLabel: string;
};

export type InboxWorkspaceAuditEvent = {
  id: string;
  fromStatus: InboxWorkspaceStatus;
  toStatus: InboxWorkspaceStatus;
  actionNote: string;
  createdAtLabel: string;
};

type SummaryCounts = {
  today: number;
  unreviewed: number;
  inReview: number;
  overdue: number;
  completed: number;
};

type Props = {
  companyLabel: string;
  companyCode: string;
  managerHref: string;
  monthlyHref: string;
  baseHref: string;
  items: InboxWorkspaceItem[];
  selectedItem: InboxWorkspaceItem | null;
  auditEvents: InboxWorkspaceAuditEvent[];
  auditEventsFailed: boolean;
  summaryCounts: SummaryCounts;
  selectedType: InboxWorkspaceType | "all";
  selectedStatus: InboxWorkspaceStatus | "all";
  selectedPeriod: "today" | "week" | "month";
  queryText: string;
  mobileDetailInitiallyOpen: boolean;
  resultMessage?: string;
  resultTone?: "success" | "warning";
  updateReviewAction: (formData: FormData) => void | Promise<void>;
};

const TYPE_LABEL: Record<InboxWorkspaceType, string> = {
  monthly: "위험성평가 공유확인",
  prework: "작업 전 안전확인",
  anonymous: "익명 의견",
  visitor: "외부인 확인",
  representative: "근로자대표 확인",
};

const TYPE_ICON: Record<InboxWorkspaceType, string> = {
  monthly: "lucide:share-2",
  prework: "lucide:clipboard-check",
  anonymous: "lucide:message-circle-question",
  visitor: "lucide:door-open",
  representative: "lucide:user-check",
};

const STATUS_LABEL: Record<InboxWorkspaceStatus, string> = {
  unreviewed: "확인 필요",
  in_review: "처리 중",
  completed: "처리 기록 완료",
};

const STATUS_CLASS: Record<InboxWorkspaceStatus, string> = {
  unreviewed: "b-orange",
  in_review: "b-blue",
  completed: "b-green",
};

function buildItemHref(
  baseHref: string,
  itemId: string,
  filters: Pick<Props, "selectedType" | "selectedStatus" | "selectedPeriod" | "queryText">,
) {
  const url = new URL(baseHref, "https://safemetrica.invalid");
  url.searchParams.set("type", filters.selectedType);
  url.searchParams.set("status", filters.selectedStatus);
  url.searchParams.set("period", filters.selectedPeriod);
  if (filters.queryText) url.searchParams.set("q", filters.queryText);
  url.searchParams.set("id", itemId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function ReviewSubmitButton({ status }: { status: "unreviewed" | "in_review" }) {
  const { pending } = useFormStatus();
  const isStarting = status === "unreviewed";

  return (
    <button className="btn btn--primary workspace-action-submit" type="submit" disabled={pending}>
      <iconify-icon icon={pending ? "lucide:loader-circle" : isStarting ? "lucide:play" : "lucide:check"}></iconify-icon>
      {pending ? "저장 중…" : isStarting ? "확인 시작" : "처리 기록 완료"}
    </button>
  );
}

function WorkDetail({
  item,
  auditEvents,
  auditEventsFailed,
  companyCode,
  managerHref,
  updateReviewAction,
  mobile,
  onBack,
}: {
  item: InboxWorkspaceItem;
  auditEvents: InboxWorkspaceAuditEvent[];
  auditEventsFailed: boolean;
  companyCode: string;
  managerHref: string;
  updateReviewAction: Props["updateReviewAction"];
  mobile?: boolean;
  onBack?: () => void;
}) {
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
          <span className="workspace-type"><iconify-icon icon={TYPE_ICON[item.type]}></iconify-icon>{TYPE_LABEL[item.type]}</span>
          <h2>{item.title}</h2>
        </div>
        <span className={`badge ${STATUS_CLASS[item.status]}`}>{STATUS_LABEL[item.status]}</span>
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
        <div><dt>접수 시각</dt><dd>{item.createdAtLabel}</dd></div>
        <div><dt>보낸 사람</dt><dd>{item.submitterLabel}</dd></div>
        <div><dt>관련 장소</dt><dd>{item.location || "미입력"}</dd></div>
        <div><dt>현재 상태</dt><dd>{STATUS_LABEL[item.status]}</dd></div>
      </dl>

      <div className="workspace-detail__section">
        <h3>접수 내용</h3>
        <p>{item.content || "작성된 내용이 없습니다."}</p>
      </div>

      <div className="workspace-detail__section">
        <h3>관리자 메모</h3>
        <p>{item.actionNote || "아직 작성된 메모가 없습니다."}</p>
      </div>

      <section className="workspace-history" aria-label="처리 이력">
        <h3>처리 이력</h3>
        {auditEventsFailed ? (
          <p className="workspace-history__notice workspace-history__notice--warning">처리 이력을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p>
        ) : auditEvents.length ? (
          <ol>{auditEvents.map((event) => (
            <li key={event.id}>
              <div><strong>{STATUS_LABEL[event.fromStatus]} → {STATUS_LABEL[event.toStatus]}</strong><span>{event.createdAtLabel}</span></div>
              {event.actionNote ? <p>{event.actionNote}</p> : null}
            </li>
          ))}</ol>
        ) : (
          <p className="workspace-history__notice">아직 기록된 상태 변경이 없습니다.</p>
        )}
      </section>

      {item.type === "monthly" ? (
        item.canTransition ? (
          <div className="workspace-next-action">
            <div><span className="eyebrow">다음 행동</span><p>공유확인 검토 화면에서 기존 처리 흐름을 이어갑니다.</p></div>
            <a className="btn btn--primary workspace-action-submit" href={`${managerHref}#confirmation-review`}>
              <iconify-icon icon="lucide:arrow-right"></iconify-icon>검토·처리 계속
            </a>
          </div>
        ) : (
          <p className="workspace-history__notice workspace-history__notice--warning">이 공유확인 기록은 현재 상태 변경 대상이 아닙니다.</p>
        )
      ) : item.status !== "completed" ? (
        <form action={updateReviewAction} className="workspace-action-card">
          <input type="hidden" name="companyCode" value={companyCode} />
          <input type="hidden" name="submissionId" value={item.id} />
          <input type="hidden" name="expectedStatus" value={item.status} />
          <input type="hidden" name="nextStatus" value={item.status === "unreviewed" ? "in_review" : "completed"} />
          <div className="workspace-action-card__copy">
            <span className="eyebrow">다음 행동</span>
            <h3>{item.status === "unreviewed" ? "접수 내용을 확인하고 처리를 시작합니다" : "확인·전달·조치 내용을 기록합니다"}</h3>
            <p>{item.status === "unreviewed" ? "메모는 선택사항이며, 시작 후 상태가 ‘처리 중’으로 바뀝니다." : "처리 기록 완료 전 관리자 메모를 반드시 남겨 주세요."}</p>
          </div>
          <label className="form-field" htmlFor={`action-note-${item.id}`}>
            <span>관리자 메모 {item.status === "in_review" ? "(필수)" : "(선택)"}</span>
            <textarea
              id={`action-note-${item.id}`}
              name="actionNote"
              defaultValue={item.actionNote}
              maxLength={500}
              required={item.status === "in_review"}
              rows={4}
              placeholder={item.status === "in_review" ? "확인한 내용과 전달·조치 기록을 입력해 주세요." : "확인을 시작하며 남길 메모가 있으면 입력해 주세요."}
            />
          </label>
          <div className="workspace-action-card__footer">
            <small>접수함 처리 기록을 남기는 기능이며, 안전조치의 적정성이나 법적 종결을 확정하지 않습니다.</small>
            <ReviewSubmitButton status={item.status} />
          </div>
        </form>
      ) : (
        <div className="workspace-complete-note">
          <iconify-icon icon="lucide:circle-check-big"></iconify-icon>
          <div><b>처리 기록이 완료됐습니다.</b><span>위 처리 이력에서 기록 내용을 확인할 수 있습니다.</span></div>
        </div>
      )}
    </section>
  );
}

export default function ManagerInboxCustomerWorkspace(props: Props) {
  const {
    theme,
    toggleTheme,
    isSidebarOpen,
    isSidebarMini,
    handleSidebarToggleClick,
    closeSidebar,
  } = useDashboardShellInteractions();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(props.mobileDetailInitiallyOpen);

  const summaryCards = [
    { label: "오늘 새로 들어온 업무", value: props.summaryCounts.today, icon: "lucide:sparkles", color: "i-blue" },
    { label: "확인할 업무", value: props.summaryCounts.unreviewed, icon: "lucide:inbox", color: "i-orange" },
    { label: "처리 중인 업무", value: props.summaryCounts.inReview, icon: "lucide:triangle-alert", color: "i-purple" },
    { label: "24시간 이상 대기", value: props.summaryCounts.overdue, icon: "lucide:clock-alert", color: "i-red" },
    { label: "처리 기록 완료", value: props.summaryCounts.completed, icon: "lucide:circle-check-big", color: "i-green" },
  ];
  const filterProps = {
    selectedType: props.selectedType,
    selectedStatus: props.selectedStatus,
    selectedPeriod: props.selectedPeriod,
    queryText: props.queryText,
  };

  const detail = props.selectedItem ? (
    <WorkDetail
      item={props.selectedItem}
      auditEvents={props.auditEvents}
      auditEventsFailed={props.auditEventsFailed}
      companyCode={props.companyCode}
      managerHref={props.managerHref}
      updateReviewAction={props.updateReviewAction}
    />
  ) : (
    <div className="workspace-empty"><iconify-icon icon="lucide:inbox"></iconify-icon><b>목록에서 접수를 선택해 주세요.</b></div>
  );

  return (
    <div className={`rsx-shell manager-workspace-preview manager-inbox-live${isSidebarMini ? " sb-mini" : ""}`} data-theme={theme}>
      <div className="app">
        <aside className={`sidebar${isSidebarOpen ? " open" : ""}`}>
          <a className="sidebar__brand" href={props.managerHref} onClick={closeSidebar} aria-label="SafeMetrica 관리자 홈">
            <Image className="logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" width={1618} height={383} priority />
            <Image className="logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" width={1618} height={383} />
            <Image className="brand-mark" src="/brand/safemetrica-logo-mark.svg" alt="" width={256} height={256} />
          </a>
          <nav className="sidebar__nav" aria-label="고객사 관리자 메뉴">
            <div className="nav__section">
              <div className="nav__label">개요</div>
              <a className="nav__item" href={props.managerHref} onClick={closeSidebar}><iconify-icon icon="lucide:layout-dashboard"></iconify-icon><span className="nav__txt">대시보드</span></a>
            </div>
            <div className="nav__section">
              <div className="nav__label">안전운영</div>
              <a className="nav__item is-active" href={props.baseHref} onClick={closeSidebar}><iconify-icon icon="lucide:inbox"></iconify-icon><span className="nav__txt">관리자 접수함</span><span className="nav__badge">{props.summaryCounts.unreviewed}</span></a>
              <a className="nav__item" href={`${props.managerHref}#confirmation-review`} onClick={closeSidebar}><iconify-icon icon="lucide:share-2"></iconify-icon><span className="nav__txt">공유 내용 관리</span></a>
              <a className="nav__item nav__item--featured" href={props.monthlyHref} onClick={closeSidebar}><iconify-icon icon="lucide:calendar-check"></iconify-icon><span className="nav__txt">월간 안전운영 요약</span></a>
            </div>
          </nav>
          <div className="sidebar__foot"><div className="workspace-role-card"><span>현재 사용자</span><b>고객사 관리자</b><p>현장 접수를 확인하고 처리 흐름을 관리합니다.</p></div></div>
        </aside>
        <div className={`overlay${isSidebarOpen ? " show" : ""}`} onClick={closeSidebar}></div>

        <div className="main">
          <header className="header">
            <button className="iconbtn" type="button" aria-label={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={isSidebarOpen} onClick={handleSidebarToggleClick}><iconify-icon icon="lucide:menu"></iconify-icon></button>
            <div className="workspace-breadcrumb" aria-label="현재 위치"><span>안전운영</span><iconify-icon icon="lucide:chevron-right"></iconify-icon><b>관리자 접수함</b></div>
            <div className="header__spacer"></div>
            <button className="iconbtn theme-toggle" type="button" aria-label="테마 전환" onClick={toggleTheme}><iconify-icon icon="lucide:sun" className="sun"></iconify-icon><iconify-icon icon="lucide:moon" className="moon"></iconify-icon></button>
            <div className="user-chip" aria-label="현재 사용자 고객사 관리자"><div className="user-chip__av">관</div><div className="user-chip__meta"><b>안전 담당자</b><span>고객사 관리자</span></div></div>
          </header>

          <main className="content">
            <div className="page-head">
              <div><p className="workspace-site-label">{props.companyLabel} · 고객사 관리자</p><h1>관리자 접수함</h1><p>오늘 들어온 현장 업무와 우선 확인할 항목을 한곳에서 관리합니다.</p></div>
              <div className="workspace-status-guide" aria-label="고객용 상태 안내"><span>상태 기준</span><b className="b-orange">확인 필요</b><iconify-icon icon="lucide:arrow-right"></iconify-icon><b className="b-blue">처리 중</b><iconify-icon icon="lucide:arrow-right"></iconify-icon><b className="b-green">처리 기록 완료</b></div>
            </div>

            <section className="workspace-summary" aria-label="오늘의 업무 요약">
              {summaryCards.map((card) => <article className="workspace-summary__card" key={card.label}><span className={`stat__icon ${card.color}`}><iconify-icon icon={card.icon}></iconify-icon></span><span><small>{card.label}</small><strong>{card.value}<em>건</em></strong></span></article>)}
            </section>

            <form className="workspace-filter card" method="get" aria-label="접수함 필터">
              <input type="hidden" name="company" value={props.companyCode} />
              <div className="workspace-filter__search"><iconify-icon icon="lucide:search"></iconify-icon><input name="q" defaultValue={props.queryText} placeholder="업무 내용·장소 검색" aria-label="업무 검색" maxLength={80} /></div>
              <label><span>유형</span><select name="type" defaultValue={props.selectedType}><option value="all">전체 유형</option><option value="monthly">공유확인</option><option value="prework">작업 전 안전확인</option><option value="anonymous">익명 의견</option><option value="visitor">외부인 확인</option><option value="representative">근로자대표 확인</option></select></label>
              <label><span>상태</span><select name="status" defaultValue={props.selectedStatus}><option value="all">전체 상태</option><option value="unreviewed">확인 필요</option><option value="in_review">처리 중</option><option value="completed">처리 기록 완료</option></select></label>
              <label><span>기간</span><select name="period" defaultValue={props.selectedPeriod}><option value="today">오늘</option><option value="week">최근 7일</option><option value="month">최근 30일</option></select></label>
              <div className="workspace-filter__actions"><button className="btn btn--primary btn--sm" type="submit"><iconify-icon icon="lucide:search"></iconify-icon>조회</button><a className="btn btn--outline btn--sm" href={props.baseHref}>초기화</a></div>
            </form>

            {props.resultMessage ? <div className={`workspace-result workspace-result--${props.resultTone ?? "warning"}`} role="status">{props.resultMessage}</div> : null}

            <div className={`workspace-mobile-stage${mobileDetailOpen ? " is-detail" : ""}`}>
              <section className="workspace-board card" aria-label="처리할 업무 목록과 상세">
                <div className="workspace-list-column">
                  <div className="workspace-list-head"><div><h2>처리할 업무</h2><p>24시간 이상 대기 → 처리 중 → 확인 필요 → 최근 완료 순서</p></div><span>{props.items.length}건 표시</span></div>
                  <div className="workspace-list" aria-live="polite">
                    {props.items.length ? props.items.map((item) => (
                      <a className={`workspace-list-item${props.selectedItem?.id === item.id ? " is-selected" : ""}`} href={buildItemHref(props.baseHref, item.id, filterProps)} key={item.id} onClick={() => setMobileDetailOpen(true)}>
                        <span className={`workspace-priority workspace-priority--${item.attention}`} aria-hidden="true"></span>
                        <span className="workspace-list-item__main"><span className="workspace-list-item__top"><span className="workspace-type"><iconify-icon icon={TYPE_ICON[item.type]}></iconify-icon>{TYPE_LABEL[item.type]}</span><span className={`badge ${STATUS_CLASS[item.status]}`}>{STATUS_LABEL[item.status]}</span></span><b>{item.title}</b><span className="workspace-list-item__meta">{item.location || "장소 미입력"} · {item.createdAtLabel}</span><span className={`workspace-age workspace-age--${item.attention}`}>{item.ageLabel}</span></span>
                        <iconify-icon className="workspace-list-item__go" icon="lucide:chevron-right"></iconify-icon>
                      </a>
                    )) : <div className="workspace-empty"><iconify-icon icon="lucide:inbox"></iconify-icon><b>조건에 맞는 업무가 없습니다.</b><a href={props.baseHref}>필터 초기화</a></div>}
                  </div>
                  <div className="workspace-more"><span>최근 접수 200건 안에서 조건에 맞는 업무를 표시합니다.</span></div>
                </div>
                <div className="workspace-desktop-detail">{detail}</div>
              </section>

              <div className="workspace-mobile-detail">
                {props.selectedItem ? <WorkDetail item={props.selectedItem} auditEvents={props.auditEvents} auditEventsFailed={props.auditEventsFailed} companyCode={props.companyCode} managerHref={props.managerHref} updateReviewAction={props.updateReviewAction} mobile onBack={() => setMobileDetailOpen(false)} /> : null}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
