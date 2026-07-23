# Synthetic tenant Production E2E fixture contract v1

Status: repository-only readiness contract. This document creates no fixture,
authorizes no Production write, and changes no Runtime access decision.

## Purpose

Define the evidence, isolation, retry, and cleanup conditions that must be
approved before a synthetic tenant is created in Production for the Commercial
Core end-to-end path. The fixture is a temporary test identity, never a
customer entitlement or evidence of a commercial grant.

## Fixed identity and isolation rules

- A new, dedicated synthetic tenant must be used. An existing customer,
  legacy tenant, prospect, partner, complimentary tenant, or current
  `test-risk-pack-01` shadow tenant must not be repurposed.
- The tenant code and test account must be reserved for this fixture before
  creation. Fixture identifiers are captured from returned database values;
  they are never guessed, reconstructed from chat, or copied from another
  environment.
- Only synthetic names, contact data, submissions, signatures, files, and
  source documents are permitted. Customer or worker personal data is
  prohibited.
- Tenant, default site, active tenant-admin membership, `risk_share`
  entitlement, every test record, Storage object, and audit event must retain
  the same tenant identity. Cross-tenant or cross-site fallback is prohibited.
- The product grant uses `activation_source = internal_test`, has a non-null
  expiry, and uses an `internal-test:` external reference. It must not be
  represented as contract, payment, partner, or complimentary evidence.

## Approved scenario manifest

Before any Production write, a human-approved manifest must name the exact
scenario set, expected result, idempotency key namespace, maximum record count,
expiry, owner, and cleanup deadline. The first tranche is limited to:

1. signup and email ownership confirmation;
2. company and default-site profile completion;
3. Owner-approved activation with one `internal_test` entitlement;
4. one synthetic source through preparation, review, and immutable publish;
5. one public QR confirmation and one manager inbox review;
6. monthly read and Export using only the synthetic records;
7. same-key retry for each supported mutation;
8. controlled inactive-entitlement observations without changing public QR
   policy or enabling entitlement enforcement.

Missing-entitlement, suspended, expired, terminated, invalid-response, timeout,
and recovery scenarios remain separately counted cases. A successful active
scenario does not authorize a policy decision for any other state.

## Preflight and counted-delta evidence

The runner must stop before writes unless all of the following are recorded:

- GitHub `main`, Vercel Production deployment, Supabase migration inventory,
  Runtime target, and approved manifest version;
- reserved tenant code and account are absent;
- no customer-derived fixture input is present;
- expected tables, RPC signatures, RLS/grants, and Storage boundaries match the
  reviewed contract;
- before-counts exist for tenant, site, membership, entitlement, entitlement
  event, source, item, version, submission, manager review, and Storage object
  families.

After each step, returned identity and exact delta are compared with the
manifest. HTTP success alone is not PASS. A timeout or ambiguous response is
followed by read-only reconciliation before retry. The same idempotency key is
reused only for the same request digest; a changed request uses a new key.
Partial failure, duplicate rows, an unexpected tenant/site identity, or an
unexplained delta is HOLD and must never be reported as success.

## Cleanup and evidence preservation

Cleanup is an explicit, separately approved phase; expiry is not proof that
cleanup completed.

- Disable the synthetic account and tenant access, and transition the
  `internal_test` entitlement to `terminated` through an audited operation.
- Revoke active membership/session access and remove disposable synthetic
  Storage objects using an allowlisted manifest.
- Do not hard-delete entitlement rows, entitlement events, tenant activation
  events, publish/version snapshots, submission audit, manager review audit,
  or other append-only business evidence.
- Do not reuse the tenant code, account, entitlement, idempotency keys, or
  fixture registry entry after cleanup.
- Record post-cleanup access checks, retained evidence counts, removed object
  counts, exceptions, and the authorized human who confirms closure.

The fixture registry contains identifiers and lifecycle state only. It must not
contain credentials, tokens, customer data, worker personal data, raw
signatures, free text, or private file content.

## Separate approval and rollback gates

Separate explicit approval is required for fixture creation, authenticated
Runtime execution, public QR submission, cleanup writes, entitlement-policy
experiments, and final closure. Runtime rollback restores the previous access
decision and never deletes entitlement or audit evidence.

This contract does not approve a feature flag, entitlement enforcement,
shadow-tenant expansion, public QR fail-open/fail-closed policy, customer
backfill, customer activation, Production SQL execution, or sale readiness.
GitHub merge, Supabase state, Vercel deployment, Runtime evidence, cleanup, and
Manual QA are recorded as distinct states.

