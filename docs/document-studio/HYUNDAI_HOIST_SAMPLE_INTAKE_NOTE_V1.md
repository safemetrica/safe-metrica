# Hyundai Hoist Sample Intake Note v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 제품정의
- Product axis: Document Studio Local Edition + Hoist Work Report Pack candidate
- Target customer: Hyundai Hoist sample intake
- Current status: Sample request / intake note only
- Not a final product spec
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Purpose

이 문서는 현대호이스트 자료를 받기 전에 어떤 샘플이 필요한지, 받은 자료를 어떻게 분류할지, 어떤 부분을 아직 확정하지 않을지 정리하는 intake note다.

현대호이스트는 Document Studio 전체 기준이 아니다.

현대호이스트는 Document Studio Sample Intake Protocol을 검증하는 첫 적용 사례 중 하나이며, Hoist Work Report Pack 후보를 구체화하기 위한 샘플 수령 대상이다.

## 3. Current Position

현재 구조:

    Document Studio Local Edition
    → 기존 Excel / HWPX / PDF 양식 보존
    → 입력값 검증
    → 반복 문서 자동정리
    → 보고서 / 청구서 / 작업계획서 / 완료보고서 출력

    Hoist Work Report Pack candidate
    → 작업지시서
    → 설치 / 정비 / AS 기록
    → 전후사진
    → 완료보고서
    → 고객 확인서
    → DS 문서 자동정리
    → SafeMetrica 운영기록 첨부 후보

## 4. Key Rule

자료 없이 추측 개발하지 않는다.

현대호이스트 샘플을 받은 뒤에만 Hoist Work Report Pack Spec을 확정한다.

이 문서는 다음을 확정하지 않는다.

- 최종 DB schema
- 최종 UI
- 최종 보고서 양식
- SafeMetrica route
- Supabase 연동
- Notion 연동
- 고객 로그인
- 작업허가 승인 로직
- 법적 판단 로직

## 5. Sample Request List

현대호이스트에 요청할 샘플 자료는 다음과 같다.

### Required Samples

1. 작업지시서 빈 양식
2. 작업지시서 작성 완료 예시
3. 설치 / 정비 / AS 완료보고서 빈 양식
4. 설치 / 정비 / AS 완료보고서 작성 완료 예시
5. 작업 전 사진 예시
6. 작업 후 사진 예시
7. 고객 확인서 또는 인수확인서 양식
8. 작업자 또는 외주 작업자 확인 흐름 예시
9. 현장에서 실제로 쓰는 카톡 / 문자 / 수기 메모 예시
10. 최종 제출 또는 보관용 출력물 예시

### Optional Samples

1. 견적서 / 거래명세서 / 청구서 양식
2. 장비 목록 또는 호이스트 모델 목록
3. 설치 위치 기록 예시
4. AS 접수 내역 예시
5. 부품 교체 내역 예시
6. 사진 정리 방식 예시
7. 월말 정산 또는 월간 보고 방식
8. 담당자별 업무 흐름 설명
9. 자주 발생하는 오류 사례
10. 자동화하면 안 되는 항목

## 6. Privacy Rule for Samples

외부 공유 또는 AI 검토용 샘플은 비식별 사본으로 받는다.

비식별 대상:

- 실명
- 휴대폰번호
- 계좌번호
- 주민번호
- 사업자등록번호
- 상세 주소
- 차량번호 전체
- 고객사 내부 단가
- 계약금액
- 원청 / 하청 민감정보
- 사고자 정보
- 서명 이미지
- 고객 담당자 개인정보

원본 샘플은 외부 도구에 그대로 업로드하지 않는다.

## 7. Workflow to Understand

현대호이스트 업무 흐름은 다음 순서로 확인한다.

    고객 요청 / AS 접수
    → 일정 배정
    → 작업지시서 작성
    → 작업자 / 외주 / 기사 배정
    → 현장 방문
    → 작업 전 사진
    → 설치 / 정비 / AS 작업
    → 작업 후 사진
    → 완료보고서 작성
    → 고객 확인
    → 청구 / 정산 / 내부 보관
    → 월간 정리

