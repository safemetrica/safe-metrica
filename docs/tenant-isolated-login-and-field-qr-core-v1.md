# Tenant-Isolated Login and Field QR Core v1 Policy

## Critical principle

SafeMetrica should move as one product, not as endless company-by-company custom work. However, customer screens and data must be strictly separated by tenant.

Common codebase does not mean shared customer screens.
Common login does not mean one shared dashboard.
Common Field QR Core does not mean mixed records.

The correct architecture is:

* One shared SafeMetrica codebase.
* One common auth/authorization engine for new tenant login areas.
* Tenant-isolated logged-in dashboards.
* Tenant-scoped Field QR flows.
* Tenant-scoped records, reports, QR settings, manager inboxes, worker submissions, and monthly reports.
* No cross-tenant data exposure.
* No shared customer dashboard.
* No mixed company records in customer-facing views.

## 1. Purpose

This document defines the operating policy for:

* Existing customer legacy operation.
* New customer tenant-isolated login operation.
* Common Field QR Core across all tenants.
* Tenant data isolation.
* Future migration direction.

This document is a policy/spec lock, not a runtime implementation PR.

## 2. Existing customer policy — do not force login migration

Existing customers must remain on their current operational flow for now:

* `daedo`
* `dongwoo`
* `hankookgreen`
* `bubblemon`

Policy:

* Do not force these existing customers into a new login flow.
* Do not break existing routes.
* Do not break current Notion bridge / legacy behavior where already used.
* Do not refactor them into the new login structure without a separate tested migration plan.
* Apply only safe, targeted fixes.
* Keep production stability first.
* Do not mix existing customer data with new tenant-login screens.

Existing customer rule:

Current customers stay stable. New architecture must not damage working legacy operation.

## 3. New customer policy — tenant-isolated login structure

New customers from Richi and future tenants should move toward tenant-isolated login-based operation:

* `richi`
* `hyundai-hoist` / hoist future tenant
* future manufacturing tenants
* future logistics tenants
* future food factory tenants
* future contractor/external workforce tenants

Policy:

* Manager/Admin/Owner/Representative/HQ dashboards should be login-based.
* Login must resolve tenant membership.
* After login, each customer must enter only their own tenant-isolated screen.
* Customer users must never see another customer’s records, reports, submissions, QR settings, or dashboards.
* Avoid company-specific hardcoded UI branches.
* Use tenant registry / config / template / profile direction for onboarding.
* A customer dashboard may use common components, but must be rendered inside a tenant-scoped runtime context.

Tenant login examples:

* Richi manager login → only Richi dashboard, Richi records, Richi QR, Richi reports.
* Hyundai Hoist manager login → only Hyundai Hoist dashboard, Hoist records, Hoist QR, Hoist reports.
* Future company login → only that company’s dashboard, records, QR, reports.

Never implement customer login as one shared customer dashboard with a visible company filter.
Company filters across multiple tenants are Owner/internal-only.

## 4. Tenant isolation rule

For logged-in customer screens:

* Resolve tenant from authenticated user membership, not from unsafe client-only query parameters.
* Every server-side query must be scoped by `tenant_id` / `company_code`.
* Every customer-facing screen must load only the selected tenant’s data.
* If a user belongs to multiple tenants, show an explicit tenant switcher.
* Never mix multiple tenants’ operational records in one customer-facing view.
* Owner/internal screens may view multiple tenants only under Owner authorization.
* Owner/internal multi-tenant views must never be exposed to customer users.

Strictly separate by tenant:

* manager dashboard
* representative dashboard
* owner/customer report view
* manager inbox
* worker submissions
* risk share summaries
* TBM records
* monthly reports
* evidence records
* QR settings
* export/downloads

## 5. Field QR Core policy — common engine, tenant-scoped records

Field QR should become a common core across both existing and new tenants.

Field QR users:

* worker
* visitor
* supplier / delivery driver
* contractor / external participant
* site participant

