import { redirect } from "next/navigation";

import { getTenantRegistryConfigByCode, selectSupabaseExportRows } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { fetchRiskShareRepresentativeSubmissionSummary } from "@/lib/riskShareRepresentativeSubmissionRecords";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import SignOutButton from "@/components/auth/SignOutButton";
import { Sparkline, StackedBars, Donut } from "./charts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    company?: string | string[];
    lang?: string | string[];
  }>;
};

function readSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function isRiskSharePackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

function getCurrentKstMonthRange() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;

  const startOfMonthUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
  const startOfNextMonthUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  return {
    createdAtGte: startOfMonthUtc.toISOString(),
    createdAtLt: startOfNextMonthUtc.toISOString(),
  };
}

function getCurrentKstMonthDatePeriod() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
    dayAfterEnd: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
  };
}

function getMonthLabelFromPeriod(period: { startDate: string }) {
  const [year = "", month = "1"] = period.startDate.split("-");
  return `${year}년 ${Number(month)}월`;
}

function getTodayKstLabel() {
  const now = new Date();
  const datePart = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/\s/g, "")
    .replace(/\.$/, "");
  const weekdayPart = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(now);

  return `${datePart} ${weekdayPart}`;
}

const RISK_SHARE_PARTICIPATION_SOURCE = "risk_share_participation_submit_v1";
const RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT = 500;

type RiskShareParticipationRawPayload = {
  mode?: string;
  signature_present?: boolean | string | null;
  signature_url?: string | null;
};

type RiskShareParticipationSummaryRow = {
  raw_payload: RiskShareParticipationRawPayload | null;
};

type RiskShareParticipationSummary = {
  status: "ok" | "not_configured" | "failed";
  counts: {
    monthly: number;
    prework: number;
    monthlySignatureConfirmed: number;
    preworkSignatureConfirmed: number;
  };
};

function hasParticipationSignature(rawPayload: RiskShareParticipationRawPayload | null) {
  return rawPayload?.signature_present === true || rawPayload?.signature_present === "true" || Boolean(rawPayload?.signature_url);
}

