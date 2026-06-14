# SafeMetrica Risk Share Pack Source Retention, Access & Deletion Policy v1

## 1. Purpose

This document defines the retention, access, deletion, and return policy for customer-provided risk assessment source files used in Risk Share Pack.

Risk Share Pack source files may include:

- risk assessment tables
- risk assessment result reports
- site-specific hazard summaries
- photos or scanned documents
- Excel/PDF/HWP documents
- worker-facing safety measures
- site or equipment information

These files can contain customer-sensitive information and must be controlled.

## 2. Core Decision

Risk assessment source files are controlled internal operating records.

They must not be stored in GitHub.

They must not be exposed through public QR links.

They must not be treated as public worker-facing content unless the customer explicitly confirms the share scope.

For v1 managed onboarding, source files are handled by internal operators only.

## 3. Product Boundary

Risk Share Pack does not replace the customer's legal risk assessment execution.

Risk Share Pack uses customer-provided sources to prepare worker-facing share items, confirmation flows, reports, and export records.

The system records operation and evidence flow.

It does not guarantee legal compliance, penalty prevention, legal immunity, no-accident outcome, or safety management agency service.

## 4. Source File Sensitivity

Source files may include:

- customer site layout
- equipment and machinery information
- high-risk work details
- accident or near miss history
- improvement measures
- manager names or roles
- internal safety weaknesses
- contractor information
- photos or scanned documents
- personal information if included by the customer

Therefore source files must be handled as restricted internal materials.

## 5. Access Policy

### 5.1 Allowed Access

Allowed access:

- Owner / internal operator
- authorized SafeMetrica operating manager
- customer-designated manager if future customer portal is enabled
- legal/IP reviewer only with masked package if needed

### 5.2 Not Allowed Access

Do not expose source files to:

- workers through QR flow
- public partner demo
- sales demo using real customer files
- GitHub
- PR descriptions
- public documentation
- external partners without customer approval
- AI training dataset without explicit policy and approval

## 6. Storage Policy

### 6.1 v1 Managed Storage

For v1:

- store original files in internal controlled storage
- record only metadata in Notion operating hub
- do not create full Notion risk assessment DB for new Risk Share Pack customers
- do not upload source files to GitHub
- do not expose source files through app public routes

### 6.2 Future App Storage

For future app intake:

- use Supabase Storage or Blob for file storage
- store authoritative metadata in Supabase
- use controlled access or signed URLs
- avoid public file URLs
- log upload and access events where possible

## 7. Metadata Policy

Allowed metadata:

- source title
- source type
- source version
- assessment period
- received date
- review status
- share scope status
- operator note
- internal storage reference

Do not store in public docs:

- actual file URL if sensitive
- storage key
- token-like values
- service credentials
- raw customer-sensitive content
- unnecessary personal information

## 8. Retention Policy

Retention period must be confirmed by contract or internal operating policy.

Until a formal policy is approved:

- keep source files only as long as necessary for Risk Share Pack operation
- keep customer export records according to agreed service scope
- mark old versions as archived when a new source is activated
- do not promise a specific legal retention period unless verified
- do not state that retention guarantees legal compliance

Recommended operating categories:

- active source
- archived source
- replaced source
- test source
- deleted source

## 9. Deletion Policy

Delete or archive source files when:

- customer requests deletion according to contract
- contract ends and retention period has expired
- test file is no longer needed
- duplicate upload is confirmed
- wrong customer file was uploaded
- source file contains unnecessary sensitive data

Before deletion:

- confirm companyCode
- confirm source title
- confirm source version
- confirm storage location
- confirm whether export/monthly report records need to remain
- record deletion memo internally

Do not delete production evidence blindly without confirming operational and contractual impact.

## 10. Return Policy

If customer requests return of source files:

- provide agreed export or original file copy if available
- do not include internal notes unless agreed
- do not include tokens, storage keys, raw_payload, API data, or internal admin links
- keep return record internally

## 11. Test File Cleanup

Test files must be clearly named.

Recommended test prefix:

- TEST_RSP_SOURCE_
- TEST_RSP_SHARE_SCOPE_
- TEST_RSP_IP_CAPTURE_

After verification:

- delete test source files
- delete test metadata rows
- delete test share items
- delete test worker confirmation rows if created
- confirm no test data appears in customer export or monthly summary

## 12. Customer-Facing Export Boundary

Customer-facing export may include:

- source title
- source version label
- assessment period
- share version label
- worker confirmation count
- worker report count
- representative confirmation status
- review status

Customer-facing export should not include:

- source file storage key
- internal file URL
- raw_payload
- service credentials
- internal admin URL
- Owner Token
- API keys
- internal debug fields
- unnecessary worker personal data

## 13. Worker-Facing Boundary

Worker-facing QR screens may show:

- simple worker-facing risk summary
- selected share items
- safety measure summary
- privacy notice
- report options

Worker-facing QR screens must not show:

- full internal source file by default
- storage URL
- internal assessment notes
- customer-sensitive incident details
- manager-only notes
- other workers' personal data

## 14. Version and Archive Rule

When a new source is activated:

- previous version should be archived
- active version should be updated
- monthly summary should identify which version was active
- worker confirmations should not be silently reinterpreted under a new version

Do not overwrite an old source version without trace.

## 15. Incident Handling

If wrong file or sensitive file is exposed:

1. stop public access immediately
2. revoke or disable affected link if needed
3. identify affected company and source
4. preserve internal incident memo
5. notify responsible internal operator
6. decide customer notification according to contract and law after review
7. rotate credentials if secrets were exposed
8. document corrective action

Do not discuss exposed secrets or sensitive content in GitHub, public docs, or chat logs.

## 16. AI Use Boundary

AI may help:

- classify document type
- summarize source
- propose share item drafts
- identify missing fields
- suggest worker-facing summaries

AI must not:

- finalize legal risk assessment
- guarantee compliance
- approve share scope without customer confirmation
- expose sensitive source content to public demo
- train on customer files without explicit policy and approval
- mutate production records without human review

## 17. Open Decisions

The following require future decision:

- formal retention period by contract type
- customer portal access model
- source file encryption policy
- signed URL expiration rule
- audit log level
- deletion request workflow
- export package retention
- backup storage provider
- legal review process

## 18. Current Decision

Before implementing Risk Share Pack source upload, SafeMetrica must keep source file handling controlled.

The safe sequence is:

1. v1 managed internal storage
2. metadata-only operating hub record
3. source review
4. share scope confirmation
5. version lock
6. QR activation
7. future Supabase-first app source intake
8. future AI extraction with human review

This policy protects customer-sensitive information and prevents Notion, GitHub, QR routes, or demos from becoming unintended source file exposure channels.
