# SafeMetrica Risk Share Pack Share Scope Confirmation & Version Lock v1

## 1. Purpose

This document defines how Risk Share Pack should confirm and lock the worker-facing share scope before QR activation.

This closes an important operating risk:

customer risk assessment source
→ operator extracts worker-facing share items
→ customer confirms the share scope
→ version is locked
→ QR is activated
→ worker confirmations and reports are collected against that version

Risk Share Pack should not distribute worker-facing risk content before the customer confirms the share scope.

## 2. Core Risk

If share scope is not confirmed, the following disputes may occur:

- customer says a shared item was not approved
- customer says an important risk item was omitted
- customer says the wrong assessment version was used
- customer says the worker-facing summary changed after confirmation
- worker confirmation records cannot be tied to a specific share version
- monthly summary and export cannot prove what was actually shared

Therefore, share scope confirmation and version locking are required before operation.

## 3. Product Boundary

Risk Share Pack does not finalize the customer's legal risk assessment.

Risk Share Pack confirms only the operating share scope:

- which source was used
- which site or work group is covered
- which worker-facing risk items are shared
- what summary workers see
- what version is active
- when QR was activated

Customer confirmation of share scope is not a legal compliance guarantee.

## 4. Required Confirmation Before QR Activation

Before QR activation, confirm:

- customer company
- site or work group
- source title
- source version or assessment period
- shared item list
- worker-facing summary
- anonymous report policy
- representative confirmation method
- monthly summary receiver
- export receiver
- privacy notice reviewed

Do not activate QR if share scope is not confirmed.

## 5. Share Scope Confirmation Fields

Recommended fields:

- company_code
- source_id
- source_title
- source_version
- assessment_period
- site_name
- work_group
- share_item_count
- worker_facing_summary
- confirmed_by_name
- confirmed_by_role
- confirmed_at
- confirmation_method
- confirmation_note
- version_label
- active_from
- active_until
- locked_by
- locked_at

## 6. Confirmation Method Candidates

Allowed confirmation methods:

- signed customer confirmation sheet
- email confirmation
- internal meeting memo confirmed by customer
- app-based confirmation in future
- manager approval record in future

For managed v1, email or internal meeting memo may be used.

For scalable v2, app-based confirmation should be implemented.

## 7. Version Lock Rule

Once QR is activated, the share version should be locked.

Locked version means:

- worker-facing summary should not be silently changed
- share item list should not be silently changed
- source version should not be silently changed
- monthly summary should identify the active version
- export should identify the active version when possible

If content must change, create a new version.

## 8. Version Change Cases

Create a new share version when:

- new risk assessment source is received
- assessment period changes
- customer changes shared item scope
- site/work group changes
- worker-facing summary changes materially
- high-risk item is added or removed
- customer requests a new QR campaign
- regular or ad-hoc assessment update is reflected

Minor typo correction can be handled as operator note if it does not change meaning.

## 9. Version Label Standard

Recommended format:

- RSP-{companyCode}-{YYYYMM}-{siteCode}-v1
- RSP-{companyCode}-{YYYYMM}-v1
- RSP-{companyCode}-{assessmentPeriod}-v1

Examples:

- RSP-sampleco-202606-main-v1
- RSP-sampleco-2026H1-v1

Do not put private customer-sensitive data in public version labels.

## 10. Current v1 Managed Process

For managed v1:

1. receive customer risk assessment source
2. extract worker-facing share items
3. prepare share scope draft
4. send share scope to customer for confirmation
5. record confirmation in internal operating hub
6. assign version label
7. prepare QR poster
8. run 3 go-live tests
9. verify export and monthly summary
10. activate controlled operation

## 11. Future App-Based Process

Future app process:

1. source file registered
2. share item drafts created
3. operator marks draft ready
4. customer manager reviews in app
5. customer manager confirms share scope
6. system creates risk_share_versions row
7. QR becomes active for that version
8. worker confirmations are linked to version_id
9. monthly summary groups by version_id
10. export includes version label

## 12. Supabase Table Candidate

### 12.1 risk_share_scope_confirmations

Purpose:

Track customer confirmation of share scope.

Candidate fields:

- id
- company_code
- source_id
- version_id
- site_id
- source_title
- source_version
- assessment_period
- share_item_count
- worker_facing_summary_snapshot
- confirmed_by_name
- confirmed_by_role
- confirmation_method
- confirmation_note
- confirmed_at
- locked_at
- locked_by
- created_at
- updated_at

### 12.2 risk_share_version_snapshots

Purpose:

Store a snapshot of the active share scope at activation time.

Candidate fields:

- id
- version_id
- company_code
- source_id
- share_scope_snapshot
- item_snapshot
- summary_snapshot
- created_at
- created_by

Snapshots should not expose unnecessary personal data.

## 13. Export and Monthly Summary Impact

Customer export should eventually include:

- share version label
- source title or safe source reference
- assessment period
- share confirmation date
- worker confirmation count
- worker report count
- representative confirmation status

Monthly summary should show:

- active share version
- source assessment period
- share confirmation count
- worker report count
- representative confirmation status
- unresolved review items

## 14. Privacy and Security

Do not expose:

- raw source file URLs unless designed and reviewed
- storage keys
- tokens
- API keys
- service role keys
- Owner Token
- environment variable values
- actual worker personal data beyond agreed scope
- customer-sensitive incident details

Worker-facing QR should not expose internal source IDs or storage paths.

## 15. Go / Hold / No-Go

### Go

Proceed to QR activation when:

- source reviewed
- share item draft prepared
- customer confirmed share scope
- version label assigned
- privacy notice ready
- go-live test plan ready

### Hold

Hold when:

- customer has not confirmed the share scope
- source version is unclear
- target site/work group is unclear
- worker-facing summary is not approved
- anonymous report policy is not decided
- representative confirmation method is not decided

### No-Go

Stop when:

- customer demands legal guarantee wording
- customer demands risk assessment outsourcing replacement
- customer refuses to confirm what is being shared
- customer asks to expose unsafe internal links or secrets
- customer demands unreviewed AI-generated risk assessment as final output

## 16. Sales Wording

Recommended wording:

Before QR operation, we prepare the worker-facing share scope from the customer's existing risk assessment source and confirm the share version with the customer. Workers then confirm or submit reports against that confirmed share version.

Avoid wording:

- we automatically finalize the legal risk assessment
- upload once and legal sharing is complete
- AI confirms all risk items
- penalty prevention
- legal immunity
- no-accident guarantee

## 17. Current Decision

Risk Share Pack should not activate QR sharing until the worker-facing share scope is confirmed and version-locked.

This is required for operating integrity, customer trust, export reliability, monthly summary accuracy, and future item-level confirmation.
