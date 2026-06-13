# SafeMetrica Companies & Sites Schema for Supabase-first Tenants v1

* 기준일: 2026-06-13
* 문서 성격: Supabase-first 신규 고객의 companies / sites 논리 schema 기준
* 적용 범위: 신규 고객, Risk Share Pack, Full SafeMetrica, 월간보고서, Export, Owner Console
* 주의: 본 문서는 법적 판단, 면책, 처벌 방지, 무재해 보장 문서가 아니다.

## 1. 목적

이 문서는 SafeMetrica 신규 고객을 Supabase-first 구조로 운영하기 위한 고객사와 현장 기준을 정의한다.

핵심 목적은 다음과 같다.

* 신규 고객 company_code 표준화
* 고객사와 현장 분리
* Risk Share Pack과 Full SafeMetrica 서비스 모드 구분
* 월간보고서, Export, 사진·증빙, 감사이력의 공통 연결 기준 확정
* Notion 의존을 줄이고 Supabase/PostgreSQL을 운영 원장으로 사용하기 위한 기준 확정

## 2. 기본 원칙

1. 신규 고객은 Supabase-first로 등록한다.
2. 기존 고객은 Notion 병행을 유지하되 점진적으로 Supabase 원장 비중을 높인다.
3. 고객사 기준은 `companies`가 담당한다.
4. 현장·사업장·작업구역 기준은 `sites`가 담당한다.
5. 모든 운영 원장은 `company_id` 또는 `company_code`와 연결되어야 한다.
6. 현장 단위 기록은 가능하면 `site_id`와 연결한다.
7. 외부 공유 링크에는 company_code, site_name, confirmation_scope를 직접 노출하지 않는다.
8. 외부 공유 링크는 linkId 기반으로 운영한다.
9. 고객용 Export에는 내부 UUID, raw payload, snapshot, token, service role 값을 포함하지 않는다.

## 3. companies 논리 schema

`companies`는 고객사 단위의 기준 테이블이다.

### 3.1 주요 컬럼 후보

| 컬럼                    | 타입 후보       | 필수 | 설명                        |
| --------------------- | ----------- | -: | ------------------------- |
| company_id            | uuid        |  예 | 내부 고객사 식별자                |
| company_code          | text        |  예 | 앱·원장·Export에서 사용하는 고객사 코드 |
| company_name          | text        |  예 | 고객사 표시명                   |
| legal_name            | text        | 선택 | 사업자등록 기준 법인명 또는 상호        |
| business_type         | text        | 선택 | 업종 구분                     |
| industry_profile      | text        | 선택 | 물류, 생활폐기물, 건설폐기물, 제조 등    |
| plan_type             | text        |  예 | 상품 플랜                     |
| service_mode          | text        |  예 | 서비스 운영 모드                 |
| status                | text        |  예 | 운영 상태                     |
| primary_contact_label | text        | 선택 | 담당자 표시명                   |
| owner_note            | text        | 선택 | 내부 운영 메모                  |
| created_at            | timestamptz |  예 | 생성 시각                     |
| updated_at            | timestamptz |  예 | 수정 시각                     |

### 3.2 company_code 기준

`company_code`는 신규 고객 등록 시 가장 먼저 확정한다.

원칙:

* 영문 소문자, 숫자, 하이픈만 사용한다.
* 한글, 공백, 괄호, 특수문자는 사용하지 않는다.
* 회사명이 바뀌어도 company_code는 함부로 바꾸지 않는다.
* 외부 URL에는 직접 노출하지 않는 것을 기본으로 한다.
* 고객용 CSV에는 회사 구분을 위해 노출할 수 있으나 내부 토큰처럼 사용하지 않는다.

예시:

| 회사명     | company_code 후보 |
| ------- | --------------- |
| (주)우광개발 | woogwang        |
| 우광개발    | woogwang        |
| 한국그린환경  | hankookgreen    |
| 버블몬코리아  | bubblemon       |

주의:
company_code는 보안 비밀값이 아니다. 다만 외부 링크에서는 조작 가능성을 줄이기 위해 linkId 구조를 우선한다.

## 4. plan_type 기준

`plan_type`은 과금 또는 상품 수준을 구분한다.

후보 값:

* risk_share_basic
* risk_share_standard
* full_basic
* full_standard
* full_plus
* full_pro
* internal_demo
* partner_demo

초기에는 문자열로 운영하되, 추후 enum 또는 별도 plans 테이블로 분리할 수 있다.

