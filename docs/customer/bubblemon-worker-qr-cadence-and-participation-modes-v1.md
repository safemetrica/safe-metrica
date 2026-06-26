# Bubblemon Worker QR Cadence and Participation Modes v1

## Purpose
- Define how Bubblemon should use the worker QR after the first month of operation.
- Separate monthly risk assessment share confirmation, daily prework safety check, anonymous feedback, and visitor safety check.
- Prevent daily repetition of the full risk assessment share confirmation flow.

## Current issue
- Bubblemon currently uses the worker QR participation flow actively.
- Early operation included frequent risk-share confirmation checks.
- This helped onboarding and verification.
- Long-term operation should not treat full risk assessment share confirmation as a daily task.
- Risk-share confirmation, TBM/prework check, anonymous feedback, and visitor check need separate participation intents.

## Recommended cadence
### Monthly
- Risk assessment key hazard share confirmation.
- Use once per month or when the risk assessment version changes.
- Include key hazards, major risk factors, unresolved items, and required precautions.
- Identified submission and mobile signature should be required.

### Daily / before work
- Prework safety check or TBM participation.
- Use before daily work or relevant work start.
- Keep the form short.
- Confirm today’s work, main hazards, PPE, traffic/storage/loading precautions.
- Signature can be optional at first and later upgraded.

### Weekly / optional
- Weekly risk reminder.
- Use only when the site needs repeated reminders.
- Keep it to 3-5 key risks.
- Do not treat this as a full risk assessment share confirmation.

### Always available
- Anonymous feedback.
- Near-miss report.
- Improvement suggestion.
- No name, no signature, no identification fields.

### Visitor / contractor
- External visitor safety check.
- Use for visitors, delivery workers, contractors, or short-term external workers.
- Collect visitor name, organization, visit purpose, host/manager, contact suffix, safety notice confirmation, and mobile signature.
- Keep it separate from anonymous feedback.

## Proposed first screen
- Monthly risk assessment share confirmation
- Today’s prework safety check
- Anonymous opinion / near-miss / improvement suggestion
- External visitor safety check

## Data fields
Recommended normalized fields:
- company_code
- entry_intent
- cadence
- identity_mode
- anonymous
- signature_required
- signature_status
- submitter_name
- submitter_org
- contact_suffix
- location
- content
- risk_share_version_id
- source
- created_at

## Monthly report interpretation
Monthly report should eventually separate:
- Monthly risk assessment share confirmation participation
- Daily prework safety check count
- Anonymous feedback / near-miss / improvement suggestions
- Manager review needed items
- Visitor safety check count

## Mobile signature policy
- Required for monthly risk assessment share confirmation.
- Optional or deferred for daily prework safety check.
- Not allowed for anonymous feedback.
- Required for visitor safety check.

## Internal-only caution
- Owner Console, Notion DB, Supabase, API routes, service role keys, tokens, environment variables, customer raw data, and internal IDs must not be exposed to workers or customers.
- This QR flow organizes participation records and review candidates.
- It does not replace final legal judgment, safety action confirmation, risk assessment outsourcing, or employer/manager responsibility.
