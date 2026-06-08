# SafeMetrica Customer Export Field Mapper Spec v1

## 1. 목적

이 문서는 SafeMetrica 내부 Supabase JSON 백업 데이터를 고객 전달용 CSV / Excel 컬럼으로 변환하는 기준을 정의한다.

내부 JSON 백업은 운영자 확인, 복구, 원장 검증 목적이다. 고객에게 직접 제공하지 않는다.

고객 전달용 Export는 월간 안전운영 보고서, TBM 기록, 근로자 공유확인, 위험제보·아차사고·개선제안, 조치현황, 증빙목록, 증빙 ZIP 형태로 별도 정제한다.

## 2. 기준 문서

- `docs/data/SAFEMETRICA_CUSTOMER_FACING_EXPORT_SPEC_V1.md`
- `docs/data/SAFEMETRICA_SUPABASE_EXPORT_SPEC_V1.md`
- `docs/data/SAFEMETRICA_SUPABASE_LEDGER_CURRENT_STATE.md`
- `docs/data/SAFEMETRICA_SUPABASE_LEDGER_SCHEMA_V1.md`
- `docs/data/SAFEMETRICA_SUPABASE_EXPORT_VIEWS_V1.md`

## 3. Internal Backup Export와 Customer-facing Export 차이

| 구분 | Internal Backup Export | Customer-facing Export |
| --- | --- | --- |
| 목적 | 운영자 백업, 복구, 원장 검증 | 고객 보고, 월간 운영자료, 증빙 제출 패키지 |
| 대상 | Owner 내부 | 고객사 대표, 관리자, 현장관리자 |
| 형식 | JSON | PDF / CSV / Excel / ZIP |
| 데이터 범위 | 내부 원본에 가까움 | 필요한 컬럼만 정제 |
| 링크 | Notion URL 포함 가능 옵션 | 기본 제외 |
| 내부 ID | 포함 가능 | 제외 |
| raw payload | 포함 가능 | 제외 |
| 제공 방식 | Owner Console 내부 다운로드 | 고객 전달용 패키지로 별도 생성 |

## 4. `field_participation_submissions` → 고객용 컬럼 매핑

### 4-1. 공통 매핑

| 내부 필드 후보 | 고객용 컬럼 | 변환 기준 | 비고 |
| --- | --- | --- | --- |
| `tenant_code`, `company_code` | 업체코드 | 내부 처리용. 고객용 파일명 또는 표지에만 사용 가능 | 본문 표에는 원칙적으로 제외 |
| `created_at`, `submitted_at` | 제출일시 | `YYYY-MM-DD HH:mm` | 시간대는 KST 기준 |
| `submission_type` | 제출구분 | 공유확인 / 위험제보 / 아차사고 / 개선제안 / 기타 | 표준값으로 정규화 |
| `title` | 제목 | 문자열 정제 | 비어 있으면 내용 앞부분으로 후보 생성 가능 |
| `location` | 위치/구역 | 문자열 정제 | 없으면 빈칸 |
| `content` | 내용 요약 | 장문은 요약 컬럼으로 정제 | 원문 전체는 고객용 v1 기본 제외 |
| `anonymous` | 익명 여부 | 예 / 아니오 | 개인정보 최소화 |
| `status` | 처리상태 | 접수 / 검토중 / 조치필요 / 조치완료 / 반려 | 표준값으로 정규화 |
| `file_urls` | 증빙 여부 | 있음 / 없음 | URL 직접 노출 금지 |
| `file_urls` | 증빙 수 | 파일 개수 | 숫자 |
| `manager_memo`, `action_memo` | 관리자 메모 | 관리자가 확인한 메모만 포함 | 내부 디버그 제외 |
| `monthly_report_candidate` | 월간보고서 반영 후보 | 예 / 아니오 | 후보값 없으면 제출구분 기준으로 산정 가능 |

### 4-2. 근로자 공유확인 CSV 컬럼 후보