위 흐름은 가설이다.
실제 샘플과 담당자 설명을 받은 뒤 수정한다.

## 8. Document Type Classification

받은 자료는 다음 문서 유형으로 분류한다.

- 작업지시서
- 완료보고서
- AS 처리보고서
- 설치보고서
- 정비보고서
- 고객 확인서
- 사진대장
- 부품 교체 내역
- 견적서
- 거래명세서
- 청구서
- 월간 작업현황
- 외주 / 일당 정산자료
- 내부 관리대장

## 9. File Type Classification

샘플 파일 형식은 다음으로 분류한다.

- Excel
- HWPX
- PDF
- Image
- Word
- CSV
- Text
- KakaoTalk / message capture
- scanned document
- mixed evidence package

## 10. Form Preservation Review

현대호이스트 양식도 Document Studio 원칙을 따른다.

기존 양식을 보존하면서 데이터만 정확히 채운다.

### Excel Review

- cell size
- row height
- column width
- merged cells
- font
- alignment
- border
- fill
- print area
- page setup
- formulas
- dropdowns
- hidden sheets
- protected sheets

### HWPX Review

- XML structure
- hp:t
- lineBreak
- table structure
- cell structure
- paragraph structure
- document numbering
- 시행일자
- 금액 / 한글금액
- fixed labels
- placeholder locations

### PDF / Image Review

- text extraction 가능 여부
- table extraction 가능 여부
- scanned image 여부
- OCR 필요 여부
- 좌표 기반 추출 필요 여부
- 사진 압축 / 정렬 기준

## 11. Data Mapping Candidate

샘플에서 추출할 수 있는 후보 필드다.
실제 샘플 확인 전까지 확정하지 않는다.

### Project / Case

- case_id
- request_date
- customer_name
- site_name
- site_address
- request_type
- work_category
- scheduled_date
- completion_date
- manager_name
- worker_name
- subcontractor_name

### Equipment

- equipment_type
- hoist_type
- crane_type
- model_name
- serial_number
- capacity
- installation_location
- issue_description
- repair_description
- parts_used

### Work

- work_before_note
- work_after_note
- safety_note
- customer_request_note
- manager_review_note
- completion_status
- additional_work_required
- follow_up_required

### Evidence

- before_photo
- during_photo
- after_photo
- defect_photo
- parts_photo
- customer_confirmation_photo

### Document

- document_no
- issue_date
- report_month
- invoice_status
- output_file_path
- template_id

## 12. Validation Candidate

현대호이스트 Pack 후보의 검증 항목이다.

- 필수값 누락 확인
- 작업일자 / 완료일자 형식 확인
- 고객명 / 현장명 누락 확인
- 장비 종류 누락 확인
- 사진 누락 확인
- 완료보고서 중복 생성 확인
- 작업 전 / 작업 후 사진 짝 확인
- AS 접수 건과 완료보고서 매칭
- 부품 교체 내역 누락 확인
- 월별 작업현황 합계 확인
- 청구 대상 / 비청구 대상 구분 확인

## 13. Output Candidate

Document Studio에서 생성할 출력물 후보:

1. 작업지시서 정리본
2. 설치 / 정비 완료보고서
3. AS 처리보고서
4. 전후사진대장
5. 고객 확인서
6. 부품 교체 내역서
7. 월간 작업현황표
8. 청구 첨부용 작업내역서
9. ZIP evidence package

출력 형식 후보:

- PDF
- Excel
- HWPX
- ZIP evidence package

v1은 실제 양식 확인 후 PDF / Excel / HWPX 우선순위를 정한다.

## 14. SafeMetrica Connection Candidate

현대호이스트 자료는 Document Studio에서 먼저 정리한다.

SafeMetrica 연결은 추후 후보로만 검토한다.

### No Connection

로컬 DS 문서 자동정리로만 처리한다.

### Evidence Attachment Candidate

PDF / Excel / ZIP 출력물을 SafeMetrica Evidence Book 또는 월간보고서 부록 후보로 첨부한다.

### Ledger Candidate

SafeMetrica 운영 원장에는 일부 메타데이터만 반영할 수 있다.

