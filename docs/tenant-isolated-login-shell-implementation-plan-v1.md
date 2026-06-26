# Tenant-Isolated Login Shell Implementation Plan v1

## 1. Purpose

This document defines the safe implementation plan for the SafeMetrica tenant-isolated login shell v1.

SafeMetrica must move toward a SaaS structure with one shared codebase and a common auth/authorization engine, while keeping every customer screen and every customer record tenant-isolated. Common code and common authorization logic are allowed. Shared customer dashboards, mixed tenant data, and customer-visible cross-tenant company filters are not allowed.

This plan protects current customer flows while defining the target direction for new and future tenants.

## 2. Non-goals

This documentation PR must not:

- Modify runtime code.
- Modify auth logic.
- Modify routes.
- Add database schema or migrations.
- Change existing customer behavior.
- Force login on existing customers.
- Force login on Field QR flows.
- Weaken the #691 Bubblemon monthly gate.
- Expose shared customer dashboards.

## 3. Existing customer protection

The following existing customers remain stable and must not be forced into a login migration by tenant-isolated login shell v1:

- `daedo`
- `dongwoo`
- `hankookgreen`
- `bubblemon`

Protection rules:

- No forced login migration.
- No route breaking.
- No Notion bridge disruption.
- No cross-tenant mixing.
- Only targeted fixes are allowed for existing customer flows.

Any future migration for an existing customer must be handled through a separate, tested plan with explicit compatibility checks and rollback criteria.

## 4. New tenant login target

New and future customers should move toward tenant-isolated login areas. Candidate tenants include:

- `richi`
- `hyundai-hoist`
- Future tenants

Login-based areas for new tenants may include:

- Manager dashboard.
- Admin dashboard.
- Representative dashboard, if needed.
- Owner/customer report view.
- HQ manager dashboard, if needed.

Each area must render only one tenant context at a time.

## 5. Tenant isolation requirements

Every logged-in customer screen must:

- Resolve the tenant from authenticated user membership.
- Scope every server-side query by `tenant_id` and/or `company_code`.
- Load only that tenant's records.
- Never rely on unsafe client-only company query parameters for authorization.
- Never show other tenants' records.
- Never show Owner/internal multi-tenant filters to customer users.

Tenant identity must be enforced on the server side. Client route parameters, selected UI filters, local storage, or query strings may help navigation, but they must not be the source of authorization truth.

## 6. Multi-tenant user rule

If one user belongs to multiple tenants:

- Show an explicit tenant switcher.
- Never mix tenants in one operational view.
- Every screen must render one selected tenant context at a time.

The selected tenant context must be validated against the authenticated user's memberships before any tenant data is loaded.

## 7. Owner/internal exception

Owner/internal screens may see multiple tenants only under Owner authorization.

Owner/internal multi-tenant views must never be exposed to customer users. Customer users must not see Owner/internal tenant lists, multi-tenant filters, cross-tenant exports, internal operations, or internal implementation details.

## 8. Suggested route direction

The conceptual route direction for tenant-isolated login shell v1 is:

- `/login`
- `/tenant/[tenantCode]/manager`
- `/tenant/[tenantCode]/admin`
- `/tenant/[tenantCode]/reports`
- `/tenant/[tenantCode]/qr`
- `/owner/...` for internal-only multi-tenant views

These route names are conceptual only. Actual route names, nesting, and layout boundaries can change after implementation review. Any future route implementation must preserve existing customer routes unless a separate migration plan explicitly approves the change.

## 9. Session and membership concept

Tenant-isolated login shell v1 should be designed around the following conceptual entities:

- `user`: the authenticated person.
- `tenant`: the customer organization or tenant boundary.
- `tenant_membership`: the relationship between a user and a tenant.
- `role`: the user's role within a tenant or internal scope.
- `selectedTenant`: the single tenant context currently rendered for the user.
- `permission scope`: the server-validated set of actions and records available to the user.

Conceptual role names:

- `owner_internal`
- `tenant_admin`
- `tenant_manager`
- `tenant_representative`
- `tenant_viewer`

This document does not add schema. Any future schema, migration, or storage change must be proposed and reviewed in a separate code PR.

## 10. Data isolation checklist

Every future tenant route must check:

- The authenticated user exists.
- The user has membership for the requested tenant.
- The requested tenant matches the user's membership.
- Every query is scoped by `tenant_id` and/or `company_code`.
- A customer user cannot access the Owner/internal tenant list.
- There are no customer-facing cross-tenant exports.
- Raw internal IDs are not exposed in the UI.

A route must fail closed if any required tenant, membership, role, or scope check cannot be confirmed.

## 11. Field QR relationship

Field QR remains no-login by default, including:

- Worker QR.
- Visitor QR.
- Supplier/delivery QR.
- Anonymous feedback QR.

Field QR must still be tenant-scoped by QR, company, or tenant context. Field QR records must save to the correct tenant. Field QR must not show another tenant's risk items or submissions.

Tenant-isolated login shell work must not force login on Field QR flows unless a separate product decision and implementation plan explicitly require it.

## 12. Implementation phases

### Phase 1: Documentation and guardrails

Create this documentation-only implementation plan and use it as the guardrail for future code PRs.

### Phase 2: Tenant auth and membership types

Create tenant auth/membership type definitions and server guard helpers. These helpers should centralize membership validation, tenant selection validation, and role/scope checks.

### Phase 3: Tenant shell layout placeholder

Create a tenant shell layout component with no real customer data. The shell should prove navigation and layout boundaries without introducing tenant data access risk.

### Phase 4: Tenant-scoped manager dashboard placeholder

Create a tenant-scoped manager dashboard placeholder for new tenants only. The placeholder must not affect existing customer routes or behavior.

### Phase 5: Richi candidate mapping

Map `richi` as the first tenant-isolated login candidate. Confirm the required roles, manager flows, report views, and Field QR relationship before loading real data.

### Phase 6: Hyundai Hoist design

Design `hyundai-hoist` after work order, completion report, and photo samples are reviewed. The design must confirm tenant scope before implementation.

### Phase 7: Existing tenant migration plan

Migrate existing tenants only with a separate tested plan. Existing tenant migration must include compatibility checks, route protection, data isolation validation, and rollback criteria.

## 13. First code PR after this document

The first code PR after this document should be:

`feat: add tenant auth guard types and shell placeholders`

That future PR should add only the minimum type definitions, server guard helpers, and placeholder shell surfaces needed to start tenant-isolated login implementation safely.

This document PR itself is documentation-only and must not change runtime behavior.

## 14. Non-exposure rules

Do not expose customer-facing text or UI with:

- Owner Console internals.
- Notion DB.
- Supabase.
- API internals.
- Tokens.
- Service role.
- Environment variables.
- `raw_payload`.
- Internal IDs.
- Schema/profile names.
- Customer raw data.

Customer-facing screens should use product-safe wording and hide internal implementation details.

## 15. Legal and copy guardrails

Do not use:

- Legal guarantee.
- Penalty prevention guarantee.
- Immunity.
- Accident prevention guarantee.
- Automatic legal compliance.
- AI legal judgment.

Use terms such as:

- Operating record.
- Confirmation record.
- Manager review.
- Follow-up check.
- Shared risk item.
- Monthly operation summary.
- Safety operation record.
