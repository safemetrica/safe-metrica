# Document Studio Staging Inbox Data Model v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 데이터모델 정의
- Product axis: Document Studio Local Edition + Agent Assist Layer
- Target customer: 반복 자료 수집과 반복 문서 정리가 많은 업체
- Current status: Data model / workflow spec only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Purpose

Staging Inbox는 Agent Assist Layer와 Document Studio Core 사이의 안전한 대기함이다.

Agent Assist Layer가 파일 수집, OCR, 표 추출, 문서 분류, 필드 매핑 후보를 만들더라도 그 결과를 바로 Document Studio DB나 SafeMetrica 원장에 저장하지 않는다.

모든 후보 자료는 먼저 Staging Inbox에 들어오고, 담당자가 확인한 뒤 Document Studio import gate를 통과해야 한다.

기본 흐름:

    Agent Assist Layer
    → Staging Inbox
    → 담당자 검토
    → Document Studio Import Gate
    → Local SQLite DB
    → Excel / HWPX / PDF / ZIP output
    → 관리자 승인 후 SafeMetrica evidence package 후보

## 3. Core Rule

Staging Inbox의 핵심 원칙:

    원본과 후보를 분리한다.
    비식별 사본을 만든다.
    Agent 추출값은 확정값이 아니다.
    담당자 검토 전 DS DB에 저장하지 않는다.
    SafeMetrica production DB에 직접 쓰지 않는다.

## 4. What Staging Inbox Stores

Staging Inbox는 다음을 저장한다.

- 원본 파일 위치
- 비식별 사본 위치
- 추출 텍스트 후보
- 추출 표 후보
- 문서 유형 분류 후보
- Pack 분류 후보
- DS 필드 매핑 후보
- 검증 필요 항목
- 담당자 검토 상태
- import 가능 여부
- reject 사유
- 출력 후보 연결 정보

Staging Inbox는 최종 원장이 아니다.
Staging Inbox는 검토 대기함이다.

## 5. Folder Structure

권장 로컬 폴더 구조:

    DocumentStudioProjects/
      staging-inbox/
        company_alias/
          YYYY-MM/
            00_original/
            01_sanitized/
            02_extracted_text/
            03_extracted_tables/
            04_classification_candidates/
            05_mapping_candidates/
            06_reviewed_for_import/
            07_rejected/
            08_imported/
            intake_log.json
            staging_index.sqlite

폴더 의미:

- `00_original`: 고객 제공 원본
- `01_sanitized`: 비식별 사본
- `02_extracted_text`: OCR/text extraction 결과 후보
- `03_extracted_tables`: table extraction 결과 후보
- `04_classification_candidates`: 문서/Pack 분류 후보
- `05_mapping_candidates`: DS 필드 매핑 후보
- `06_reviewed_for_import`: 담당자가 확인한 import 후보
- `07_rejected`: 폐기 또는 보류 자료
- `08_imported`: DS import 완료 자료

## 6. Staging Item Lifecycle

Staging item 상태값 후보:

    received
    sanitized
    extracted
    classified
    mapped
    needs_review
    reviewed
    ready_for_import
    imported
    rejected
    archived

상태 의미:

### received

파일이 수신되었지만 아직 비식별·추출 전 상태.

### sanitized

비식별 사본이 만들어진 상태.

### extracted

OCR, PDF text extraction, table extraction, metadata extraction 후보가 만들어진 상태.

### classified

문서 유형, Pack 후보, 기간, 업체, 업무흐름 분류 후보가 만들어진 상태.

### mapped

Document Studio 필드 매핑 후보가 만들어진 상태.

### needs_review

담당자 확인이 필요한 상태.

### reviewed

담당자가 후보를 확인하고 수정한 상태.

### ready_for_import

Document Studio import gate로 넘겨도 되는 상태.

### imported

Document Studio local DB에 import 완료된 상태.

### rejected

담당자가 import하지 않기로 한 상태.

### archived

검토 완료 후 보관 처리된 상태.

## 7. Local SQLite Candidate Tables

Staging Inbox는 로컬 SQLite 기준으로 설계한다.

v1 후보 테이블:

- staging_items
- staging_files
- extraction_candidates
- classification_candidates
- mapping_candidates
- review_events
- import_events
- rejection_events

Production Supabase / Notion과 직접 연결하지 않는다.

## 8. staging_items

Staging item의 기본 단위다.

후보 필드:

- id
- company_alias
- source_channel
- received_at
- received_by
- original_filename
- original_file_path
- sanitized_file_path
- document_date
- document_month
- document_type_candidate
- pack_candidate
- workflow_candidate
- status
- sensitivity_level
- requires_sanitization
- requires_human_review
- ready_for_import
- imported_at
- rejected_at
- archived_at
- note

