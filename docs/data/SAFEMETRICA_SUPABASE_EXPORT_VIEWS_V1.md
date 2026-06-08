# SafeMetrica Supabase Export Views v1 설계 기준

- 기준일: 2026-06-08
- 문서 성격: read-only export view 설계 기준 문서
- 대상: 업체별·기간별 Supabase Export, 월간보고서 근거, 증빙 패키지 생성 기준
- 참고 문서:
  - `docs/data/SAFEMETRICA_SUPABASE_LEDGER_CURRENT_STATE.md`
  - `docs/data/SAFEMETRICA_SUPABASE_EXPORT_SPEC_V1.md`
  - `docs/data/SAFEMETRICA_SUPABASE_LEDGER_SCHEMA_V1.md`
  - `docs/product/SAFEMETRICA_FEATURE_TRUTH_INVENTORY.md`

## 1. 목적

이 문서는 업체별·기간별 Supabase Export를 구현하기 전에 read-only view 설계 기준을 정의한다.

Export API와 관리자/Owner Export 버튼이 어떤 데이터 구조를 읽어야 하는지 기준을 잠그는 것이 목적이다.

이 문서는 설계 문서이며 실제 SQL view, SQL migration, DB 변경, API 구현, 관리자 화면 변경은 포함하지 않는다.

## 2. 기본 원칙

- Supabase를 업체별 안전운영 원장 기준으로 본다.
- Notion은 보조 링크와 운영허브로 유지한다.
- Export는 서버 사이드에서 수행한다.
- 전체 고객사 무제한 export는 금지한다.
- `company_key`, `startDate`, `endDate`, `role` 필터를 기본으로 한다.
- service role은 client에 노출하지 않는다.
- Export는 백업, 월간보고서 근거, 증빙 패키지 생성을 위한 기능이다.
- 법적 면책 또는 보장 표현을 사용하지 않는다.

## 3. `company_key` 정규화

Supabase 제출 원장별 업체 식별 필드는 서로 다르므로 export view에서는 공통 필드인 `company_key`로 정규화한다.

| 원본 테이블 또는 기준 | 원본 필드 | export 기준 필드 | 비고 |
| --- | --- | --- | --- |
| `field_participation_submissions` | `tenant_code` | `company_key` | 현장참여 제출 원장의 업체코드 |
| `tbm_voice_submissions` | `company_code` | `company_key` | TBM 음성 제출 원장의 업체코드 |
| `companies.id`가 있는 테이블 | `company_id` | `company_id`와 연결 후 `company_key` 노출 | 업체 기준정보와 조인 후보 |

`company_key`는 업체별 백업, 월간보고서, 증빙 export의 기본 필터다.

## 4. 권장 read-only view 후보

v1에서 권장하는 read-only export view 후보는 다음과 같다.

| View 후보 | 목적 | v1 상태 |
| --- | --- | --- |
| `v_operational_ledger` | TBM, 현장참여, 위험성평가, 조치, 증빙을 하나의 원장 형태로 조회 | 설계 기준만 정의 |
| `v_field_participation_export` | 공유확인, 위험제보, 아차사고, 개선제안 export | 설계 기준만 정의 |
| `v_tbm_voice_export` | TBM 음성작성, 텍스트 변환, 사진첨부, 작업유형, 특이사항 export | 설계 기준만 정의 |
| `v_risk_action_export` | 위험성평가 항목, 개선조치, 조치상태, 담당자, 기한 export | 설계 기준만 정의 |
| `v_evidence_manifest` | TBM 사진, 위험제보 사진, 조치사진, `evidence_items` manifest 통합 | 설계 기준만 정의 |
| `v_company_monthly_activity` | 업체별 월간 활동 요약 | 설계 기준만 정의 |
| `v_worker_participation_summary` | 근로자 참여와 위험성평가 공유확인 흐름 요약 | 설계 기준만 정의 |
| `v_action_status_history_candidate` | 향후 조치상태 변경 이력 view 또는 table 기준 | 설계 기준만 정의 |

## 5. `v_operational_ledger` 설계

### 5.1 목적

`v_operational_ledger`는 TBM, 현장참여, 위험성평가, 조치, 증빙을 하나의 원장 형태로 조회하는 통합 view 후보다.

v1에서는 실제 `UNION` SQL을 작성하지 않고 설계 기준만 문서화한다.

### 5.2 포함 후보

- `field_participation_submissions`
- `tbm_voice_submissions`
- `actions`
- `evidence_items`
- `risk_instances`

