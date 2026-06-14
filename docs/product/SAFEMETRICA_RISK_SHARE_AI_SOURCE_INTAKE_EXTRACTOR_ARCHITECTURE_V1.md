# SafeMetrica Risk Share AI Source Intake Extractor Architecture v1

작업명: `docs: define risk share AI source intake extractor architecture v1`

기준일: 2026-06-14

## 1. 목적

이 문서는 Risk Share Pack의 핵심 자동화 방향을 잠그기 위한 기준 문서다.

현재 Share Item Builder v1은 운영자가 고객 위험성평가 source를 보고 수동으로 공유항목을 정리하는 구조다.

다음 단계는 고객이 제공한 위험성평가표, 평가결과지, PDF, Excel, 이미지 자료를 Source Intake로 접수하고, AI가 근로자 공유용 위험요인 후보를 추출한 뒤 운영자가 검토·수정·채택하는 구조다.

목표는 수동 입력을 줄이고, 업체별 공통위험·비공통위험·현장 특이점·근로자 참여 위험을 축적하여 살아있는 위험성평가 운영 구조로 발전시키는 것이다.

## 2. 안전ON 참고 기준

안전ON 자료에서 참고할 점:

- 근로자 앱과 관리자 앱 역할 분리
- 근로자 승인 / 관리자 교체선임 구조
- TBM 작성 후 전 직원 전파
- 누구나 작성 가능한 안전신고
- 공지사항, 법률정보, 이러닝 메뉴
- 월간 증빙 패키지 개념
- 인원 구간별 가격표와 영업수수료 구조

SafeMetrica가 그대로 사용하지 않을 표현:

- 위험성평가 서류 제공
- 맞춤 위험성평가 제공
- 중대재해 발생 시 법적 대응 보장
- 법적 면책 또는 처벌 방지 보장
- 안전관리대행
- 무재해 보장

SafeMetrica의 방향은 서류 대체가 아니라 운영기록, 공유확인, 근로자 참여, 증빙 원장, 재평가 후보 축적이다.

## 3. 목표 흐름

1. 고객 위험성평가 source 접수
2. source file 저장
3. raw text 추출
4. AI risk item candidate 추출
5. 공통 / 비공통 / 현장특이 / worker signal / 기타 분류
6. 운영자 검토
7. 고객 공유범위 확인
8. Version Lock
9. QR 배포
10. 근로자 공유확인 / 위험제보 / 아차사고 / 개선제안
11. 월간요약 / Export
12. 다음 위험성평가 재검토 후보 축적

## 4. Source Intake 구조

신규 테이블 후보:

```sql
risk_share_sources
```

필드 후보:

- id
- company_code
- company_name
- site_name
- source_title
- source_type
- file_url
- file_name
- file_mime_type
- file_size
- storage_provider
- uploaded_by
- uploaded_at
- raw_text_status
- extraction_status
- review_status
- source_note
- created_at

source_type 후보:

- risk_assessment_pdf
- risk_assessment_excel
- risk_assessment_image
- customer_document
- other

storage_provider 후보:

- vercel_blob
- supabase_storage
- external_link

## 5. AI Extracted Candidate 구조

신규 테이블 후보:

```sql
risk_share_item_candidates
```

필드 후보:

- id
- source_id
- company_code
- site_name
- task_name
- hazard
- accident_type
- risk_level
- current_controls
- improvement_plan
- worker_share_summary
- category
- source_page
- source_row
- confidence
- ai_generated
- reviewer_status
- reviewer_note
- worker_visible
- customer_confirmed
- created_at

category 후보:

- common
- non_common
- site_specific
- worker_signal
- other

reviewer_status 후보:

- pending
- accepted
- edited
- excluded
- needs_customer_check

## 6. 분류 기준

### common

동종 업종에서 반복적으로 나타나는 일반 위험요인.

예:

- 차량 후진
- 협착
- 지게차 충돌
- 미끄러짐
- 중량물 취급
- 절단 / 베임

### non_common

해당 고객 또는 현장에 존재하지만 업종 공통위험으로 보기 어려운 위험.

예:

- 특정 설비
- 특정 화학물질
- 특정 협력사 작업방식
- 특정 현장 동선

### site_specific

현장 구조, 장소, 계절, 시간대, 장비 배치 등 현장 특이점.

예:

- 야간 수거 골목길
- 좁은 진입로
- 경사로 상차
- 특정 적재장
- 특정 랙 구역

### worker_signal

근로자 제보, 아차사고, 개선제안에서 새로 나온 위험.

예:

- 반복 제보된 미끄러운 바닥
- 작업자가 불편하다고 올린 보호구 문제
- 조치 후에도 반복되는 동선 충돌
- 현장관리자가 놓친 작업 전 위험

### other

분류 기준이 불명확하거나 검토가 필요한 항목.

## 7. AI 역할 경계

AI는 후보 제안자다.

