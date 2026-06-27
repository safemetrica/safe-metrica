# Document Studio Sample Intake Protocol v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 제품정의
- Product axis: Document Studio Local Edition
- Target customer: 여러 업체 샘플 전체
- Current status: Sample intake protocol only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Purpose

Document Studio는 여러 업체의 반복 행정·실무 문서를 수집, 분류, 검증, 자동정리, 출력물 생성으로 확장하는 별도 로컬 문서자동화 제품축이다.

앞으로 한국그린환경, 현대호이스트, 지게차 작업계획서, 식품공장, 폐기물, 제조업, 물류업 등 여러 업체 샘플을 받을 수 있다.

따라서 특정 업체 문서를 전체 기준으로 삼지 않고, 모든 샘플을 같은 방식으로 접수·분류·검토하기 위한 공통 intake protocol을 먼저 둔다.

## 3. Key Decision

현대호이스트는 첫 적용 사례 또는 첫 검증 샘플이 될 수 있다.

그러나 현대호이스트 작업지시서/완료보고서 구조를 Document Studio 전체 기준으로 확정하지 않는다.

현재 기준:

    Common first:
    Document Studio Sample Intake Protocol

    Then case-specific:
    Hyundai Hoist Sample Intake
    Forklift Work Plan Pack
    WasteManager Pack
    Food Factory / HACCP Operation Pack
    Safety Binder Pack

## 4. Why Not Hyundai Hoist First

현대호이스트는 작업지시서, 설치·정비, 완료보고서, AS, 전후사진, 외주/일당 관리 중심의 좋은 Pack 후보이다.

그러나 모든 업체 문서가 작업지시/완료보고 구조로 흘러가지는 않는다.

현대호이스트를 전체 기준으로 삼으면 다음 문제가 생긴다.

- 청구서, 실적보고, 민원대장, 점검표가 작업지시 구조로 억지 분류될 수 있다.
- WasteManager의 Excel/HWPX/PDF 양식 보존 원칙이 약해질 수 있다.
- 업체별 특수 흐름이 Document Studio Core에 섞일 수 있다.
- Pack과 Core 경계가 흐려질 수 있다.
- 고객별 커스터마이징이 기본값처럼 커질 수 있다.

## 5. Sample Intake Unit

샘플은 문서 1개 단위로만 보지 않는다.

아래 단위로 묶어 받는다.

- 업무 흐름
- 원본 양식
- 입력 원천
- 반복 입력값
- 검증 규칙
- 출력물
- 첨부 증빙
- 월간/연간 정리 방식
- SafeMetrica 연결 가능성

## 6. Sample Request Checklist

업체에서 샘플을 받을 때 요청할 자료:

### Required

- 실제 사용하는 원본 양식
- 빈 양식
- 작성 완료 예시
- 월별 또는 회차별 반복 작성 예시
- 입력에 사용하는 원본 자료
- 최종 제출 또는 보관 출력물
- 사진 또는 첨부자료 예시
- 수기/카톡/문자/엑셀 등 실제 전달 방식 설명

### Optional

- 기존 작성 매뉴얼
- 담당자별 작성 순서
- 검토/승인 흐름
- 자주 발생하는 오류
- 자주 바뀌는 값
- 고정값 목록
- 자동화하면 좋은 부분
- 자동화하면 안 되는 부분

## 7. File Type Classification

샘플 파일은 다음 형식으로 분류한다.

- Excel
- HWPX
- PDF
- Image
- Word
- CSV
- Text
- KakaoTalk / message capture
- Scanned document
- Mixed evidence package

## 8. Document Type Classification

문서 유형 후보:

- 보고서
- 청구서
- 작업계획서
- 작업지시서
- 완료보고서
- 점검표
- 민원대장
- 사진대장
- 실적보고
- 차량/장비 현황
- 노선현황
- 인력/시설/장비 현황
- 월간 운영요약
- 연간 점검자료
- PTW 검토자료
- Evidence Book appendix

