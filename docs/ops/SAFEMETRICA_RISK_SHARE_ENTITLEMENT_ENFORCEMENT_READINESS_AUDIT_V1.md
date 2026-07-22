# Risk Share entitlement enforcement readiness audit v1

Status: repository-only inspection record. This document authorizes nothing.
It does not supersede
`docs/ops/SAFEMETRICA_RISK_SHARE_ENTITLEMENT_ENFORCEMENT_TRANSITION_CANDIDATE_V1.md`;
it records the current Runtime state against that candidate's approval gates.

## Purpose

Name every actual Runtime boundary that could someday be gated by `risk_share`
product entitlement, record which existing guard currently makes that
boundary's access decision, and record whether entitlement code is connected
to that decision today. This is an inspection artifact, not a rollout step.

## Runtime boundary inventory

Boundary ids match `RISK_SHARE_ENTITLEMENT_SHADOW_BOUNDARIES` in
`src/lib/risk-share/riskShareEntitlementShadow.ts`.

| Boundary id | Kind | Runtime file | Legacy decision guard | Entitlement connected? |
| --- | --- | --- | --- | --- |
| `saas.manager.page` | authenticated_read | `src/app/risk-share/manager/page.tsx` | `requireTenantManagerAccessForCurrentSession`, `canAccessRiskShareManagerTenant` | Shadow-only, `test-risk-pack-01` gate, non-blocking |
| `saas.monthly.page` | authenticated_read | `src/app/risk-share/monthly/page.tsx` | `requireTenantManagerAccessForCurrentSession`, `resolveActiveRiskSharePublicTenant` | No |
| `saas.publish.mutation` | authenticated_mutation | `src/app/api/risk-share/manager/publish/route.ts` | `requireTenantAccessForCurrentSession`, `resolveActiveRiskSharePublicTenant` | No |
| `saas.preparation.mutation` | authenticated_mutation | `src/app/api/risk-share/manager/preparation/route.ts` | `requireTenantAccessForCurrentSession`, `resolveActiveRiskSharePublicTenant` | No |
| `saas.share_review.mutation` | authenticated_mutation | `src/app/api/risk-share/manager/share-review/route.ts` | `requireTenantAccessForCurrentSession`, `resolveActiveRiskSharePublicTenant` | No |
| `public.participation.submit` | public_mutation | `src/app/api/risk-share/participation/submit/route.ts` | `resolveActiveRiskSharePublicTenant`, `resolveActiveRiskSharePublicVersion` | No |
| `public.anonymous.submit` | public_mutation | `src/app/api/risk-share/anonymous/submit/route.ts` | `resolveActiveRiskSharePublicTenant`, `consumeRiskSharePublicRateLimit` | No |
| `public.visitor.submit` | public_mutation | `src/app/api/risk-share/visitor/submit/route.ts` | `resolveActiveRiskSharePublicTenant`, `consumeRiskSharePublicRateLimit` | No |
| `public.representative.submit` | public_mutation | `src/app/api/risk-share/representative/submit/route.ts` | `resolveActiveRiskSharePublicTenant`, `consumeRiskSharePublicRateLimit` | No |
| `legacy.manager.page` | legacy_read | `src/app/manager/risk-share/page.tsx` | `getCompanyConfig`, `getCompanyConfigByCode` | No |
| `legacy.field_participation.submit` | legacy_mutation | `src/app/api/field/participation/submit/route.ts` | `getCompanyConfig`/`getCompanyConfigByCode` (same legacy company guard family) | No |

Finding: `riskShareEntitlementAccess` (the reader) and
`riskShareEntitlementRuntimeShadow` (the shadow) are imported by exactly one
Runtime file, `src/app/risk-share/manager/page.tsx`, matching the repository
lock in the transition candidate. Every other boundary's access decision is
made only by its pre-existing tenant/session/membership/rate-limit guard.

## Admin read / mutation / public submission coverage

- Admin read paths: `saas.manager.page`, `saas.monthly.page` are gated by
  `requireTenantManagerAccessForCurrentSession` before any Risk Share data is
  rendered. `legacy.manager.page` is gated by the older
  `getCompanyConfig`/`getCompanyConfigByCode` company lookup and, on the
  common path, redirects into the session/membership-guarded
  `/risk-share/manager` rather than rendering data itself.
- Admin mutation/API paths: `saas.publish.mutation`,
  `saas.preparation.mutation`, `saas.share_review.mutation`. All gated by
  `requireTenantAccessForCurrentSession` before the mutation body executes.
- Public QR / public submission paths: `public.participation.submit`,
  `public.anonymous.submit`, `public.visitor.submit`,
  `public.representative.submit` are gated by
  `resolveActiveRiskSharePublicTenant` plus a rate limit where the route
  accepts unauthenticated writes. `legacy.field_participation.submit` uses the
  older `getCompanyConfig`/`getCompanyConfigByCode` company guard instead.

No boundary in any of the three groups currently branches on entitlement
state. The objective state groups and decision matrix in the transition
candidate remain proposals only.

## Rollback readiness

- The only Runtime call site, `src/app/risk-share/manager/page.tsx`, invokes
  `observeInternalTestRiskShareEntitlementShadow` strictly after both legacy
  guard branches (`tenantAccessResult.ok`, `canAccessRiskShareManagerTenant`)
  have already returned or redirected. The call's resolved value is never
  read, assigned, or branched on.
- `observeInternalTestRiskShareEntitlementShadow` returns `Promise<void>`,
  wraps its lookup in `try/catch`, and the catch block is empty by design so
  a reader or timeout failure cannot surface to the caller.
- Deleting the single call site and its import restores
  `src/app/risk-share/manager/page.tsx` to a page whose access decision is
  made entirely by the two pre-existing guards, with no other code path
  affected.
- No feature flag currently exists for entitlement enforcement. Introducing
  one and rehearsing an on/off rollback against synthetic fixtures remains a
  gate in the transition candidate's rollout order (steps 4 and 7) and is not
  performed by this audit.
- Rollback must restore the legacy decision without deleting
  `tenant_product_entitlements` rows or entitlement audit events. This audit
  does not delete, backfill, or migrate any such data.

## Entitlement and audit data preservation principle

Entitlement rows and their audit events are append-only evidence, not
disposable cache state. A rollback of Runtime access behavior is a policy
change; it must never be implemented as, or accompanied by, deletion of
entitlement or audit rows. Restoring the legacy decision and preserving prior
entitlement/audit history are independent operations and both are required.

## What this audit does not do

- It does not change any Runtime access decision.
- It does not enable, expand, or schedule the shadow beyond
  `test-risk-pack-01`.
- It does not flip a feature flag; none exists yet.
- It does not touch a migration or Production schema.
- It does not expand to actual customers or approve public QR policy.
- It does not perform the rollback rehearsal itself — it only records that
  the current single call site is structurally reversible.

## Open gates before an enforcing patch

Unchanged from the transition candidate's approval gates: customer
entitlement evidence and backfill scope; synthetic Production fixtures and
cleanup rules; the lookup-uncertainty policy per boundary family; the
enforcing Runtime patch itself; Production rollout and rollback activation;
actual-customer expansion and sale readiness. This audit satisfies none of
them; it narrows the boundary inventory from a static list to a file-by-file
inspection result.
