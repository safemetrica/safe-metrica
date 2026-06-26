# Field Touch Note Core v1

## 1. Purpose

Field Touch Note Core is a SafeMetrica common field-operation feature.

It lets a field manager, owner, or internal operator quickly tap the mobile screen while walking the site and leave a short color-coded field note.

The note is not a final legal or safety judgment. It is an operating record and a review candidate that can later connect to manager review, owner signals, monthly operation reports, evidence records, and risk-assessment improvement candidates.

## 2. Core Use Cases

- 급하게 발견한 위험요인 메모
- 조치 필요 항목 메모
- 확인 필요 항목 메모
- 대표 확인 후보 메모
- 월간보고서 후보 메모
- 위험성평가 보완 후보 메모
- 현장 사진·위치·짧은 설명을 함께 남기는 현장 운영기록
- 현대호이스트 같은 설치·AS·작업지시 현장의 빠른 메모 후보

## 3. User Roles

### Field Manager

현장에서 위험요인, 조치 필요, 확인 필요 항목을 빠르게 기록합니다.

### Owner / Representative

대표 확인이 필요한 항목을 직접 남기거나, 관리자 기록 중 대표 확인 후보를 확인합니다.

### Internal Operator

운영자가 현장 방문 중 확인한 내용을 내부 운영기록 후보로 남깁니다.

## 4. Color Categories

| Color | Category | Meaning |
| --- | --- | --- |
| Red | 긴급 위험 | 즉시 확인이 필요한 위험 신호 |
| Orange | 조치 필요 | 후속 조치 또는 담당자 확인 필요 |
| Yellow | 확인 필요 | 추가 확인, 재점검, 현장 확인 필요 |
| Green | 완료 / 양호 | 확인 완료, 조치 완료, 양호 상태 |
| Blue | 대표 확인 / 보고 후보 | 대표 또는 사업주 확인 후보 |
| Purple | 위험성평가 후보 | 위험성평가표 보완 또는 다음 평가 반영 후보 |

## 5. Minimum Input Fields

Field Touch Note v1 should keep input minimal.

- noteText
- colorCategory
- tenantCode or companyCode
- site/location optional
- photo optional
- createdAt
- createdBy role label
- status: draft / submitted / reviewed / action_needed / closed

Do not store unnecessary sensitive data.

## 6. Output Connections

Field Touch Note records can later connect to:

- Manager Inbox
- Owner / CEO Home signal
- Monthly Operation Report candidate
- Evidence Book candidate
- Risk Assessment candidate
- Action tracking candidate
- Field visit memo archive

## 7. Safety and Legal Copy

SafeMetrica does not make final legal or safety determinations.

Field Touch Notes are operating records and review candidates. Final review, action decision, and workplace responsibility remain with the manager and business owner.

Avoid guarantee expressions such as:
- 중대재해 면책 보장
- 법적 처벌 방지 보장
- 무재해 보장
- 위험성평가 대행 확정 표현

## 8. Rollout Policy

## 8.1 Company-wide Rollout Matrix

Field Touch Note Core is not a Hyundai Hoist-only feature. It is a SafeMetrica common operating feature for all customers.

| Customer / Tenant | Rollout Position | First Use Case | Route / Login Policy |
| --- | --- | --- | --- |
| daedo | Existing customer additive module | 수거 현장 위험, 차량·장비·동선 메모 | Existing route preserved. No forced login transition. |
| bubblemon | Existing customer additive module | 물류, 적재, 지게차, 상하차, 창고 동선 메모 | Existing route preserved. No forced login transition. |
| dongwoo | Existing customer additive module | 생활폐기물 수거, 침출수, 후진, 야간작업 메모 | Existing route preserved. No forced login transition. |
| hankookgreen | Existing customer additive module | 현장 위험, 장비, 작업 전 확인, 조치 후보 메모 | Existing route preserved. No forced login transition. |
| richi | Current/new operating customer module | 식품공장 위생·미끄럼·포장실·세척구역 메모 | Existing Richi worker confirmation and anonymous opinion routes preserved. |
| hyundai-hoist | Strong first application candidate | 호이스트·크레인·설치·AS·정비·전후사진 메모 | New tenant module candidate. Tenant-scoped setup allowed. |
| future tenants | Default common module candidate | 업종별 현장 메모와 월간보고서 후보 | Tenant-scoped setup allowed from onboarding. |

### Existing Customer Rule

Existing customers must not be forced into a new login, route, or storage flow when Field Touch Note is introduced.

Field Touch Note should be added as an optional operating module or targeted feature while preserving existing customer routes and current operating records.

### New Tenant Rule

New tenants can adopt Field Touch Note as a default SafeMetrica module from onboarding.

For new tenants, Field Touch Note can connect to tenant-scoped manager inbox, owner signal, monthly report candidates, evidence book candidates, and risk assessment candidates.

### Rollout Priority

1. Lock product spec and rollout matrix.
2. Add mobile touch-note prototype without changing existing customer routes.
3. Connect manager inbox candidate list.
4. Connect owner/CEO signal candidate.
5. Connect monthly report candidate section.
6. Connect risk assessment candidate mapping.



### Existing Customers

Existing customers such as daedo, bubblemon, dongwoo, and hankookgreen must not be forced into new login, route, or storage flows.

Field Touch Note can be introduced later as an additional module or targeted feature without changing existing routes.

### New Tenants

New tenants such as richi, hyundai-hoist, and future tenants can adopt Field Touch Note as a common SafeMetrica module from the beginning.

### Hyundai Hoist Candidate

Hyundai Hoist is a strong candidate for this feature because installation, AS, maintenance, hoist/crane work, before/after photos, and field memo records are important operating evidence.

## 9. Non-goals in v1 Spec

This document does not implement:

- DB migration
- API route
- UI component
- Field QR change
- existing customer route change
- login or tenant-auth change
- automatic legal judgment
- automatic action confirmation

## 10. Recommended Implementation Split

1. Spec lock
2. Data model draft
3. Mobile UI prototype
4. Manager Inbox candidate list
5. Owner signal candidate
6. Monthly report candidate section
7. Risk assessment candidate mapping

