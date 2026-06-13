# SafeMetrica Risk Share Pack Customer Intake & Setup Sheet v1

## 1. Purpose

This sheet defines the customer intake and setup process for onboarding a new Risk Share Pack customer.

Risk Share Pack is operated as a managed commercial MVP.

It supports the record flow after a company's risk assessment has been prepared:

- worker share confirmation
- worker report, near miss, improvement suggestion
- worker representative confirmation
- manager review
- monthly summary
- customer-facing export

It is not a legal-compliance guarantee, risk assessment outsourcing service, safety management agency service, or no-accident guarantee.

## 2. Customer Intake

Confirm these items before setup.

### 2.1 Company Information

- Company legal name
- Display name
- Business site name
- Industry
- Main work types
- Worker count
- Site count
- Main manager name
- Main manager role
- Monthly summary receiver
- Customer export receiver

Do not store private contact details in public docs, GitHub issues, or PR descriptions.

### 2.2 Risk Assessment Status

Confirm:

- Existing risk assessment table availability
- Risk assessment period
- Risk assessment sharing target
- Main risk items to share
- Whether worker share confirmation is required for all workers or selected teams
- Whether risk assessment table is provided as file, Notion page, PDF, Excel, or app data

Risk Share Pack does not replace the company's own risk assessment.

## 3. Worker Participation Policy

Confirm:

- Worker share confirmation method
- Anonymous report policy
- Whether worker name or alias is allowed
- Whether team or work group is required
- Whether phone last 4 digits or employee number is used
- Whether photo attachment is allowed
- Whether field location is required

Default policy:

- Share confirmation requires minimum identity information.
- Worker reports, near misses, and improvement suggestions may allow anonymous submission.
- Anonymous reports do not expose worker identity fields in customer-facing export.

## 4. Worker Representative Policy

Confirm:

- Whether worker representative confirmation is required
- Representative name
- Representative department or team
- Representative role
- Confirmation scope
- Whether objection or follow-up opinion is allowed
- Manager reviewer

Worker representative confirmation must not be replaced by general worker share confirmation counts.

## 5. Company Code Setup

Before go-live:

- Confirm company code
- Register company in Companies SSOT
- Confirm company display name
- Confirm field participation DB or Supabase ledger target
- Confirm monthly summary route
- Confirm customer CSV export route

Worker participation link format:

- /field/participation?company={company_code}

Worker representative confirmation link format:

- /field/representative-confirmation?linkId={link_id}

Company code must not be guessed from Notion page names or customer display names.

## 6. Setup Checklist

### 6.1 Required Setup

- Companies SSOT registered
- Worker participation link created
- Worker representative confirmation link generation available
- Manager review screen available
- Supabase ledger available
- Customer CSV export available
- Monthly summary available
- QR poster text reviewed
- Personal data notice reviewed
- Prohibited wording removed

### 6.2 Required Test Records

Before customer operation, create and verify:

1. Worker share confirmation
2. Anonymous worker report
3. Worker representative confirmation

Expected Supabase result for share confirmation:

- submission_type = 공유확인
- anonymous = false
- identityMode = identified
- workerName present
- workerTeam present
- workerPhoneLast4 or workerEmployeeNo present

Expected Supabase result for anonymous report:

- submission_type = 위험제보, 아차사고, or 개선제안
- anonymous = true
- identityMode = anonymous
- workerName empty
- workerTeam empty
- workerPhoneLast4 empty
- workerEmployeeNo empty

Expected worker representative result:

- linkId route used
- representative name stored
- representative role stored
- review status stored
- company code and site name are not editable URL parameters

## 7. Customer Export Acceptance Check

Customer-facing export must separate:

- worker share confirmations
- worker reports, near misses, improvement suggestions
- worker representative confirmations
- evidence manifest

Export must not include:

- raw_payload
- service role
- API key
- environment variable names or values
- owner or admin-only links
- debug messages
- token-like values

Legacy identity labels:

- 확인정보 있음
- 익명
- 기존기록/확인정보 미입력
- 기존기록/제출자 표시 있음

## 8. Monthly Summary Acceptance Check

Monthly summary should separate:

- share confirmation count
- worker report count
- near miss count
- improvement suggestion count
- manager review-needed count
- worker representative confirmation count
- representative objection or follow-up count

Share confirmation must not be counted as action-completed KPI.

Anonymous reports must not expose worker identity information.

## 9. Customer Handoff Packet

Before customer start, prepare:

- Worker QR link
- Worker QR poster
- Worker representative confirmation link
- Manager review guide
- Monthly summary guide
- Export delivery guide
- Personal data notice text
- Prohibited wording check

## 10. Go-Live Decision

Go-live is allowed only when:

- intake items are confirmed
- company code is registered
- Companies SSOT is checked
- 3 required test records are verified
- customer CSV export is verified
- monthly summary is verified
- test rows are deleted or marked as test
- QR poster text is reviewed
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

Risk Share Pack is ready for sales proposal, demo, paid pilot, and controlled customer onboarding.

It remains a managed commercial MVP.

It is not yet a fully automated self-service SaaS product.
