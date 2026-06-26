# SafeMetrica Design System and Tenant Shell UX v1

## 1. Purpose

This document defines SafeMetrica's product-wide visual direction and information architecture direction so designers and developers do not diverge while SafeMetrica moves toward a tenant-isolated B2B industrial safety operation SaaS structure.

This is a policy/spec lock. It is not a runtime implementation PR.

This document must be used as the alignment reference before creating tenant shell layouts, manager/admin dashboard placeholders, Field QR surfaces, report views, or future customer-specific UI work.

## 2. Product design positioning

SafeMetrica is not a cute mint app and not a heavy dark-only admin tool.

SafeMetrica should present itself as:

> A tenant-isolated B2B industrial safety operation SaaS for safety operation records, worker confirmations, manager review, representative/owner check, monthly operation summaries, and evidence/report output.

Recommended visual direction:

- Deep navy structure.
- Light cards.
- Teal CTA.
- Limited amber warning.
- White/mint/teal for worker-facing QR.

The product should feel operational, trustworthy, and clear. It should support industrial safety workflows without becoming visually heavy, technical, or intimidating for field workers.

## 3. Reference mix

SafeMetrica should use the following reference blend.

### OKR/executive dashboard style

Use this reference for:

- Organization/status structure.
- Progress state.
- Priority table.
- Executive summary.

### Admin dashboard style

Use this reference for:

- Left navigation.
- Top hero.
- Metric cards.
- Quick actions.
- Pending actions.

### Current Richi light style

Use this reference for:

- Friendly worker-facing tone.
- White/mint/teal for field use.
- Simple action cards.

### Avoid

Do not let SafeMetrica drift into:

- Pure LMS look.
- Healthcare/wellness look.
- Generic ecommerce dashboard look.
- All-dark heavy screen.
- Overly soft mint entire background.

## 4. Core color direction

These color tokens are conceptual policy tokens. This document does not add runtime CSS, theme files, or component implementation.

| Token | Value | Intended use |
| --- | --- | --- |
| Primary Navy | `#0B2742` | Main product structure, header/sidebar, primary trust anchor. |
| Deep Background | `#071526` | Deep structural background where stronger contrast is needed. |
| Surface | `#FFFFFF` | Cards, report panels, input surfaces, readable content blocks. |
| Page Background | `#F6FAF8` or `#F7F9FA` | Light app background behind cards and report surfaces. |
| Teal CTA | `#16A085` | Primary customer-facing action buttons and positive progress CTAs. |
| Teal Dark | `#12806A` | CTA hover/pressed state or stronger teal emphasis. |
| Success Green | `#2ECC71` | Completed/success state only. |
| Warning Amber | `#E67E22` | Review-needed, warning, attention state. |
| Danger Red | `#E74C3C` | Real error, urgent danger, or destructive action only. |
| Text Main | `#102033` | Main body and title text on light surfaces. |
| Text Sub | `#526174` | Secondary explanation, metadata, helper text. |
| Border | `#D6EDE6` or `#E2E8F0` | Card boundaries, separators, subtle field outlines. |

Rules:

- Mint is an accent/helper surface, not the whole product background.
- Red is only for real error/urgent danger.
- Amber/orange is for review-needed/warning.
- CTA should be teal or navy, not many colors.
- Dark navy should create trust and structure, not make every screen heavy.

## 5. Layout principles by area

### A. Tenant logged-in manager/admin screens

Tenant logged-in manager/admin screens should use:

- Deep navy header or sidebar.
- Light page background.
- White cards.
- A first screen that shows today's priority.
- Metric cards limited to 3-4.
- Quick actions limited to 4.
- Detailed links hidden in a secondary section or separate page.

The home screen should not become a sitemap. It should tell the manager what needs attention today and provide the shortest path to review, share, confirm, or summarize work.

### B. Owner/internal screens

Owner/internal screens:

- May use denser multi-tenant structures.
- Must clearly distinguish internal/Owner scope.
- Must never expose Owner/internal UI to customer users.

Owner/internal UI may include cross-tenant operational views, but those controls must not be reused in customer-visible tenant dashboards.

### C. Field QR screens

Field QR screens must be:

- Mobile-first.
- No-login by default.
- White/mint/teal.
- Large touch targets.
- Minimal text.
- Free of internal terms.
- Free of heavy dashboard UI.
- Optimized for fast confirmation and submission.

Field QR screens are not miniature admin dashboards. They are field action surfaces for workers who need to confirm, sign, add a note, or submit feedback quickly.

### D. Representative/Owner customer report view

Representative/Owner customer report views should use:

- Light report/summary style.
- Operational record clarity.
- Plain language.
- Print/export-friendly structure.

Avoid:

- Technical jargon.
- Legal guarantee language.
- UI that implies SafeMetrica replaces legally required responsible persons, agencies, or professional judgment.

## 6. Tenant isolation and UI

Common UI components are allowed. Shared customer screens are not allowed.

Rules:

- Common design system may be shared.
- Common layout components may be shared.
- Common auth shell may be shared.
- Every customer login must render tenant-isolated screens.
- Customer users must never see cross-tenant filters.
- Company selector across tenants is Owner/internal-only.
- Customer dashboard must show only that tenant's records, QR, reports, submissions, and settings.

