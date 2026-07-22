# Risk Share entitlement enforcement transition candidate v1

Status: repository-only candidate. This document does not authorize Runtime enforcement.

## Purpose

Define the evidence and failure boundaries required before `risk_share` product
entitlement can affect an existing Runtime access decision. The current legacy
decision remains authoritative until every gate below is approved separately.

## Fixed safety boundaries

- Tenant authentication, membership, role, `tenant_id`, `tenant_code`, and
  `site_id` checks remain mandatory and run before product access evaluation.
- Entitlement is a product-use condition. It never replaces tenant isolation,
  authentication, RLS, Storage, or record ownership checks.
- Shadow observations must not contain tenant, company, user, request, contact,
  free-text, URL query, or credential data.
- No actual customer may be inferred as entitled from `service_mode`, current
  usage, an existing route, or a successful legacy decision.
- Public safety submissions and authenticated mutations are separate rollout
  boundaries. Success at one boundary does not authorize another.
- AI or a rule may classify objective entitlement state, but cannot approve a
  contract, free provision, suspension exception, termination, or reactivation.

## Objective state groups

| Group | States | Meaning before enforcement |
| --- | --- | --- |
| allow candidate | `active_effective` | Eligible only after identity and policy-version checks pass |
| known inactive | `pending`, `not_yet_effective`, `suspended`, `expired`, `terminated` | Deny candidate; customer-facing wording and recovery path require approval |
| coverage gap | `entitlement_missing` | HOLD; never auto-convert current usage into a grant |
| system uncertainty | `lookup_failed`, `invalid_response` | HOLD; must not be presented as a contractual denial |

## Rollout order

1. Internal-test authenticated read shadow only.
2. Stable observation window with no unexplained mismatch or privacy leak.
3. Approved entitlement inventory and evidence-bound backfill plan.
4. Synthetic tenant tests for active, missing, suspended, expired, terminated,
   invalid response, timeout, retry, and recovery.
5. Separate decision for authenticated reads.
6. Separate decisions for authenticated mutations and each public submission
   family. Public QR writes do not inherit a read-page decision.
7. Rollback rehearsal that restores the legacy decision without deleting
   entitlement or audit rows.
8. Representative approval, staged deployment, Production verification, and
   Manual QA.

## Decision matrix requiring human approval

| Boundary | Known inactive | Missing | Lookup failure / invalid response |
| --- | --- | --- | --- |
| authenticated read | deny candidate | HOLD | availability fallback candidate; alert required |
| authenticated mutation | deny candidate | HOLD | HOLD; no success response without completed write |
| public safety submission | separate decision | HOLD | safety-continuity decision required |
| legacy read / mutation | no automatic change | no automatic change | preserve current result |

The table records candidates, not deployed policy. In particular, fail-open or
fail-closed behavior for system uncertainty and public safety submissions is not
approved by this document.

## Required evidence before any enforcing patch

- Every affected boundary is named in the reviewed boundary inventory.
- Test and approved customer entitlements have explicit source evidence,
  effective dates, policy version, and append-only audit events.
- Shadow results are reviewed by deployment time window so pre-deployment
  timeout rows cannot be mixed with current evidence.
- Timeout, upstream error, missing config, and invalid response remain distinct.
- Cross-tenant, cross-site, URL tampering, session, role, and RLS regression tests pass.
- Retry does not duplicate writes or audit events, and partial failure cannot be
  reported as success.
- Customer-facing inactive and temporary-error messages are distinct and do not
  claim legal termination or contractual facts that the system cannot prove.
- A feature flag or equivalent reversible switch is specified; rollback changes
  access policy only and never deletes business or audit data.
- Production, Runtime, and Manual QA are recorded separately from GitHub merge.

## Current repository lock

- Only `test-risk-pack-01` may execute the temporary manager-page shadow read.
- The shadow result cannot alter the legacy allow decision.
- No other boundary may import the entitlement reader or Runtime shadow helper.
- No backfill, customer expansion, public QR enforcement, or product-access
  enforcement is authorized by this candidate.

## Approval gates

Separate explicit approval is required for:

1. customer entitlement evidence and backfill scope;
2. synthetic Production fixtures and cleanup rules;
3. the policy for lookup uncertainty at each boundary family;
4. an enforcing Runtime patch;
5. Production rollout and rollback activation;
6. actual-customer expansion and sale readiness.
