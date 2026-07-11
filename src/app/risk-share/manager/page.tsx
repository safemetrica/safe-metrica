import { redirect } from "next/navigation";

import { getTenantRegistryConfigByCode, selectSupabaseExportRows } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { fetchRiskShareRepresentativeSubmissionSummary } from "@/lib/riskShareRepresentativeSubmissionRecords";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import SignOutButton from "@/components/auth/SignOutButton";
import { Donut } from "./charts";

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
              <div className="nav__item is-disabled" title="위험성평가 공유확인">
                <iconify-icon icon="lucide:share-2"></iconify-icon>
                <span className="nav__txt">위험성평가 공유확인</span>
                <span className="nav__badge">{monthlyConfirmationCount}</span>
              </div>
              <div className="nav__item is-disabled" title="작업 전 안전확인">
                <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                <span className="nav__txt">작업 전 안전확인</span>
                <span className="nav__badge">{preworkConfirmationCount}</span>
              </div>
              <div className="nav__item is-disabled" title="익명 의견함">
                <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                <span className="nav__txt">익명 의견함</span>
                <span className="nav__badge">{anonymousFeedbackCount}</span>
              </div>
              <div className="nav__item is-disabled" title="외부인 확인">
                <iconify-icon icon="lucide:door-open"></iconify-icon>
                <span className="nav__txt">외부인 확인</span>
                <span className="nav__badge">{visitorConfirmationCount}</span>
              </div>
              <div className="nav__item is-disabled" title="근로자대표 확인">
                <iconify-icon icon="lucide:user-check"></iconify-icon>
                <span className="nav__txt">근로자대표 확인</span>
                <span className="nav__badge">{representativeTotalCount}</span>
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
                  <b id="dateChipDate">{getTodayKstLabel()}</b>
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
                    {monthlyConfirmationCount}
                    <small>건</small>
                  </div>
                </div>
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
                    {preworkConfirmationCount}
                    <small>건</small>
                  </div>
                </div>
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
                    {anonymousFeedbackCount}
                    <small>건</small>
                  </div>
                </div>
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
                    {visitorConfirmationCount}
                    <small>건</small>
                  </div>
                </div>
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
                    {representativeTotalCount}
                    <small>건</small>
                  </div>
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
                <p>이번 달 접수 {totalSubmissionCount}건이 월간 운영기록으로 정리되고 있습니다</p>
              </div>
              <a className="btn btn--white" href={monthlyHref}>
                월간 요약 보기 <iconify-icon icon="lucide:arrow-right"></iconify-icon>
              </a>
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
                <div className="card__body">
                  <p style={{ color: "var(--text-3)", fontSize: "14px" }}>
                    접수 건별 상세 목록은 아직 이 화면에 연동되어 있지 않습니다. 위 요약 건수는 실제 접수 데이터를 반영합니다.
                  </p>
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