source_channel 후보:

- local_folder
- email_attachment
- browser_download
- manual_upload
- scanner
- mobile_photo
- kakao_capture
- external_drive
- agent_collected

sensitivity_level 후보:

- low
- medium
- high
- restricted

## 9. staging_files

하나의 staging item에 여러 파일이 붙을 수 있다.

후보 필드:

- id
- staging_item_id
- file_role
- file_type
- original_file_path
- sanitized_file_path
- file_hash
- file_size
- page_count
- image_count
- created_at
- note

file_role 후보:

- original
- sanitized
- extracted_text
- extracted_table
- image
- evidence_photo
- mapping_json
- reviewed_import_file
- output_candidate

file_type 후보:

- xlsx
- xls
- hwpx
- pdf
- image
- csv
- txt
- json
- zip
- message_capture
- scanned_document

## 10. extraction_candidates

Agent/OCR가 만든 추출 후보를 저장한다.

후보 필드:

- id
- staging_item_id
- extraction_type
- extractor_name
- extracted_text_path
- extracted_table_path
- extracted_json_path
- confidence_score
- needs_review
- created_at
- note

extraction_type 후보:

- pdf_text
- pdf_table
- image_ocr
- scanned_document_ocr
- excel_parse
- hwpx_text
- metadata
- photo_metadata
- message_text

주의:

    confidence_score는 참고용이다.
    높은 점수라도 확정값이 아니다.

## 11. classification_candidates

문서와 Pack 분류 후보를 저장한다.

후보 필드:

- id
- staging_item_id
- document_type_candidate
- pack_candidate
- safemetrica_connection_level
- period_candidate
- site_candidate
- work_type_candidate
- confidence_score
- classified_by
- created_at
- note

document_type_candidate 후보:

- report
- invoice
- work_plan
- work_order
- completion_report
- inspection_sheet
- complaint_ledger
- photo_ledger
- performance_report
- vehicle_status
- route_status
- manpower_facility_equipment_status
- monthly_summary
- annual_audit
- ptw_review_material
- evidence_book_appendix

pack_candidate 후보:

- wastemanager_pack
- forklift_work_plan_pack
- hoist_work_report_pack
- food_factory_operation_pack
- safety_binder_pack
- billing_report_pack
- unknown

safemetrica_connection_level 후보:

- no_connection
- evidence_attachment_candidate
- ledger_candidate
- workflow_candidate

## 12. mapping_candidates

DS import field mapping 후보를 저장한다.

후보 필드:

- id
- staging_item_id
- target_pack
- target_template_id
- source_field_name
- target_field_name
- candidate_value
- normalized_value
- validation_status
- review_status
- reviewed_value
- reviewed_by
- reviewed_at
- note

validation_status 후보:

- unchecked
- valid
- missing_required
- format_warning
- duplicate_candidate
- calculation_mismatch
- needs_human_review
- rejected

review_status 후보:

- pending
- accepted
- edited
- rejected

## 13. review_events

담당자 검토 이력을 저장한다.

후보 필드:

- id
- staging_item_id
- reviewer_name
- review_action
- from_status
- to_status
- reviewed_at
- review_note

review_action 후보:

- mark_needs_review
- accept_classification
- edit_mapping
- approve_for_import
- reject_item
- archive_item
- request_rescan
- request_new_sample

## 14. import_events

DS import 이력을 저장한다.

후보 필드:

- id
- staging_item_id
- target_pack
- target_db_table
- imported_record_id
- imported_at
- imported_by
- import_status
- import_note

import_status 후보:

- success
- partial_success
- failed
- skipped_duplicate
- blocked_by_validation

중요:

    imported_record_id는 Document Studio local DB 기준이다.
    SafeMetrica production DB id가 아니다.

## 15. rejection_events

반려·폐기 이력을 저장한다.

후보 필드:

- id
- staging_item_id
- rejected_by
- rejected_at
- reject_reason
- reject_note

reject_reason 후보:

- duplicate
- wrong_file
- unreadable
- sensitive_original_not_sanitized
- missing_required_data
- wrong_month
- wrong_company
- template_not_supported
- not_relevant
- manual_processing_required

## 16. Import Gate Rule

Document Studio local DB에 저장되려면 import gate를 통과해야 한다.

필수 조건:

- status = ready_for_import
- requires_human_review = false 또는 review 완료
- required fields filled
- duplicate check completed
- file type supported
- template_id resolved
- validation_status not blocked
- original/sanitized file boundary checked

