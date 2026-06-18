# SafeMetrica Supabase-first Trial Tenant Registry v1

## 1. 목적

이 문서는 리치코리아와 현대호이스트 같은 신규업체를 Notion Companies DB가 아니라 Supabase/PostgreSQL 기반 tenant registry와 Owner Backoffice 기준으로 관리하기 위한 운영 기준이다.

기존 업체는 Notion 병행 구조로 마무리하되, 신규업체는 Notion Companies DB에 추가하지 않는 것을 원칙으로 한다.

## 2. 최종 운영 원칙

신규업체 기준:

- 신규 고객은 Supabase-first로 관리한다.
- Notion Companies DB를 신규 고객 원장으로 사용하지 않는다.
- Notion은 고도화 문서, RAG 자료, 내부 운영허브, 기존 고객 백오피스 보조로 제한한다.
- Supabase/PostgreSQL을 장기 원본 운영 DB로 둔다.
- Owner Backoffice에서 신규업체 상태, 체험판 여부, service mode, site, enabled modules를 관리한다.

기존업체 기준:

- 기존 Notion 기반 고객은 당장 제거하지 않는다.
- 기존 고객은 Notion 병행 유지 + Supabase 원장 점진 전환으로 처리한다.
- 기존 Notion Companies DB는 legacy tenant source로 본다.

## 3. 현재 코드 부채

현재 src/lib/company.ts는 Notion Companies DB를 조회해 companyCode와 active=true를 확인하고, tbmDbId, ebmDbId, ptwDbId를 필수로 요구하는 구조다.

이 구조는 기존 TBM/EB/PTW 중심 업체에는 동작하지만, 리치코리아처럼 QR 전자확인 체험판만 필요한 신규업체에는 과하다.

따라서 신규업체를 Notion Companies DB에 억지로 넣고 tbmDbId/ebmDbId/ptwDbId를 채우는 방식은 금지한다.

## 4. 신규 trial tenant registry 후보 필드

Supabase/PostgreSQL tenant registry 후보:

- id
- company_code
- company_name
- service_mode
- plan_type
- status
- default_site_id
- enabled_modules
- trial_start_date
- trial_end_date
- owner_notes
- created_at
- updated_at

service_mode 후보:

- risk_share_pack
- full_safemetrica
- food_factory_e_confirmation_trial
- hoist_work_order_trial
- partner_demo
- internal_test

status 후보:

- onboarding
- active
- paused
- offboarding
- archived
- internal_test

## 5. 리치코리아 기준

company_code:

    richi

service_mode:

    food_factory_e_confirmation_trial

1차 enabled modules:

- worker_qr_e_confirmation
- quick_feedback
- manager_inbox
- weekly_trial_summary_candidate

1차 제외:

- TBM 필수화
- EB 필수화
- PTW 필수화
- Notion Companies DB 신규 등록
- HACCP 전체 문서관리
- 법적 효력 보장
- 종이서명 완전 대체 보장

## 6. 현대호이스트 기준

company_code 후보:

    hyundai-hoist

service_mode:

    hoist_work_order_trial

1차 enabled modules:

- work_order
- contractor_qr_confirmation
- before_after_photo_evidence
- completion_report
- owner_review

1차 제외:

- 독립앱 신규 개발
- 전체 ERP 연동
- 회계/청구 자동화
- GPS 실시간 직원 추적
- Notion Companies DB 신규 등록
- 법적 면책 또는 분쟁 승소 보장

## 7. 필요한 코드 전환 방향

현재 getCompanyConfigByCode는 legacy Notion Companies DB loader다.

후속 구조:

1. Supabase tenant registry loader 추가
2. 신규업체는 Supabase loader 우선 조회
3. 기존업체는 legacy Notion loader fallback 허용
4. 기능별 필수 DB 요구사항 분리
5. QR 전자확인만 쓰는 업체에는 tbmDbId/ebmDbId/ptwDbId 요구 금지
6. Owner Backoffice에서 tenant 생성/상태/모듈 활성화 관리

## 8. 리치코리아 현재 상태

코드상 준비된 것:

- 리치코리아 worker QR copy
- 리치코리아 의견유형 copy
- 리치코리아 Stepper 문구
- 불편사항 / 위생·안전 확인 submit 정규화

아직 필요한 것:

- Supabase-first tenant registry 경로
- Owner Backoffice trial tenant 생성 경로
- field participation submit route의 신규 tenant config source 전환
- 리치코리아 제출 저장을 PostgreSQL 원장으로 우선 처리하는 구조

## 9. 금지 사항

- 신규업체를 Notion Companies DB에 추가하지 않는다.
- 신규업체 체험판을 위해 임시 tbmDbId/ebmDbId/ptwDbId를 억지로 채우지 않는다.
- 토큰, API Key, service role, Owner Token, 환경변수 실제 값을 문서나 GitHub에 기록하지 않는다.
- 법적 면책, 처벌 방지, 무재해 보장, HACCP 인증 보장, 종이서명 완전 대체 보장 표현을 사용하지 않는다.

## 10. 다음 PR 후보

1. docs: define supabase trial tenant registry schema v1
2. feat: add supabase tenant registry loader
3. feat: route field participation company config through supabase-first loader
4. feat: add owner trial tenant backoffice stub
5. feat: store richi field participation trial submissions in PostgreSQL first
