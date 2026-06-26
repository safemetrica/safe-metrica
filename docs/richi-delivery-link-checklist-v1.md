# Richi Delivery Link Checklist v1

## Scope

- (주)리치코리아 Full SafeMetrica operation
- Delivery/smoke-test checklist before customer sharing
- This document separates customer-facing links, manager operation links, and internal-only links.

## Customer/field-facing links

- `/field/participation?company=richi`
- `/field/anonymous-feedback?company=richi`

## Manager operation links

- `/manager/risk-share?company=richi`
- `/field/voice?company=richi`
- `/tbm?company=richi`
- `/monthly-report/risk-share?company=richi`

## Internal-only / do not share

- Owner Console
- Supabase
- Notion DB
- Export/admin routes
- environment variables
- service role keys
- tokens
- customer raw data or internal IDs

## Final smoke test checklist

- Manager home opens.
- Quick action buttons open.
- Field voice inbox opens and does not show internal metadata.
- TBM page opens.
- Monthly operation report opens.
- Worker QR first screen opens.
- Identified prework confirmation flow submits.
- Anonymous feedback flow submits.
- Test data is deleted or archived before customer delivery.

## Caution

- SafeMetrica organizes operation records and review candidates.
- It does not replace final legal judgment, safety action confirmation, or employer/manager responsibility.
- AI or system summaries are support material only. Final review and action decisions remain with the manager and employer.