Import Gate가 막는 경우:

- 개인정보 비식별 미완료
- 필수값 누락
- 중복자료 의심
- 잘못된 기준월
- 대상 Pack 미정
- 양식 미지원
- 추출값 검토 미완료
- 원본 파일 훼손
- template mapping 없음

## 17. Human Review Rule

사람 검토가 필요한 경우:

- sensitivity_level = high 또는 restricted
- confidence_score 낮음
- 문서 유형 불확실
- target_pack 불확실
- 금액/톤수/수량 계산 불일치
- 날짜 형식 오류
- 사진 누락
- 작업 전/후 사진 매칭 실패
- 원본 양식 구조 변경
- 법적/안전 판단처럼 보일 수 있는 문구 포함

검토자는 후보값을 수정하거나 반려할 수 있다.

Agent가 만든 값은 검토 전 확정값이 아니다.

## 18. Privacy and Sanitization

비식별 대상:

- 실명
- 주민번호
- 휴대폰번호
- 계좌번호
- 사업자등록번호
- 상세주소
- 차량번호 전체
- 서명 이미지
- 고객 담당자 개인정보
- 계약금액
- 단가
- 사고자 정보
- 원청/하청 민감정보
- 내부 담당자 연락처

원칙:

- 원본은 `00_original`에 보관한다.
- 외부 AI에는 원본을 그대로 업로드하지 않는다.
- 외부 AI 사용 시 `01_sanitized` 사본만 사용한다.
- 로그에는 원문 개인정보를 남기지 않는다.
- 토큰/API Key/service role/Owner Token/환경변수 값은 어떤 파일에도 포함하지 않는다.

## 19. SafeMetrica Boundary

Staging Inbox는 SafeMetrica production DB에 직접 연결하지 않는다.

금지:

- Supabase production 직접쓰기
- Notion production 직접쓰기
- SafeMetrica route 내부 구현
- customer login 구현
- service role 보유
- production DB direct write
- 월간보고서 finalized 처리
- 작업허가 승인
- 조치완료 확정

허용 후보:

- DS output PDF
- DS output Excel
- DS output HWPX
- ZIP evidence package
- Monthly Report appendix candidate
- Evidence Book attachment candidate
- PTW Lite review material candidate

## 20. User-Facing Copy Rule

고객 화면에 기술어를 그대로 노출하지 않는다.

피해야 할 표현:

- raw payload
- schema mismatch
- API failed
- service role
- internal exception
- XML stack trace
- Supabase
- Notion
- production DB

사용 가능한 표현:

- 가져온 자료를 확인해 주세요.
- 같은 자료가 이미 있는지 확인이 필요합니다.
- 원본 양식 구조가 변경되어 확인이 필요합니다.
- 일부 값은 담당자 확인 후 저장할 수 있습니다.
- 사진 파일이 누락되어 확인이 필요합니다.
- 출력 전 검토가 필요한 자료입니다.

## 21. Example Workflow — WasteManager PDF

    계근표 PDF 수신
    → received
    → sanitized
    → pdf_text / pdf_table extracted
    → WasteManager Pack 후보 분류
    → 기준월 / 차량번호 / 톤수 후보 매핑
    → 담당자 검토
    → ready_for_import
    → DS local DB import
    → 생활폐기물 통합보고서 / HWPX 청구서 출력

## 22. Example Workflow — Hoist Photos

    작업 전/후 사진 수신
    → received
    → sanitized
    → photo metadata 후보 생성
    → Hoist Work Report Pack 후보 분류
    → 작업지시서와 사진 매칭 후보
    → 담당자 검토
    → ready_for_import
    → DS 완료보고서 / 전후사진대장 출력 후보

## 23. Example Workflow — Forklift Daily Change

    당일 변경사항 메모 수신
    → received
    → text extraction 후보
    → Forklift Work Plan Pack 후보 분류
    → 작업 프로필 / 동선 변경 / 외부인력 참여 후보 매핑
    → 담당자 검토
    → ready_for_import
    → DS 작업계획서 / 작업 전 확인서 출력 후보

## 24. Current Decision

현재 결정:

    Staging Inbox는 Agent Assist Layer와 Document Studio Core 사이의 검토 대기함이다.
    Agent 결과물은 확정값이 아니다.
    담당자 검토 후에만 DS import gate로 넘긴다.
    Document Studio local DB와 SafeMetrica production DB는 분리한다.
    SafeMetrica 연결은 PDF / Excel / HWPX / ZIP evidence package 후보 방식으로만 검토한다.
    AI와 Agent는 후보 제안자이며 최종 확정자는 관리자와 사업주다.
