# SafeMetrica Owner-Approved Tenant Onboarding Foundation v1

## 1. 목적

이 문서는 신규업체가 늘어날 때 SafeMetrica를 업체별 수작업 코드 수정으로 확장하지 않기 위한 Owner 승인형 tenant onboarding 기준이다.

현재 SafeMetrica는 산업안전 운영기록 SaaS다. 신규업체는 Supabase/PostgreSQL-first `tenant_registry` 기준으로 온보딩하고, 기존업체는 기존 route와 legacy bridge를 보호한 상태에서 점진 전환한다.

## 2. 현재 기준

완료된 기초:

- `/login` 산업안전플랫폼 입구 shell
- SafeMetrica brand logo asset
- `/select-tenant`
- `/tenant/[tenantCode]/manager` placeholder
- `tenant_registry` migration
- `tenant_registry` loader
- tenant auth role/type foundation
- Field QR company/tenant context flow

아직 구현하지 않는 것:

- 공개 셀프 회원가입
- 실제 tenant membership DB migration
- 실제 auth session 기반 tenant membership 조회
- 관리자 초대 이메일 발송
- 결제/구독 자동화
- 기존 고객 강제 이전

## 3. 온보딩 원칙

신규업체 사용은 공개 즉시 개방형이 아니라 Owner 승인형으로 운영한다.

기본 흐름:

1. 신규업체 도입 문의 또는 가입 신청
2. Owner가 업체 기본정보 확인
3. Owner가 tenant code 확정
4. `tenant_registry` row 생성
5. enabled modules 선택
6. 대표/운영관리자/현장관리자 role 후보 정리
7. 고객사 전용 접근 링크 발급
8. Field QR 링크 발급
9. 시범 운영
10. 운영 전환 여부 확인

## 4. 사용자/역할 기준

역할 후보:

- `owner_internal`
- `tenant_admin`
- `tenant_manager`
- `tenant_representative`
- `tenant_viewer`

초기 운영 기준:

| 역할 | 대상 | 접근 방향 |
| --- | --- | --- |
| owner_internal | SafeMetrica 내부 운영자 | Owner Console / tenant setup |
| tenant_admin | 고객사 운영관리자 | 고객사 관리 홈 |
| tenant_manager | 현장관리자 | 현장관리자 홈 / QR 관리 |
| tenant_representative | 대표 또는 본사 확인자 | 대표 확인 항목 / 월간보고 |
| tenant_viewer | 조회 전용 | 제한 조회 |

## 5. QR 원칙

근로자, 외부인, 방문자, 납품기사, 협력업체의 QR flow는 기본 무로그인이다.

QR flow는 다음 값을 통해 tenant context를 가져간다.

- `company`
- `companyCode`
- `tenantCode`
- link token when needed

QR에서 로그인 강제 금지:

- 월간 위험성평가 공유확인
- 작업 전 안전확인
- 익명 의견
- 외부인 안전확인

익명 의견 flow는 실명 확인 flow와 분리한다.

## 6. 기존 고객 보호

기존 고객은 다음을 강제하지 않는다.

- 신규 로그인 구조 강제 전환
- 기존 `/select-tenant` 링크 폐기
- 기존 Field QR 링크 폐기
- legacy Notion bridge 즉시 제거
- 기존 submit API 변경

기존 고객 대상 변경은 targeted fix로만 진행한다.

## 7. 신규 tenant 생성 시 필수 확인값

Owner가 확인할 기본값:

| 항목 | 예시 | 비고 |
| --- | --- | --- |
| company_code | hyundai-hoist | 영문 소문자/하이픈 |
| company_name | (주)현대호이스트 | 고객 노출명 |
| status | trial / active / suspended | 상태 |
| service_mode | full / risk_share / trial | 서비스 모드 |
| plan_type | trial / paid | 과금 구분 |
| enabled_modules | worker_qr, manager_inbox | 배열 |
| default_site_name | 본사 / 1공장 | 기본 현장 |
| contact_label | 담당자명 또는 부서 | 민감정보 최소화 |
| owner_notes | 내부 운영 메모 | 외부 노출 금지 |

금지 입력값:

- 실제 API Key 값
- 실제 service role 값
- 실제 Owner Token 값
- 비밀번호
- 주민등록번호
- 근로자 개인정보 원문
- 실제 고객 민감자료 원문

## 8. 다음 구현 후보

1단계 docs-only:

- 본 문서로 Owner 승인형 onboarding 기준 잠금

2단계 type/model:

- tenant membership schema 후보 문서화
- role별 접근 policy 문서화

3단계 Owner UI shell:

- Owner tenant setup checklist 화면
- tenant_registry 조회/상태 확인
- 신규 tenant 입력 후보 shell

4단계 auth integration:

- 실제 user session
- tenant membership lookup
- selected tenant validation

5단계 신규업체 pilot:

- Richi 또는 Hyundai Hoist를 신규 tenant pilot으로 적용

## 9. 표현 가드

SafeMetrica는 법적 판단자나 조치 확정자가 아니다.

피해야 할 표현:

- 법적 책임이나 면책 결과를 보장한다는 표현
- 처분·제재 결과를 막는다고 단정하는 표현
- 과태료 등 제재 결과를 막는다고 단정하는 표현
- 사고가 발생하지 않는다고 단정하는 표현
- 고객의 위험성평가 업무를 대신 수행한다고 오해되는 표현
- 외부 안전관리 업무를 대신 수행한다고 오해되는 표현
- 인증 취득을 보장한다고 오해되는 표현
- 완전한 익명성을 보장한다고 오해되는 표현
- 실제 고객자료가 자동 처리된다고 단정하는 표현

## 10. 다음 작업 판단

다음 작업은 실제 회원가입 구현이 아니다.

우선순위:

1. Owner tenant setup checklist shell
2. tenant_membership schema 후보 문서화
3. role guard helper 확장
4. 신규 tenant pilot 선택
5. Field QR mode activation
