# SafeMetrica Voice PTW & Work Signal Escalation Roadmap v1

## 1. Purpose

This document defines the future roadmap for expanding SafeMetrica voice input from Voice TBM into Voice PTW and always-on Work Signal escalation.

Current Voice TBM supports pre-work safety communication.

The next expansion should support:

- high-risk work permit request drafting
- work change signal reporting
- hazard escalation
- urgent supervisor notification
- manager review
- approval, supplement request, rejection, or action-needed status
- monthly report and company risk ledger reflection

This roadmap is not an immediate implementation spec.

## 2. Current Position

Current:

- Voice TBM records pre-work safety communication.
- Worker participation records risk reports, near misses, improvement suggestions, and share confirmations.
- Risk Share Pack supports managed commercial MVP operation.
- Company Risk Ledger roadmap defines future assessment candidate generation.

Voice PTW and Work Signal should connect these flows without confusing their roles.

## 3. Voice TBM vs Voice PTW vs Work Signal

### 3.1 Voice TBM

Voice TBM is used before work.

Main purpose:

- summarize work plan
- identify expected hazards
- record safety briefing
- attach evidence
- support monthly reporting

### 3.2 Voice PTW

Voice PTW is used before high-risk work that requires prior approval or review.

Main purpose:

- draft PTW request
- classify high-risk work type
- identify required controls
- notify supervisor or approver
- record approval workflow

Voice PTW must not automatically approve high-risk work.

### 3.3 Work Signal

Work Signal is used during daily operations.

Main purpose:

- report work change
- report unexpected hazard
- report equipment abnormality
- report near miss
- request supervisor review
- report action completion candidate

Work Signal is an escalation and record flow, not a legal judgment.

## 4. Voice PTW Flow

Recommended flow:

1. field manager or worker speaks PTW request
2. system transcribes voice
3. AI classifies high-risk work type
4. AI drafts PTW request candidate
5. system checks required fields
6. supervisor or approver receives notification
7. supervisor reviews
8. supervisor approves, requests supplement, rejects, or marks action-needed
9. final decision is stored
10. record connects to monthly report and company risk ledger

## 5. High-Risk Work Candidate Types

Initial candidate types:

- hot work
- confined space
- work at height
- lifting operation
- heavy equipment operation
- electrical isolation
- excavation
- demolition
- night work
- vehicle and pedestrian mixed operation
- abnormal maintenance
- chemical handling
- fire-risk work

These are classification candidates.

Company-specific PTW categories should be configurable later.

## 6. Escalation Channel Candidates

Possible escalation channels:

- in-app alert
- manager dashboard alert
- push notification
- SMS
- vibration alert
- email
- Kakao or external notification later if approved
- site display or speaker in future Physical Safety AI OS stage

Initial implementation should start with in-app status and manager dashboard alert.

SMS or external notification should be added only after notification policy, cost, consent, and privacy review.

## 7. Notification Rule Candidates

Notification may be triggered when:

- high-risk work type is detected
- PTW request is submitted
- urgent hazard is reported
- work condition changes
- near miss is reported
- action completion is reported
- supervisor approval is overdue
- repeated report appears in the same site or equipment area

Urgency candidates:

- normal
- review_needed
- urgent
- stop_and_review_candidate

Do not use wording that implies AI has ordered work stoppage unless a human manager confirms it.

## 8. AI Role Boundary

AI may:

- transcribe voice
- summarize request
- classify intent
- identify missing fields
- suggest PTW category
- suggest required checks
- suggest escalation level
- suggest manager review candidate
- suggest monthly report candidate
- suggest company risk ledger candidate

AI must not:

- approve PTW
- reject PTW
- confirm legal compliance
- confirm work is safe
- confirm action completion
- replace supervisor judgment
- replace business owner responsibility

## 9. Human Review Boundary

Manager or approver must:

- review the PTW request
- confirm work scope
- confirm controls
- approve, request supplement, reject, or mark action-needed
- confirm actual work condition
- confirm completion evidence if needed

Business owner or responsible manager remains responsible for final operation decisions.

## 10. Data Model Candidates

Voice PTW candidate fields:

- company_code
- site_name
- requester_name
- requester_role
- work_type
- ptw_type
- work_location
- planned_start_time
- planned_end_time
- hazard_summary
- required_controls
- attached_evidence
- AI draft summary
- review_status
- approver_name
- approved_at
- rejected_reason
- supplement_request
- linked_tbm_id
- linked_risk_item_id
- linked_company_risk_ledger_id

Work Signal candidate fields:

- company_code
- site_name
- reporter_mode
- signal_type
- urgency_candidate
- location
- equipment
- work_type
- voice_transcript
- AI summary
- manager_review_status
- action_status
- evidence_files
- monthly_report_candidate
- company_risk_ledger_candidate

## 11. Connection to Risk Share Pack

Voice PTW and Work Signal should not replace Risk Share Pack.

They should connect to it:

- risk reports can become Work Signals
- repeated Work Signals can become company risk ledger candidates
- PTW requests can become high-risk work evidence
- manager review can feed monthly summary
- urgent signals can become ad-hoc risk assessment candidates
- unresolved signals can carry into next assessment cycle

## 12. Connection to Company Risk Ledger

Voice PTW and Work Signal should feed the company risk ledger.

Candidate reflections:

- repeated high-risk work
- repeated near miss
- repeated equipment abnormality
- repeated work change
- rejected PTW request
- delayed approval
- repeated supplement request
- repeated missing control
- action completion evidence

These should become reviewed hazard candidates, not automatic confirmed assessment items.

## 13. Connection to Physical Safety AI OS

Long-term direction:

- voice input
- app alert
- manager dashboard
- vibration or SMS alert
- site display
- speaker or broadcast
- sensor signal
- equipment signal
- robot or physical device guidance

The future Physical Safety AI OS should connect field signals to the right communication channel.

## 14. Implementation Phases

### Phase 1 - Documentation

- define Voice PTW roadmap
- define Work Signal escalation roadmap
- define AI and human role boundary
- define high-risk work candidate types

### Phase 2 - Voice PTW Draft MVP

- create voice PTW draft route
- classify PTW type
- store draft
- show manager review screen
- no external notification yet

### Phase 3 - Internal Escalation

- dashboard alert
- pending approval count
- urgent signal card
- manager review workflow

### Phase 4 - External Notification

- SMS or push notification
- consent and cost policy
- notification log
- retry and failure handling

### Phase 5 - Company Risk Ledger Integration

- repeated PTW and Work Signal reflection
- ad-hoc assessment candidate generation
- monthly summary integration

### Phase 6 - Physical Safety AI OS

- zone-based alert
- voice guidance
- site display
- sensor/equipment integration
- physical device or robot guidance

## 15. Prohibited Wording

Do not use:

- AI approves PTW
- automatic work permit
- legal permit completed
- high-risk work safety guaranteed
- accident prevention guaranteed
- legal compliance guaranteed
- penalty prevention
- work stoppage ordered by AI
- action completion confirmed by AI

Recommended wording:

- PTW request draft
- approval request support
- supervisor review needed
- escalation candidate
- urgent review candidate
- manager confirmation required
- approval-support workflow

## 16. Current Decision

Voice PTW and Work Signal are feasible and strategically aligned with SafeMetrica.

They should not be implemented before Risk Share Pack commercialization and customer onboarding are stabilized.

The correct sequence is:

1. Risk Share Pack commercial onboarding
2. Company Risk Ledger MVP
3. Voice PTW draft MVP
4. Work Signal escalation MVP
5. notification integration
6. Physical Safety AI OS expansion
