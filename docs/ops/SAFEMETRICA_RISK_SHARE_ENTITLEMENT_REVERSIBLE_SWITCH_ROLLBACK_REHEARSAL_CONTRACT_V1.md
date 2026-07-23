# Risk Share entitlement reversible switch and rollback rehearsal contract v1

Status: repository-only readiness contract. This document creates no feature
flag, changes no Runtime access decision, and authorizes no Production action.

## Purpose

Define the reversible-switch and rollback evidence required before a
`risk_share` entitlement can enforce any Runtime boundary. Rollback restores
the previous legacy access decision; it never changes tenant isolation and it
never deletes entitlement, business, or audit evidence.

## Reversible switch contract

- The switch is server-only, denylisted from client bundles and customer
  payloads, and defaults to OFF when configuration is absent, malformed, or an
  unknown policy version is supplied.
- OFF means the existing tenant, session, membership, role, site, RLS, Storage,
  and record-ownership decisions remain authoritative. OFF must not mean allow
  without those guards.
- Activation is allowlisted by an exact policy version and boundary id. An
  authenticated-read approval cannot activate authenticated mutations, public
  submissions, or legacy boundaries.
- The first eligible boundary is `saas.manager.page` for a dedicated synthetic
  tenant only. `test-risk-pack-01`, an existing customer, a legacy tenant, a
  prospect, or a partner must not be used for enforcement rehearsal.
- A switch value must never be accepted from a URL, request body, cookie,
  browser storage, tenant profile, customer-controlled metadata, or a public
  environment variable.
- Every change requires an authorized actor, reason, approved policy version,
  exact boundary allowlist, deployment receipt, activation time, and expiry or
  rollback deadline. Credentials and customer or worker personal data are
  prohibited from the receipt.

## Decision ordering

For an enabled boundary, existing tenant-isolation and authorization guards run
first. Entitlement evaluation may only narrow a legacy allow result; it cannot
convert a legacy deny or error into allow. A lookup timeout, missing config,
upstream error, invalid response, missing entitlement, or inactive entitlement
must remain distinguishable in evidence.

The policy for lookup uncertainty and public safety submissions remains HOLD.
This contract does not choose fail-open or fail-closed behavior for either
case. No successful authenticated-read rehearsal authorizes mutation or public
QR enforcement.

## Synthetic rehearsal matrix

Before Production activation, an isolated non-Production rehearsal must prove:

| Switch / input | Required result |
| --- | --- |
| OFF + any entitlement state | exact legacy decision |
| ON + legacy deny or error | never allow |
| ON + active effective entitlement | candidate result only for the allowlisted boundary and policy version |
| ON + missing or inactive entitlement | distinct non-success candidate; wording and recovery remain separately approved |
| ON + lookup failure or invalid response | distinct uncertainty result; no contractual-denial claim |
| unknown boundary or policy version | switch treated as OFF |
| expired activation window | switch treated as OFF |

The rehearsal must also cover concurrent requests during ON-to-OFF change,
same-request retry, stale deployment configuration, and process restart. A
successful HTTP response alone is not PASS; the effective decision, boundary,
policy version, deployment, and evidence timestamp must match the manifest.

## Rollback rehearsal

Rollback is rehearsed as a controlled ON-to-OFF transition with the same
synthetic manifest. It must demonstrate all of the following:

1. new requests use the exact legacy decision after the switch is OFF;
2. in-flight requests do not bypass tenant, membership, role, site, RLS,
   Storage, or record-ownership guards;
3. entitlement rows, entitlement events, activation events, version snapshots,
   submissions, manager-review events, and other append-only evidence retain
   identical counts and identities before and after rollback;
4. rollback does not update entitlement status, fabricate a grant, hard-delete
   business rows, or rewrite audit history;
5. a read-only reconciliation records zero unexplained row delta and confirms
   that the synthetic account cannot access a boundary that the legacy
   decision denies;
6. rollback completion is recorded separately from GitHub merge, Vercel
   deployment, Supabase state, Runtime verification, and Manual QA.

An ambiguous result, unexplained delta, stale process, mixed policy version, or
missing receipt is HOLD. Retry begins with read-only reconciliation; it must not
repeat writes or rotate to a new manifest merely to obtain a PASS.

## Approval and rollback authority

Separate explicit approval is required for implementation of the switch,
Production configuration, synthetic fixture creation, Runtime activation,
rollback activation, public QR policy, actual-customer expansion, and sale
readiness. The person approving activation must be identifiable in the private
operational receipt; AI or a rule cannot approve activation, rollback closure,
contract entitlement, suspension exception, termination, or reactivation.

## Repository lock

Until those approvals exist:

- no feature flag or equivalent switch exists in Runtime;
- `observeInternalTestRiskShareEntitlementShadow` remains non-enforcing and
  limited to `test-risk-pack-01`;
- no Runtime boundary may branch on `readRiskShareEntitlementAccess`;
- no migration, Production SQL, customer data, entitlement, public QR behavior,
  or legacy route is changed by this contract.

