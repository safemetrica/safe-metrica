# SafeMetrica Risk Share Pack IP Evidence Capture Checklist v1

## 1. Purpose

This checklist defines the screen capture and evidence preparation process for Risk Share Pack copyright and IP documentation.

This is an internal evidence checklist.

It is not a legal opinion, patent claim, trademark filing document, or final rights analysis.

## 2. Evidence Capture Principle

Use only test data or masked data.

Do not capture or expose:

- API keys
- service role keys
- Owner Token
- environment variable values
- Supabase service credentials
- actual worker personal information
- actual customer-sensitive incident details
- unmasked phone numbers
- admin-only URLs with token-like values
- Notion database IDs unless necessary and masked

## 3. Required Capture Set

### 3.1 Product Overview

Capture:

- SafeMetrica main app screen
- Risk Share Pack manager entry screen
- worker participation entry screen
- monthly risk share summary screen

### 3.2 Worker Share Confirmation Flow

Capture:

1. company-specific QR/link entry
2. risk assessment sharing confirmation screen
3. minimum identity information input
4. share confirmation submission result
5. manager inbox showing share confirmation
6. customer CSV export showing identified confirmation

Expected evidence:

- submission_type: 공유확인
- anonymous: false
- identityMode: identified
- worker identity fields visible in customer export

### 3.3 Anonymous Worker Report Flow

Capture:

1. worker report entry screen
2. anonymous submission selection
3. report content screen
4. submission result
5. manager inbox showing 익명 label
6. customer CSV export with identity fields blank

Expected evidence:

- submission_type: 위험제보 / 아차사고 / 개선제안
- anonymous: true
- identityMode: anonymous
- workerName blank
- workerTeam blank
- workerPhoneLast4 blank
- workerEmployeeNo blank

### 3.4 Worker Representative Confirmation Flow

Capture:

1. linkId-based confirmation entry
2. representative confirmation form
3. representative opinion or objection field if used
4. submission result
5. manager representative confirmation screen
6. customer export row

### 3.5 Manager Review Inbox

Capture:

- 공유확인 후보
- 신규 제보
- 익명
- 확인정보 있음
- 기존기록/확인정보 미입력
- 기존기록/제출자 표시 있음
- 월간보고서 후보

### 3.6 Customer CSV Export

Capture masked samples for:

- worker_share_confirmations
- worker_reports
- worker_representative_confirmations
- evidence_manifest if used

Check:

- no raw_payload
- no token-like values
- no service credentials
- anonymous worker identity fields blank
- legacy unidentified label visible where applicable

### 3.7 Monthly Summary

Capture:

- share confirmation count
- worker report count
- near miss / improvement suggestion if available
- manager review-needed count
- worker representative confirmation count

Check:

- share confirmation is not counted as action-completed KPI
- anonymous reports do not expose worker identity

### 3.8 Production Deployment / PR History

Capture:

- GitHub PR list or selected merged PRs
- production deployment ready screen
- commit history around #446 to #456

Use as timestamped development evidence.

## 4. Recommended File Naming

Use this naming pattern:

- 01_product_overview.png
- 02_worker_share_confirmation_entry.png
- 03_worker_share_confirmation_identity.png
- 04_worker_share_confirmation_submitted.png
- 05_anonymous_report_entry.png
- 06_anonymous_report_submitted.png
- 07_manager_inbox_identity_labels.png
- 08_worker_representative_confirmation.png
- 09_customer_csv_share_confirmations_masked.png
- 10_customer_csv_worker_reports_masked.png
- 11_monthly_summary_masked.png
- 12_production_deployment_ready.png
- 13_pr_history.png

## 5. Masking Rules

Mask or remove:

- customer private contact details
- actual worker names
- phone numbers
- tokens
- IDs that are not necessary
- internal admin-only URLs
- incident-sensitive text

Acceptable test labels:

- 테스트근로자A
- 검증팀
- 테스트구역
- TEST_RSP_IP_CAPTURE
- Demo Company
- Sample Site

## 6. Evidence Package Folder Structure

Recommended structure:

1_Product_Overview/
2_Worker_Share_Confirmation/
3_Anonymous_Worker_Report/
4_Worker_Representative_Confirmation/
5_Manager_Review_Inbox/
6_Customer_CSV_Export/
7_Monthly_Summary/
8_PR_Commit_History/
9_Excluded_Materials_Checklist/

## 7. Excluded Materials Checklist

Before sharing with legal/IP reviewer, confirm that the package excludes:

- API keys
- service role keys
- Owner Token
- environment variable values
- Supabase service credentials
- raw production secrets
- real worker personal data
- unmasked customer incident details
- admin-only links
- token-like URL parameters

## 8. Product Boundary Statement

Recommended statement:

SafeMetrica Risk Share Pack is a managed SaaS workflow that connects risk assessment sharing, worker confirmation, anonymous worker reporting, worker representative confirmation, manager review, customer-facing export, and next-cycle risk assessment candidate generation.

Avoid:

- legal compliance guarantee
- penalty prevention guarantee
- no-accident guarantee
- automated final risk assessment
- AI legal judgment
- risk assessment outsourcing replacement
- safety management agency replacement

## 9. Capture Completion Criteria

Evidence capture is complete when:

- all required capture groups are prepared
- all screenshots use test or masked data
- CSV samples are masked
- PR history is captured
- production deployment evidence is captured
- excluded materials checklist is reviewed
- no sensitive secrets are included

## 10. Current Decision

Risk Share Pack has enough product structure and timestamped development evidence for a first IP evidence capture package.

The next step is to collect masked screenshots and exported samples according to this checklist.