후보:

- 작업일자
- 작업유형
- 장비유형
- 현장명
- 완료 여부
- 사진 첨부 여부
- 관리자 검토 상태
- 후속 조치 필요 여부

### Workflow Candidate

SafeMetrica Core flow와 연결 가능성 검토:

- 현장 QR
- 작업 전 확인
- 작업자 확인·서명
- 관리자 검토
- PTW Lite 후보
- 월간 운영기록
- 대표 / 관리자 브리핑 후보

## 15. Data Boundary

Document Studio v1에서는 다음을 금지한다.

- SafeMetrica production DB 직접 연결
- Supabase production data 직접 연결
- Notion production DB 직접 연결
- customer login 구현
- SafeMetrica Vercel route 내부 구현
- service role 보유
- 고객 데이터 자동 sync
- production DB 직접쓰기

허용 후보:

- 로컬 SQLite 저장
- 로컬 JSON project 저장
- 로컬 template folder
- 로컬 output folder
- PDF / Excel / HWPX / ZIP output
- 관리자가 검토 후 첨부하는 evidence package

## 16. Interview Questions

현대호이스트 담당자에게 확인할 질문:

1. 작업지시서는 누가 작성하나요?
2. 작업지시서는 언제 작성하나요?
3. 작업 완료보고서는 누가 작성하나요?
4. 작업 전후 사진은 누가 찍고 어디에 보관하나요?
5. 사진은 보고서에 반드시 들어가야 하나요?
6. 고객 확인 또는 서명 절차가 있나요?
7. AS 접수와 완료보고서는 어떤 기준으로 연결하나요?
8. 부품 교체 내역은 따로 관리하나요?
9. 외주 / 일당 / 기사 작업자는 어떻게 구분하나요?
10. 월말에 다시 합산하는 자료가 있나요?
11. 청구서나 거래명세서와 연결되나요?
12. 기존 양식에서 절대 바꾸면 안 되는 부분은 무엇인가요?
13. 자주 틀리는 입력값은 무엇인가요?
14. 자동화하면 좋은 부분은 무엇인가요?
15. 자동화하면 안 되는 부분은 무엇인가요?

## 17. Pack Decision Rule

현대호이스트 샘플 수령 후 다음 중 하나로 분류한다.

### A. Hoist Work Report Pack

작업지시서, 완료보고서, 전후사진, AS 기록이 중심이면 Hoist Work Report Pack으로 간다.

### B. Safety Binder Pack

점검표, 사진대장, 교육자료, 안전문서 묶음이 중심이면 Safety Binder Pack으로 분류한다.

### C. Billing / Report Pack

청구서, 거래명세서, 월간 작업현황, 정산자료가 중심이면 Billing / Report Pack 후보로 분류한다.

### D. SafeMetrica Workflow Candidate

작업 전 확인, 현장 QR, 관리자 승인, PTW Lite 후보가 중심이면 SafeMetrica Workflow Candidate로 분류한다.

단, 처음부터 SafeMetrica route로 구현하지 않는다.

## 18. Copy Guard

금지 표현:

- 법적 효력 보장
- 중대재해 면책
- 과태료 방지 보장
- 무재해 보장
- 위험성평가 대행
- 안전관리대행
- 작업허가 자동 승인
- AI 법적 판단
- 안전조치 자동 확정

사용 가능한 표현:

- 작업지시서 정리 지원
- 완료보고서 작성 지원
- 사진대장 정리
- 확인자료 정리
- 관리자 검토 후보
- PTW Lite 검토 후보
- 월간 운영기록 첨부 후보
- 문서 결과물 정리
- evidence package 후보

## 19. Current Decision

현재 결정:

    현대호이스트는 Document Studio 전체 기준이 아니다.
    현대호이스트는 Sample Intake Protocol을 적용하는 첫 검증 사례다.
    Hoist Work Report Pack은 샘플 수령 후 설계한다.
    자료 없이 추측 개발하지 않는다.
    SafeMetrica Core는 슬림하게 유지한다.
    복잡한 문서 출력과 양식 보존은 Document Studio가 담당한다.