async function fetchRiskShareParticipationSummary(
  companyCode: string,
  period: { createdAtGte: string; createdAtLt: string }
): Promise<RiskShareParticipationSummary> {
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${RISK_SHARE_PARTICIPATION_SOURCE}`);
  query.append("created_at", `gte.${period.createdAtGte}`);
  query.append("created_at", `lt.${period.createdAtLt}`);
  query.set("limit", String(RISK_SHARE_PARTICIPATION_SUMMARY_LIMIT));

  try {
    const rows = await selectSupabaseExportRows<RiskShareParticipationSummaryRow>(
      "field_participation_submissions",
      query
    );
    const monthlyRows = rows.filter((row) => row.raw_payload?.mode === "monthly");
    const preworkRows = rows.filter((row) => row.raw_payload?.mode === "prework");

    return {
      status: "ok",
      counts: {
        monthly: monthlyRows.length,
        prework: preworkRows.length,
        monthlySignatureConfirmed: monthlyRows.filter((row) => hasParticipationSignature(row.raw_payload)).length,
        preworkSignatureConfirmed: preworkRows.filter((row) => hasParticipationSignature(row.raw_payload)).length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      counts: { monthly: 0, prework: 0, monthlySignatureConfirmed: 0, preworkSignatureConfirmed: 0 },
    };
  }
}

const ANONYMOUS_FEEDBACK_SOURCES = ["anonymous_worker_feedback_v1", "risk_share_anonymous_feedback_v1"] as const;
const ANONYMOUS_FEEDBACK_SUMMARY_LIMIT = 500;

type AnonymousFeedbackSummaryRow = {
  raw_payload: unknown;
};

type AnonymousFeedbackSummary = {
  status: "ok" | "not_configured" | "failed";
  count: number;
};

async function fetchRiskShareAnonymousFeedbackSummary(
  companyCode: string
): Promise<AnonymousFeedbackSummary> {
  const monthRange = getCurrentKstMonthRange();
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `in.(${ANONYMOUS_FEEDBACK_SOURCES.join(",")})`);
  query.append("created_at", `gte.${monthRange.createdAtGte}`);
  query.append("created_at", `lt.${monthRange.createdAtLt}`);
  query.set("limit", String(ANONYMOUS_FEEDBACK_SUMMARY_LIMIT));

  try {
    const rows = await selectSupabaseExportRows<AnonymousFeedbackSummaryRow>(
      "field_participation_submissions",
      query
    );

    return { status: "ok", count: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      count: 0,
    };
  }
}

const VISITOR_CONFIRMATION_SOURCE = "risk_share_visitor_confirmation_v1";
const VISITOR_CONFIRMATION_SUMMARY_LIMIT = 500;

type VisitorConfirmationSummaryRow = {
  raw_payload: unknown;
};

type VisitorConfirmationSummary = {
  status: "ok" | "not_configured" | "failed";
  count: number;
};

async function fetchRiskShareVisitorConfirmationSummary(
  companyCode: string
): Promise<VisitorConfirmationSummary> {
  const monthRange = getCurrentKstMonthRange();
  const query = new URLSearchParams();
  query.set("select", "raw_payload");
  query.set("tenant_code", `eq.${companyCode}`);
  query.set("raw_payload->>source", `eq.${VISITOR_CONFIRMATION_SOURCE}`);
  query.append("created_at", `gte.${monthRange.createdAtGte}`);
  query.append("created_at", `lt.${monthRange.createdAtLt}`);
  query.set("limit", String(VISITOR_CONFIRMATION_SUMMARY_LIMIT));

  try {
    const rows = await selectSupabaseExportRows<VisitorConfirmationSummaryRow>(
      "field_participation_submissions",
      query
    );

    return { status: "ok", count: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    return {
      status: message.includes("configuration is missing") ? "not_configured" : "failed",
      count: 0,
    };
  }
}

export default async function RiskShareManagerHomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: companyCode }, lang);
  const fieldHref = buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);
  const currentPeriod = getCurrentKstMonthDatePeriod();
  const monthLabel = getMonthLabelFromPeriod(currentPeriod);

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            관리자 홈을 열 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            등록된 고객사 코드가 필요합니다. 링크팩에서 발급된 관리자 홈 주소로 다시 접속해
            주세요.
          </p>
        </section>
      </main>
    );
  }

  const tenantAccessResult = await requireTenantManagerAccessForCurrentSession({
    tenantCode: companyCode,
  });

  if (!tenantAccessResult.ok) {
    if (tenantAccessResult.reason === "unauthenticated") {
      redirect(`/login?callbackUrl=${encodeURIComponent(managerHref)}`);
    }

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            이 회사의 관리자 권한이 확인되지 않았습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            운영 담당자에게 문의해 주세요.
          </p>
        </section>
      </main>
    );
  }

  const userEmail = tenantAccessResult.context.membership.userEmail;
  const userDisplayName = tenantAccessResult.context.membership.displayName || userEmail || "관리자";
  const avatarInitial = userDisplayName.trim().slice(0, 1) || "관";

  const participationSummary = await fetchRiskShareParticipationSummary(
    companyCode,
    getCurrentKstMonthRange(),
  );
  const anonymousFeedbackSummary = await fetchRiskShareAnonymousFeedbackSummary(companyCode);
  const visitorConfirmationSummary = await fetchRiskShareVisitorConfirmationSummary(companyCode);
  const representativeSubmissionSummary = await fetchRiskShareRepresentativeSubmissionSummary(
    companyCode,
    currentPeriod,
  );

  const monthlyConfirmationCount = participationSummary.counts.monthly;
  const preworkConfirmationCount = participationSummary.counts.prework;
  const anonymousFeedbackCount = anonymousFeedbackSummary.count;
  const visitorConfirmationCount = visitorConfirmationSummary.count;
  const representativeTotalCount = representativeSubmissionSummary.totalCount;
  const signatureConfirmedCount = representativeSubmissionSummary.signatureConfirmedCount;
  const signatureNotSubmittedCount = representativeSubmissionSummary.signatureNotSubmittedCount;
  const totalSubmissionCount =
    monthlyConfirmationCount +
    preworkConfirmationCount +
    anonymousFeedbackCount +
    visitorConfirmationCount +
    representativeTotalCount;

  return (
    <div className="rsx-shell">
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
              <a className="nav__item" href="#" title="위험성평가 공유확인">
                <iconify-icon icon="lucide:share-2"></iconify-icon>
                <span className="nav__txt">위험성평가 공유확인</span>
                <span className="nav__badge">{monthlyConfirmationCount}</span>
              </a>
              <a className="nav__item" href="#" title="작업 전 안전확인">
                <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                <span className="nav__txt">작업 전 안전확인</span>
                <span className="nav__badge">{preworkConfirmationCount}</span>
              </a>
              <a className="nav__item" href="#" title="익명 의견함">
                <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                <span className="nav__txt">익명 의견함</span>
                <span className="nav__badge">{anonymousFeedbackCount}</span>
              </a>
              <a className="nav__item" href="#" title="외부인 확인">
                <iconify-icon icon="lucide:door-open"></iconify-icon>
                <span className="nav__txt">외부인 확인</span>
              </a>
              <a className="nav__item" href="#" title="근로자대표 확인">
                <iconify-icon icon="lucide:user-check"></iconify-icon>
                <span className="nav__txt">근로자대표 확인</span>
              </a>
              <a className="nav__item nav__item--featured" href={monthlyHref} title="월간 안전운영 요약">
                <iconify-icon icon="lucide:calendar-check"></iconify-icon>
                <span className="nav__txt">월간 안전운영 요약</span>
              </a>
            </div>
          </nav>

          <div className="sidebar__foot">
            <div className="plan-card">
              <h4>
                <iconify-icon icon="lucide:crown"></iconify-icon> 위공팩 v1
              </h4>
              <p>확장팩 버전 1 이용 중입니다. 메뉴는 계속 추가됩니다.</p>
              <a className="plan-card__btn" href="#">
                플랜 관리
              </a>
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
                <span className="dot"></span>
              </button>
              <div className="dd__menu dd__menu--noti">
                <div className="dd__head">
                  알림 <span className="badge b-blue">3건</span>
                </div>
                <a className="noti" href="#">
                  <span className="noti__ic i-blue">
                    <iconify-icon icon="lucide:share-2"></iconify-icon>
                  </span>
                  <div>
                    <b>공유확인 접수</b>
                    <span>익명 근로자 · 오늘 09:12</span>
                  </div>
                </a>
                <a className="noti" href="#">
                  <span className="noti__ic i-orange">
                    <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                  </span>
                  <div>
                    <b>익명 의견 접수</b>
                    <span>지게차 동선 개선 제안 · 어제 17:05</span>
                  </div>
                </a>
                <a className="noti" href="#">
                  <span className="noti__ic i-purple">
                    <iconify-icon icon="lucide:door-open"></iconify-icon>
                  </span>
                  <div>
                    <b>외부인 확인 제출</b>
                    <span>협력업체 A · 어제 13:20</span>
                  </div>
                </a>
                <a className="dd__foot" href="#">
                  알림 전체 보기
                </a>
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
                <a className="dd__item" href="#">
                  <iconify-icon icon="lucide:user"></iconify-icon>프로필 정보
                </a>
                <a className="dd__item" href="#">
                  <iconify-icon icon="lucide:bell-ring"></iconify-icon>알림 설정
                </a>
                <a className="dd__item" href="#">
                  <iconify-icon icon="lucide:settings"></iconify-icon>계정 설정
                </a>
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
                  <b id="dateChipDate">{getTodayKstLabel()}</b>
                </div>
                <button className="btn btn--outline">
                  <iconify-icon icon="lucide:download"></iconify-icon> 내보내기
                </button>
                <a className="btn btn--primary" href={fieldHref}>
                  <iconify-icon icon="lucide:qr-code"></iconify-icon> 현장 QR 입구
                </a>
              </div>
            </div>

            {/* ① 핵심 5카드 — 숫자 + 추세 스파크라인 */}
            <section className="grid grid--stats">
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-blue">
                    <iconify-icon icon="lucide:share-2"></iconify-icon>
                  </div>
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> +2
                  </span>
                </div>
                <div>
                  <div className="stat__label">위험성평가 공유확인</div>
                  <div className="stat__value">
                    {monthlyConfirmationCount}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark">
                  <Sparkline data={[0, 1, 0, 1, 0, 1, 3]} colorVar="--c1" />
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-green">
                    <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                  </div>
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> +1
                  </span>
                </div>
                <div>
                  <div className="stat__label">작업 전 안전확인</div>
                  <div className="stat__value">
                    {preworkConfirmationCount}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark">
                  <Sparkline data={[1, 0, 1, 0, 0, 0, 2]} colorVar="--c2" />
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-orange">
                    <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                  </div>
                  <span className="stat__trend warn">
                    <iconify-icon icon="lucide:bell"></iconify-icon> 2 대기
                  </span>
                </div>
                <div>
                  <div className="stat__label">익명 의견함</div>
                  <div className="stat__value">
                    {anonymousFeedbackCount}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark">
                  <Sparkline data={[0, 1, 1, 0, 1, 0, 3]} colorVar="--c3" />
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-purple">
                    <iconify-icon icon="lucide:door-open"></iconify-icon>
                  </div>
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> +2
                  </span>
                </div>
                <div>
                  <div className="stat__label">외부인 확인</div>
                  <div className="stat__value">
                    {visitorConfirmationCount}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark">
                  <Sparkline data={[0, 0, 1, 0, 1, 0, 2]} colorVar="--c4" />
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-red">
                    <iconify-icon icon="lucide:user-check"></iconify-icon>
                  </div>
                  <span className="stat__trend warn">
                    <iconify-icon icon="lucide:signature"></iconify-icon> 서명 1/7
                  </span>
                </div>
                <div>
                  <div className="stat__label">근로자대표 확인</div>
                  <div className="stat__value">
                    {representativeTotalCount}
                    <small>건</small>
                  </div>
                </div>
                <div className="stat__spark">
                  <Sparkline data={[1, 2, 3, 4, 5, 6, 7]} colorVar="--c5" />
                </div>
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
                  <span>접수 {totalSubmissionCount}건 · 검토 완료</span>
                  <b>65%</b>
                </div>
                <div className="monthly-banner__bar">
                  <span style={{ width: "65%" }}></span>
                </div>
              </div>
              <a className="btn btn--white" href={monthlyHref}>
                월간 요약 보기 <iconify-icon icon="lucide:arrow-right"></iconify-icon>
              </a>
            </section>

            {/* ③ AI 안전운영 브리핑 + 현장 참고정보 */}
            <section className="grid grid--dash mt-18">
              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>
                      <span className="ai-chip">AI</span>안전운영 브리핑
                    </h3>
                    <small>오늘 07:00 생성 · 전국 사고사례 128건 분석</small>
                  </div>
                  <span className="badge b-blue">
                    <iconify-icon icon="lucide:sparkles"></iconify-icon> 우리 현장 관련 3건
                  </span>
                </div>
                <div className="card__body">
                  <div className="brief-live" aria-label="실시간 속보·사례">
                    <span className="live-badge">LIVE</span>
                    <div className="brief-live__ticker">
                      <ul>
                        <li>
                          <b>속보</b> ○○물류센터 지게차 협착 사고 — 후진 경보 미작동
                        </li>
                        <li>
                          <b className="k">기상</b> 폭염특보 지속 — 옥외작업 온열질환 주의
                        </li>
                        <li>
                          <b>사례</b> △△건설현장 개구부 추락 — 덮개 미설치
                        </li>
                        <li>
                          <b>속보</b> ○○물류센터 지게차 협착 사고 — 후진 경보 미작동
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="brief">
                    <a className="brief__item brief__item--p1" href="#">
                      <span className="brief__ic i-red">
                        <iconify-icon icon="lucide:forklift"></iconify-icon>
                      </span>
                      <div className="brief__main">
                        <b>지게차 후진 경보 작동 점검</b>
                        <span>○○물류센터 협착 사고 속보 연계 · 우리 현장 지게차 3대 운용 중</span>
                      </div>
                      <span className="badge b-red">우선</span>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
                    <a className="brief__item brief__item--p2" href="#">
                      <span className="brief__ic i-orange">
                        <iconify-icon icon="lucide:thermometer-sun"></iconify-icon>
                      </span>
                      <div className="brief__main">
                        <b>옥외작업조 휴식시간 조정</b>
                        <span>폭염 경보 지속 · 온열질환 재해 기사 2건 수집</span>
                      </div>
                      <span className="badge b-orange">권고</span>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
                    <a className="brief__item brief__item--p3" href="#">
                      <span className="brief__ic i-blue">
                        <iconify-icon icon="lucide:hard-hat"></iconify-icon>
                      </span>
                      <div className="brief__main">
                        <b>개구부 덮개 고정 상태 확인</b>
                        <span>△△건설현장 추락 사고 사례 공유 · 유사 공정 보유</span>
                      </div>
                      <span className="badge b-blue">참고</span>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
                  </div>
                  <div className="brief__foot">
                    <button className="btn btn--primary btn--sm">
                      <iconify-icon icon="lucide:list-plus"></iconify-icon> 오늘 체크리스트에 반영
                    </button>
                    <button className="btn btn--ghost btn--sm">
                      브리핑 전체 보기 <iconify-icon icon="lucide:chevron-right"></iconify-icon>
                    </button>
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>현장 참고정보</h3>
                    <small>인천 연수구 · 오늘 07:00 기준</small>
                  </div>
                  <span className="badge b-orange">
                    <iconify-icon icon="lucide:triangle-alert"></iconify-icon> 폭염주의보
                  </span>
                </div>
                <div className="card__body">
                  <div className="weather">
                    <iconify-icon icon="lucide:sun" className="weather__ic"></iconify-icon>
                    <div>
                      <b>31°</b>
                      <span>맑음 · 최고 34° / 최저 25°</span>
                    </div>
                  </div>
                  <div className="wx-grid">
                    <div className="wx-tile">
                      <iconify-icon icon="lucide:thermometer"></iconify-icon>
                      <div>
                        <b>33°</b>
                        <span>체감온도</span>
                      </div>
                    </div>
                    <div className="wx-tile">
                      <iconify-icon icon="lucide:droplets"></iconify-icon>
                      <div>
                        <b>68%</b>
                        <span>습도</span>
                      </div>
                    </div>
                    <div className="wx-tile">
                      <iconify-icon icon="lucide:wind"></iconify-icon>
                      <div>
                        <b>3 m/s</b>
                        <span>풍속 · 남서</span>
                      </div>
                    </div>
                    <div className="wx-tile">
                      <iconify-icon icon="lucide:leaf"></iconify-icon>
                      <div>
                        <b>좋음</b>
                        <span>미세먼지</span>
                      </div>
                    </div>
                  </div>
                  <div className="wx-alert">
                    <iconify-icon icon="lucide:triangle-alert"></iconify-icon>
                    <span>
                      <b>폭염주의보 발효 중</b> — 14~17시 옥외작업은 시간당 10분 이상 그늘 휴식을 권고합니다.
                    </span>
                  </div>
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
                  <ul className="legend">
                    <li>
                      <span className="swatch" style={{ background: "var(--c1)" }}></span>공유확인
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>작업 전
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c3)" }}></span>익명 의견
                    </li>
                  </ul>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "290px" }}>
                    <StackedBars
                      labels={["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "오늘"]}
                      series={[
                        { colorVar: "--c1", data: [0, 1, 0, 1, 0, 1, 0] },
                        { colorVar: "--c2", data: [1, 0, 1, 0, 0, 0, 0] },
                        { colorVar: "--c3", data: [0, 1, 1, 0, 1, 0, 0] },
                      ]}
                    />
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>처리 현황</h3>
                    <small>이번 달 17건 기준</small>
                  </div>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "180px" }}>
                    <Donut
                      segments={[
                        { value: 5, colorVar: "--c3" },
                        { value: 3, colorVar: "--c1" },
                        { value: 9, colorVar: "--c2" },
                      ]}
                    />
                    <div className="donut-center">
                      <b>5</b>
                      <span>미검토</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "16px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c3)" }}></span>미검토<b>5건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c1)" }}></span>검토 중<b>3건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>검토 완료<b>9건</b>
                    </li>
                  </ul>
                  <div className="action-need">
                    <a className="action-item" href="#">
                      <span className="action-item__ic i-red">
                        <iconify-icon icon="lucide:triangle-alert"></iconify-icon>
                      </span>
                      <div>
                        <b>지게차 동선 개선 제안</b>
                        <span>익명 의견 · 2일째 미검토</span>
                      </div>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
                    <a className="action-item" href="#">
                      <span className="action-item__ic i-orange">
                        <iconify-icon icon="lucide:signature"></iconify-icon>
                      </span>
                      <div>
                        <b>근로자대표 서명 {signatureNotSubmittedCount}건 대기</b>
                        <span>{monthLabel} 공유확인 서명 요청</span>
                      </div>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
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
                  <button className="btn btn--ghost btn--sm">
                    전체 보기 <iconify-icon icon="lucide:chevron-right"></iconify-icon>
                  </button>
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
                      <tr>
                        <td>
                          <span className="badge b-blue">
                            <iconify-icon icon="lucide:share-2"></iconify-icon> 공유확인
                          </span>
                        </td>
                        <td>
                          <div className="td-user">
                            <span className="td-av" style={{ background: "var(--c1)" }}>
                              익
                            </span>{" "}
                            익명 근로자
                          </div>
                        </td>
                        <td>7월 위험요인 3건 확인 완료</td>
                        <td>07.07 09:12</td>
                        <td>
                          <span className="badge b-orange">검토 대기</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="badge b-green">
                            <iconify-icon icon="lucide:clipboard-check"></iconify-icon> 작업 전
                          </span>
                        </td>
                        <td>
                          <div className="td-user">
                            <span className="td-av" style={{ background: "var(--c2)" }}>
                              익
                            </span>{" "}
                            익명 근로자
                          </div>
                        </td>
                        <td>고소작업 전 안전확인 제출</td>
                        <td>07.07 08:41</td>
                        <td>
                          <span className="badge b-green">검토 완료</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="badge b-orange">
                            <iconify-icon icon="lucide:message-circle-question"></iconify-icon> 익명 의견
                          </span>
                        </td>
                        <td>
                          <div className="td-user">
                            <span className="td-av" style={{ background: "var(--c3)" }}>
                              ?
                            </span>{" "}
                            이름 없음
                          </div>
                        </td>
                        <td>지게차 동선 개선 제안</td>
                        <td>07.05 17:05</td>
                        <td>
                          <span className="badge b-orange">검토 대기</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="badge b-purple">
                            <iconify-icon icon="lucide:door-open"></iconify-icon> 외부인
                          </span>
                        </td>
                        <td>
                          <div className="td-user">
                            <span className="td-av" style={{ background: "var(--c4)" }}>
                              협
                            </span>{" "}
                            협력업체 A
                          </div>
                        </td>
                        <td>출입 전 안전 안내 확인·제출</td>
                        <td>07.05 13:20</td>
                        <td>
                          <span className="badge b-green">검토 완료</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="badge b-red">
                            <iconify-icon icon="lucide:user-check"></iconify-icon> 근로자대표
                          </span>
                        </td>
                        <td>
                          <div className="td-user">
                            <span className="td-av" style={{ background: "var(--c5)" }}>
                              대
                            </span>{" "}
                            근로자대표
                          </div>
                        </td>
                        <td>공유확인 검토 의견 기록</td>
                        <td>07.04 10:33</td>
                        <td>
                          <span className="badge b-gray">서명 미제출</span>
                        </td>
                      </tr>
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
                        { value: signatureConfirmedCount, colorVar: "--c2" },
                        { value: signatureNotSubmittedCount, colorVar: "--border-strong" },
                      ]}
                    />
                    <div className="donut-center">
                      <b style={{ fontSize: "23px" }}>
                        {signatureConfirmedCount}/{representativeTotalCount}
                      </b>
                      <span>서명 확인</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "16px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>서명 확인
                      <b>{signatureConfirmedCount}건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--border-strong)" }}></span>선택 서명 미제출
                      <b>{signatureNotSubmittedCount}건</b>
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
                  <small>안전보건공단 최신 자료와 업계 소식</small>
                </div>
                <button className="btn btn--ghost btn--sm">
                  전체 보기 <iconify-icon icon="lucide:chevron-right"></iconify-icon>
                </button>
              </div>
              <div className="card__body res-grid" style={{ paddingTop: "8px", paddingBottom: "10px" }}>
                <a className="res" href="#">
                  <span className="res__ic i-green">
                    <iconify-icon icon="lucide:file-down"></iconify-icon>
                  </span>
                  <div className="res__main">
                    <b>여름철 온열질환 예방 가이드</b>
                    <span>
                      <em className="src src--kosha">공단</em>안전보건공단 · 07.03 · PDF
                    </span>
                  </div>
                  <iconify-icon icon="lucide:download" className="res__go"></iconify-icon>
                </a>
                <a className="res" href="#">
                  <span className="res__ic i-blue">
                    <iconify-icon icon="lucide:newspaper"></iconify-icon>
                  </span>
                  <div className="res__main">
                    <b>폭염 속 옥외작업, 휴식시간 의무화 추진</b>
                    <span>
                      <em className="src src--news">뉴스</em>안전보건 뉴스 · 오늘
                    </span>
                  </div>
                  <iconify-icon icon="lucide:external-link" className="res__go"></iconify-icon>
                </a>
                <a className="res" href="#">
                  <span className="res__ic i-green">
                    <iconify-icon icon="lucide:file-down"></iconify-icon>
                  </span>
                  <div className="res__main">
                    <b>지게차 안전작업 체크리스트</b>
                    <span>
                      <em className="src src--kosha">공단</em>안전보건공단 · 06.28 · PDF
                    </span>
                  </div>
                  <iconify-icon icon="lucide:download" className="res__go"></iconify-icon>
                </a>
                <a className="res" href="#">
                  <span className="res__ic i-blue">
                    <iconify-icon icon="lucide:newspaper"></iconify-icon>
                  </span>
                  <div className="res__main">
                    <b>하반기 중대재해 예방 집중 점검 시행</b>
                    <span>
                      <em className="src src--news">뉴스</em>안전보건 뉴스 · 어제
                    </span>
                  </div>
                  <iconify-icon icon="lucide:external-link" className="res__go"></iconify-icon>
                </a>
                <a className="res" href="#">
                  <span className="res__ic i-green">
                    <iconify-icon icon="lucide:file-down"></iconify-icon>
                  </span>
                  <div className="res__main">
                    <b>소규모 사업장 위험성평가 안내서</b>
                    <span>
                      <em className="src src--kosha">공단</em>안전보건공단 · 06.20 · PDF
                    </span>
                  </div>
                  <iconify-icon icon="lucide:download" className="res__go"></iconify-icon>
                </a>
                <a className="res" href="#">
                  <span className="res__ic i-blue">
                    <iconify-icon icon="lucide:newspaper"></iconify-icon>
                  </span>
                  <div className="res__main">
                    <b>개구부 추락사고 예방 캠페인 시작</b>
                    <span>
                      <em className="src src--news">뉴스</em>안전보건 뉴스 · 07.04
                    </span>
                  </div>
                  <iconify-icon icon="lucide:external-link" className="res__go"></iconify-icon>
                </a>
              </div>
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