| 순서 | 고객용 컬럼 |
| --- | --- |
| 1 | 제출일시 |
| 2 | 제출구분 |
| 3 | 제목 |
| 4 | 위치/구역 |
| 5 | 내용 요약 |
| 6 | 익명 여부 |
| 7 | 처리상태 |
| 8 | 증빙 여부 |
| 9 | 증빙 수 |
| 10 | 관리자 메모 |
| 11 | 월간보고서 반영 후보 |
| 12 | 비고 |

### 4-3. 위험제보·아차사고·개선제안 CSV 컬럼 후보

| 순서 | 고객용 컬럼 |
| --- | --- |
| 1 | 제출일시 |
| 2 | 제출구분 |
| 3 | 제목 |
| 4 | 위치/구역 |
| 5 | 내용 요약 |
| 6 | 익명 여부 |
| 7 | 처리상태 |
| 8 | 조치 메모 |
| 9 | 증빙 여부 |
| 10 | 증빙 수 |
| 11 | 월간보고서 반영 후보 |
| 12 | 비고 |

## 5. `tbm_voice_submissions` → 고객용 컬럼 매핑

| 내부 필드 후보 | 고객용 컬럼 | 변환 기준 | 비고 |
| --- | --- | --- | --- |
| `company_code` | 업체코드 | 내부 처리용 | 본문 표에는 원칙적으로 제외 |
| `date_value`, `work_date`, `created_at` | 날짜 | `YYYY-MM-DD` | KST 기준 |
| `start_time` | 시작시간 | `HH:mm` | 없으면 빈칸 |
| `end_time` | 종료시간 | `HH:mm` | 없으면 빈칸 |
| `work_name`, `title` | 작업명 | 문자열 정제 | 필수 후보 |
| `work_type` | 작업유형 | 대표 작업유형 1개 | select 기준 |
| `work_types`, `work_type_multi` | 작업유형(복수) | 쉼표 구분 | multi_select 기준 |
| `work_tags` | 주요 위험요인 | 쉼표 구분 | 고객용 표현으로 정제 |
| `safety_notice`, `daily_notice` | 안전공지/오늘의 주의사항 | 장문 정제 | 과장 표현 금지 |
| `special_issue` | 특이사항 여부 | 예 / 아니오 | checkbox 또는 boolean |
| `special_issue_content` | 특이사항 내용 | 문자열 정제 | 민감정보 제거 |
| `action_status` | 조치상태 | 표준 상태로 정규화 | 즉시 조치 완료 등 |
| `uploaded_files` | 증빙 여부 | 있음 / 없음 | URL 직접 노출 금지 |
| `uploaded_files` | 증빙 수 | 파일 개수 | 숫자 |
| `created_at` | 기록 생성일시 | `YYYY-MM-DD HH:mm` | 내부 확인용 컬럼으로 선택 가능 |

### 5-1. TBM 기록 CSV 컬럼 후보

| 순서 | 고객용 컬럼 |
| --- | --- |
| 1 | 날짜 |
| 2 | 시작시간 |
| 3 | 종료시간 |
| 4 | 작업명 |
| 5 | 작업유형 |
| 6 | 작업유형(복수) |
| 7 | 주요 위험요인 |
| 8 | 안전공지/오늘의 주의사항 |
| 9 | 특이사항 여부 |
| 10 | 특이사항 내용 |
| 11 | 조치상태 |
| 12 | 증빙 여부 |
| 13 | 증빙 수 |
| 14 | 비고 |

## 6. `evidenceManifest` → 증빙목록 컬럼 매핑

| 내부 필드 후보 | 고객용 컬럼 | 변환 기준 | 비고 |
| --- | --- | --- | --- |
| `evidence_id`, generated index | 증빙번호 | `EV-YYYYMM-0001` 형식 후보 | 고객용 별도 번호 |
| `source_type` | 관련 기록 유형 | TBM / 현장참여 / 조치 / 위험성평가 | 표준값 |
| `source_title` | 관련 제목 | 작업명 또는 제보 제목 | 문자열 정제 |
| `created_at`, `source_date` | 날짜 | `YYYY-MM-DD` | KST 기준 |
| `file_name` | 파일명 | 원본 파일명 또는 정제 파일명 | 개인정보 포함 여부 확인 |
| `evidence_type` | 증빙유형 | 참석/서명, 작업 전, 작업 대상, 조치, 기타 | 후보값 |
| `file_url` | ZIP 내 경로 | 고객용 ZIP 생성 시 경로로 변환 | 원본 URL 직접 노출 금지 |
| `included_in_zip` | ZIP 포함 여부 | 예 / 아니오 | v1에서는 후보 |
| `note` | 비고 | 필요한 경우만 | 내부 디버그 제외 |