### 5.3 컬럼 후보

| 컬럼 | 설명 |
| --- | --- |
| `ledger_id` | 통합 원장 row 식별자 후보 |
| `company_key` | export 공통 업체 필터 |
| `company_id` | `companies` 기준정보 연결 후보 |
| `company_name` | 업체명 |
| `site_id` | 현장 식별자 |
| `source_table` | 원본 테이블명 |
| `source_id` | 원본 row 식별자 |
| `event_type` | TBM, 공유확인, 위험제보, 조치, 증빙 등 이벤트 유형 |
| `actor_role` | 제출자 또는 처리자 역할 |
| `actor_name` | 제출자 또는 처리자 이름 |
| `submitted_anonymously` | 익명 제출 여부 |
| `title` | 제목 후보 |
| `content` | 본문 또는 상세 내용 |
| `location` | 위치 또는 장소 |
| `status` | 원본 또는 정규화 상태 |
| `event_date` | 이벤트 기준일 |
| `created_at` | 생성일시 |
| `updated_at` | 수정일시 |
| `notion_page_id` | Notion page 식별자 |
| `notion_url` | Notion 보조 링크 |
| `has_files` | 첨부파일 존재 여부 |
| `evidence_count` | 증빙 수 후보 |
| `monthly_report_candidate` | 월간보고서 포함 후보 여부 |
| `client_submission_id` | 클라이언트 제출 멱등성 식별자 후보 |

## 6. `v_field_participation_export` 설계

### 6.1 목적

`v_field_participation_export`는 근로자 공유확인, 위험제보, 아차사고, 개선제안 export를 위한 view 후보다.

### 6.2 기본 필터

- `company_key`
- `startDate`
- `endDate`
- `submission_type`
- `status`

### 6.3 컬럼 후보

| 컬럼 | 설명 |
| --- | --- |
| `id` | 제출 row 식별자 |
| `company_key` | `tenant_code` 정규화 값 |
| `company_name` | 업체명 |
| `submission_type` | 정규화 제출 유형 |
| `legacy_type` | 기존 유형값 보존 후보 |
| `title` | 제출 제목 |
| `content` | 제출 내용 |
| `location` | 현장 또는 위치 |
| `submitter` | 제출자명 |
| `anonymous` | 익명 제출 여부 |
| `status` | 제출 상태 |
| `reported_date` | 보고 또는 발생 기준일 |
| `created_at` | 생성일시 |
| `file_urls` | 첨부파일 URL 목록 |
| `notion_page_id` | Notion page 식별자 |
| `notion_url` | Notion 보조 링크 |
| `clientSubmissionId` | 클라이언트 제출 멱등성 식별자 후보 |
| `raw_payload` | 원본 payload 보존값 |

### 6.4 주의사항

- 공유확인은 `file_urls`가 없을 수 있다.
- 위험제보와 조치사진은 `file_urls` 기준으로 `v_evidence_manifest`와 연결해야 한다.
- `#357` 이후 `clientSubmissionId`가 `raw_payload`에 저장될 수 있다.

## 7. `v_tbm_voice_export` 설계

### 7.1 목적

`v_tbm_voice_export`는 TBM 음성작성, 텍스트 변환, 사진첨부, 작업유형, 특이사항 export를 위한 view 후보다.

### 7.2 기본 필터

- `company_key`
- `startDate`
- `endDate`
- `work_type`
- `has_special_issue`

### 7.3 컬럼 후보

| 컬럼 | 설명 |
| --- | --- |
| `id` | TBM 제출 row 식별자 |
| `company_key` | `company_code` 정규화 값 |
| `company_name` | 업체명 |
| `date_value` | TBM 기준일 |
| `start_time` | 작업 시작 시각 |
| `end_time` | 작업 종료 시각 |
| `voice_intent` | 음성작성 의도 후보 |
| `title` | TBM 제목 |
| `transcript` | 음성 텍스트 변환 결과 |
| `draft_text` | 초안 텍스트 |
| `main_text` | 본문 텍스트 |
| `normalized_text` | 정규화 텍스트 |
| `supervisor_name` | 관리자 또는 담당자명 |
| `work_type` | 단일 작업유형 후보 |
| `work_types` | 복수 작업유형 후보 |
| `work_tags` | 작업 태그 |
| `risk_tags` | 위험 태그 |
| `safety_notice` | 안전 공지 또는 유의사항 |
| `has_special_issue` | 특이사항 존재 여부 |
| `special_issue_content` | 특이사항 내용 |
| `action_status` | 조치 상태 후보 |
| `uploaded_file_count` | 첨부파일 수 |
| `uploaded_files` | 첨부파일 목록 |
| `notion_page_id` | Notion page 식별자 |
| `notion_page_url` | Notion 보조 링크 |
| `snapshot` | 제출 시점 snapshot |
| `created_at` | 생성일시 |