Default Field QR policy:

* No login by default.
* Tenant-scoped QR entry.
* Simple identity confirmation where required.
* Optional mobile handwritten signature by tenant/mode config.
* Optional remember-info by tenant config.
* Anonymous feedback separated from identified confirmation.
* Submitted records must include the correct tenant/company context.
* Worker/visitor QR screens must never expose another tenant’s risk items, reports, or submissions.

Important:

Common Field QR Core means common UX/logic modules.
It does not mean common customer data or mixed submissions.

## 6. Common Field QR modes

Standard modes:

* `monthly_risk_share_confirmation`
* `daily_prework_safety_check`
* `anonymous_feedback`
* `visitor_safety_confirmation`

Mode meanings:

### `monthly_risk_share_confirmation`

* Monthly or changed-risk shared risk confirmation.
* Requires actual visible shared risk items before proceeding.
* `cadence=monthly`.

### `daily_prework_safety_check`

* Lightweight prework check.
* Focused on today’s PPE, route, storage/stacking, equipment, and site-specific checks.
* Must not force monthly risk summary viewing.
* `cadence=daily`.

### `anonymous_feedback`

* Anonymous opinion / near miss / improvement suggestion.
* Separate route/flow.
* No name, team, phone, employee number, or signature.
* `anonymous=true`.
* `identityMode=anonymous`.

### `visitor_safety_confirmation`

* Future visitor/supplier/delivery/contractor safety confirmation.
* No speculative implementation in this document PR.
* Must be tenant-scoped when implemented.

## 7. Common Field QR modules

These common modules should be extracted over time:

* mode selection
* shared risk summary view
* monthly shared-risk item gate
* daily prework checklist
* special note yes/no
* identity card
* mobile handwritten signature
* remember worker info
* evidence photo upload
* completion screen
* manager review candidate generation

These modules should be configurable by tenant and mode instead of implemented separately per company.

## 8. Monthly risk-share gate policy

Monthly risk-share confirmation must require actual visible shared risk items before proceeding.

Required principle:

* Do not allow monthly confirmation when shared risk items fail to load.
* Do not treat a button click alone as confirmation.
* Do not proceed when `riskItems.length === 0`.
* Show manager-check guidance if shared risk items cannot be loaded.
* Preserve the #691 Bubblemon gate principle.

Correct behavior:

* Before shared risk view: blocked.
* After view + no items: blocked.
* After view + actual items visible: allowed to continue.

## 9. Daily prework policy

Daily prework should stay lightweight.

Typical checklist categories:

* PPE / protective equipment
* route / pathway
* stacking / storage
* forklift / cart / loading / unloading
* site-specific hazards

Daily prework must not require monthly shared-risk item viewing.
Daily prework may use a different checklist per industry profile.

## 10. Anonymous feedback policy

Anonymous feedback must stay separate from identified confirmation.

Anonymous feedback must not collect:

* name
* team
* phone
* employee number
* handwritten signature

Anonymous feedback should use:

* `anonymous=true`
* `identityMode=anonymous`
* no `signature_required`
* manager review candidate

Do not mix anonymous feedback with identified confirmation/signature flow.

## 11. Signature policy

Mobile handwritten signature should become a common Field QR module controlled by tenant/mode config.

Examples:

* Richi signed prework confirmation: signature required.
* Bubblemon monthly/daily identified confirmation: planned to use common signature module.
* Anonymous feedback: signature not collected.
* Visitor confirmation: future configurable signature option.

Do not create separate custom signature implementation per tenant unless unavoidable.

## 12. Remember-info policy

Optional tenant-scoped remember-info module.

Allowed to remember:

* name / submitter
* team / workerTeam
* phoneLast4
* employeeNo or field ID

Do not store:

* signature image
* opinion content
* photos
* raw_payload
* token
* internal IDs
* customer raw data

Use tenant-scoped localStorage key:

```text
safemetrica:<tenant>:worker-confirmation-info:v1
```

Recommended helper copy:

> 공용 휴대폰이면 체크하지 마세요. 이름, 소속/작업조, 확인번호만 이 브라우저에 저장됩니다.

## 13. Login strategy

Login-based areas:

* Owner Console
* Admin dashboard
* Manager dashboard
* Representative dashboard if needed
* HQ manager dashboard
* Customer owner/representative report view

No-login by default:

* Field worker QR
* Visitor QR
* Supplier/delivery QR
* Anonymous feedback QR

Future option:

* Repeat worker simple login/account may be considered later.
* Do not force worker login in Field QR Core v1.
* Do not force login migration on existing customers.

## 14. Tenant config direction

Conceptual config shape:

* `tenantCode`
* `tenantId`
* `serviceMode`
* `legacyMode`
* `enabledModes`
* `industryProfile`
* `copyPack`
* `themeTokens`
* `signatureRequiredByMode`
* `identityRequiredByMode`
* `rememberInfoEnabled`
* `riskSummaryRequiredByMode`
* `reportTemplate`
* `managerDashboardTemplate`
* `fieldQrTemplate`

Config purpose:

* Reduce company-specific hardcoding.
* Keep customer screens tenant-specific.
* Keep data tenant-isolated.
* Allow common components to render different tenant experiences safely.

## 15. Tenant mapping examples

### Existing legacy group

#### `daedo`

* Keep current flow.
* Do not force login migration.
* Apply only safe targeted fixes.

#### `dongwoo`

* Keep current flow.
* Do not force login migration.
* Apply only safe targeted fixes.

#### `hankookgreen`

* Keep current flow.
* Do not force login migration.
* Apply only safe targeted fixes.

#### `bubblemon`

* Keep current flow.
* Apply Field QR Core progressively.
* Preserve #691 monthly shared-risk gate.
* Do not force login migration now.

### New/common group

#### `richi`

* Move toward tenant-isolated login for manager/admin where applicable.
* Field QR should be mapped into common Field QR Core.
* Signed confirmation and anonymous feedback should become common modules.

#### `hyundai-hoist`

* Design after receiving work order, completion report, and photo samples.
* Use hoist/crane/maintenance profile later.
* No speculative custom route.

#### Future tenants

* Use tenant registry/config/template onboarding.
* Do not create new company-specific UI branches unless unavoidable.

## 16. Migration plan

Phase 1:
Document this policy and stop ad hoc company-specific QR customization.

Phase 2:
Protect existing tenants and current production routes.

Phase 3:
Extract common Field QR identity/signature/remember-info modules.

Phase 4:
Map Richi and Bubblemon flows into common Field QR Core without breaking production.

Phase 5:
Use tenant-isolated login structure for new tenants.

Phase 6:
Migrate existing tenants only when there is a clear operational reason, customer need, and tested migration plan.

## 17. Non-exposure rules

Do not expose customer-facing text or UI with:

* Owner Console internals
* Notion DB
* Supabase
* API internals
* tokens
* service role
* environment variables
* raw_payload
* internal IDs
* schema/profile names
* customer raw data

## 18. Legal/copy guardrails

Do not use:

* legal guarantee
* penalty prevention guarantee
* immunity
* accident prevention guarantee
* automatic legal compliance
* AI legal judgment
* risk assessment agency/substitute wording
* safety management agency/substitute wording

Use:

* operating record
* confirmation record
* manager review
* follow-up check
* shared risk item
* monthly operation summary
* safety operation record

## 19. Development guardrails

This PR must be documentation-only.

Do not:

* modify runtime code
* modify routes
* add components
* add DB schema/migrations
* change authentication logic
* change Field QR runtime behavior
* weaken #691 Bubblemon monthly gate
* force login on existing customers
* force login on Field QR v1
* introduce a shared customer dashboard
* expose multi-tenant filters to customer users

Validation:

```sh
git diff --check
```
