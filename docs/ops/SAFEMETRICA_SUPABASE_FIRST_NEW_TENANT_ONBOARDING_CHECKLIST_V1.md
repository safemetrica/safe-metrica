# SafeMetrica Supabase-first New Tenant Onboarding Checklist v1

* 기준일: 2026-06-13
* 문서 성격: 신규 고객 Supabase-first 온보딩 운영 체크리스트
* 적용 범위: 신규 고객, Risk Share Pack, Full SafeMetrica, Owner Console, Supabase 원장, 월간보고서, 고객 Export
* 주의: 본 문서는 법적 판단, 면책, 처벌 방지, 무재해 보장 문서가 아니다.

## 1. 목적

이 문서는 SafeMetrica 신규 고객을 Supabase-first 기준으로 세팅할 때 운영자가 따라야 할 표준 절차를 정의한다.

신규 고객은 Notion DB를 필수 원장으로 만들지 않는다. Supabase/PostgreSQL을 장기 원본 운영 DB로 보고, Notion은 고도화 문서 저장, RAG 자료, 기존 고객 백오피스 보조, 내부 운영허브로 제한한다.

이 체크리스트의 목적은 다음이다.

* 신규 고객 company_code 중복 방지
* companies / sites 기준 세팅
* Risk Share Pack 또는 Full SafeMetrica 서비스 모드 확정
* Supabase 원장 저장 확인
* 링크 생성·폐기·만료 테스트
* 월간보고서 및 고객용 Export 확인
* 테스트 데이터 정리
* 고객 노출 위험 방지

## 2. 온보딩 전 확인

신규 고객 등록 전 아래 정보를 확인한다.

### 2.1 고객 기본정보

* 고객사 표시명
* 사업자등록 기준 상호 또는 법인명
* 업종
* 사업장 또는 현장 수
* 담당자 표시명
* 담당자 연락 방식
* 서비스 시작 희망일
* Risk Share Pack 또는 Full SafeMetrica 구분

### 2.2 서비스 범위 확인

다음 중 하나를 선택한다.

* risk_share_pack
* full_safemetrica
* partner_demo
* internal_test

Risk Share Pack 범위:

* 위험성평가 공유 링크
* 근로자 공유확인
* 위험제보·아차사고·개선제안
* 근로자대표 참여확인
* 링크 만료·폐기 관리
* 관리자 접수함
* 월간 공유팩 요약
* 고객용 CSV Export

Full SafeMetrica 범위:

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

## 3. company_code 확정

`company_code`는 신규 고객 세팅의 첫 기준이다.

### 3.1 company_code 규칙

* 영문 소문자, 숫자, 하이픈만 사용한다.
* 한글, 공백, 괄호, 특수문자는 사용하지 않는다.
* 회사명이 바뀌어도 company_code는 함부로 바꾸지 않는다.
* 외부 공유 URL에는 직접 노출하지 않는 것을 기본으로 한다.
* 고객용 CSV에는 회사 구분 목적으로 포함할 수 있다.
* 보안 비밀값처럼 사용하지 않는다.

### 3.2 예시

| 회사명     | company_code 후보 |
| ------- | --------------- |
| (주)우광개발 | woogwang        |
| 우광개발    | woogwang        |
| 한국그린환경  | hankookgreen    |
| 버블몬코리아  | bubblemon       |

### 3.3 중복 확인

등록 전 확인:

```text
company_code 중복 없음
동일 또는 유사 고객명 중복 없음
기존 테스트 코드와 충돌 없음
```

## 4. companies 등록 기준

신규 고객은 `companies` 기준으로 등록한다.

필수 값:

* company_id
* company_code
* company_name
* plan_type
* service_mode
* status
* created_at
* updated_at

초기 상태 후보:

```text
status = onboarding
```

Risk Share Pack 예시:

```text
company_code = woogwang
company_name = (주)우광개발
service_mode = risk_share_pack
plan_type = risk_share_standard
status = onboarding
```

주의:

* 실제 고객 정보는 GitHub, 채팅, 문서 샘플에 그대로 남기지 않는다.
* 실제 담당자 연락처, 사업자번호, 민감정보는 샘플 문서에 넣지 않는다.
* 고객 세팅용 SQL 또는 seed에는 실제 민감정보를 포함하지 않는다.

## 5. sites 등록 기준

신규 고객은 최소 1개 site를 가진다.

필수 값:

* site_id
* company_id
* company_code
* site_name
* site_type
* status
* created_at
* updated_at

Risk Share Pack만 사용하는 고객도 기본 site를 둔다.

예시:

```text
site_name = 본사
site_code = main
site_type = headquarters
status = active
```

또는:

```text
site_name = 수거 현장
site_code = collection
site_type = collection_route
status = active
```

현장명이 아직 명확하지 않으면 `main` 또는 `default` site를 사용한다.

## 6. 서비스 모드별 세팅 체크