## 8. `v_risk_action_export` 설계

### 8.1 목적

`v_risk_action_export`는 위험성평가 항목, 개선조치, 조치상태, 담당자, 기한을 export하기 위한 view 후보다.

### 8.2 포함 후보

- `risk_instances`
- `actions`
- `sites`
- `companies`

### 8.3 컬럼 후보

| 컬럼 | 설명 |
| --- | --- |
| `company_key` | export 공통 업체 필터 |
| `company_id` | 업체 식별자 |
| `company_name` | 업체명 |
| `site_id` | 현장 식별자 |
| `site_name` | 현장명 |
| `risk_id` | 위험성평가 항목 식별자 |
| `hazard` | 위험요인 |
| `work_type` | 작업유형 |
| `process_name` | 공정명 |
| `location_detail` | 세부 위치 |
| `current_control` | 현재 관리대책 |
| `frequency` | 빈도 |
| `severity` | 강도 |
| `risk_score` | 위험도 점수 |
| `is_sif` | 중대위험 후보 여부 |
| `risk_level` | 위험등급 |
| `risk_status` | 위험성평가 상태 |
| `action_id` | 조치 식별자 |
| `action_type` | 조치 유형 |
| `action_detail` | 조치 상세 |
| `owner_name` | 담당자명 |
| `due_date` | 조치 기한 |
| `completed_at` | 조치 완료일시 |
| `action_status` | 조치 상태 |

## 9. `v_evidence_manifest` 설계

### 9.1 목적

`v_evidence_manifest`는 TBM 사진, 위험제보 사진, 조치사진, `evidence_items`를 export manifest로 통합하기 위한 view 후보다.

### 9.2 포함 후보

- `field_participation_submissions.file_urls`
- `tbm_voice_submissions.uploaded_files`
- `evidence_items.file_url`

### 9.3 컬럼 후보

| 컬럼 | 설명 |
| --- | --- |
| `evidence_id` | 증빙 식별자 후보 |
| `company_key` | export 공통 업체 필터 |
| `company_name` | 업체명 |
| `source_table` | 원본 테이블명 |
| `source_id` | 원본 row 식별자 |
| `event_type` | 증빙이 연결된 이벤트 유형 |
| `evidence_type` | TBM 사진, 위험제보 사진, 조치사진 등 증빙 유형 |
| `file_url` | 파일 URL |
| `file_name` | 파일명 후보 |
| `file_type` | 파일 MIME 또는 확장자 후보 |
| `created_at` | 생성일시 |
| `verified` | 검증 여부 후보 |
| `verified_by` | 검증자 후보 |
| `verified_at` | 검증일시 후보 |
| `notion_url` | Notion 보조 링크 |
| `export_included` | export 포함 여부 후보 |

### 9.4 주의사항

- 실제 파일 다운로드 포함 ZIP은 v2로 분리한다.
- v1은 URL manifest 중심으로 본다.
- Blob cleanup 정책은 별도 문서에서 다룬다.

## 10. `v_company_monthly_activity` 설계

### 10.1 목적

`v_company_monthly_activity`는 월간보고서와 Export API가 참조할 업체별 월간 활동 요약 view 후보다.

### 10.2 기본 필터

- `company_key`
- `month`
- `startDate`
- `endDate`

### 10.3 집계 후보

| 집계 후보 | 설명 |
| --- | --- |
| TBM 건수 | 기간 내 TBM 제출 수 |
| 공유확인 건수 | 기간 내 공유확인 제출 수 |
| 위험제보 건수 | 기간 내 위험제보 제출 수 |
| 아차사고 건수 | 기간 내 아차사고 제출 수 |
| 개선제안 건수 | 기간 내 개선제안 제출 수 |
| 조치필요 건수 | 기간 내 조치필요 상태 수 |
| 조치완료 건수 | 기간 내 조치완료 상태 수 |
| 첨부파일 건수 | 기간 내 첨부파일 수 |
| 미확인자 또는 미조치 후보 수 | 후속 확인이 필요한 후보 수 |
| 월간보고서 후보 수 | 월간보고서 포함 후보 수 |

## 11. `v_worker_participation_summary` 설계

