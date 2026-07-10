import { redirect } from "next/navigation";

import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";
import { buildRiskShareLangHref, getRiskShareLocale } from "@/lib/risk-share/riskShareI18n";
import { requireTenantManagerAccessForCurrentSession } from "@/lib/tenant-auth/tenantAccessServerGuards";
import SignOutButton from "@/components/auth/SignOutButton";
import { Donut } from "../manager/charts";
import { AreaTrend, HorizontalBars } from "./charts";

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

export default async function RiskShareMonthlySummaryPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const companyCode = normalizeCompanyCode(readSearchParam(params.company));
  const lang = getRiskShareLocale(readSearchParam(params.lang));
  const tenant = companyCode
    ? await getTenantRegistryConfigByCode(companyCode).catch(() => null)
    : null;
  const isAllowed = Boolean(companyCode) && isRiskSharePackTenant(tenant?.serviceMode);
  const managerHref = buildRiskShareLangHref("/risk-share/manager", { company: companyCode }, lang);
  const monthlyHref = buildRiskShareLangHref("/risk-share/monthly", { company: companyCode }, lang);

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-black text-amber-700">SafeMetrica · 안전운영</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            월간 안전운영 요약을 열 수 없습니다.
          </h1>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            등록된 고객사 코드가 필요합니다. 링크팩에서 발급된 주소로 다시 접속해 주세요.
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
      redirect(`/login?callbackUrl=${encodeURIComponent(monthlyHref)}`);
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
              <a className="nav__item" href={managerHref} title="대시보드">
                <iconify-icon icon="lucide:layout-dashboard"></iconify-icon>
                <span className="nav__txt">대시보드</span>
              </a>
            </div>

            <div className="nav__section">
              <div className="nav__label">안전운영</div>
              <a className="nav__item" href="#" title="위험성평가 공유확인">
                <iconify-icon icon="lucide:share-2"></iconify-icon>
                <span className="nav__txt">위험성평가 공유확인</span>
                <span className="nav__badge">3</span>
              </a>
              <a className="nav__item" href="#" title="작업 전 안전확인">
                <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                <span className="nav__txt">작업 전 안전확인</span>
                <span className="nav__badge">2</span>
              </a>
              <a className="nav__item" href="#" title="익명 의견함">
                <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                <span className="nav__txt">익명 의견함</span>
                <span className="nav__badge">3</span>
              </a>
              <a className="nav__item" href="#" title="외부인 확인">
                <iconify-icon icon="lucide:door-open"></iconify-icon>
                <span className="nav__txt">외부인 확인</span>
              </a>
              <a className="nav__item" href="#" title="근로자대표 확인">
                <iconify-icon icon="lucide:user-check"></iconify-icon>
                <span className="nav__txt">근로자대표 확인</span>
              </a>
              <a className="nav__item nav__item--featured is-active" href={monthlyHref} title="월간 안전운영 요약">
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
              <input type="text" placeholder="기간 · 항목 검색" />
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
                <div className="user-chip__av">김</div>
                <div className="user-chip__meta">
                  <b>김진형</b>
                  <span>안전관리자</span>
                </div>
                <iconify-icon icon="lucide:chevron-down" className="user-chip__cv"></iconify-icon>
              </button>
              <div className="dd__menu">
                <div className="dd__userhead">
                  <div className="user-chip__av">김</div>
                  <div>
                    <b>김진형</b>
                    <span>안전관리자 · tirany2014@gmail.com</span>
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
                <h2>2026년 7월 안전운영 요약</h2>
                <p>
                  위공팩 테스트 고객 · 기간 <b>2026.07.01 – 07.31</b> · 이번 달 확인·의견·검토 기록을 한 장으로 정리합니다.
                </p>
              </div>
              <div className="page-head__actions">
                <div className="date-chip" aria-label="오늘 날짜">
                  <iconify-icon icon="lucide:calendar-days"></iconify-icon>
                  <b id="dateChipDate">2026.07.07 화</b>
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
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> 18%
                  </span>
                </div>
                <div>
                  <div className="stat__label">위험성평가 공유확인</div>
                  <div className="stat__value">
                    3<small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: "18%", background: "var(--c1)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-green">
                    <iconify-icon icon="lucide:clipboard-check"></iconify-icon>
                  </div>
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> 12%
                  </span>
                </div>
                <div>
                  <div className="stat__label">작업 전 안전확인</div>
                  <div className="stat__value">
                    2<small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: "12%", background: "var(--c2)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-orange">
                    <iconify-icon icon="lucide:message-circle-question"></iconify-icon>
                  </div>
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> 18%
                  </span>
                </div>
                <div>
                  <div className="stat__label">익명 의견 · 아차사고</div>
                  <div className="stat__value">
                    3<small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: "18%", background: "var(--c3)" }}></span>
                </div>
              </article>
              <article className="stat">
                <div className="stat__top">
                  <div className="stat__icon i-purple">
                    <iconify-icon icon="lucide:door-open"></iconify-icon>
                  </div>
                  <span className="stat__trend up">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> 12%
                  </span>
                </div>
                <div>
                  <div className="stat__label">외부인 출입 전 확인</div>
                  <div className="stat__value">
                    2<small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: "12%", background: "var(--c4)" }}></span>
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
                  <div className="stat__label">근로자대표 확인 · 의견</div>
                  <div className="stat__value">
                    7<small>건</small>
                  </div>
                </div>
                <div className="progress" style={{ marginTop: "2px" }}>
                  <span style={{ width: "40%", background: "var(--c5)" }}></span>
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
                  <span className="badge b-green">
                    <iconify-icon icon="lucide:trending-up"></iconify-icon> 전월 대비 +6건
                  </span>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "290px" }}>
                    <AreaTrend labels={["3월", "4월", "5월", "6월", "7월"]} data={[6, 8, 9, 11, 17]} colorVar="--c1" />
                  </div>
                </div>
              </article>

              <article className="card">
                <div className="card__head">
                  <div>
                    <h3>항목별 비중</h3>
                    <small>7월 총 17건</small>
                  </div>
                </div>
                <div className="card__body">
                  <div className="chart-wrap" style={{ height: "190px" }}>
                    <Donut
                      segments={[
                        { value: 3, colorVar: "--c1" },
                        { value: 2, colorVar: "--c2" },
                        { value: 3, colorVar: "--c3" },
                        { value: 2, colorVar: "--c4" },
                        { value: 7, colorVar: "--c5" },
                      ]}
                    />
                    <div className="donut-center">
                      <b>17</b>
                      <span>총 접수</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "16px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c1)" }}></span>공유확인<b>3건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>작업 전 확인<b>2건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c3)" }}></span>익명 의견<b>3건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c4)" }}></span>외부인 확인<b>2건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--c5)" }}></span>근로자대표<b>7건</b>
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
                      { label: "공유확인", value: 3, colorVar: "--c1" },
                      { label: "작업 전 확인", value: 2, colorVar: "--c2" },
                      { label: "익명 의견", value: 3, colorVar: "--c3" },
                      { label: "외부인 확인", value: 2, colorVar: "--c4" },
                      { label: "근로자대표", value: 7, colorVar: "--c5" },
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
                        { value: 1, colorVar: "--c2" },
                        { value: 6, colorVar: "--border-strong" },
                      ]}
                    />
                    <div className="donut-center">
                      <b style={{ fontSize: "22px" }}>1/7</b>
                      <span>서명 확인</span>
                    </div>
                  </div>
                  <ul className="legend legend--col" style={{ marginTop: "14px" }}>
                    <li>
                      <span className="swatch" style={{ background: "var(--c2)" }}></span>서명 확인<b>1건</b>
                    </li>
                    <li>
                      <span className="swatch" style={{ background: "var(--border-strong)" }}></span>선택 서명 미제출<b>6건</b>
                    </li>
                  </ul>
                </article>

                <article className="card card--pad">
                  <div className="sec-title">
                    <iconify-icon icon="lucide:refresh-ccw"></iconify-icon> 다음 위험성평가 재검토 후보
                  </div>
                  <div className="action-need" style={{ marginTop: 0 }}>
                    <a className="action-item" href="#">
                      <span className="action-item__ic i-orange">
                        <iconify-icon icon="lucide:forklift"></iconify-icon>
                      </span>
                      <div>
                        <b>지게차 동선 교차 구간</b>
                        <span>익명 의견 2건 연계</span>
                      </div>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
                    <a className="action-item" href="#">
                      <span className="action-item__ic i-blue">
                        <iconify-icon icon="lucide:hard-hat"></iconify-icon>
                      </span>
                      <div>
                        <b>고소작업 안전대 체결 절차</b>
                        <span>작업 전 확인에서 반복 지적</span>
                      </div>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
                    <a className="action-item" href="#">
                      <span className="action-item__ic i-purple">
                        <iconify-icon icon="lucide:door-open"></iconify-icon>
                      </span>
                      <div>
                        <b>외부인 출입 안내 게시 위치</b>
                        <span>협력업체 확인 지연 1건</span>
                      </div>
                      <iconify-icon icon="lucide:chevron-right" className="go"></iconify-icon>
                    </a>
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
