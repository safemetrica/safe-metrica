# SafeMetrica Risk Share Pack First Customer Onboarding Template v1

## 1. Purpose

This template defines the execution flow for onboarding the first real Risk Share Pack customer.

This is an internal operating template.

Do not store customer-sensitive information, private contact details, tokens, API keys, service role keys, Owner Token, or actual worker personal data in GitHub.

Actual customer-specific intake details should be stored in the internal operating hub.

## 2. Operating Position

Risk Share Pack is a managed commercial MVP.

It supports:

- risk assessment sharing
- worker share confirmation
- anonymous or identified worker report
- worker representative confirmation
- manager review
- monthly summary
- customer-facing export

It is not:

- a legal-compliance guarantee
- a penalty-prevention guarantee
- a no-accident guarantee
- a risk assessment outsourcing service
- a safety management agency service
- an AI legal judgment system

## 3. Customer Intake Fields

Before setup, confirm:

### 3.1 Company Basics

- company legal name
- display name
- business site name
- industry
- main work type
- worker count
- site count
- manager reviewer
- monthly summary receiver
- customer export receiver

### 3.2 Risk Assessment Status

- whether a current risk assessment table exists
- risk assessment period
- target site or work group
- high-risk work types
- shared risk items
- whether the assessment differs by site
- whether supporting files are PDF, Excel, Notion, or app data

### 3.3 Worker Participation Policy

- share confirmation required scope
- minimum identity policy
- anonymous report allowed or not
- photo attachment allowed or not
- field location required or not
- worker representative confirmation required or not

Default policy:

- share confirmation requires minimum identity information
- anonymous report can be allowed for risk reports, near misses, and improvement suggestions
- worker representative confirmation uses separate linkId flow

## 4. Company Code Setup

Before go-live:

- confirm companyCode
- register Companies SSOT
- confirm display name
- confirm site name
- confirm field participation route
- confirm worker representative confirmation route
- confirm Supabase ledger target
- confirm customer CSV export route
- confirm monthly summary route

Worker QR link format:

- /field/participation?company={company_code}

Worker representative confirmation link format:

- /field/representative-confirmation?linkId={link_id}

Do not distribute a generic worker participation link without company context.

## 5. Customer Handoff Pack

Prepare:

- worker QR poster
- worker short guide
- manager review guide
- worker representative confirmation guide
- monthly summary guide
- customer CSV export guide
- personal data notice text
- go-live checklist

## 6. Required Production Tests

Before customer operation, run 3 test submissions.

### 6.1 Worker Share Confirmation Test

Expected result:

- submission_type: 공유확인
- anonymous: false
- identityMode: identified
- workerName present
- workerTeam present
- workerPhoneLast4 or workerEmployeeNo present
- manager inbox shows 확인정보 있음
- customer CSV export shows identity information

### 6.2 Anonymous Worker Report Test

Expected result:

- submission_type: 위험제보, 아차사고, or 개선제안
- anonymous: true
- identityMode: anonymous
- workerName empty
- workerTeam empty
- workerPhoneLast4 empty
- workerEmployeeNo empty
- manager inbox shows 익명
- customer CSV export keeps identity fields blank

### 6.3 Worker Representative Confirmation Test

Expected result:

- linkId route is used
- representative name stored
- representative department or role stored
- confirmation scope stored
- review status stored
- customer CSV export includes representative confirmation record

## 7. Verification Checklist

Confirm:

- worker QR opens correct customer context
- share confirmation stores identityMode identified
- anonymous report stores identityMode anonymous
- manager inbox displays identity labels
- Supabase ledger stores expected raw_payload fields
- customer CSV export separates worker share confirmations and worker reports
- monthly summary separates share confirmations, reports, and representative confirmations
- test rows are deleted or clearly marked as test

## 8. Test Data Cleanup

Use a clear test prefix:

- TEST_RSP_GO_LIVE_

After verification, remove or archive test records from:

- Notion field participation DB
- Supabase field_participation_submissions
- worker representative confirmation table if test record was created

Before deleting, verify that the query returns only intended test records.

## 9. Customer Start Decision

Customer operation can start only when:

- customer intake is complete
- companyCode is confirmed
- Companies SSOT is checked
- worker QR poster is reviewed
- personal data notice is reviewed
- 3 production test submissions are verified
- customer CSV export is verified
- monthly summary is verified
- test records are cleaned up
- prohibited wording is removed

## 10. Prohibited Wording

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
- complete anonymity guarantee
- untraceable report guarantee

## 11. First Customer Execution Notes

For the first real customer, operate manually and carefully.

Recommended flow:

1. complete internal intake
2. create companyCode
3. register Companies SSOT
4. prepare QR poster
5. run 3 test submissions
6. verify manager inbox
7. verify Supabase
8. verify customer CSV export
9. verify monthly summary
10. clean test rows
11. start controlled operation

The first customer should be treated as controlled onboarding, not fully automated self-service onboarding.