### 6-1. 증빙목록 CSV 컬럼 후보

| 순서 | 고객용 컬럼 |
| --- | --- |
| 1 | 증빙번호 |
| 2 | 날짜 |
| 3 | 관련 기록 유형 |
| 4 | 관련 제목 |
| 5 | 증빙유형 |
| 6 | 파일명 |
| 7 | ZIP 내 경로 |
| 8 | ZIP 포함 여부 |
| 9 | 비고 |

## 7. `actions`, `risk_instances` 향후 매핑

### 7-1. `risk_instances` 후보

| 내부 필드 후보 | 고객용 컬럼 | 비고 |
| --- | --- | --- |
| `risk_code` | 위험요인코드 | 있으면 포함 |
| `hazard` | 위험요인명 | 필수 후보 |
| `work_category` | 작업구분 | 없으면 빈칸 |
| `risk_level_before` | 개선 전 위험도 | 고객용 표현 주의 |
| `risk_level_after_target` | 개선 후 위험도(목표) | 확정값처럼 표현 금지 |
| `control_measure` | 개선대책 | 관리적/공학적 구분 가능 |
| `owner` | 담당자 | 고객 요청 시 포함 |
| `due_date` | 개선예정일 | `YYYY-MM-DD` |
| `status` | 조치상태 | 표준 상태로 정규화 |

### 7-2. `actions` 후보

| 내부 필드 후보 | 고객용 컬럼 | 비고 |
| --- | --- | --- |
| `action_detail` | 조치내용 | 고객용 핵심 필드 |
| `status` | 조치상태 | 접수/진행/완료 등 표준화 |
| `owner` | 담당자 | 고객 요청 시 포함 |
| `due_date` | 조치기한 | 확인 필요 시 빈칸 |
| `completed_at` | 개선완료일 | `YYYY-MM-DD` |
| `memo` | 조치 메모 | 관리자 확인 메모 중심 |
| `before_photos` | 개선 전 사진 여부 | 있음/없음 |
| `after_photos` | 개선 후 사진 여부 | 있음/없음 |
| `manager_confirmed` | 관리자 확인 | 예/아니오 |
| `ceo_confirmed` | 대표 확인 | 예/아니오 |

## 8. 고객 전달용 제외 필드

고객 전달용 CSV / Excel / PDF / ZIP manifest에는 아래 필드를 포함하지 않는다.

- `raw_payload`
- `snapshot`
- `notion_properties_snapshot`
- `notion_page_id`
- `notion_url`
- `notion_page_url`
- `pageUrl`
- Supabase 내부 UUID
- 내부 row id
- service role
- API Key
- 환경변수명과 값
- 내부 라우트 경로
- owner/admin 전용 링크
- 내부 디버그 메시지
- 고객에게 불필요한 장문 원본 transcript
- 내부 에러 stack
- 브라우저 localStorage key
- 토큰 또는 토큰 유사 문자열

## 9. 고객 전달용 포함 필드

고객 전달용에는 아래 범위의 필드만 포함한다.

- 업체명
- 기간
- 날짜 또는 제출일시
- 기록유형
- 제출구분
- 제목
- 작업명
- 위치/구역
- 주요 내용 또는 내용 요약
- 위험요인
- 작업유형
- 조치상태
- 익명 여부
- 증빙 여부
- 증빙 수
- 증빙번호
- ZIP 내 경로
- 월간보고서 반영 후보 여부
- 관리자가 확인한 메모
- 비고

## 10. 날짜/상태/구분 표준화 기준

### 10-1. 날짜

| 원본 | 고객용 |
| --- | --- |
| ISO datetime | `YYYY-MM-DD HH:mm` |
| date only | `YYYY-MM-DD` |
| 빈 값 | 빈칸 |
| 판별 불가 | 확인 필요 |

