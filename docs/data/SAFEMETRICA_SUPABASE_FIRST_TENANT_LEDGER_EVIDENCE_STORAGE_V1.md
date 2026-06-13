# SafeMetrica Supabase-first Tenant Ledger & Evidence Storage Strategy v1

* 기준일: 2026-06-13
* 문서 성격: 신규 고객 Supabase-first 운영 원장·사진·감사이력·Export 기준
* 적용 범위: 신규 고객, Risk Share Pack, 전체 SafeMetrica 운영형, 사진·증빙 저장, 월간보고서, 고객 Export
* 주의: 본 문서는 법적 판단, 면책, 처벌 방지, 무재해 보장 문서가 아니다.

## 1. 목적

SafeMetrica는 기존 고객 일부에서 Notion을 운영 보조 허브로 병행하지만, 신규 고객은 Supabase-first 구조로 전환한다.

Supabase는 PostgreSQL 기반 운영 원장이다. 신규 고객의 실제 운영기록, 제출기록, 링크 원장, 사진 메타데이터, Export 기준, 감사이력은 Supabase를 기준으로 관리한다.

Notion은 다음 역할로 축소한다.

* 고도화 문서 저장
* 산업안전 자료 기반 RAG 라이브러리
* 내부 운영허브
* 기존 고객 백오피스 보조
* 사람이 확인하기 쉬운 문서형 요약

Notion은 신규 고객의 장기 원본 운영 DB로 보지 않는다.

## 2. 기본 원칙

1. 신규 고객은 Supabase-first로 세팅한다.
2. 기존 고객은 Notion 병행을 유지하되 점진적으로 Supabase 원장 비중을 높인다.
3. 앱의 장기 원본 기록은 Supabase/PostgreSQL에 저장한다.
4. 사진 원본은 DB에 직접 저장하지 않고 Supabase Storage에 저장한다.
5. DB에는 사진 파일의 메타데이터와 연결 정보만 저장한다.
6. 고객용 Export는 내부 원장과 분리된 정제 컬럼만 제공한다.
7. Owner 화면, API 경로, service role, token, raw payload는 고객에게 노출하지 않는다.
8. AI는 후보 제안자이며 법적 판단자나 조치 확정자가 아니다.
9. 최종 판단과 조치는 관리자와 사업주가 결정한다.

## 3. 테넌트 구조

### 3.1 companies

`companies`는 고객사 단위의 기준 테이블이다.

논리 컬럼 후보:

* company_id
* company_code
* company_name
* business_type
* plan_type
* service_mode
* status
* created_at
* updated_at

`company_code`는 내부 저장·조회·Export 기준으로 사용하되, 외부 공유 링크는 linkId 기반으로 운영한다.

### 3.2 sites

`sites`는 고객사의 현장·사업장·작업구역 단위다.

논리 컬럼 후보:

* site_id
* company_id
* company_code
* site_name
* site_type
* address_summary
* status
* created_at
* updated_at

Risk Share Pack만 사용하는 고객도 최소 1개 site를 가진다.

## 4. 주요 운영 원장

### 4.1 worker_share_confirmations

근로자 공유확인 기록 원장이다.

기록 목적:

* 위험성평가 결과 공유 확인
* 위험요인 확인
* 안전조치 주지 확인
* 의견 없음 제출
* 근로자 확인 흐름 관리

공유확인은 조치완료 확정이나 법적 판단이 아니다.

### 4.2 field_participation_submissions

근로자 의견·위험제보·아차사고·개선제안 원장이다.

기록 목적:

* 현장 의견 접수
* 위험제보 접수
* 아차사고 접수
* 개선제안 접수
* 관리자 검토 및 조치메모 연결
* 다음 평가주기 보완 후보 반영

### 4.3 worker_representative_confirmation_links

근로자대표 참여확인 링크 원장이다.

기록 목적:

* linkId 기반 외부 공유 링크 생성
* companyCode, siteName, confirmationScope 직접 노출 방지
* active/revoked 상태 관리
* expires_at 만료 관리
* last_used_at 최근 접근 기록

`last_used_at`은 제출 완료 시각이 아니라 링크 조회 또는 접근 시각이다.

### 4.4 worker_representative_confirmations

근로자대표 참여확인 제출 원장이다.

기록 목적:

* 근로자대표 확인
* 별도 의견 없음 기록
* 보완 의견 기록
* 관리자 검토 필요 식별
* 월간보고서 및 고객 CSV Export 연결

근로자대표 참여확인은 평가 결과 확정, 조치 완료 확정, 법적 책임 이전을 의미하지 않는다.

### 4.5 tbm_voice_submissions

TBM 음성·작성 기록 원장이다.

기록 목적:

