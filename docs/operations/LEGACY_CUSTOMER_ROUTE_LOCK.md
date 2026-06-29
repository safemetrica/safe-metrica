# Legacy Customer Route Lock

## Purpose

This document locks the operating-route expectations for existing SafeMetrica customers.

Existing customers using legacy direct links must not be forced into new login, tenant-isolated, or onboarding flows unless an explicit migration has been planned, tested, and approved.

This lock was added after the Daedo TBM access regression in June 2026, where tenant/login guard work blocked the existing daily TBM route.

## Protected legacy route

### Daedo TBM

Protected operating route:

    /tbm?company=daedo

Required behavior:

- It must not redirect to /login.
- It must not return tenant_required.
- It must not return a server error.
- It must continue to show a usable TBM operating page.
- The Daedo TBM form/action link must remain available.
- It must preserve the existing legacy operation path unless a separate migration is approved.

## Richi operating routes to smoke check together

Richi is a Supabase-first Full SafeMetrica operation customer and uses direct query context for selected routes.

Routes to check when tenant/login/proxy work changes route access:

    /tbm?company=richi
    /field/participation?company=richi
    /manager/risk-share?company=richi
    /monthly-report/risk-share?company=richi

## Development rule

Before merging tenant, login, auth, proxy, middleware, onboarding, route shell, or customer-context changes, run the legacy route smoke test.

Required check:

    npm run smoke:legacy-routes

If using a non-production deployment:

    BASE_URL="https://your-preview-url.vercel.app" npm run smoke:legacy-routes

## Do not expose internal terms to customer-facing UI

Customer-facing UI must not expose internal technical or security terms such as:

- Supabase
- Notion
- API path
- schema
- raw payload
- service role
- token
- environment variable
- internal database errors
- source table names
- private configuration names

These terms may appear in internal documentation only when they are part of a warning or development standard.

## Product-safe wording

SafeMetrica does not replace legal judgment or final management decisions.

Allowed wording:

- operating record
- manager review
- review required
- evidence record
- monthly operation record
- candidate for follow-up
- review memo

Avoid wording that implies legal certainty or automatic completion:

- legal exemption
- accident prevention guarantee
- no accident guarantee
- legal compliance guaranteed
- automatic approval
- automatic work stop order
- action completed by system
- legally complete

## Legacy vs new customer rule

- Existing customers such as Daedo, Bubblemon, Hankookgreen, and Dongwoo remain on protected legacy flows unless explicitly migrated.
- Richi and future Supabase-first customers may use direct company query handling where intentionally designed.
- New Supabase-first work must not be used as a reason to silently alter existing Notion-first legacy customer behavior.

## Required PR checklist for route/auth work

For any PR touching tenant, login, auth, middleware, proxy, route guards, or shared operating routes:

- Check /tbm?company=daedo.
- Confirm no /login?error=tenant_required redirect is introduced for legacy direct links.
- Confirm no server error is introduced on legacy direct operating routes.
- Confirm no customer-facing internal technical terms are exposed.
- Confirm Richi direct operating routes still open where intended.

## Incident note

Daedo TBM access was restored through sequential hotfixes:

- #743 allowed Daedo TBM direct access at proxy level.
- #744 allowed Daedo company query resolution in the TBM page.
- #745 kept the TBM page open when legacy list loading fails.

This document exists to prevent the same regression from recurring.