## 5. service_mode 기준

`service_mode`는 고객사가 어떤 운영 범위를 사용하는지 나타낸다.

후보 값:

* risk_share_pack
* full_safemetrica
* partner_demo
* internal_test

### 5.1 risk_share_pack

위험성평가 공유팩 전용 고객이다.

포함 가능 기능:

* 위험성평가 공유 링크
* 근로자 공유확인
* 위험제보·아차사고·개선제안
* 근로자대표 참여확인
* 링크 만료·폐기 관리
* 관리자 접수함
* 월간 공유팩 요약
* 고객용 CSV Export

제외 가능 기능:

* TBM 전체 운영
* PTW
* EB
* 대표 대시보드 전체형
* 전체 SafeMetrica 월간보고서

### 5.2 full_safemetrica

전체 SafeMetrica 운영형 고객이다.

포함 가능 기능:

* TBM
* PTW
* EB
* 현장참여
* 위험성평가 공유확인
* 근로자대표 참여확인
* 대표 대시보드
* 월간보고서
* 고객 Export
* 사진·증빙관리
* 향후 위험요인 발견 엔진

### 5.3 partner_demo

외부 파트너·영업용 샘플 모드다.

주의:

* 실제 고객 데이터 사용 금지
* Supabase 실원장 연결 금지
* Owner Console 노출 금지
* 실제 API Key, token, service role 노출 금지
* 정식 앱의 과장판이 아니라 핵심 흐름의 샘플 모드로 유지

## 6. company status 기준

`status`는 고객사 운영 상태를 나타낸다.

후보 값:

* onboarding
* active
* paused
* offboarding
* archived
* internal_test

설명:

| status        | 의미      |
| ------------- | ------- |
| onboarding    | 세팅 중    |
| active        | 운영 중    |
| paused        | 일시 중단   |
| offboarding   | 종료 처리 중 |
| archived      | 보관 상태   |
| internal_test | 내부 테스트  |

## 7. sites 논리 schema

`sites`는 고객사의 현장, 사업장, 작업구역, 프로젝트 단위를 관리한다.

### 7.1 주요 컬럼 후보

| 컬럼              | 타입 후보       | 필수 | 설명                          |
| --------------- | ----------- | -: | --------------------------- |
| site_id         | uuid        |  예 | 내부 현장 식별자                   |
| company_id      | uuid        |  예 | companies 연결                |
| company_code    | text        |  예 | 조회·Export 편의용 회사코드          |
| site_code       | text        | 선택 | 현장 코드                       |
| site_name       | text        |  예 | 현장 표시명                      |
| site_type       | text        | 선택 | 본사, 사업장, 수거구역, 물류센터, 공사현장 등 |
| address_summary | text        | 선택 | 고객 화면용 주소 요약                |
| risk_profile    | text        | 선택 | 현장 위험 특성                    |
| status          | text        |  예 | 현장 운영 상태                    |
| created_at      | timestamptz |  예 | 생성 시각                       |
| updated_at      | timestamptz |  예 | 수정 시각                       |

### 7.2 site_code 기준

`site_code`는 같은 고객사 안에서 현장을 구분하기 위한 코드다.

원칙:

* company_code와 결합했을 때 유일해야 한다.
* 외부 URL에 직접 노출하지 않는 것을 기본으로 한다.
* 현장명이 바뀌어도 site_code는 가능하면 유지한다.
* site_code가 없더라도 site_id는 반드시 있어야 한다.

예시:

| site_name | site_code 후보     |
| --------- | ---------------- |
| 본사        | hq               |
| 수거 현장     | collection       |
| 1공장       | plant1           |
| 송도 물류센터   | songdo-logistics |
| 우광개발 A현장  | site-a           |

## 8. site_type 기준

`site_type` 후보:

* headquarters
* office
* collection_route
* logistics_center
* warehouse
* manufacturing_site
* construction_site
* waste_processing_site
* temporary_project
* other

Risk Share Pack 고객도 최소 1개 site를 가진다.

현장명이 명확하지 않은 고객은 초기값으로 `main` 또는 `default` site를 둔다.

## 9. companies와 sites 연결 기준

기본 관계:

```text
companies 1 : N sites
```

운영 원장은 아래 기준으로 연결한다.