* TBM 작성 기록
* 작업유형
* 핵심 위험요인
* 안전공지
* 특이사항
* 사진 증빙 연결
* 월간보고서 반영

### 4.6 evidence_items

사진·파일 증빙 메타데이터 원장이다.

사진 원본은 Storage에 저장하고, DB에는 파일 메타데이터만 저장한다.

논리 컬럼 후보:

* evidence_id
* company_id
* company_code
* site_id
* source_type
* source_id
* evidence_type
* storage_bucket
* storage_path
* file_name
* mime_type
* file_size
* uploaded_by_role
* uploaded_at
* is_customer_exportable
* retention_status
* export_manifest_status

## 5. Supabase Storage 기준

사진과 파일은 Supabase Storage bucket에 저장한다.

기본 원칙:

1. bucket은 private을 기본값으로 한다.
2. 고객 화면에 public URL을 직접 노출하지 않는다.
3. 필요한 경우 signed URL 또는 서버 프록시를 사용한다.
4. 파일명에는 고객 민감정보를 직접 넣지 않는다.
5. 파일 path는 company_code, site_id, source_type, date 기준으로 정리한다.
6. EXIF 위치정보는 기본 제거 또는 별도 검토한다.
7. Export ZIP은 Storage 원본을 그대로 노출하지 않고 manifest 기준으로 구성한다.

Storage path 후보:

```text
evidence/{company_code}/{yyyy}/{mm}/{source_type}/{source_id}/{evidence_id}_{safe_file_name}
```

## 6. audit_events 기준

운영 SaaS에는 변경·접근·Export 이력이 필요하다.

`audit_events` 논리 컬럼 후보:

* event_id
* company_id
* company_code
* actor_role
* actor_label
* event_type
* source_type
* source_id
* event_summary
* before_snapshot
* after_snapshot
* created_at

감사이력 대상:

* 링크 생성
* 링크 폐기
* 링크 만료 확인
* 링크 접근
* 근로자 제출
* 근로자대표 제출
* 관리자 상태 변경
* 조치메모 변경
* 사진 업로드
* CSV Export 생성
* 월간보고서 생성

audit_events는 운영 확인 이력이다. 법적 판단 또는 면책 확정 이력으로 표현하지 않는다.

## 7. Export 기준

고객용 Export는 내부 원장과 분리된 정제 자료다.

고객용 Export에 포함 가능한 자료:

* TBM 기록 CSV
* 근로자 공유확인 CSV
* 위험제보·아차사고·개선제안 CSV
* 근로자대표 참여확인 CSV
* 증빙목록 CSV
* 월간 운영보고서 PDF

고객용 Export에서 제외할 항목:

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

## 8. RLS 및 서버 접근 기준

Supabase 접근 원칙:

1. client에서 service role을 사용하지 않는다.
2. service role은 서버 전용 API에서만 사용한다.
3. Owner 전용 API는 Owner 인증 후 실행한다.
4. 외부 근로자 링크는 linkId 기반으로만 접근한다.
5. RLS는 public 직접 접근을 차단하는 방향을 기본으로 한다.
6. 고객용 다운로드는 서버가 정제한 결과만 반환한다.

## 9. 신규 고객 세팅 방향

신규 고객은 다음 순서로 구성한다.

1. company_code 확정
2. companies 등록
3. sites 등록
4. 서비스 모드 선택

   * Risk Share Pack
   * Full SafeMetrica
5. 공유확인 흐름 활성화
6. 근로자대표 참여확인 링크 생성 테스트
7. Supabase 원장 저장 확인
8. 월간보고서 확인
9. 고객용 CSV Export 확인
10. 테스트 데이터 정리

온보딩 체크리스트는 별도 문서로 작성한다.

## 10. 보존·삭제 기준

운영 기록은 원칙적으로 보존한다.

삭제가 가능한 경우:

* 테스트 데이터
* 잘못 생성된 초기 설정 데이터
* 고객 요청에 따른 삭제 검토 대상
* 보존정책에 따른 만료 데이터

삭제보다 상태 변경을 우선한다.

예:

* 링크는 삭제보다 revoked 상태를 우선한다.
* 제출 기록은 삭제보다 review_status 또는 correction 기록을 우선한다.
* Export는 생성 이력을 audit_events로 남기는 것을 검토한다.

## 11. 금지 표현

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

## 12. 후속 PR 후보

1. companies / sites 논리 schema 문서
2. evidence_items / Storage bucket 설계 문서
3. audit_events 설계 문서
4. 신규 고객 온보딩 체크리스트
5. Risk Share Pack 전용 관리자 홈 설계
6. Risk Share Pack 전용 월간보고서 모드 설계
7. 실제 Supabase migration v1
8. Storage upload policy 및 signed URL 설계
