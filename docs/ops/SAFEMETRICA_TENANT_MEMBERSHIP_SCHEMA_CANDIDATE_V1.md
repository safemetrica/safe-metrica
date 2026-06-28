# SafeMetrica Tenant Membership Schema Candidate v1

## 1. 목적

이 문서는 SafeMetrica 신규업체 SaaS 구조에서 사용자와 고객사 tenant를 안전하게 연결하기 위한 `tenant_membership` 후보 기준이다.

현재 단계는 문서 후보이며, 실제 DB migration, auth session 연결, 고객 데이터 조회 연결은 하지 않는다.

## 2. 배경

이미 존재하는 기준:

- `/login` 산업안전플랫폼 입구
- `/select-tenant`
- `/tenant/[tenantCode]/manager`
- `tenant_registry`
- tenant role/type foundation
- Owner 승인형 tenant onboarding 기준
- Owner tenant setup checklist
- Owner tenant registry draft input shell

아직 필요한 기준:

- user와 tenant의 연결 구조
- role별 접근 범위
- selected tenant 검증 방식
- 기존 고객 보호 방식
- 근로자·외부인 QR 무로그인 원칙 유지

## 3. 핵심 원칙

1. 고객사 운영 화면은 authenticated user membership을 기준으로 접근한다.
2. 고객 화면에서 다른 고객사를 선택하는 cross-tenant selector를 노출하지 않는다.
3. Owner 내부 화면과 고객사 tenant 화면은 분리한다.
4. 근로자·외부인 QR flow에는 로그인을 강제하지 않는다.
5. 기존 고객 route, Field QR 링크, legacy bridge는 강제 전환하지 않는다.
6. 실제 고객 민감정보, 토큰, 비밀번호, 인증키는 membership record에 저장하지 않는다.

## 4. 역할 후보

| role | 대상 | 접근 범위 후보 |
| --- | --- | --- |
| owner_internal | SafeMetrica 내부 운영자 | Owner Console, tenant setup, 내부 Export |
| tenant_admin | 고객사 운영관리자 | 고객사 관리자 홈, 사용자/QR/보고 확인 |
| tenant_manager | 현장관리자 | 현장 QR, 접수함, 조치, TBM/작업 전 확인 |
| tenant_representative | 대표 또는 본사 확인자 | 대표 확인 항목, 월간 운영기록, 요약 보고 |
| tenant_viewer | 조회 전용 | 제한 조회 |

## 5. tenant_membership 후보 필드

| field | type 후보 | 설명 |
| --- | --- | --- |
| id | uuid | membership row id |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |
| tenant_id | uuid | `tenant_registry.id` 참조 후보 |
| tenant_code | text | 안정적인 고객사 코드 |
| user_id | uuid/text | auth user id 후보 |
| user_email | text | 로그인 계정 식별 후보 |
| display_name | text | 고객 화면 표시명 |
| role | text | TenantRole |
| status | text | invited / active / suspended / revoked |
| invited_by | text | 초대한 Owner 또는 관리자 표시명 |
| accepted_at | timestamptz | 초대 수락 시각 |
| revoked_at | timestamptz | 권한 해제 시각 |
| last_seen_at | timestamptz | 마지막 접근 시각 |
| raw_payload | jsonb | 비민감 운영 메타만 허용 |

## 6. status 후보

| status | 의미 |
| --- | --- |
| invited | 초대됨, 아직 활성 사용 전 |
| active | 사용 가능 |
| suspended | 일시 중지 |
| revoked | 권한 회수 |

## 7. 접근 판단 후보

고객사 운영 화면 접근 전 확인 순서:

1. 로그인 여부 확인
2. 요청 tenantCode 정규화
3. user의 active membership 조회
4. membership tenantCode와 요청 tenantCode 일치 확인
5. role별 접근 가능 여부 확인
6. 실패 시 fail-closed 처리
7. 고객 화면에는 내부 DB 구조나 정책명을 노출하지 않음

## 8. role별 접근 후보

| route 후보 | owner_internal | tenant_admin | tenant_manager | tenant_representative | tenant_viewer |
| --- | --- | --- | --- | --- | --- |
| `/owner` | 가능 | 불가 | 불가 | 불가 | 불가 |
| `/owner/tenant-onboarding` | 가능 | 불가 | 불가 | 불가 | 불가 |
| `/tenant/[tenantCode]/manager` | 가능 | 가능 | 가능 | 제한 | 제한 |
| `/tenant/[tenantCode]/reports` | 가능 | 가능 | 제한 | 가능 | 제한 |
| `/tenant/[tenantCode]/qr` | 가능 | 가능 | 가능 | 불가 | 불가 |

## 9. QR flow와 membership 분리

다음 flow는 membership login과 분리한다.

- 월간 위험성평가 공유확인
- 작업 전 안전확인
- 익명 의견
- 외부인 안전확인
- 근로자대표 확인 link flow

QR flow는 tenant context 또는 발급 link token 기준으로 처리한다. 관리자/대표 화면 접근과 같은 membership login을 요구하지 않는다.

## 10. 기존 고객 보호

기존 고객은 아래 항목을 강제로 변경하지 않는다.

- 기존 `/select-tenant` 진입
- 기존 Field QR link
- 기존 submit API
- 기존 monthly report route
- legacy Notion bridge

기존 고객에 membership 구조를 적용할 때는 별도 migration plan과 targeted pilot 후 진행한다.

## 11. 보안·비노출 기준

membership record 또는 고객 화면에 남기지 않는 값:

- 실제 API Key 값
- 실제 service role 값
- 실제 Owner Token 값
- 비밀번호
- 주민등록번호
- 근로자 개인정보 원문
- 서명 원본 이미지
- 확인번호 원문
- 고객 민감자료 원문

고객 화면에 노출하지 않는 내부 용어:

- raw_payload
- service role
- RLS policy name
- internal schema
- internal API path
- Owner Console 내부 링크

## 12. 다음 구현 후보

1. 본 문서 기준 검토
2. `tenant_membership` migration 초안 작성
3. RLS/접근정책 후보 문서화
4. owner_internal 전용 조회 helper 후보
5. tenant manager route fail-closed guard 후보
6. 신규 tenant pilot 1곳에 제한 적용

## 13. 현재 결론

지금은 schema 후보 문서화 단계다.

아직 하지 않는다:

- DB migration
- auth session lookup
- 실제 user invite
- email 발송
- tenant data query 연결
- 기존 고객 강제 이전
