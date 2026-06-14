# SafeMetrica Risk Share Pack Source Intake App MVP Spec v1

## 1. Purpose

This document defines the MVP product spec for receiving customer risk assessment source files inside SafeMetrica.

This spec follows the source storage and share item activation principle:

customer risk assessment source
→ source intake
→ source metadata
→ share item draft
→ customer-confirmed share scope
→ QR activation
→ worker confirmation / report / representative confirmation
→ manager review
→ export / monthly summary
→ next assessment review candidate

## 2. Core Problem

Risk Share Pack requires a customer's existing risk assessment source.

Current managed MVP operation can work manually, but the product gap is:

- no source upload UI
- no source metadata table
- no share item draft builder
- no customer-confirmed share set version
- no item-level confirmation tracking

Without this layer, Risk Share Pack can be operated manually but cannot become scalable SaaS.

## 3. MVP Scope

The first app MVP should be internal-operator focused.

It is not customer self-service yet.

MVP users:

- Owner / internal operator
- later: customer manager with restricted access

MVP goals:

- register customer source file
- record source metadata
- draft worker-facing share items
- mark share scope as customer-confirmed
- prepare QR activation state
- connect to existing worker confirmation and report flow

## 4. Non-Goals

MVP does not include:

- automatic legal risk assessment creation
- automatic PDF/Excel parsing
- AI final assessment generation
- risk assessment outsourcing
- legal compliance guarantee
- automatic PTW approval
- item-level worker confirmation enforcement
- customer self-service upload without review

## 5. Source Intake UI Candidate

Route candidate:

- /owner/risk-share/sources
- /manager/risk-share/sources
- /manager/risk-share/source-intake

Recommended first route:

- /owner/risk-share/sources

Reason:

- source files may contain sensitive information
- first version should be internal controlled flow
- customer-facing upload requires consent, retention, and access policy

## 6. Source Intake Fields

Minimum fields:

- companyCode
- company display name
- source title
- source type
- assessment period
- site name
- work group
- received date
- source review status
- share scope status
- operator note

Source type options:

- PDF
- Excel
- HWP
- Image scan
- Manual summary
- Existing internal document
- Other

Review status options:

- received
- reviewing
- reviewed
- needs_customer_confirmation
- confirmed
- rejected
- archived

Share scope status options:

- not_started
- draft
- customer_confirmed
- qr_ready
- operating
- hold

## 7. File Storage Candidate

v1 implementation candidates:

### 7.1 Supabase Storage

Use when Supabase-first architecture is prioritized.

Pros:

- aligns with Supabase ledger
- easier relation with metadata tables
- better for future customer portal

Cons:

- access policy must be carefully configured
- signed URL and permission handling required

### 7.2 Vercel Blob

Use when app upload and file handling speed is prioritized.

Pros:

- already used in existing evidence flows
- simple upload model

Cons:

- must still store authoritative metadata in Supabase
- access policy and retention policy still needed

### 7.3 Internal Manual Storage

Use before implementation.

Pros:

- immediately usable
- avoids premature file upload feature

Cons:

- not scalable
- cannot provide in-app source traceability

Current decision:

- v1 managed onboarding can use internal manual storage.
- app MVP should prepare for Supabase Storage or Blob with Supabase metadata.

## 8. Supabase Metadata Table Candidate

### 8.1 risk_share_sources

Purpose:

Track source document metadata.

Candidate fields:

- id
- company_code
- site_id
- source_type
- source_title
- source_file_url
- source_storage_key
- source_version
- assessment_period
- received_at
- reviewed_at
- review_status
- share_scope_status
- uploaded_by
- reviewed_by
- operator_note
- created_at
- updated_at

### 8.2 risk_share_source_files

Purpose:

Track file-level details if multiple files belong to one source.

Candidate fields:

- id
- source_id
- file_name
- file_mime_type
- file_size
- storage_provider
- storage_key
- file_url
- uploaded_at
- uploaded_by
- deleted_at

### 8.3 risk_share_items

Purpose:

Track worker-facing share items.

Candidate fields:

