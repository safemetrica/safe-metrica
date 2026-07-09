/**
 * Static/sample values ported verbatim from the 2026-07-09 designer reference
 * (docs/design/risk-share-ui-reference-2026-07-09/manager.html).
 *
 * These are NOT backed by real queries — there is no per-day history, no
 * review-status field, and no row-level submission feed in the current schema.
 * Every export here is a placeholder shell pending real backend wiring in a
 * later PR. Do not treat these as live counts.
 */

export const SAMPLE_STAT_TRENDS = {
  monthlyConfirmation: { kind: "up", text: "+2" },
  preworkConfirmation: { kind: "up", text: "+1" },
  anonymousFeedback: { kind: "warn", text: "2 대기" },
  visitorConfirmation: { kind: "up", text: "+2" },
  representativeConfirmation: { kind: "warn", text: "서명 1/7" },
} as const;

export const SAMPLE_STAT_SPARKS = {
  monthlyConfirmation: [0, 1, 0, 1, 0, 1, 3],
  preworkConfirmation: [1, 0, 1, 0, 0, 0, 2],
  anonymousFeedback: [0, 1, 1, 0, 1, 0, 3],
  visitorConfirmation: [0, 0, 1, 0, 1, 0, 2],
  representativeConfirmation: [1, 2, 3, 4, 5, 6, 7],
} as const;

export const SAMPLE_MONTHLY_REVIEW_PROGRESS_PERCENT = 65;

export const SAMPLE_SAFETY_TICKER_ITEMS = [
  { tag: "속보", text: "○○물류센터 지게차 협착 사고 — 후진 경보 미작동" },
  { tag: "기상", text: "폭염특보 지속 — 옥외작업 온열질환 주의" },
  { tag: "사례", text: "△△건설현장 개구부 추락 — 덮개 미설치" },
] as const;

export const SAMPLE_AI_RECOMMENDATION_ITEMS = [
  {
    icon: "지게",
    accent: "danger",
    title: "지게차 후진 경보 작동 점검",
    description: "물류센터 협착 사고 사례 연계 · 우리 현장 지게차 운용 중",
    badge: "우선",
  },
  {
    icon: "온열",
    accent: "warning",
    title: "옥외작업조 휴식시간 조정",
    description: "폭염 경보 지속 · 온열질환 재해 사례 참고",
    badge: "권고",
  },
  {
    icon: "개구부",
    accent: "info",
    title: "개구부 덮개 고정 상태 확인",
    description: "건설현장 추락 사고 사례 공유 · 유사 공정 보유",
    badge: "참고",
  },
] as const;

export const SAMPLE_WEEKLY_TREND = {
  labels: ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "오늘"],
  series: [
    { label: "공유확인", colorVar: "c1", data: [0, 1, 0, 1, 0, 1, 0] },
    { label: "작업 전", colorVar: "c2", data: [1, 0, 1, 0, 0, 0, 0] },
    { label: "익명 의견", colorVar: "c3", data: [0, 1, 1, 0, 1, 0, 0] },
  ],
} as const;

export const SAMPLE_REVIEW_STATUS = {
  unreviewed: 5,
  inReview: 3,
  reviewed: 9,
} as const;

export const SAMPLE_RECENT_SUBMISSIONS = [
  {
    category: "공유확인",
    accent: "info",
    submitter: "익명 근로자",
    avatarLabel: "익",
    content: "7월 위험요인 3건 확인 완료",
    submittedAt: "07.07 09:12",
    status: "검토 대기",
    statusAccent: "warning",
  },
  {
    category: "작업 전",
    accent: "success",
    submitter: "익명 근로자",
    avatarLabel: "익",
    content: "고소작업 전 안전확인 제출",
    submittedAt: "07.07 08:41",
    status: "검토 완료",
    statusAccent: "success",
  },
  {
    category: "익명 의견",
    accent: "warning",
    submitter: "이름 없음",
    avatarLabel: "?",
    content: "지게차 동선 개선 제안",
    submittedAt: "07.05 17:05",
    status: "검토 대기",
    statusAccent: "warning",
  },
  {
    category: "외부인",
    accent: "purple",
    submitter: "협력업체 A",
    avatarLabel: "협",
    content: "출입 전 안전 안내 확인·제출",
    submittedAt: "07.05 13:20",
    status: "검토 완료",
    statusAccent: "success",
  },
  {
    category: "근로자대표",
    accent: "danger",
    submitter: "근로자대표",
    avatarLabel: "대",
    content: "공유확인 검토 의견 기록",
    submittedAt: "07.04 10:33",
    status: "서명 미제출",
    statusAccent: "neutral",
  },
] as const;

export const SAMPLE_NOTIFICATIONS = [
  { accent: "info", title: "공유확인 접수", detail: "익명 근로자 · 오늘 09:12" },
  { accent: "warning", title: "익명 의견 접수", detail: "지게차 동선 개선 제안 · 어제 17:05" },
  { accent: "purple", title: "외부인 확인 제출", detail: "협력업체 A · 어제 13:20" },
] as const;