AI가 할 수 있는 것:

- source에서 위험요인 후보 추출
- 작업명 / 위험요인 / 사고유형 / 안전조치 후보 정리
- 중복 항목 병합 후보 제안
- 공통 / 비공통 / 특이점 / worker signal / 기타 분류 후보 제안
- 근로자에게 보여줄 쉬운 문장 후보 작성
- 다음 평가 재검토 후보 정리

AI가 하면 안 되는 것:

- 법적 적합성 확정
- 위험성평가 완료 판단
- 조치완료 확정
- 법적 의무 이행 보장
- 처벌 방지 보장
- 무재해 보장
- 안전관리대행 표현
- 위험성평가 대행 표현

## 8. 운영자 Review 구조

AI가 추출한 후보는 반드시 운영자 검토를 거친다.

운영자 작업:

- 후보 채택
- 후보 수정
- 후보 제외
- 근로자 표시 여부 선택
- 고객 확인 필요 표시
- 위험등급 표현 조정
- 근로자용 요약문 수정

검토 후에만 Share Item Builder 또는 Version Lock으로 이동한다.

## 9. 고객 확인 구조

고객 확인 전 상태:

```text
share item candidate
```

고객 확인 후 상태:

```text
customer_confirmed = true
```

고객 확인 항목:

- 공유 대상 항목이 맞는가
- 표현이 현장과 맞는가
- 누락된 작업이 있는가
- 위험등급 표현이 과장 또는 누락되지 않았는가
- 근로자에게 공개해도 되는가

## 10. Version Lock 연결

고객 확인이 끝난 항목만 Version Lock 후보가 된다.

신규 테이블 후보:

```sql
risk_share_versions
```

필드 후보:

- id
- company_code
- source_id
- version_label
- locked_item_count
- locked_by
- locked_at
- status
- go_live_ready
- qr_ready
- export_ready
- created_at

status 후보:

- draft
- customer_confirmed
- locked
- live
- archived

## 11. Worker Risk Summary 연결

최종 목표:

```text
/field/participation/risk-summary?company=companyCode
```

이 화면은 locked 상태의 share items를 조회해서 근로자에게 보여준다.

근로자 화면에 노출할 항목:

- 작업명
- 핵심 위험요인
- 사고유형
- 확인할 안전조치
- 위험등급 또는 주의수준
- 공유확인 버튼
- 의견 / 위험제보 / 아차사고 / 개선제안 진입

노출하지 않을 항목:

- raw_payload
- internal UUID
- source 원문 전체
- 고객 내부 메모
- Owner Token
- API Key
- service role
- 환경변수 값

## 12. 근로자 참여 데이터 반영

근로자 참여 데이터는 다음 위험성평가 재검토 후보가 된다.

대상 데이터:

- 공유확인
- 의견 없음
- 위험제보
- 아차사고
- 개선제안
- 사진 증빙
- 반복 제보
- 관리자 검토결과
- 조치 필요 항목
- 조치완료 후보

후속 후보 테이블:

```sql
risk_share_reassessment_candidates
```

필드 후보:

- id
- company_code
- source_version_id
- worker_report_id
- evidence_item_id
- candidate_type
- summary
- severity_hint
- frequency_hint
- reviewer_status
- next_assessment_note
- created_at

## 13. 파일 저장 기준

source 원본 파일은 DB에 직접 넣지 않는다.

원칙:

- 원본 파일: Storage 또는 Blob
- DB: metadata, file_url, source_id, processing status
- evidence_items: 증빙 파일 메타데이터 원장
- source text: 추출 텍스트 또는 chunk metadata 별도 저장 검토

금지:

- 환경변수 실제 값 저장
- service role 노출
- Owner Token 노출
- 고객 민감 원문을 GitHub에 저장
- 고객 위험성평가 원본을 GitHub에 저장

## 14. 단계별 개발 순서

1. docs: lock AI Source Intake Extractor architecture
2. feat: add risk share source file intake v1
3. feat: persist risk share source metadata v1
4. feat: add AI extracted share item candidate schema v1
5. feat: add extracted candidate review UI v1
6. feat: persist accepted share items v1
7. feat: persist risk share version lock v1
8. feat: connect locked share items to worker risk summary
9. feat: generate QR poster from locked share version
10. feat: add reassessment candidate ledger from worker signals

## 15. 현재 결론

Risk Share Pack의 경쟁력은 수동 Builder가 아니라 AI Source Intake다.

고객이 위험성평가표 파일을 주면 SafeMetrica는 이를 근로자 공유용 위험요인 후보로 자동 정리하고, 운영자와 고객 확인을 거쳐 Version Lock 후 QR로 배포하는 구조로 가야 한다.

이 구조가 쌓이면 업체별 공통위험, 비공통위험, 현장 특이점, 근로자 참여 위험, 다음 평가 재검토 후보가 데이터 자산으로 축적된다.