## 9. Form Preservation Review

Document Studio의 핵심은 기존 양식을 새로 꾸미는 것이 아니다.

기존 양식을 최대한 보존하면서 데이터만 정확히 채운다.

샘플 검토 시 반드시 확인한다.

### Excel

- cell size
- row height
- column width
- merged cells
- font
- alignment
- border
- fill
- number format
- print area
- page setup
- repeated title rows
- formulas
- dropdowns
- hidden sheets
- protected sheets

### HWPX

- XML structure
- hp:t
- lineBreak
- table structure
- cell structure
- paragraph structure
- document numbering
- 시행일자
- 금액/한글금액
- 누계값
- fixed labels
- placeholder locations

### PDF

- text extraction 가능 여부
- table extraction 가능 여부
- scanned image 여부
- OCR 필요 여부
- 반복 양식 여부
- 좌표 기반 추출 필요 여부

## 10. Data Mapping Review

각 샘플은 다음 값으로 나눈다.

### Fixed Values

- 회사명
- 사업장명
- 주소
- 사업자등록번호
- 대표자
- 담당부서
- 고정 문구
- 고정 계좌
- 고정 문서번호 prefix

### Monthly Values

- 보고월
- 시행일자
- 월별 실적
- 월별 합계
- 월별 매출
- 월별 운행 차량
- 월별 작업일수
- 월별 누계

### Daily / Case Values

- 작업일자
- 작업장소
- 작업자
- 차량번호
- 장비번호
- 처리량
- 중량
- 민원내용
- 작업내용
- 완료내용
- 사진
- 특이사항

### Derived Values

- 합계
- 누계
- 한글금액
- 작업일수
- 휴일 반영 값
- 차량번호 전체번호 변환
- 주소 구역 자동분류
- 중복 여부
- 기간별 통계

## 11. Validation Rule Review

샘플별 검증 후보:

- 날짜 형식 검증
- 월 범위 검증
- 중복 import 방지
- 차량번호 4자리 → 전체번호 정규화
- 금액 계산 검증
- 톤수/수량 합계 검증
- 누계 계산 검증
- 필수값 누락 검증
- 사진 누락 검증
- 작업자/기사 이력 검증
- 휴일/작업일수 반영
- 주소 자동분류
- 문서번호 중복 확인

## 12. Output Classification

출력물 후보:

- PDF
- Excel
- HWPX
- ZIP evidence package
- 월간 보고서
- 연간 점검자료
- 고객 제출용 문서
- 내부 검토용 문서
- SafeMetrica 첨부 후보

## 13. Pack Candidate Classification

샘플은 다음 Pack 후보로 분류한다.

### WasteManager Pack

- 생활폐기물
- 음식물
- 재활용
- 민원
- 청구
- 실적보고
- 계근표 PDF
- 월간/연간 점검자료

### Forklift Work Plan Pack

- 지게차 작업계획서
- 중량물 반복작업
- 당일 변경사항 확인
- 작업 전 확인·서명
- PTW Lite 검토 후보
- 작업계획서/확인서 출력

### Hoist Work Report Pack

- 작업지시서
- 설치/정비 기록
- AS 기록
- 완료보고서
- 전후사진
- 외주/일당/기사 확인
- 고객 확인서

### Food Factory / HACCP Operation Pack

- 식품공장 운영문서
- 점검표
- 위생·안전 확인자료
- HACCP 관련 운영항목 정리

주의: HACCP 적합 판단 또는 인증 보장 표현은 사용하지 않는다.

### Safety Binder Pack

- 안전보건 문서 묶음
- 점검표
- 교육자료
- 사진대장
- 월간 안전운영 부록
- Evidence Book appendix

## 14. SafeMetrica Connection Review

샘플마다 SafeMetrica 연결 가능성을 다음 단계로 분류한다.

### No Connection

Document Studio 로컬 문서자동화로만 처리한다.

### Evidence Attachment Candidate

