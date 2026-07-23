# Synthetic tenant Production E2E read-only preflight v1

Status: code-only preflight. This tool performs no Production write, creates no
fixture, changes no Runtime access decision, and authorizes no later phase.

## Purpose

Turn the approved synthetic Production E2E scenario into a one-time,
non-secret manifest and fail closed before any Production record is created.
This preflight closes the unsafe gap between a repository-only contract and
manual, untracked Production SQL.

## Identity rules

- The generated tenant code is `sm-e2e-YYYYMMDD-NNN`.
- `test-risk-pack-01`, customer, prospect, partner, complimentary, legacy, and
  other pre-existing tenants are rejected.
- The test account email is supplied only through `SM_E2E_ACCOUNT_EMAIL`.
- The manifest stores only a SHA-256 fingerprint of the normalized test email.
  It never stores the email, password, token, service role, Owner Token, session,
  customer data, worker data, signature, source content, or private file.
- A sequence is one-time. Tenant code, account, manifest, entitlement,
  idempotency namespace, and fixture registry entry must never be reused.

## Manifest contract

The generated manifest fixes:

- the exact tenant and manifest identifiers;
- the Vercel Production target;
- the authorized human and phase-specific approval references;
- a required fixture-creation approval record plus optional later approval
  records for authenticated Runtime, Public QR submission, and cleanup writes;
- one `risk_share` entitlement using `activation_source=internal_test`;
- a non-null expiry and `internal-test:` external reference;
- the exact scenario set and maximum records per table family;
- all required before-count families;
- cleanup deadline and evidence-preservation rules.

The manifest generator does not write the manifest file automatically. The
operator redirects stdout to a protected temporary location and records only
the manifest checksum in durable SDM evidence.

## Read-only preflight

`preflight` performs exact `GET` counts for:

- `tenant_registry` by reserved tenant code;
- `tenant_membership` by reserved tenant code;
- `tenant_membership` by the exact synthetic account email;
- `tenant_product_entitlements` by reserved tenant code.

Every count must be zero. A missing count, non-zero count, timeout, invalid
manifest, or account fingerprint mismatch is `HOLD`.

The output explicitly leaves these states false:

- `migrationInventoryVerified`
- `schemaAndGrantFingerprintVerified`
- `storageBoundaryVerified`
- `writeAuthorized`

Therefore `READ_ONLY_PREFLIGHT_PASS` is not fixture-creation approval and cannot
be presented as Production E2E PASS. The remaining Supabase migration,
function/grant, RLS, and Storage checks require an authenticated Production
inspector before the first write.

## Commands

Required secret or sensitive inputs must be provided as process environment
variables and must not be pasted into chat, committed, echoed, or stored in
Notion.

```bash
SM_E2E_SEQUENCE=1 \
SM_E2E_ACCOUNT_EMAIL="<synthetic account>" \
SM_E2E_APPROVED_BY="<authorized human>" \
SM_E2E_FIXTURE_CREATION_APPROVAL_REFERENCE="<fixture approval reference>" \
npm run synthetic-tenant-production-e2e:manifest
```

Later approval references are optional during fixture preflight and are added
only when the corresponding phase receives explicit approval:

```bash
SM_E2E_AUTHENTICATED_RUNTIME_APPROVAL_REFERENCE="<Runtime approval reference>"
SM_E2E_PUBLIC_QR_APPROVAL_REFERENCE="<Public QR approval reference>"
SM_E2E_CLEANUP_APPROVAL_REFERENCE="<cleanup approval reference>"
```

Every supplied approval reference must be distinct. One general instruction
cannot be copied into multiple phase fields. A pending later approval never
blocks read-only preflight or expands the current write scope.

Validate a protected temporary manifest:

```bash
SM_E2E_MANIFEST_PATH="<protected temporary path>" \
SM_E2E_ACCOUNT_EMAIL="<synthetic account>" \
node scripts/synthetic-tenant-production-e2e-preflight.mjs validate
```

Run the exact-absence read-only preflight:

```bash
SM_E2E_MANIFEST_PATH="<protected temporary path>" \
SM_E2E_ACCOUNT_EMAIL="<synthetic account>" \
SUPABASE_URL="<Production URL>" \
SUPABASE_SERVICE_ROLE_KEY="<Production service role>" \
npm run synthetic-tenant-production-e2e:preflight
```

## HOLD

This tranche does not implement or authorize:

- Auth user creation or email confirmation;
- tenant, site, membership, entitlement, source, item, version, or submission
  writes;
- authenticated Runtime execution;
- Public QR submission;
- cleanup writes or final closure;
- schema, migration, RPC, RLS, grant, Storage-policy, entitlement-enforcement,
  Public QR policy, multi-site, customer, or legacy-data changes.
