# SafeMetrica Supabase Trial Tenant Registry Schema v1

## 1. 목적

이 문서는 리치코리아, 현대호이스트 같은 신규 trial tenant를 Notion Companies DB가 아니라 Supabase/PostgreSQL 원장 기준으로 관리하기 위한 tenant registry schema 초안이다.

기존 고객은 Notion bridge를 유지하되, 신규 고객은 Supabase-first tenant registry와 Owner Backoffice 기준으로 생성·활성화·중단·보관한다.

## 2. 배경

현재 코드의 legacy company loader는 Notion Companies DB를 조회하고 tbmDbId, ebmDbId, ptwDbId를 필수로 요구한다.

이 구조는 기존 TBM/EB/PTW 기반 고객에는 동작하지만, 리치코리아처럼 QR 전자확인 체험판만 필요한 신규 고객에게는 과하다.

따라서 신규 trial tenant는 별도 Supabase tenant registry에서 관리하고, 기능별 필수 연결값을 분리해야 한다.

## 3. 테이블 후보

후보 테이블명:

    tenant_registry

대안:

    company_tenants
    safemetrica_tenants

1차 권장:

    tenant_registry

이유:

- 신규 고객과 기존 고객을 모두 포괄할 수 있다.
- service_mode, enabled_modules, trial 상태를 관리하기 쉽다.
- 기존 Notion Companies DB와 이름 충돌을 줄일 수 있다.

## 4. tenant_registry 필드 후보

필수 필드:

- id uuid primary key
- company_code text unique not null
- company_name text not null
- status text not null
- service_mode text not null
- enabled_modules jsonb not null default []
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

권장 필드:

- plan_type text
- trial_start_date date
- trial_end_date date
- default_site_id uuid
- default_site_name text
- owner_notes text
- source_channel text
- contact_label text
- raw_payload jsonb not null default {}

금지 필드:

- 실제 API Key
- 실제 service role
- 실제 Owner Token
- 실제 환경변수 값
- 고객 개인정보 원문

## 5. status 후보

허용 후보:

- onboarding
- active
- paused
- offboarding
- archived
- internal_test

운영 의미:

- onboarding: 세팅 중
- active: 운영 또는 체험판 사용 가능
- paused: 일시중지
- offboarding: 종료 절차 중
- archived: 보관
- internal_test: 내부 테스트

## 6. service_mode 후보

허용 후보:

- risk_share_pack
- full_safemetrica
- food_factory_e_confirmation_trial
- hoist_work_order_trial
- partner_demo
- internal_test

리치코리아:

    service_mode=food_factory_e_confirmation_trial

현대호이스트:

    service_mode=hoist_work_order_trial

## 7. enabled_modules 후보

리치코리아 1차:

- worker_qr_e_confirmation
- quick_feedback
- manager_inbox
- weekly_trial_summary_candidate

현대호이스트 1차:

- work_order
- contractor_qr_confirmation
- before_after_photo_evidence
- completion_report
- owner_review

공유팩/기존 고객 후보:

- risk_share_pack
- worker_share_confirmation
- worker_feedback
- manager_risk_share
- monthly_report
- export_center

## 8. 기능별 필수 연결값 분리 원칙

신규 tenant registry에서는 TBM, EB, PTW DB ID를 전체 필수값으로 두지 않는다.

기능별 필수값:

- worker_qr_e_confirmation: tenant_registry row, field participation storage
- quick_feedback: field participation storage
- manager_inbox: field participation query source
- weekly_trial_summary_candidate: aggregation query source
- work_order: work_order table
- before_after_photo_evidence: evidence_items or work_order_evidence table
- tbm: tbm table or legacy tbm bridge
- eb: evidence book table or legacy eb bridge
- ptw: ptw table or legacy ptw bridge

따라서 리치코리아 같은 QR 체험판에는 tbmDbId, ebmDbId, ptwDbId를 요구하지 않는다.

## 9. 신규 field participation 저장 방향

신규 tenant의 field participation 제출은 PostgreSQL 원장을 우선한다.

목표 흐름:

    QR 제출
    → Supabase tenant registry 조회
    → field_participation_submissions 저장
    → evidence_items 저장
    → 관리자 접수함 조회
    → 필요 시 Notion export 또는 내부 문서 보조

Notion page 생성은 신규 tenant의 필수 흐름이 아니다.

## 10. 기존 legacy 경로

기존 고객은 당장 제거하지 않는다.

legacy 경로:

- getCompanyConfigByCode
- Notion Companies DB
- tbmDbId / ebmDbId / ptwDbId 필수 구조
- Notion 저장 후 Supabase shadow-write

전환 방향:

1. 신규 tenant는 Supabase-first loader 사용
2. 기존 tenant는 legacy Notion loader fallback 허용
3. 저장 route에서 service_mode별 저장 경로 분기
4. 기존 고객 안정화 후 단계적으로 Supabase 원장 우선 전환

## 11. 리치코리아 적용 기준

tenant_registry 후보값:

- company_code: richi
- company_name: 리치코리아
- status: onboarding 또는 active
- service_mode: food_factory_e_confirmation_trial
- enabled_modules: worker_qr_e_confirmation, quick_feedback, manager_inbox, weekly_trial_summary_candidate

리치코리아에서 금지:

- Notion Companies DB 신규 등록
- 임시 tbmDbId / ebmDbId / ptwDbId 강제 입력
- HACCP 인증 보장
- 종이서명 완전 대체 보장
- 법적 효력 보장

## 12. 현대호이스트 적용 기준

tenant_registry 후보값:

- company_code: hyundai-hoist
- company_name: 현대호이스트
- status: onboarding
- service_mode: hoist_work_order_trial
- enabled_modules: work_order, contractor_qr_confirmation, before_after_photo_evidence, completion_report, owner_review

현대호이스트에서 금지:

- Notion Companies DB 신규 등록
- 독립앱 신규 개발로 분리
- 법적 면책 보장
- 분쟁 승소 보장
- 사고 방지 보장

## 13. 후속 migration 후보

다음 PR에서 migration을 만든다면 후보는 아래와 같다.

    supabase/migrations/YYYYMMDDHHMMSS_create_tenant_registry.sql

필수 포함 후보:

- create table tenant_registry
- company_code unique index
- status check constraint
- service_mode check constraint
- enabled_modules jsonb default []
- updated_at trigger 또는 수동 업데이트 기준

## 14. 후속 코드 PR 후보

1. feat: add supabase tenant registry migration
2. feat: add supabase tenant registry loader
3. feat: route field participation tenant lookup through supabase-first loader
4. feat: store new tenant field participation submissions in PostgreSQL first
5. feat: add owner trial tenant registry stub

## 15. 보안 기준

아래 값은 문서, GitHub, 채팅, PR 본문에 기록하지 않는다.

- 실제 토큰
- 실제 API Key
- service role 실제 값
- Owner Token 실제 값
- 환경변수 실제 값
- 고객 개인정보 원문
- 실제 직원명, 전화번호, 내부 민감자료 원문
