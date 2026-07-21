# SafeMetrica Risk Share Version Lifecycle Contract v1

Status: inspect baseline; no lifecycle writer is implemented by this document.

## Outcome

Risk Share versions are append-only evidence. Replacing or ending the current
worker-facing share must never edit a snapshot, delete a confirmation, or
reactivate an older row.

The implementation sequence is locked as:

1. establish one canonical tenant/site current-version rule;
2. add an atomic, tenant-authorized lifecycle RPC with durable audit fields;
3. expose that RPC through an authenticated manager API;
4. add manager UI only after the database and API contracts pass;
5. verify Public QR, prior confirmations, monthly evidence, and retry behavior.

## Live findings on 2026-07-22

- `risk_share_version_locks` already stores immutable version-chain metadata:
  `previous_version_id`, `content_source_version_id`, `actor_membership_id`,
  `idempotency_key`, `superseded_at`, and `publish_action`.
- `risk_share_version_items` is the immutable per-version snapshot.
- worker confirmations have a durable `version_lock_id`; old confirmations can
  remain attributable after a later version becomes current.
- the database uniqueness rule permits one active version per company and
  month, not one active version per company/site.
- the Public QR resolver selects the newest active version across all months.
- the current publish RPC deliberately does not replace, end, supersede,
  rollback, or reactivate a version.
- a safe lifecycle writer therefore cannot be inferred by changing only the UI
  or by updating a single row's `lock_status`.

## Required state semantics

| Operation | Required result | Forbidden result |
| --- | --- | --- |
| Replace | create a new immutable snapshot, then atomically supersede every version that the same canonical current scope would otherwise expose | overwrite an old snapshot or leave two competing current versions |
| End | atomically remove the current scope from worker exposure and record actor, reason, time, and idempotency | reveal an older active version as an accidental fallback |
| Reconfirm | treat confirmations for the new `version_lock_id` as a new evidence set while preserving all earlier confirmations | copy, relabel, or count old confirmations as confirmation of new content |
| Rollback | create a new version whose `content_source_version_id` identifies the copied historical snapshot | reactivate a historical row |

`confirmed` means that the person confirmed the exact displayed version. It
does not mean education completion, risk-assessment participation completion,
legal sufficiency, or safety-measure approval.

## Atomic writer requirements

The future writer must fail closed unless all of the following are true:

- the actor is an active `tenant_admin` or `tenant_manager` membership for the
  exact tenant;
- the tenant and site scope is re-derived inside the transaction;
- the current version set is locked in deterministic order;
- the requested item/revision set is validated before any state transition;
- new snapshot creation and old-version transition are one transaction;
- retry with the same idempotency key returns the same result;
- reuse of the key with different action, reason, scope, source version, or
  item content returns an idempotency conflict;
- zero, duplicate, cross-tenant, stale-revision, partial-snapshot, and overflow
  inputs cause no write;
- lifecycle actor, action, reason code, occurred time, previous version, and
  content source are queryable without relying on free-form JSON;
- direct execution remains service-role-only and the public API never exposes
  membership IDs, internal errors, or cross-tenant existence.

## Current blockers before a writer migration

1. Canonical current scope is not yet explicit. The table has `company_code`
   and `site_name`, but not the `site_id` required by the current tenant/site
   contract.
2. Ending a single newest row can expose an older active month because the
   Public QR resolver falls back to the next active row.
3. `superseded_at` exists, but a dedicated end actor, end reason, end time, and
   lifecycle idempotency contract are not complete.
4. Existing multi-month active rows need a read-only Production preflight
   before choosing a uniqueness migration or backfill policy.

## Production preflight gate

Before any migration is applied, run SELECT-only checks for:

- active-version count grouped by tenant and by tenant/month;
- tenants with more than one active version;
- newest-active versus Public QR resolved version;
- null or ambiguous site identity on version rows;
- snapshot count drift and cross-tenant lineage drift;
- confirmation counts grouped by `version_lock_id`;
- unexpected RPC overloads, owners, `search_path`, and grants.

The preflight must return counts only. It must not print customer content,
worker identity, signatures, credentials, or raw payloads.

## HOLD

- lifecycle migration or Production SQL execution;
- actual customer-data transition or backfill;
- UI controls that imply replacement or ending is available;
- automatic legal, safety, completion, or reconfirmation decisions;
- TBM integration and multi-site expansion in the same change.
