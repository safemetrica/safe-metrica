# SafeMetrica Risk Share Pack Go-Live Checklist v1

## 1. Purpose

This checklist defines the minimum go-live process for operating SafeMetrica Risk Share Pack as a managed commercial MVP.

Risk Share Pack is not a legal-compliance guarantee, safety management agency service, or risk assessment outsourcing service.

It supports the operational record flow after a company's risk assessment has been prepared:

- risk assessment sharing
- worker share confirmation
- worker report, near miss, improvement suggestion
- worker representative confirmation
- manager review
- monthly summary
- customer-facing export

## 2. Commercial Readiness Status

Current status:

- Sales proposal: available
- Demo: available
- Paid pilot: available
- Managed customer setup: available
- Fully self-service SaaS: not yet

Risk Share Pack should be sold and operated as a managed SaaS MVP until onboarding, link generation, monthly summary, export, and cleanup flows are further automated.

## 3. Pre-Contract Customer Intake

Before setup, confirm:

- Company legal name
- Business site name
- Worker count
- Site count
- Existing risk assessment table availability
- Risk assessment sharing target scope
- Worker representative or worker participation method
- Monthly summary receiver
- Export receiver
- Manager reviewer
- Desired pilot period
- Personal data notice requirement
- Anonymous report policy

Do not promise legal immunity, penalty prevention, no-accident outcome, KOSHA approval, risk assessment outsourcing, or safety management agency services.

## 4. Company Setup

Required setup:

- Confirm company code
- Register company in Companies SSOT
- Confirm field participation route
- Confirm worker representative confirmation route
- Confirm Supabase ledger target
- Confirm customer-facing CSV export availability
- Confirm monthly report or risk share summary route

Worker participation link format:

- /field/participation?company={company_code}

Worker representative confirmation link format:

- /field/representative-confirmation?linkId={link_id}

Company code must not be guessed from Notion page names or customer display names. Companies SSOT is the source of truth.

## 5. Minimum Operating Flow

The go-live flow must include:

1. Risk assessment sharing target prepared
2. Worker QR or link prepared
3. Worker share confirmation submitted
4. Worker anonymous or identified report submitted
5. Worker representative confirmation link generated
6. Worker representative confirmation submitted
7. Manager review screen checked
8. Supabase ledger checked
9. Customer CSV export checked
10. Monthly summary checked

## 6. Required Test Submissions

Before customer operation starts, perform 3 test submissions.

### 6.1 Worker Share Confirmation

Expected result:

- submission_type: 공유확인
- anonymous: false
- identityMode: identified
- workerName present
- workerTeam present
- workerPhoneLast4 or workerEmployeeNo present
- Customer CSV shows identity information

### 6.2 Anonymous Worker Report

Expected result:

- submission_type: 위험제보, 아차사고, or 개선제안
- anonymous: true
- identityMode: anonymous
- workerName empty
- workerTeam empty
- workerPhoneLast4 empty
- workerEmployeeNo empty
- Customer CSV keeps identity fields blank

### 6.3 Worker Representative Confirmation

Expected result:

- worker representative confirmation link uses linkId
- company code and site name are not exposed as editable URL parameters
- representative_name stored
- representative_department stored if provided
- representative_role stored
- review_status stored
- Customer CSV export includes representative confirmation record

## 7. Customer-Facing Export Check

Customer export should separate:

- worker share confirmations
- worker reports, near misses, improvement suggestions
- worker representative confirmations
- evidence manifest

Customer-facing export must not include:

- raw_payload
- service role
- API key
- environment variable names or values
- owner or admin-only links
- debug messages
- token-like values

Legacy records without identity mode should not be displayed as if they have verified identity information.

Recommended labels:

- identified: 확인정보 있음
- anonymous: 익명
- legacy_unidentified: 기존기록/확인정보 미입력
- legacy_identified: 기존기록/제출자 표시 있음

## 8. Monthly Summary Check

Monthly summary should separate:

- share confirmation count
- worker report, near miss, improvement suggestion count
- manager review-needed count
- worker representative confirmation count
- representative objection or follow-up count

Share confirmations must not be counted as action-completed KPI.

Anonymous reports must not expose worker identity information in customer-facing summaries.

## 9. Data Cleanup After Test

After production test, remove or archive test rows from:

- Notion field participation DB
- Supabase field_participation_submissions
- worker representative confirmation tables, if test records were created

Use a clear test prefix:

- TEST_RSP_GO_LIVE_

Before deleting production test records, verify that the query returns only intended test rows.

## 10. Go-Live Decision

Go-live is allowed only when:

- 3 required test submissions are completed
- Supabase ledger values are checked
- customer CSV export is checked
- monthly summary route is checked
- test rows are deleted or marked as test
- customer QR or poster text has been reviewed
- no prohibited legal or safety-guarantee wording is used

## 11. Prohibited Wording

Do not use:

- legal immunity guarantee
- penalty prevention
- no-accident guarantee
- legal compliance completion
- risk assessment outsourcing replacement
- safety management agency service
- KOSHA approval guarantee
- AI confirms legal compliance
- AI confirms action completion

## 12. Operating Position

Risk Share Pack is a managed commercial MVP.

It is suitable for sales, paid pilot, and controlled customer onboarding.

It is not yet a fully automated self-service SaaS product.