Examples:

- Richi login -> Richi dashboard only.
- Hyundai Hoist login -> Hyundai Hoist dashboard only.
- Future tenant login -> that tenant dashboard only.

Tenant isolation is a product and UX rule, not only a backend rule. Any UI that suggests cross-tenant browsing for customer users is invalid.

## 7. Recommended tenant manager dashboard IA

### Desktop manager/admin home

Recommended structure:

1. Deep navy header or sidebar.
2. Tenant label.
3. Priority Hero:
   - Review pending items.
   - Urgent/attention items.
   - Primary CTA.
4. 3 metric cards:
   - Today/this month confirmations.
   - Feedback/review items.
   - Representative/owner check.
5. Quick actions:
   - Field QR share.
   - TBM/prework.
   - Manager inbox.
   - Monthly operation record.
6. Monthly operation summary:
   - Short briefing.
   - Key progress indicators.
7. Detailed operations:
   - Collapsed or secondary page.

### Mobile manager/admin home

Priority order:

1. Review pending items.
2. Primary CTA.
3. TBM/prework.
4. Field QR share.
5. Monthly operation record.
6. Key metrics.
7. Detailed operations collapsed.

Mobile should favor action order over dashboard completeness.

## 8. SafeMetrica IA from uploaded flow-map direction

SafeMetrica IA should reflect the existing flow-map concepts below.

### Representative/Owner operation flow

- Dashboard.
- Risk view / risk assessment status.
- Action flow.
- Evidence book.
- PTW status.
- Monthly report.
- Print/export.

### Site manager operation flow

- Daily TBM.
- Field participation inbox.
- Risk assessment confirmation/monthly storage.
- Action needed items.
- Field notice.
- Evidence book.
- PTW.

### Risk assessment management flow

- Risk intelligence / risk assessment status.
- Risk item detail.
- Improvement before/after / responsible person / approval status.
- Risk assessment print support.
- Formal table output.

### Monthly report/output flow

- Monthly safety operation report.
- Summary view.
- Detail view.
- Risk assessment output.
- PDF save/print.
- Recent TBM/operation data aggregation.

### Full operation tenant flow

- Worker field confirmation/opinion link.
- Field voice/inbox.
- Manager risk-share/inbox.
- Monthly report.
- Representative confirmation management.

## 9. UX principles

Use these principles:

- Home is for what the operator must do today.
- Reports are for detailed results.
- Settings/export/details should not dominate the home screen.
- Representative/owner screens should prioritize judgment flow, not raw numbers.
- Manager screens should prioritize action and review.
- Field screens should prioritize speed and clarity.
- Monthly report/output screens should be print/report friendly.

## 10. Component direction

Common building blocks:

- Priority hero card.
- Metric summary card.
- Quick action card.
- Pending action card.
- Collapsible section.
- Data table / status table.
- PDF/export action button.
- Field QR identity card.
- Field QR signature card.
- Field QR special note card.
- Tenant shell header/sidebar.
- Tenant-safe breadcrumb or label.

These building blocks may be reused across tenants only when their data scope remains tenant-isolated.

## 11. Copy rules

### Use

- 운영기록
- 확인기록
- 관리자 검토
- 후속 확인
- 공유 위험요인
- 월간 운영요약
- 안전운영 기록

### Do not use

- Legal guarantee.
- Penalty prevention guarantee.
- Immunity.
- Accident prevention guarantee.
- Automatic legal compliance.
- AI legal judgment.
- Risk assessment agency/substitute wording.
- Safety management agency/substitute wording.

### Avoid customer-facing internal terms

- Supabase.
- Notion DB.
- API.
- raw_payload.
- service role.
- schema/profile names.
- Owner Console internals.

Customer-facing copy must describe operational value, confirmation flow, review status, and report output without exposing implementation details.

## 12. Design guardrails

Avoid:

- All features shown on home.
- More than 4 equal-weight cards at top.
- Too many amber boxes.
- Dark and light screens feeling like different products.
- Customer-facing technical jargon.
- Putting reports/export ahead of daily work.
- Mixing tenant data in UI.
- Forcing Field QR login.
- Customer-visible cross-tenant filters.

## 13. Implementation phases

### Phase 1

Document design system and IA policy.

### Phase 2

Create tenant shell placeholder with design tokens only, no real data.

### Phase 3

Create manager dashboard placeholder for new tenants only.

### Phase 4

Apply design system to Richi tenant candidate.

### Phase 5

Map Bubblemon Field QR pieces progressively without forced login migration.

### Phase 6

Design Hyundai Hoist after work order/completion report/photo samples.

## 14. Non-goals

This document PR must not:

- Modify runtime code.
- Change routes.
- Add CSS/theme runtime implementation.
- Alter existing customer screens.
- Change Bubblemon #691 gate.
- Wire Field QR cards into production.
- Add auth logic.
- Add DB schema/migrations.

## 15. Validation

Required validation for this documentation-only policy change:

```bash
git diff --check
```