### 6.1 Risk Share Pack

체크 항목:

* company_code 확정
* companies 등록
* default site 등록
* service_mode = risk_share_pack
* plan_type 지정
* 근로자 공유확인 경로 확인
* 근로자대표 참여확인 링크 생성 확인
* 링크 만료일 입력 확인
* 링크 폐기 버튼 확인
* 폐기된 링크 제출 차단 확인
* 관리자 접수함 확인
* 월간보고서 공유팩 블록 확인
* 고객용 CSV Export 확인
* 테스트 데이터 삭제 또는 revoked 처리

### 6.2 Full SafeMetrica

체크 항목:

* company_code 확정
* companies 등록
* sites 등록
* service_mode = full_safemetrica
* plan_type 지정
* TBM 입력 확인
* PTW 접근 확인
* EB 접근 확인
* 현장참여 제출 확인
* 위험성평가 공유확인 확인
* 근로자대표 참여확인 확인
* 대표 대시보드 확인
* 월간보고서 확인
* 고객용 CSV Export 확인
* 사진·증빙 저장 정책 확인
* 테스트 데이터 정리

## 7. Supabase 원장 확인

신규 고객 온보딩 시 다음 원장 연결을 확인한다.

### 7.1 Risk Share Pack 최소 확인

* worker_share_confirmations
* field_participation_submissions
* worker_representative_confirmation_links
* worker_representative_confirmations
* customer CSV export route

### 7.2 Full SafeMetrica 추가 확인

* tbm_voice_submissions
* evidence_items
* audit_events
* monthly report source
* export_jobs 후보

### 7.3 저장 확인 기준

확인할 항목:

* company_code가 정확히 저장되는지
* site_name 또는 site_id가 연결되는지
* 제출 시간이 저장되는지
* status 값이 표준값인지
* 고객용 Export에서 내부값이 제외되는지

## 8. 링크 생성·폐기·만료 테스트

근로자대표 참여확인 링크 기준 테스트:

1. 관리자 접수함 접속
2. 현장명 입력
3. 확인 내용 입력
4. 만료일 선택 또는 비움
5. 링크 만들기
6. 생성된 linkId URL 확인
7. 최근 발급 링크 목록에 표시 확인
8. 외부 URL에 companyCode, siteName, confirmationScope 미노출 확인
9. 링크 접속 확인
10. link 원장의 last_used_at 갱신 확인
11. 링크 폐기
12. 폐기 상태 표시 확인
13. 폐기된 링크 접속 차단 확인

주의:

* last_used_at은 제출 완료가 아니라 링크 조회 또는 접근 시각이다.
* 폐기된 링크는 삭제하지 않고 revoked 상태로 남기는 것을 우선한다.
* 테스트 링크는 운영 전 삭제하거나 revoked 처리한다.

## 9. 근로자 공유확인 테스트

Risk Share Pack 신규 고객 기준 테스트:

1. 위험성평가 공유 링크 접속
2. 위험요인 확인
3. 안전조치 주지 확인
4. 의견 없음 제출
5. 위험제보 제출
6. 아차사고 제출
7. 개선제안 제출
8. 관리자 접수함 표시 확인
9. 처리상태 변경 후보 확인
10. 월간보고서 반영 후보 확인
11. 고객용 CSV Export 확인

주의:

* 공유확인은 조치완료 확정이 아니다.
* 위험제보는 관리자 검토 전에는 조치완료로 표현하지 않는다.
* AI는 후보 제안자이며 최종 판단자는 관리자와 사업주다.

## 10. 근로자대표 참여확인 테스트

테스트 항목:

1. linkId 기반 URL 접속
2. 현장명과 확인 내용 표시 확인
3. 성명 입력
4. 소속·작업조 입력
5. 별도 의견 없음 제출
6. 보완 의견 있음 제출
7. 개인정보 수집·이용 안내 체크
8. 제출 완료 화면 확인
9. worker_representative_confirmations 저장 확인
10. 관리자 접수함 표시 확인
11. 월간보고서 블록 반영 확인
12. 고객용 CSV Export 확인

주의:

* 근로자대표 참여확인은 운영기록이다.
* 위험성평가 완료 확정, 조치완료 확정, 법적 책임 이전으로 표현하지 않는다.

## 11. 월간보고서 확인

Risk Share Pack 고객에게는 공유팩 중심 블록이 중요하다.

확인 항목:

* 근로자 공유확인 수
* 위험제보·아차사고·개선제안 수
* 관리자 검토 필요 수
* 근로자대표 참여확인 수
* 보완 의견 수
* 최근 제출 기록
* 고객용 Export 안내

Full SafeMetrica 고객은 추가로 다음을 확인한다.

* TBM 기록
* PTW 현황
* EB 증빙
* 대표 대시보드 요약
* 전체 월간 운영현황

주의:

* 월간보고서는 운영 확인 자료다.
* 법적 판단 또는 조치 확정 자료로 표현하지 않는다.

## 12. 고객용 CSV Export 확인

확인할 Export:

* TBM 기록 CSV
* 근로자 공유확인 CSV
* 위험제보·아차사고·개선제안 CSV
* 근로자대표 참여확인 CSV
* 증빙목록 CSV

Risk Share Pack 최소 확인:

* 근로자 공유확인 CSV
* 위험제보·아차사고·개선제안 CSV
* 근로자대표 참여확인 CSV

Export 제외 항목:

* Supabase 내부 UUID
* raw_payload
* snapshot
* linkId 원문
* Owner 링크
* 내부 API 경로
* token
* service role
* 환경변수명 또는 실제 값
* 고객 민감정보 중 불필요한 원문

## 13. 사진·증빙 확인

사진 기능이 포함된 고객은 다음을 확인한다.

* Storage bucket private 여부
* evidence_items 메타데이터 저장 여부
* storage_path 직접 노출 여부
* signed URL 또는 서버 프록시 기준 여부
* 파일명 정제 여부
* EXIF 제거 또는 검토 기준
* 고객용 증빙목록 CSV 확인
* ZIP Export 후보 확인

주의:

* public bucket에 고객 증빙사진을 저장하지 않는다.
* 고객용 Export에 signed URL 원문을 넣지 않는다.
* 사진만으로 조치완료를 확정하지 않는다.

## 14. audit_events 확인

감사이력 기능이 적용된 경우 다음 이벤트를 확인한다.

* company_created
* site_created
* representative_link_created
* representative_link_revoked
* representative_link_accessed
* worker_share_submitted
* field_participation_submitted
* worker_representative_confirmation_submitted
* review_status_changed
* customer_csv_export_created
* evidence_uploaded

주의:

* audit_events는 운영 확인 이력이다.
* 법적 판단 또는 면책 확정 이력으로 표현하지 않는다.
* 고객에게 원본 audit_events 전체를 제공하지 않는다.

## 15. 테스트 데이터 정리

온보딩 테스트 후 정리한다.

정리 대상:

* 테스트 링크
* 테스트 제출
* 테스트 제보
* 테스트 근로자대표 확인
* 테스트 사진
* 테스트 Export 파일

정리 원칙:

* 실제 운영 전 테스트 데이터는 삭제 가능하다.
* 운영 중 데이터는 삭제보다 상태 변경을 우선한다.
* 링크는 삭제보다 revoked 처리 우선.
* 제출 기록은 삭제보다 review_status 또는 correction 기록 우선.
* 테스트 삭제 SQL은 company_code와 생성일 범위를 반드시 조건으로 넣는다.

주의:

* 전체 테이블 delete 금지.
* company_code 조건 없는 delete 금지.
* 운영 고객 데이터와 테스트 데이터가 섞이지 않게 확인한다.

## 16. 고객 전달 전 최종 확인

고객에게 링크 또는 안내자료 전달 전 확인한다.

* 실제 고객 민감정보가 샘플에 노출되지 않았는지
* Owner 링크가 전달되지 않았는지
* Owner Token이 전달되지 않았는지
* 내부 API 경로가 안내문에 노출되지 않았는지
* Supabase URL, service role, API Key가 노출되지 않았는지
* linkId 기반 외부 링크인지
* 만료일이 필요한 링크인지
* 고객용 Export 컬럼이 정제되어 있는지
* 월간보고서 문구가 운영기록 기준인지
* 금지 표현이 없는지

## 17. 금지 표현

다음 표현은 제안서, 고객 안내문, 월간보고서, Export 안내문에서 사용하지 않는다.

* 법적 의무 완료
* 과태료 방지
* 면책 보장
* 무재해 보장
* 위험성평가 대행 대체
* 안전관리대행
* AI 법적 판단
* AI 조치완료 확정
* 근로자대표 승인으로 법적 요건 충족
* 사진으로 조치완료 확정
* 이 서비스만 쓰면 안전보건관리체계가 완성됩니다

## 18. 온보딩 완료 기준

온보딩 완료 조건:

1. company_code 확정
2. companies 등록
3. sites 등록
4. service_mode 설정
5. plan_type 설정
6. 핵심 제출 흐름 테스트 완료
7. Supabase 저장 확인
8. 월간보고서 확인
9. 고객용 CSV Export 확인
10. 링크 생성·폐기·만료 확인
11. 테스트 데이터 정리
12. 고객 전달 자료 검수 완료

## 19. 후속 PR 후보

1. Risk Share Pack 전용 관리자 홈 설계
2. Risk Share Pack 전용 월간보고서 모드 설계
3. companies / sites 실제 migration v1
4. evidence_items 실제 migration v1
5. audit_events 실제 migration v1
6. Owner Console 신규 고객 등록 UI
7. 신규 고객 seed script 기준
8. 고객별 Export package 생성 기능
