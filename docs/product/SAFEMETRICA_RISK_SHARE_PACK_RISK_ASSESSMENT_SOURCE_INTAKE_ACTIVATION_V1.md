# SafeMetrica Risk Share Pack Risk Assessment Source Intake & Activation v1

## 1. Purpose

This document defines the required source intake and activation process for operating Risk Share Pack with an actual customer.

Risk Share Pack cannot operate meaningfully without a risk assessment source.

The customer must provide one of the following:

- existing risk assessment table
- risk assessment result report
- latest risk assessment file
- site/work-specific risk assessment summary
- customer-confirmed risk assessment items prepared outside Risk Share Pack

Risk Share Pack does not replace the customer's risk assessment duty or create a legally final risk assessment by itself.

Risk Share Pack supports the post-risk-assessment operating flow:

- sharing
- worker confirmation
- worker report
- worker representative confirmation
- manager review
- monthly summary
- customer-facing export
- next assessment review candidate

## 2. Product Boundary

Risk Share Pack is not:

- risk assessment outsourcing
- safety management agency service
- legal compliance guarantee
- penalty prevention guarantee
- no-accident guarantee
- AI legal judgment
- automatic risk assessment finalizer

Risk Share Pack is:

- risk assessment sharing support
- worker participation record support
- manager review workflow support
- operational evidence and export support
- next-cycle review candidate support

## 3. Current Implementation Status

### 3.1 Implemented

Currently implemented or operationally available:

- worker share confirmation
- anonymous worker report
- near miss / improvement suggestion intake
- worker representative confirmation
- manager inbox
- identity mode labels
- customer CSV export
- risk share monthly summary
- go-live checklist
- customer intake sheet
- QR poster and worker guide
- IP evidence package and capture checklist

### 3.2 Not Fully Implemented Yet

Not fully implemented as automated product flow:

- risk assessment table upload UI
- PDF/Excel automatic parsing
- risk assessment source versioning
- share item generation UI
- site/work-specific share set builder
- per-risk-item worker confirmation
- risk assessment source activation status
- direct link between source risk item and worker confirmation row

Therefore v1 operation is a managed onboarding process.

## 4. Required Customer Source Before Activation

Before activating Risk Share Pack, confirm:

- whether a current risk assessment table exists
- whether the customer can provide the file
- target site
- target work group
- assessment period or revision date
- whether risk items differ by site
- whether high-risk work categories are included
- whether worker-facing summary can be created from the source

If the customer has no risk assessment source, Risk Share Pack should remain in Hold status.

## 5. Source Types

Accepted source types:

### 5.1 PDF

Use when the customer has a signed or exported risk assessment result report.

Managed v1 action:

- internal operator reviews the file
- extract worker-facing shared risk summary
- prepare share scope
- do not upload customer-sensitive source to GitHub

### 5.2 Excel

Use when the customer has structured risk assessment items.

Managed v1 action:

- internal operator reviews columns
- map key fields manually
- prepare share scope

### 5.3 Notion / Existing Customer Hub

Use only for existing customers where Notion is already part of operations.

Managed v1 action:

- read existing risk items
- prepare share scope
- do not treat Notion as the new customer long-term ledger

### 5.4 Manual Summary

Use when the customer provides confirmed shared risk items verbally or in a simple document.

Managed v1 action:

- prepare short worker-facing summary
- mark source quality as limited
- request formal file if commercial operation continues

## 6. Minimum Source Fields

Minimum fields for a useful Risk Share Pack activation:

- company name
- site name
- assessment period or version
- work type
- hazard title
- possible accident or consequence
- existing control
- improvement measure or safety measure
- responsible role if available
- due date if available
- worker-facing shared summary

Optional but recommended fields:

- major category
- middle category
- minor category
- equipment
- location
- current status
- before evidence
- after evidence
- manager note

## 7. Activation States

Risk Share Pack customer activation should follow these states:

1. lead
2. intake_started
3. source_requested
4. source_received
5. source_reviewed
6. share_scope_drafted
7. customer_confirmed_share_scope
8. qr_ready
9. test_submissions_done
10. export_verified
11. monthly_summary_verified
12. operating
13. hold
14. closed

Do not move to qr_ready before source_reviewed.

Do not move to operating before test_submissions_done, export_verified, and monthly_summary_verified.

## 8. Managed v1 Activation Flow

For v1 managed operation:

1. receive customer risk assessment source
2. review source quality
3. identify target site and work group
4. create worker-facing shared risk summary
5. select 5 to 15 key shared risk items if possible
6. prepare QR poster and worker guide
7. run share confirmation test
8. run anonymous report test
9. run worker representative confirmation test
10. verify manager inbox
11. verify Supabase ledger
12. verify customer CSV export
13. verify monthly summary
14. clean or mark test records
15. start controlled operation

## 9. Worker-Facing Share Scope

Worker-facing content should be simple.

Recommended structure:

- 오늘 공유하는 위험요인
- 작업 중 특히 확인할 사항
- 안전조치 주지 확인
- 의견 없음 또는 위험제보 제출
- 익명 제보 가능 여부
- 개인정보 안내

Do not show full internal risk assessment tables to workers unless the customer confirms that full table sharing is intended.

## 10. Future Data Model Candidate

Future Supabase-first tables may include:

### 10.1 risk_share_sources

Purpose:

- store source document metadata
- store customer-provided assessment version
- track source review state

Candidate fields:

- id
- company_code
- site_id
- source_type
- source_title
- source_version
- assessment_period
- received_at
- reviewed_at
- review_status
- operator_note

### 10.2 risk_share_items

Purpose:

- store shared risk items extracted or prepared from the source

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
- consequence
- safety_measure
- worker_facing_summary
- share_status
- review_status

### 10.3 risk_share_versions

Purpose:

- manage each published share set

Candidate fields:

- id
- company_code
- source_id
- version_label
- published_at
- active
- qr_scope
- published_by

### 10.4 worker_share_item_confirmations

Purpose:

- track worker confirmation by item in future v2

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

## 11. Current v1 Manual Mapping

Until the data model is implemented, use manual mapping:

- source file remains in internal operating hub
- worker-facing summary is prepared manually
- sharedRiskSummary is stored in submission raw_payload
- riskAssessmentCheck confirms shared assessment awareness
- customer CSV export shows worker confirmation records
- manager review is based on submission type and identity mode

This is acceptable for managed MVP operation.

It is not acceptable for fully automated self-service SaaS positioning.

## 12. Go / Hold / No-Go

### Go

Use Go when:

- customer has risk assessment source
- customer agrees to share selected risk items
- worker confirmation is needed
- anonymous report policy is agreed
- representative confirmation method is agreed
- monthly summary / export recipient is agreed

### Hold

Use Hold when:

- customer is interested but source file is not ready
- responsible manager is unclear
- site/work scope is unclear
- existing consultant or safety agency role conflict needs review
- customer expects us to create the risk assessment itself

### No-Go

Use No-Go when:

- customer demands legal compliance guarantee
- customer demands penalty prevention wording
- customer demands risk assessment outsourcing replacement
- customer refuses worker participation flow
- customer requires unsafe exposure of tokens or internal systems
- customer wants actual worker personal information exposed beyond agreed scope

## 13. Sales Wording

Recommended wording:

Risk Share Pack operates after a company's risk assessment source is prepared. It helps share selected risk items with workers, collect confirmation and reports, manage representative confirmation, and organize manager review, monthly summary, and customer-facing export.

Avoid wording:

- we create the legal risk assessment
- automatic risk assessment completion
- legal compliance completed
- penalty prevention
- legal immunity
- no-accident guarantee
- safety management agency service

## 14. Current Decision

Risk Share Pack is commercially usable as a managed MVP only when the customer provides a risk assessment source.

The next product gap is risk assessment source intake and activation.

Before implementing automatic parsing or item-level confirmation, SafeMetrica should first lock the managed v1 intake, source review, share scope, and activation process.
