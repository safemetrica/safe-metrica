# SafeMetrica Risk Share Pack Commercialization Status & IP Brief v1

## 1. Purpose

This document summarizes the current commercialization status and IP candidate structure of SafeMetrica Risk Share Pack.

Risk Share Pack is a managed commercial MVP for operating the post-risk-assessment record flow:

- worker share confirmation
- anonymous or identified worker report
- near miss report
- improvement suggestion
- worker representative confirmation
- manager review
- monthly summary
- customer-facing export

It is not a legal-compliance guarantee, penalty-prevention service, no-accident guarantee, risk assessment outsourcing service, or safety management agency service.

## 2. Current Commercialization Status

Current status:

- Sales proposal: available
- Demo: available
- Paid pilot: available
- Controlled customer onboarding: available
- Managed SaaS operation: available
- Fully automated self-service SaaS: not yet

Risk Share Pack can be offered as a managed commercial MVP.

It should not be described as a fully automated SaaS product until onboarding, company setup, link generation, customer export, monthly summary, and cleanup flows are sufficiently automated.

## 3. Completed Commercialization Components

### 3.1 Product Definition

Risk Share Pack is defined as a QR-based operational support product for risk assessment sharing and worker participation records.

It supports companies that already have or prepare risk assessment materials and need a practical record flow for:

- sharing
- confirmation
- worker participation
- representative confirmation
- manager review
- reporting
- export

### 3.2 Identity and Anonymous Report Policy

Completed:

- share confirmation requires minimum identity information
- worker reports can allow anonymous submission
- anonymous reports do not expose worker identity fields in customer-facing export
- worker representative confirmation is separated from general worker share confirmation

Identity modes:

- identified
- anonymous
- legacy_unidentified
- legacy_identified
- representative_identified

### 3.3 Submission Flow

Completed:

- worker share confirmation flow
- anonymous worker report flow
- worker representative confirmation linkId flow
- manager review inbox
- Supabase ledger storage
- customer-facing CSV export

### 3.4 Export and Legacy Record Handling

Completed:

- customer CSV export separates worker share confirmations and worker reports
- anonymous report identity fields are blank in customer export
- legacy records without identity mode are not displayed as verified identity records
- manager inbox shows identity mode labels

### 3.5 Go-Live Documentation

Completed:

- Go-Live Checklist
- Customer Intake & Setup Sheet
- Customer QR Poster & Worker Guide

## 4. Production Verification Status

Production verification completed:

### 4.1 Worker Share Confirmation

Verified result:

- submission_type: 공유확인
- anonymous: false
- identityMode: identified
- workerName stored
- workerTeam stored
- workerPhoneLast4 stored
- customer CSV shows identity information

### 4.2 Anonymous Worker Report

Verified result:

- submission_type: 위험제보
- anonymous: true
- identityMode: anonymous
- workerName empty
- workerTeam empty
- workerPhoneLast4 empty
- workerEmployeeNo empty
- customer CSV keeps identity fields blank

### 4.3 Customer CSV Export

Verified result:

- worker_share_confirmations export shows identified share confirmation information
- worker_reports export hides anonymous worker identity information
- legacy unidentified rows are labeled separately

### 4.4 Test Data Cleanup

Production test rows were removed after verification.

## 5. Commercial MVP Boundary

Risk Share Pack may be sold as:

- managed SaaS MVP
- paid pilot
- controlled onboarding product
- risk assessment sharing and participation record support product

Risk Share Pack must not be sold as:

- legal compliance guarantee
- penalty prevention solution
- no-accident guarantee
- risk assessment outsourcing replacement
- safety management agency service
- KOSHA approval guarantee
- automated legal judgment AI

## 6. IP Candidate Structure

The IP point is not a simple QR form.

The core structure is the operating loop:

1. risk assessment item prepared
2. worker share confirmation through company-specific QR
3. minimum identity information for share confirmation
4. anonymous or identified worker report submission
5. near miss and improvement suggestion intake
6. worker representative confirmation through linkId
7. manager review and status handling
8. Supabase ledger accumulation
9. customer-facing export with identity privacy separation
10. monthly summary
11. next risk assessment review candidate generation

This loop creates an operational record structure that connects worker participation, manager review, representative confirmation, export, and future risk assessment improvement.

## 7. IP Candidate Claims - Plain Language

Potential IP candidate themes:

- risk assessment sharing and worker confirmation record flow
- separation of share confirmation identity and anonymous worker report identity
- worker representative confirmation linkId flow
- customer-facing export with identity privacy separation
- legacy record labeling to avoid false verification interpretation
- manager review inbox identity mode labels
- operational loop from worker signal to next risk assessment review candidate

These are product and software process candidates, not legal conclusions.

## 8. Copyright / Evidence Material Candidates

Candidate materials for copyright or IP evidence package:

- Product Spec
- Anonymous Report Mode Spec
- Go-Live Checklist
- Customer Intake & Setup Sheet
- QR Poster & Worker Guide
- Customer Export Field Mapper Spec
- Supabase Ledger Schema
- screenshots of worker share confirmation flow
- screenshots of anonymous report flow
- screenshots of manager review inbox
- screenshots of customer CSV export
- PR history and commit history
- production verification log summary

Do not include tokens, API keys, service role keys, environment variable values, Owner Token, or customer-sensitive information in copyright or IP documents.

## 9. Remaining Commercial Risks

Remaining risks before scaling:

- onboarding is still managed manually
- company setup still requires internal operator review
- customer QR poster must be checked per company
- test data cleanup must be done carefully
- monthly summary identity labels should be rechecked per customer
- Supabase dedicated columns for identity fields may be needed later
- export views may need to replace raw_payload extraction later
- pricing and contract scope must be fixed before multi-customer rollout

## 10. Next Operational Steps

Recommended next steps:

1. prepare one real customer intake sheet
2. confirm companyCode
3. register Companies SSOT
4. prepare customer QR poster
5. create worker representative confirmation link
6. perform 3 required test submissions
7. verify Supabase ledger
8. verify customer CSV export
9. verify monthly summary
10. delete or mark test records
11. start controlled operation

## 11. Recommended Commercial Positioning

Recommended wording:

SafeMetrica Risk Share Pack helps companies record the flow after risk assessment preparation: worker share confirmation, worker reports, worker representative confirmation, manager review, monthly summary, and customer-facing export.

Avoid wording:

- legal guarantee
- penalty prevention
- no-accident guarantee
- legal defense guarantee
- risk assessment outsourcing replacement
- safety management agency service
- AI legal judgment

## 12. Current Decision

Risk Share Pack is ready for controlled sales, paid pilot, and managed customer onboarding.

It is not yet a fully automated self-service SaaS product.

The next practical step is to onboard one real customer using the Go-Live Checklist and Customer Intake & Setup Sheet.