| 원장                                       | company 연결 | site 연결           |
| ---------------------------------------- | ---------- | ----------------- |
| worker_share_confirmations               | 필수         | 가능하면 필수           |
| field_participation_submissions          | 필수         | 가능하면 필수           |
| worker_representative_confirmation_links | 필수         | 현장명 또는 site_id 연결 |
| worker_representative_confirmations      | 필수         | 현장명 또는 site_id 연결 |
| tbm_voice_submissions                    | 필수         | 가능하면 필수           |
| evidence_items                           | 필수         | 가능하면 필수           |
| audit_events                             | 필수         | source에 따라 선택     |
| export_jobs                              | 필수         | 선택                |

초기에는 기존 app 코드와의 호환을 위해 company_code와 site_name을 같이 유지할 수 있다. 장기적으로는 company_id, site_id 중심으로 전환한다.

## 10. 기존 고객과 신규 고객 구분

### 10.1 기존 고객

기존 고객은 다음 구조를 유지할 수 있다.

* Notion DB 병행
* Supabase shadow-write
* 회사별 예외 mapping 일부 유지
* 월간보고서 기존 구조 유지

단, 신규 기능은 가능하면 Supabase 원장을 먼저 기준으로 한다.

### 10.2 신규 고객

신규 고객은 처음부터 다음 기준으로 세팅한다.

* companies 등록
* sites 등록
* service_mode 지정
* plan_type 지정
* Supabase 원장 저장 확인
* 고객용 Export 확인
* Notion DB 필수 생성 금지

Notion은 신규 고객의 필수 원장이 아니다.

## 11. Owner Console 연결 기준

Owner Console은 companies와 sites를 조회·관리하는 내부 화면으로 확장한다.

필요 기능 후보:

* 신규 고객 등록
* company_code 중복 확인
* site 등록
* service_mode 설정
* plan_type 설정
* status 변경
* Supabase 원장 상태 확인
* Export 가능 여부 확인
* 최근 제출 기록 확인
* 테스트 데이터 정리

Owner Console은 고객에게 노출하지 않는다.

## 12. Risk Share Pack 신규 고객 최소 세팅

Risk Share Pack만 사용하는 신규 고객의 최소 세팅:

1. company_code 확정
2. company_name 등록
3. service_mode = risk_share_pack
4. plan_type 지정
5. default site 등록
6. 근로자 공유확인 흐름 테스트
7. 근로자대표 참여확인 링크 생성 테스트
8. 링크 폐기·만료 테스트
9. 월간보고서 공유팩 블록 확인
10. 고객용 CSV Export 확인
11. 테스트 데이터 삭제 또는 revoked 처리

## 13. 데이터 정합성 기준

필수 정합성:

* company_code는 중복되면 안 된다.
* company_id 없이 운영 원장을 만들지 않는 것을 목표로 한다.
* site_id 없이 현장 기록을 장기 운영하지 않는 것을 목표로 한다.
* 외부 linkId는 서버에서 company/site/scope를 조회하는 authoritative source로 사용한다.
* 고객용 Export는 내부 원장 그대로가 아니라 정제 결과여야 한다.
* 상태 변경은 삭제보다 이력 보존을 우선한다.

## 14. 보안 기준

금지:

* service role client 노출
* Owner Token 노출
* 고객용 CSV에 내부 UUID 노출
* 외부 URL에 companyCode, siteName, confirmationScope 직접 노출
* public bucket에 고객 증빙사진 저장
* 파일명에 근로자 개인정보 직접 포함
* 고객별 데이터가 섞이는 조회

권장:

* server-only 접근
* RLS 기본 활성화
* linkId 기반 외부 접근
* private Storage bucket
* signed URL 또는 서버 프록시
* company_code와 site_id 기준 필터
* Export 컬럼 whitelist

## 15. 금지 표현

다음 표현은 제품, 제안서, 고객 화면, Export 안내문에서 사용하지 않는다.

* 법적 의무 완료
* 과태료 방지
* 면책 보장
* 무재해 보장
* 위험성평가 대행 대체
* 안전관리대행
* AI 법적 판단
* AI 조치완료 확정
* 근로자대표 승인으로 법적 요건 충족

## 16. 후속 PR 후보

1. 실제 Supabase companies / sites migration v1
2. Owner Console 신규 고객 등록 UI 설계
3. Risk Share Pack 신규 고객 온보딩 체크리스트
4. evidence_items schema 문서
5. audit_events schema 문서
6. export_jobs schema 문서
7. 사진 Storage bucket policy 문서
8. 신규 고객 샘플 seed 기준