PDF / Excel / ZIP 출력물을 SafeMetrica Evidence Book 또는 월간보고서 부록 후보로 첨부할 수 있다.

### Ledger Candidate

SafeMetrica 운영 원장에 일부 메타데이터만 반영할 수 있다.

예:

- 작업일자
- 작업유형
- 확인 여부
- 관리자 검토 상태
- 첨부문서 존재 여부

### Workflow Candidate

SafeMetrica Core flow와 연결할 수 있다.

예:

- 현장 QR
- 확인·서명
- 익명 의견
- TBM
- PTW Lite 후보
- 관리자 검토
- 월간 운영기록

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

## 16. Privacy and Sanitization

외부 공유 또는 AI 검토용 샘플은 비식별 처리한다.

비식별 대상:

- 실명
- 주민번호
- 휴대폰번호
- 계좌번호
- 사업자등록번호
- 주소 상세
- 차량번호 전체
- 고객사 내부 단가
- 계약금액
- 원청/하청 민감정보
- 사고자 정보
- 서명 이미지

내부 보관 원칙:

- 원본 샘플은 외부 도구에 그대로 업로드하지 않는다.
- 필요한 경우 비식별 사본을 만든다.
- 토큰, API Key, 환경변수, service role, Owner Token은 어떤 샘플에도 포함하지 않는다.

## 17. Sample Folder Structure

샘플 보관 구조 후보:

    document-studio-samples/
      company_code_or_alias/
        00_intake_note/
        01_original_forms/
        02_filled_examples/
        03_input_sources/
        04_evidence_photos/
        05_output_targets/
        06_mapping_notes/
        07_validation_rules/
        08_pack_decision/

각 업체별로 원본과 비식별 사본을 구분한다.

    original/
    sanitized/

## 18. Intake Note Template

업체별 intake note 필수 항목:

- company_alias
- industry
- sample_received_date
- document_owner
- main_pain_point
- repeated_workflow
- document_types
- input_sources
- output_targets
- preservation_risk
- validation_needs
- pack_candidate
- safemetrica_connection_level
- next_action

## 19. Review Questions

샘플을 받은 뒤 담당자에게 확인할 질문:

1. 이 문서는 누가 작성하는가?
2. 언제 작성하는가?
3. 어떤 자료를 보고 입력하는가?
4. 매번 바뀌는 값은 무엇인가?
5. 항상 고정되는 값은 무엇인가?
6. 가장 자주 틀리는 부분은 무엇인가?
7. 출력 후 어디에 제출하거나 보관하는가?
8. 기존 양식에서 절대 바꾸면 안 되는 부분은 무엇인가?
9. 사진이나 PDF 같은 첨부자료가 필요한가?
10. 월말 또는 연말에 다시 합산하는가?
11. 관리자가 검토하거나 승인하는 단계가 있는가?
12. SafeMetrica 운영기록과 연결하면 좋은 지점이 있는가?

## 20. First Application Rule

현대호이스트는 첫 적용 사례로 사용할 수 있다.

단, 다음 순서를 지킨다.

    Document Studio Sample Intake Protocol
    → Hyundai Hoist Sample Intake Note
    → Hoist Work Report Pack Requirements
    → Hoist Work Report Pack Spec

현대호이스트 샘플을 받기 전에는 Hoist Pack을 완성 spec으로 확정하지 않는다.

## 21. Current Decision

현재 결정:

    Document Studio는 여러 업체 샘플을 받을 수 있는 공통 intake protocol을 먼저 둔다.
    현대호이스트는 첫 검증 사례일 수 있지만 전체 기준은 아니다.
    WasteManager는 Document Studio의 첫 실사용 자산이다.
    Forklift Work Plan Pack은 DS와 SafeMetrica 연결 Safety Pack 후보다.
    Hoist Work Report Pack은 현대호이스트 샘플 수령 후 설계한다.
    SafeMetrica Core는 슬림하게 유지한다.
