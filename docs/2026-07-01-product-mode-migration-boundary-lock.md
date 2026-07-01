# SafeMetrica Product Mode & Migration Boundary LOCK — 2026-07-01

## Purpose

This document locks the product-mode boundary before additional commercialization work.

The issue is not a single UI bug. SafeMetrica currently contains three generations of architecture in one codebase:

1. legacy operating customers,
2. Richi full-operation/light operating flow,
3. new SaaS customers based on `tenant_registry`.

Future work must not mix these three layers inside the same fallback flow without an explicit boundary.

## 1. Existing legacy customers

The following customers remain on the existing operating flow:

- `daedo`
- `dongwoo`
- `hankookgreen`
- `bubblemon`

Rules:

- Do not force login migration.
- Do not force route migration.
- Do not rewrite their submit/API/storage path as part of new SaaS work.
- Keep existing QR/no-login participation flow.
- Future work may improve UI/UX and targeted features, but must preserve their current operating path.
- Legacy customer data is not a test bed for new SaaS tenant behavior.

## 2. Richi operating flow

`richi` is an operating customer flow, not a generic template to copy per customer.

Richi contributed productized patterns:

- identified confirmation flow,
- mobile signature,
- separated anonymous feedback flow,
- prework confirmation,
- food-factory operating UX.

Rules:

- Do not copy Richi code for each new customer.
- Do extract reusable product patterns from Richi.
- Keep Richi route behavior intact:
  - `/field/participation?company=richi`
  - `/field/participation?company=richi&flow=signed`
  - `/field/anonymous-feedback?company=richi`
- Richi may continue as a real operating customer if/when the customer uses the service.

## 3. New SaaS customers

New SaaS customers use `tenant_registry` as the customer registry foundation.

This does not mean workers or visitors must log in.

Access model:

- workers / visitors / external personnel: public QR, no login,
- managers / executives: login-based customer workspace,
- owner/internal operator: owner-only console.

Required future structure:

- `tenant_registry` identifies the customer and service mode.
- `tenant_membership` or equivalent membership layer governs managers/executives.
- Public QR routes remain no-login.
- Manager routes must not rely on public QR assumptions.
- Owner routes must not be shown to customers.

## 4. Risk Share Pack definition

Risk Share Pack / 위공팩 is a standalone entry product, but it is also included in Full SafeMetrica.

Standalone Risk Share Pack:

- risk assessment result sharing,
- worker confirmation,
- visitor/external-person confirmation direction,
- anonymous feedback / near-miss / improvement suggestion,
- manager review,
- monthly operating evidence/result.

Full SafeMetrica includes Risk Share Pack plus broader operating modules, such as:

- prework confirmation,
- TBM/TBT,
- manager action tracking,
- executive review,
- monthly report,
- other enabled modules.

Risk Share Pack is not:

- risk assessment outsourcing,
- safety management outsourcing,
- legal compliance guarantee,
- incident-free guarantee,
- penalty avoidance guarantee.

## 5. Route boundary

Existing routes are protected for current customers:

- `/field/participation?company=daedo`
- `/field/participation?company=dongwoo`
- `/field/participation?company=hankookgreen`
- `/field/participation?company=bubblemon`
- `/field/participation?company=richi`

New SaaS/Risk Share Pack routes should be separated instead of continuing to overload legacy fallback behavior.

Preferred future route direction:

- `/risk-share/field?company=<code>` — public worker QR
- `/risk-share/anonymous?company=<code>` — public anonymous feedback
- `/risk-share/visitor?company=<code>` — public visitor/external-person confirmation
- `/app/<company>/risk-share` — manager login workspace
- `/app/<company>/monthly` — manager/executive monthly workspace
- `/owner/risk-share/customers` — owner customer/link-pack console

## 6. Migration plan requirement

Do not continue large commercialization patches until a migration plan exists for:

1. legacy customer data and routes,
2. Richi identity-mode and anonymous-flow pattern extraction,
3. new `tenant_registry` / Supabase-first customers.

Migration must define:

- source of truth per customer group,
- table ownership,
- route ownership,
- submit/API ownership,
- public QR vs login boundary,
- export/monthly report ownership,
- what is explicitly not migrated.

## 7. Immediate development direction

The next implementation work should avoid further coupling in `FieldParticipationStepper.tsx`.

Recommended sequence:

1. create separated Risk Share public QR route shells,
2. create owner Risk Share customer/link-pack console,
3. create manager login workspace shell,
4. then migrate shared UI components from Richi/Bubblemon patterns into a clean product core.

## 8. Non-negotiable safety rules

- Do not expose tokens, API keys, service role keys, owner tokens, or customer sensitive data.
- Do not put payment/invoice logic into worker QR screens.
- Do not show internal terms such as Supabase, Notion DB, raw payload, service role, RLS, or tenant_registry to customers.
- AI suggestions remain candidates; final operating decisions belong to the responsible manager/business owner.
