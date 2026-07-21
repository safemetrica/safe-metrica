# Manager Inbox Review RPC — High-Risk Independent Audit Packet

## Audit status

- Target: local Draft migration only
- Production migration: HOLD
- Customer-data mutation QA: HOLD
- PR Ready/merge: HOLD
- Existing RLS, authentication, and monthly confirmation RPC changes: none

## Files in scope

1. `supabase/migrations/20260721050000_add_manager_inbox_review_rpc.sql`
2. `scripts/verify-risk-share-manager-inbox-review-rpc-contract.mjs`
3. `package.json`

## Intended contract

The RPC may process only four non-monthly manager-inbox types:

| Customer workflow | Stored source contract |
|---|---|
| 작업 전 안전확인 | `risk_share_participation_submit_v1` + `prework` |
| 익명 의견 | `risk_share_anonymous_feedback_v1` or `anonymous_worker_feedback_v1` |
| 외부인 확인 | `risk_share_visitor_confirmation_v1` |
| 근로자대표 확인 | `risk_share_representative_confirmation_v1` |

It must reject monthly confirmations and every unknown source.

Allowed transitions are only:

1. `unreviewed -> in_review`
2. `in_review -> completed`

`completed` is an inbox-workflow state. It is not a legal conclusion, safety-measure sufficiency finding, incident closure, or official approval.

## Mandatory independent review questions

1. Can any call read or mutate a submission outside `p_company_code`?
2. Can an audit event reference a submission or actor from another tenant despite the composite FKs?
3. Can a suspended, revoked, viewer, representative, or internal Owner membership call the RPC?
4. Can a monthly confirmation or an unknown `raw_payload.source/mode` enter this RPC?
5. Can concurrent stale writers both succeed for the same submission?
6. Can one idempotency key be reused for a different submission, transition, actor, or note?
7. Does an exact retry return the original successful event without appending a duplicate?
8. Can status update succeed while event insertion fails without rolling back?
9. Is the event table SELECT-only for `service_role`, with inserts possible only through the RPC owner?
10. Does any table or function grant allow `public`, `anon`, or `authenticated` access?
11. Does the event copy worker identity, anonymous content, signatures, files, or the full `raw_payload`?
12. Does the migration alter the existing monthly RPC, existing policies, authentication, or customer rows?
13. Is rollback safe after events exist: revoke function execute and return the app to read-only without deleting audit history?

## Required catalog preflight before any Production approval

Read-only catalog inspection must confirm:

- exactly one existing monthly RPC overload and no new inbox RPC overload
- existing `field_participation_submissions` review columns and status constraint
- uniqueness of `(id, tenant_code)` targets or absence of conflicting objects
- `tenant_membership (id, tenant_code)` unique target
- zero same-id/cross-tenant inconsistencies before composite FK creation
- no conflicting table, constraint, index, or function names
- `extensions.digest(bytea, text)` exists under the Production pgcrypto schema
- function owner and ACL after applying to an isolated environment
- event table RLS enabled with no client policies
- only `service_role` has the intended table and function privileges
- no unexpected grantee or grant option exists on the function, event table, or identity sequence
- `event_sequence` provides deterministic event order even inside one transaction

Do not output credentials, customer payloads, worker identity, or anonymous report content.

## Required isolated runtime matrix before Production

Run only with synthetic tenant fixtures inside an isolated database or a transaction that is rolled back.

| Case | Expected result |
|---|---|
| each of four allowed source contracts | `updated` |
| monthly or unknown source | `unsupported_type` |
| other-tenant actor/submission | `forbidden` or `not_found` without existence disclosure |
| viewer/suspended membership | `forbidden` |
| valid first transition | one status update + one event |
| valid second transition | one status update + one additional event |
| skipped/reversed transition | `validation_failed` |
| stale expected status | `status_conflict` |
| exact retry | `replayed`, original event id, no new event |
| same key with different input | `idempotency_conflict` |
| forced event-insert failure | status update rolled back |

## Rollback boundary

- Before customer use: revoke `EXECUTE`, remove the new function/table/index only after confirming zero events.
- After any event exists: revoke `EXECUTE`, return application behavior to read-only, and retain the append-only event ledger.
- Never delete audit events or backfill customer rows as a rollback shortcut.
- Existing monthly review RPC remains independent and must continue to work.

## Claude audit prompt

```text
Inspect the three files listed in this packet against the current main schema.
Do not patch, commit, push, apply a migration, or use Production credentials.

Review tenant isolation, composite FK validity, role authorization, source/type
allowlisting, ordered transitions, lock order, stale-write behavior, exact replay,
idempotency conflict, transaction atomicity, ACL/RLS exposure, audit minimization,
and rollback safety.

Treat static contract tests as insufficient proof of runtime behavior. Identify the
exact isolated SQL cases still required. Do not output customer data, worker data,
anonymous report content, or credentials.

Return:
1. PASS / HOLD / STOP
2. Findings by severity with exact file and line
3. Tenant-isolation proof or gap
4. Concurrency/idempotency proof or gap
5. ACL/RLS proof or gap
6. Required changes, if any
7. Remaining Production preflight and runtime test gates
```
