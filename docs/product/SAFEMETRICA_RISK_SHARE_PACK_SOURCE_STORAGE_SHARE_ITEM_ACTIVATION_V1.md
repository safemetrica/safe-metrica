# SafeMetrica Risk Share Pack Source Storage & Share Item Activation v1

## 1. Purpose

This document defines how Risk Share Pack should handle customer-provided risk assessment files and activate worker-facing share items.

This document closes the key product gap:

Customer risk assessment source
→ internal storage
→ share item extraction
→ customer-confirmed share scope
→ worker-facing QR sharing
→ worker confirmation / report / representative confirmation
→ manager review
→ export / monthly summary
→ next assessment review candidate

## 2. Core Decision

Risk Share Pack should not recreate the customer's risk assessment table as a Notion database.

Risk Share Pack v1 uses managed onboarding:

- customer provides risk assessment source
- internal operator stores the original file in the internal storage process
- operator extracts worker-facing share items
- customer confirms the share scope
- Risk Share Pack activates QR sharing and participation records

Notion should not become the new operational ledger for new Risk Share Pack customers.

## 3. Product Boundary

Risk Share Pack is not:

- risk assessment outsourcing
- safety management agency service
- automatic legal risk assessment generator
- legal compliance guarantee
- penalty prevention guarantee
- no-accident guarantee
- AI legal judgment system

Risk Share Pack is:

- post-risk-assessment sharing support
- worker confirmation record support
- anonymous or identified report intake
- worker representative confirmation support
- manager review workflow
- customer-facing export
- monthly summary support
- next-cycle review candidate support

## 4. v1 Managed Source Handling

For v1, when a customer provides an existing risk assessment result:

1. receive the file from the customer
2. store the original file in the internal operating storage
3. record only source metadata in the customer operating hub
4. manually review the source
5. extract worker-facing key share items
6. prepare a worker-facing summary
7. confirm share scope with the customer
8. activate QR sharing
9. run 3 go-live tests
10. verify export and monthly summary

Do not upload customer source files to GitHub.

Do not store tokens, API keys, service role keys, Owner Token, or customer-sensitive information in public docs.

## 5. Notion Role

Notion may be used as an internal operating hub only.

Allowed Notion use:

- source received status
- file name or internal storage reference
- assessment period
- source review status
- share scope draft status
- customer confirmation status
- QR readiness
- go-live checklist
- customer communication memo

Not allowed:

- rebuilding the full risk assessment table as a Notion DB for new Risk Share Pack customers
- treating Notion as the customer source of truth
- long-term item-level ledger in Notion
- storing actual worker personal data or sensitive incident details unnecessarily
- exposing admin-only links or token-like values

## 6. Source Storage Options

### 6.1 v1 Internal Storage

Use for first controlled customers.

Characteristics:

- manual file handling
- internal operator review
- no customer self-upload
- no automatic parsing
- source metadata tracked separately

### 6.2 v2 Supabase Storage or Blob

Use when productizing source intake.

Characteristics:

- upload source file through internal app flow
- store file in Supabase Storage or Blob
- store metadata in Supabase table
- connect source_id to share items
- support future export and audit trail

### 6.3 v3 App Document Intake

Use for scalable onboarding.

Characteristics:

- internal operator or customer uploads file through SafeMetrica app
- document type selected or inferred
- source metadata created
- extraction candidate generated
- manager/operator reviews
- share item set activated

## 7. Share Item Activation

A source file is not automatically shared.

The operator must create a worker-facing share item set.

Each share item should include:

- site or work area
- work type
- hazard title
- possible consequence
- safety measure
- worker-facing summary
- share priority
- source reference
- review status
- activation status

The customer should confirm the share scope before QR distribution.

## 8. Worker-Facing Summary Standard

Worker-facing content must be simple and practical.

Recommended structure:

- 오늘 공유하는 주요 위험요인
- 작업 중 특히 확인할 사항
- 기존 안전조치 또는 주의사항
- 의견 없음 제출 안내
- 위험제보 / 아차사고 / 개선제안 안내
- 익명 제출 가능 여부
- 개인정보 안내

Avoid showing the full internal risk assessment table unless the customer explicitly confirms full table sharing.

## 9. Future Supabase Tables

### 9.1 risk_share_sources

Purpose:

- track customer-provided source files
- track assessment period/version
- track source review status

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
- operator_note

### 9.2 risk_share_items

Purpose:

- store worker-facing share items extracted from the source

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

### 9.3 risk_share_versions

Purpose:

- manage each activated QR share set

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

### 9.4 worker_share_item_confirmations

Purpose:

- future item-level confirmation tracking

Candidate fields:

- id
- company_code
- version_id
- item_id
- worker_display_name
- worker_team
- worker_phone_last4
- worker_employee_no
- confirmed_at
- confirmation_status

## 10. Current v1 Manual Mapping

Until future tables are implemented:

- original source file is stored internally
- source metadata is tracked in customer operating hub
- worker-facing summary is prepared manually
- QR flow stores sharedRiskSummary in raw_payload
- worker confirmation is tracked at submission level
- item-level confirmation is not yet implemented
- export shows worker confirmation and report records

This is acceptable for managed MVP operation.

It is not acceptable for fully automated self-service SaaS positioning.

## 11. Activation Checklist

Before activation:

- source file received
- source type identified
- assessment period confirmed
- target site confirmed
- target work group confirmed
- share item set drafted
- customer confirmed share scope
- QR poster prepared
- privacy notice prepared
- share confirmation test done
- anonymous report test done
- representative confirmation test done
- customer CSV export verified
- monthly summary verified
- test records cleaned or marked

## 12. Go / Hold / No-Go

### Go

Proceed when:

- source file exists
- customer agrees to share selected items
- worker confirmation is needed
- anonymous report policy is agreed
- representative confirmation flow is agreed
- monthly summary/export recipient is confirmed

### Hold

Hold when:

- source file is not ready
- source quality is unclear
- target site is unclear
- share scope is unclear
- customer expects us to create the risk assessment itself
- existing safety consultant role needs clarification

### No-Go

Reject or stop when:

- customer demands legal compliance guarantee
- customer demands penalty prevention wording
- customer demands risk assessment outsourcing replacement
- customer refuses worker participation flow
- customer asks to expose tokens, internal systems, or sensitive raw data
- customer requires unsafe personal data exposure

## 13. Sales Wording

Recommended wording:

Risk Share Pack works after the customer's risk assessment source is prepared. We use the provided source to set up selected worker-facing share items, then operate worker confirmation, anonymous reports, representative confirmation, manager review, monthly summary, and customer-facing export.

Avoid wording:

- upload and automatically complete risk assessment
- AI completes the legal risk assessment
- legal compliance completed
- penalty prevention
- no-accident guarantee
- safety management agency replacement
- risk assessment outsourcing replacement

## 14. Current Decision

Risk Share Pack can operate now through managed onboarding.

The next product gap is not worker confirmation, report intake, or export.

The next product gap is source storage and share item activation:

- receive source
- store source safely
- extract share items
- confirm share scope
- activate QR flow
- later automate with Supabase-first source tables and app document intake