- id
- company_code
- source_id
- site_id
- work_type
- major_category
- middle_category
- minor_category
- hazard_title
- possible_consequence
- safety_measure
- worker_facing_summary
- share_priority
- review_status
- activation_status
- created_at
- updated_at

### 8.4 risk_share_versions

Purpose:

Track activated share sets.

Candidate fields:

- id
- company_code
- source_id
- version_label
- share_scope
- published_at
- published_by
- active
- qr_scope
- created_at
- updated_at

## 9. Share Item Draft Builder

The app should allow internal operator to create share item drafts from the source.

Draft item fields:

- work type
- hazard title
- possible consequence
- safety measure
- worker-facing summary
- priority
- site or area
- source note

The operator can:

- add item
- edit item
- remove item
- mark as customer-confirmed
- include in share set
- exclude from share set

AI can later suggest drafts, but operator review is required.

## 10. Customer Confirmation Step

Before QR activation:

- customer reviews selected share scope
- customer confirms whether full table or selected items are shared
- customer confirms anonymous report policy
- customer confirms representative confirmation method
- customer confirms monthly summary/export receiver

The app should store:

- confirmed_at
- confirmed_by
- confirmation_note
- share_scope_status = customer_confirmed

## 11. QR Activation Step

QR should not be activated before:

- source reviewed
- share items drafted
- customer confirmed share scope
- privacy notice prepared
- go-live test plan ready

Activation states:

- draft
- customer_confirmed
- qr_ready
- operating
- paused
- archived

## 12. Connection to Existing Flows

Source Intake connects to existing Risk Share Pack flows:

- worker share confirmation
- anonymous worker report
- worker representative confirmation
- manager inbox
- customer CSV export
- monthly summary

Current v1 connection:

- sharedRiskSummary in raw_payload
- submission-level confirmation
- source/item relation not yet enforced

Future v2 connection:

- worker confirmation linked to version_id
- worker confirmation optionally linked to item_id
- worker report linked to source_id or item_id if selected
- monthly summary groups records by active share version

## 13. Privacy and Security

Do not expose source files publicly.

Do not put source files in GitHub.

Do not expose:

- API keys
- service role keys
- Owner Token
- environment variable values
- customer-sensitive data
- actual worker personal data beyond agreed scope
- admin-only links

File access must be controlled.

Customer-facing exports should not expose raw_payload, storage keys, or internal file URLs unless explicitly designed and reviewed.

## 14. Retention and Deletion Policy Gap

This is a required future decision.

Need to define:

- source file retention period
- archived source handling
- deleted customer handling
- export package retention
- test file cleanup
- customer request for deletion or return

Until policy is defined, operate source files as internal controlled records.

Do not promise a specific legal retention period unless verified.

## 15. AI Extraction Future Phase

AI extraction may later:

- classify document type
- extract hazard candidates
- extract work types
- extract safety measures
- propose worker-facing summaries
- detect missing fields
- propose share items

AI must not:

- finalize legal risk assessment
- confirm compliance
- approve safety measures
- replace manager/customer confirmation
- mutate production data without approval

## 16. Implementation Phases

### Phase 1 - Managed Manual Intake

- customer provides source
- operator stores source internally
- operator drafts share items manually
- customer confirms share scope
- QR flow operates through current system

### Phase 2 - Internal Source Intake UI

- owner uploads or registers source
- metadata saved in Supabase
- share item drafts created manually
- customer confirmation status tracked

### Phase 3 - Share Version Activation

- risk_share_versions created
- QR scope linked to active version
- monthly summary shows active source/version

### Phase 4 - AI Extraction Candidate

- AI suggests share items
- operator reviews and edits
- customer confirms share set

### Phase 5 - Item-Level Confirmation

- worker confirms selected share items
- item-level confirmation counts
- repeated unconfirmed items become manager review candidates

## 17. Current Decision

The next implementation target after managed onboarding is not more worker input.

The next implementation target is Source Intake App MVP:

- source file registration
- source metadata
- share item draft builder
- customer confirmation
- QR activation state

This keeps Risk Share Pack aligned with Supabase-first architecture and prevents Notion from becoming the long-term ledger for new customers.
