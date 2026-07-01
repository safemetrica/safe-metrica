# SafeMetrica Owner Tenant Onboarding Write Flow Candidate v1

## 1. 목적

이 문서는 Owner 승인형 신규 고객사 온보딩에서 `tenant_registry`와 `tenant_membership`을 어떤 순서와 기준으로 저장할지 정리한다.

현재 단계는 write flow 후보 문서화 단계다.

이번 문서는 다음을 하지 않는다.

- 실제 저장 API 생성
- `tenant_registry` insert 실행
- `tenant_membership` insert 실행
- user invite/email flow 연결
- Supabase RLS policy 생성
- 기존 고객 route 변경
- 고객 데이터 query 연결

## 2. 현재 완료 상태

현재 완료된 것:

- Owner 승인형 신규업체 온보딩 기준 문서 존재
- `/owner/tenant-onboarding` 체크리스트 shell 존재
- `/owner/tenant-onboarding/draft` 기본정보 입력 준비 shell 존재
- Owner token guard 적용 완료
- `tenant_registry` migration 존재
- `tenant_membership` migration 존재
- `tenant_membership` RLS enable 완료
- `tenant_membership` client policy는 v1에서 생성하지 않음
- email-first session 기반 tenant access helper foundation 존재
- `/tenant/[tenantCode]/manager` guard placeholder 연결 완료
- 기존 고객 legacy route smoke 기준 존재

현재 미완료인 것:

- Owner draft 입력값 validation contract
- 신규 고객 저장 API
- `tenant_registry` create/update helper
- `tenant_membership` create/update helper
- 관리자 초대 email flow
- test membership row 운영 기준
- 실제 tenant data query 연결
- RLS policy 확정

## 3. 저장 flow 후보

권장 순서:

1. Owner가 신규 고객사 기본정보를 입력한다.
2. Owner가 `tenantCode` 후보를 확인한다.
3. 서버에서 `tenantCode`를 정규화하고 legacy 고객 코드와 충돌 여부를 확인한다.
4. `tenant_registry` row를 먼저 생성 또는 갱신한다.
5. `tenant_registry.id`가 확정된 뒤 `tenant_membership` 후보를 별도 단계로 생성한다.
6. 첫 관리자 계정은 email-first 기준으로 `invited` 또는 `active` 상태 후보를 검토한다.
7. 실제 고객 운영 화면 연결은 test membership 검증 뒤 별도 PR로 진행한다.

## 4. tenant_registry write 후보

`tenant_registry`는 신규 고객사 운영공간의 기준 원장이다.

초기 write 후보 필드:

- `company_code`
- `display_name`
- `status`
- `service_mode`
- `enabled_modules`
- `site_name`
- `contract_status`
- `raw_payload`

기준:

- `company_code`는 소문자 영문, 숫자, 하이픈 중심의 안정 식별자로 관리한다.
- 기존 legacy 고객 코드와 충돌시키지 않는다.
- 신규 고객은 Supabase/PostgreSQL-first 기준으로 세팅한다.
- 기존 고객은 이 flow로 강제 전환하지 않는다.
- `enabled_modules`는 JSON array 형태를 유지한다.
- `raw_payload`에는 비민감 운영 메타데이터만 저장한다.

## 5. tenant_membership write 후보

`tenant_membership`은 사용자와 고객사 운영공간을 연결하는 권한 원장이다.

초기 write 후보 필드:

- `tenant_id`
- `tenant_code`
- `user_email`
- `display_name`
- `role`
- `status`
- `invited_by`
- `raw_payload`

기준:

- `tenant_id`는 `tenant_registry.id`를 참조한다.
- `tenant_code`는 `tenant_registry.company_code`와 일치해야 한다.
- 초기 접근권한은 email-first 기준으로 검토한다.
- `user_id`는 nullable 상태로 둔다.
- provider stable id 정책은 별도 검토 후 진행한다.
- 동일 tenant 안에서 active 계열 email 중복을 허용하지 않는다.
- `owner_internal`, `tenant_admin`, `tenant_manager`, `tenant_representative`, `tenant_viewer` 외 role은 만들지 않는다.
- `invited`, `active`, `suspended`, `revoked` 외 status는 만들지 않는다.

## 6. validation 기준

Owner draft 저장 전 최소 validation 후보:

- `companyCode` 필수
- `companyCode` 정규화 후 빈 값 금지
- `companyCode` 최대 길이 제한
- 기존 legacy 고객 코드와 충돌 금지
- `displayName` 필수
- `serviceMode` 허용값 검증
- `enabledModules` array 검증
- 관리자 email 형식 검증
- role 허용값 검증
- status 허용값 검증
- `raw_payload` object 검증

legacy 보호 코드 후보:

- `daedo`
- `dongwoo`
- `hankookgreen`
- `bubblemon`

위 기존 고객 코드는 신규 tenant write flow로 강제 전환하지 않는다.

## 7. raw_payload 금지값

`tenant_registry.raw_payload`와 `tenant_membership.raw_payload`에 저장하지 않는다.

- token 값
- API key 값
- service role 값
- 환경변수 실제 값
- 비밀번호
- Owner 인증값
- 근로자 확인번호 원문
- 서명 원본
- 고객 민감자료 원문
- 내부 운영 링크
- 내부 API path
- 원본 payload 전문
- 주민등록번호 등 고유식별정보

`raw_payload`는 운영 메모, 설정 후보, migration source 표시 같은 비민감 메타데이터만 허용한다.

## 8. 기존 고객 보호 기준

아래는 변경하지 않는다.

- 기존 `/select-tenant` 흐름
- 기존 Field QR link
- 기존 submit API
- 기존 TBM direct route
- 기존 monthly report route
- legacy Notion bridge
- 기존 고객 login 강제 전환 금지

tenant/auth/proxy/middleware/shared route 변경 시에는 반드시 `npm run smoke:legacy-routes`를 실행한다.

최소 smoke 기준:

- `/tbm?company=daedo`
- `/tbm?company=richi`
- `/field/participation?company=richi`
- `/manager/risk-share?company=richi`
- `/monthly-report/risk-share?company=richi`

## 9. RLS / service role 기준

현재 기준:

- `tenant_membership` RLS는 enabled 상태다.
- client policy는 아직 만들지 않는다.
- 서버 전용 helper에서만 service role 기반 조회·쓰기 후보를 검토한다.
- 실제 RLS policy는 auth/session/membership lookup과 route guard 검증 후 별도 PR로 진행한다.
- 고객 화면에는 schema, policy name, internal id, raw payload, 내부 API path를 노출하지 않는다.

## 10. 다음 구현 순서

권장 순서:

1. 본 문서로 write flow 기준 잠금
2. Owner draft validation helper-only 추가
3. `tenant_registry` write helper 후보 작성
4. 저장 API 설계 inspect
5. test membership row 운영 기준 문서화
6. `tenant_membership` write helper 후보 작성
7. user invite/email flow는 별도 검토
8. RLS policy는 별도 검증 후 진행
9. tenant manager 실제 데이터 연결은 가장 마지막 단계에서 진행

## 11. 현재 결론

현재는 write API를 만들지 않는다.

Owner 승인형 신규업체 저장 flow는 `tenant_registry` write 기준, `tenant_membership` 생성 기준, validation, 금지 저장값, 기존 고객 보호 기준을 먼저 잠근 뒤 별도 PR로 구현한다.

SafeMetrica SaaS 전환은 신규 고객을 위한 구조 확장 작업이며, 기존 운영 고객의 route와 저장 흐름을 흔들지 않는다.