### 11.1 목적

`v_worker_participation_summary`는 근로자 참여와 위험성평가 공유확인 흐름을 요약하기 위한 view 후보다.

### 11.2 집계 후보

| 집계 후보 | 설명 |
| --- | --- |
| 공유확인 완료 수 | 근로자 공유확인 완료 건수 |
| 위험제보 수 | 근로자 위험제보 건수 |
| 아차사고 수 | 근로자 아차사고 건수 |
| 개선제안 수 | 근로자 개선제안 건수 |
| 익명 제출 수 | 익명으로 제출된 건수 |
| 첨부파일 포함 제출 수 | 첨부파일이 있는 제출 건수 |
| 제출자 기준 참여 수 | 제출자별 참여 집계 후보 |
| 미확인자 후보 | 공유확인 미완료 후보 |

## 12. `v_action_status_history_candidate` 설계

### 12.1 목적

현재 `action_history` 테이블이 없으므로, 향후 조치상태 변경 이력 view 또는 table 설계 기준을 잡는다.

v1에서는 실제 history 기능을 만들지 않는다.

### 12.2 기록 후보

| 기록 후보 | 설명 |
| --- | --- |
| `action_id` | 조치 식별자 |
| `related_source_id` | 관련 원본 식별자 |
| `previous_status` | 이전 상태 |
| `next_status` | 변경 후 상태 |
| `changed_by` | 변경자 |
| `changed_at` | 변경일시 |
| `action_memo` | 조치 또는 상태 변경 메모 |
| `evidence_url` | 상태 변경 관련 증빙 URL |
| `company_key` | export 공통 업체 필터 |
| `site_id` | 현장 식별자 |

## 13. Export API가 사용할 기본 필터

Export API v1 후보가 사용할 기본 필터는 다음과 같다.

| 필터 | 설명 |
| --- | --- |
| `company_key` | 업체별 export 필수 필터 |
| `startDate` | 기간 시작일 |
| `endDate` | 기간 종료일 |
| `event_type` | 이벤트 유형 |
| `status` | 상태 |
| `role` | 요청자 역할 |
| `includeEvidence` | 증빙 manifest 포함 여부 |
| `includeNotionLinks` | Notion 보조 링크 포함 여부 |
| `format` | export 형식 |

`format` 후보는 다음과 같다.

- `csv`
- `json`
- `xlsx`: v2 후보
- `zip`: v2 후보

## 14. 권한 기준

- `worker`는 export 불가.
- `manager`는 자기 회사 또는 자기 현장 범위만 export 가능하도록 향후 제한.
- `ceo`는 자기 회사 요약 및 보고서 범위 export 가능.
- `owner`는 내부 운영자 권한으로 전체 고객사를 관리하되, export 시 반드시 `company_key`를 지정해야 함.
- service role은 서버에서만 사용.
- client에 전체 원장 조회 권한을 주지 않는다.

## 15. 테스트 데이터 및 cleanup 기준

- 한국그린환경 위험제보 “차고지 동선분리” 중복 제출 18건 이슈는 `#357`로 1차 방어 완료.
- 테스트 데이터 총 19건은 `cleanup_backup_field_participation_20260608`에 백업 후 원본 삭제 완료.
- export view는 운영 데이터와 테스트 데이터 구분 기준을 고려해야 한다.
- cleanup 로그 또는 backup table은 별도 관리한다.

## 16. v1에서 하지 않는 것

v1 문서화 범위에서 하지 않는 작업은 다음과 같다.

- SQL view 생성
- migration 생성
- Export API 생성
- 관리자 화면 버튼 생성
- 파일 ZIP 다운로드
- Blob 파일 삭제
- RLS 정책 변경
- 기존 DB 구조 변경

## 17. 권장 후속 작업

1. Export Views v1 문서 확정
2. SQL view 초안 작성 문서
3. read-only Export API v1 구현
4. Owner/Admin Export 버튼 구현
5. `evidence_manifest` CSV 다운로드
6. 월간보고서와 export 연결
7. RLS/권한 정책 점검
8. Blob cleanup 정책 설계

## 18. 금지 표현

다음 표현은 export view, Export API, 관리자 화면, 월간보고서, 영업자료에서 기능 설명 또는 결과 설명으로 사용하지 않는다.

- 법적 면책
- 처벌 방지
- 과태료 방지
- 중대재해 면책
- 무재해 보장
- KOSHA 인정 보장
- 위험성평가 대행
- AI가 법적 판단 확정
- 법적 증빙 완료