### 10-2. 제출구분

| 원본 후보 | 고객용 표준 |
| --- | --- |
| `share_confirmed`, `공유확인` | 공유확인 |
| `risk_report`, `위험제보`, `위험 제보` | 위험제보 |
| `near_miss`, `아차사고` | 아차사고 |
| `improvement`, `개선제안`, `개선 제안` | 개선제안 |
| 기타 | 기타 |

### 10-3. 처리상태

| 원본 후보 | 고객용 표준 |
| --- | --- |
| 접수, received | 접수 |
| 검토중, reviewing | 검토중 |
| 조치필요, action_required | 조치필요 |
| 조치완료, done, completed | 조치완료 |
| 반려, rejected | 반려 |
| 없음/불명확 | 확인 필요 |

## 11. 내용 요약/본문 정제 기준

고객용 Export에서는 장문 원본을 그대로 노출하지 않는다.

정제 기준:

1. 개인정보, 전화번호, 토큰, 내부 링크가 있으면 제거한다.
2. 동일 문장이 반복되면 1회만 남긴다.
3. 음성 인식 오류가 명백한 경우 운영 표준 보정 사전을 적용할 수 있다.
4. 요약은 사실 기록 중심으로 작성한다.
5. 법적 판단, 면책, 처벌 회피, 보장 표현은 넣지 않는다.
6. AI가 작성한 문장은 후보 문구로만 취급하고, 고객용 최종 문구는 관리자 확인 후 사용한다.

## 12. CSV v1 구현 후보

1차 구현은 Excel보다 CSV를 우선한다.

후보 파일:

```text
01_tbm_records.csv
02_worker_share_confirmations.csv
03_worker_reports.csv
04_evidence_manifest.csv
```

CSV v1 목표:

- 고객용 컬럼 정제 로직 검증
- 제외 필드 누락 방지
- PDF / Excel 확장 전 구조 안정화
- 월간보고서 숫자와 Export 숫자 정합성 확인

## 13. Excel v1 구현 후보

CSV v1 검증 후 Excel로 확장한다.

후보 시트:

```text
01_월간요약
02_TBM기록
03_근로자공유확인
04_위험제보_아차사고_개선제안
05_조치현황
06_증빙목록
07_주의사항
```

Excel v1에서는 내부 JSON 원본 시트를 포함하지 않는다.

## 14. v1에서 하지 않는 것

- 내부 JSON 고객 제공
- Notion URL 고객 제공
- Supabase UUID 고객 제공
- service role 또는 환경변수 노출
- Owner Export Panel 외부 노출
- 고객용 Excel에 raw payload 시트 포함
- AI가 조치 완료를 확정한 것처럼 표시
- 위험성평가 대행 결과처럼 표시
- 법적 적합성 또는 면책 보장 표현

## 15. 후속 작업

1. Customer CSV Export v1
2. Evidence Manifest CSV v1
3. Customer Excel Export v1
4. 월간보고서 PDF 데이터 연결
5. 증빙 ZIP v2
6. Export 이력 로그
7. RLS / 권한 정교화
8. DB-level idempotency
9. action_history
10. 고객 전달용 파일명 규칙 정리

## 16. 금지 표현

고객 전달용 Export, PDF, Excel, CSV, ZIP 안내문에서는 아래 표현을 사용하지 않는다.

- 법적 면책 보장
- 처벌 방지
- 과태료 방지
- 중대재해 면책
- 무재해 보장
- KOSHA 인정 보장
- 위험성평가 대행
- 안전관리대행
- AI가 조치완료를 확정
- AI가 법적 이행을 완료 처리
- 사고 시 문제없음
- 대표 책임 제거
- 법적 리스크 제거

권장 표현:

- 안전보건 관리·조치·확인 과정을 기록으로 남긴다.
- 월간 운영기록을 고객 확인용 자료로 정리한다.
- 현장 입력, 관리자 확인, 대표 확인 흐름을 구분해 기록한다.
- AI는 후보 제안자이며 최종 판단과 책임은 관리자와 사업주에게 있다.
