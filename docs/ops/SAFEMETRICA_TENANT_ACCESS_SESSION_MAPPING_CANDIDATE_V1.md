# SafeMetrica Tenant Access Session Mapping Candidate v1

## 1. 목적

이 문서는 `tenant_membership` 기반 고객사 운영공간 접근 guard를 실제 route에 연결하기 전에 필요한 session mapping 기준을 정리한다.

현재 단계는 문서화 단계다.

이번 문서는 다음을 하지 않는다.

- `getServerSession` route 연결
- `/tenant/[tenantCode]/manager` 실제 접근 허용
- authOptions 구조 변경
- tenant data query 연결
- user invite/email 연결
- RLS `create policy` 생성
- 기존 고객 route 변경

## 2. 현재 상태

현재 완료된 것:

- `tenant_registry` migration
- `tenant_membership` migration
- `tenant_membership` RLS enable
- `tenant_membership` server-only lookup helper
- `/tenant/[tenantCode]/manager` placeholder
- fail-closed placeholder guard

현재 미완료인 것:

- NextAuth session에서 사용할 stable user identifier 확정
- user email / user id mapping 기준 확정
- 실제 tenant access guard helper
- customer tenant route 연결
- role별 route 접근 적용

## 3. 현재 NextAuth 기준

현재 NextAuth는 Kakao provider와 JWT session 전략을 사용한다.

현재 session callback은 `session.user`를 보존하지만, tenant access guard에서 사용할 `user.email` 또는 stable `user.id`를 명시적으로 보장하는 구조는 아니다.

따라서 지금 단계에서 `/tenant/[tenantCode]/manager`를 실제 접근 허용 route로 바꾸면 안 된다.

## 4. session identifier 후보

### 4-1. user_email 우선 후보

`tenant_membership.user_email`을 기준으로 active membership을 조회한다.

장점:

- 현재 `tenant_membership` migration에 `user_email` 필드와 lower index가 있음
- 초기 Owner 승인형 운영에서 이해하기 쉬움
- invite 전 단계에서도 관리 가능

주의:

- provider가 email을 항상 제공하는지 확인 필요
- email 변경 시 membership 정합성 정책 필요
- customer UI에 내부 membership lookup 구조를 노출하지 않는다

### 4-2. user_id 보조 후보

향후 안정적인 auth user id가 확정되면 `tenant_membership.user_id`를 사용한다.

주의:

- 현재 NextAuth session callback에서 stable user id를 명시적으로 넣고 있지 않음
- provider별 subject 값을 그대로 고객 식별자로 사용할지 검토 필요

## 5. 접근 판단 후보

고객사 운영공간 접근 전 확인 순서 후보:

1. session 존재 확인
2. session user email 또는 stable user id 확인
3. requested tenantCode 정규화
4. `tenant_membership` active row 조회
5. membership tenantCode와 requested tenantCode 일치 확인
6. role별 접근 가능 여부 확인
7. 실패 시 fail-closed

## 6. fail-closed 기준

아래 경우 모두 접근 실패로 처리한다.

- session 없음
- session user email 없음
- requested tenantCode가 안전한 형식이 아님
- active membership 없음
- membership tenantCode 불일치
- role 접근 불가
- helper 조회 실패

고객 화면에는 내부 DB 구조, policy 이름, raw_payload, 내부 API path를 노출하지 않는다.

## 7. route 연결 보류 기준

다음이 정리되기 전까지 `/tenant/[tenantCode]/manager`는 실제 고객 데이터와 연결하지 않는다.

- session에서 email/id를 안정적으로 읽는 방식
- tenant access guard helper return shape
- role별 route access matrix
- 기존 고객 강제 전환 방지
- QA용 test membership row 전략

## 8. 기존 고객 보호

아래는 변경하지 않는다.

- 기존 `/select-tenant`
- 기존 Field QR
- 기존 submit API
- 기존 monthly report route
- legacy Notion bridge
- 기존 고객 login 강제 전환 금지

## 9. 다음 구현 순서 후보

1. 본 문서로 session mapping 기준 정리
2. tenant auth type에서 nullable userId 허용 여부 검토
3. server-only guard helper 후보 작성
4. session email이 없으면 fail-closed 처리
5. `/tenant/[tenantCode]/manager`에는 read-only guard 연결만 별도 PR로 진행
6. 실제 tenant data query는 그 이후 별도 PR

## 10. 현재 결론

지금은 `/tenant/[tenantCode]/manager`에 실제 access guard를 연결하지 않는다.

먼저 session mapping 기준을 잠그고, helper return type과 fail-closed 정책을 정리한 뒤 제한적으로 연결한다.
