# SafeMetrica Tenant Membership RLS / Access Policy Candidate v1

## 1. 목적

이 문서는 `tenant_membership` 테이블의 RLS 및 접근정책 후보를 정리한다.

현재 단계는 정책 후보 문서화 단계다.

이번 문서는 다음을 하지 않는다.

- `create policy` migration 생성
- auth session lookup 연결
- user invite/email 연결
- tenant data query 연결
- 기존 고객 route 변경
- 기존 Field QR / submit API / legacy Notion bridge 변경

## 2. 현재 상태

현재 완료된 것:

- `tenant_registry` migration 존재
- `tenant_membership` migration 존재
- `tenant_membership` RLS enable 완료
- `tenant_membership` client policy는 v1에서 의도적으로 생성하지 않음
- tenant role/type/helper placeholder 존재
- `/owner/tenant-onboarding` 및 `/owner/tenant-onboarding/draft`는 Owner token guard 적용 완료

현재 미완료인 것:

- 실제 NextAuth session 기반 membership lookup
- `user_id` / `user_email` 확정 매핑
- tenant-scoped query helper
- owner_internal 전용 membership 조회 helper
- customer tenant route guard 실연결
- Supabase RLS policy 확정

## 3. 기본 원칙

1. 기본은 fail-closed다.
2. client에서 `tenant_membership`을 직접 읽거나 쓰게 하지 않는다.
3. service role은 서버 전용 경로에서만 사용한다.
4. 고객 화면에는 RLS policy name, schema, raw_payload, internal API path를 노출하지 않는다.
5. 기존 고객은 membership 구조로 강제 전환하지 않는다.
6. 근로자·외부인 QR flow에는 login/membership을 강제하지 않는다.
7. Owner 내부 화면과 고객사 tenant 화면은 분리한다.

## 4. RLS 현재 기준

`tenant_membership`은 RLS가 켜져 있으나 client policy는 아직 없다.

의미:

- anon 직접 접근 금지
- authenticated 직접 접근 금지
- 서버 전용 API 또는 server-only helper에서 service role로만 조회/작성 후보
- 실제 policy는 auth session lookup과 tenant access helper가 확정된 뒤 별도 PR로 작성

## 5. 향후 policy 후보

아래는 후보이며 아직 migration으로 만들지 않는다.

### 5-1. Server-only 관리 기준

초기 단계에서는 `tenant_membership` 조회·생성·수정·해제는 서버 전용 경로에서만 처리한다.

후보 경로:

- Owner 신규 고객사 생성 flow
- Owner 사용자 역할 연결 flow
- tenant access guard helper
- tenant-selected route guard

### 5-2. owner_internal 접근 후보

`owner_internal`은 Owner Console, tenant setup, 내부 Export를 처리할 수 있다.

단, 이 역할도 client에서 cross-tenant raw data를 직접 조회하는 방식으로 구현하지 않는다.

후보 조건:

- Owner token 또는 향후 owner_internal membership 확인
- server-only helper
- 고객 화면에 multi-tenant selector 노출 금지

### 5-3. tenant_admin / tenant_manager 접근 후보

고객사 운영 화면 접근 전 다음을 확인한다.

1. 로그인 여부
2. requested tenantCode 정규화
3. active membership 조회
4. membership tenantCode와 requested tenantCode 일치
5. role별 허용 화면 확인
6. 실패 시 `/login` 또는 접근 제한 화면으로 fail-closed

### 5-4. tenant_representative / tenant_viewer 접근 후보

대표/조회 역할은 제한 조회로 시작한다.

- 월간 운영요약
- 대표 확인 항목
- 제한된 보고 화면

원장 raw data, Owner Export, 내부 후보/검토 테이블은 직접 노출하지 않는다.

## 6. Route 접근 후보

| route 후보 | owner_internal | tenant_admin | tenant_manager | tenant_representative | tenant_viewer |
| --- | --- | --- | --- | --- | --- |
| `/owner` | 가능 | 불가 | 불가 | 불가 | 불가 |
| `/owner/tenant-onboarding` | 가능 | 불가 | 불가 | 불가 | 불가 |
| `/owner/tenant-onboarding/draft` | 가능 | 불가 | 불가 | 불가 | 불가 |
| `/tenant/[tenantCode]/manager` | 가능 | 가능 | 가능 | 제한 | 제한 |
| `/tenant/[tenantCode]/reports` | 가능 | 가능 | 제한 | 가능 | 제한 |
| `/tenant/[tenantCode]/qr` | 가능 | 가능 | 가능 | 불가 | 불가 |

## 7. QR flow 제외 기준

아래 flow는 membership login을 강제하지 않는다.

- 월간 위험성평가 공유확인
- 작업 전 안전확인
- 익명 의견
- 외부인 안전확인
- 근로자대표 확인 link flow

QR flow는 tenant context 또는 발급 link token 기준으로 처리한다.

## 8. 기존 고객 보호

아래는 변경하지 않는다.

- 기존 `/select-tenant` 흐름
- 기존 Field QR link
- 기존 submit API
- 기존 monthly report route
- legacy Notion bridge
- 기존 고객 route의 login 강제 전환

기존 고객에 membership 구조를 붙일 때는 별도 pilot과 migration plan이 필요하다.

## 9. 금지 저장·노출값

membership record, policy doc, customer UI, export에 남기지 않는다.

- 실제 API Key 값
- 실제 service role 값
- 실제 Owner Token 값
- 비밀번호
- 주민등록번호
- 근로자 개인정보 원문
- 서명 원본 이미지
- 확인번호 원문
- 고객 민감자료 원문
- raw_payload 원문
- 내부 API path
- RLS policy name
- internal schema detail

## 10. 다음 구현 순서 후보

권장 순서:

1. 본 문서로 RLS/access policy 후보 확정
2. server-only membership lookup helper 후보 작성
3. NextAuth session에서 사용할 user id/email 기준 확인
4. tenant access guard helper를 fail-closed로 확장
5. `/tenant/[tenantCode]/manager` placeholder에 read-only guard 연결
6. Owner 신규업체 저장 flow와 membership row 생성 flow는 별도 PR로 분리
7. 실제 RLS `create policy`는 auth integration 검증 후 별도 migration으로 진행

## 11. 현재 결론

지금은 `create policy`를 만들지 않는다.

현재 기준은 다음이다.

- `tenant_membership` RLS는 켜져 있다.
- client policy는 생성하지 않는다.
- service role은 server-only 경로에서만 사용한다.
- auth/session/membership lookup이 확정되기 전까지 DB policy를 성급히 만들지 않는다.
- 기존 고객 운영 흐름은 변경하지 않는다.
