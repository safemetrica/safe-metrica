# Document Studio Core UI and Report Pattern v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 제품정의
- Product axis: Document Studio Local Edition
- Target customer: Document Studio 전체 Pack
- Current status: Core UI/report pattern only
- Reference implementation: WasteManager Local Edition
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Purpose

Document Studio Core UI and Report Pattern v1은 WasteManager에서 이미 구현된 로컬 문서 자동정리 흐름을 Document Studio 전체 Pack의 공통 UI/출력 패턴으로 정리하는 문서다.

앞으로 Forklift Work Plan Pack, Hoist Work Report Pack, Food Factory / HACCP Operation Pack, Safety Binder Pack 등으로 확장하더라도 Document Studio Core는 같은 사용 흐름을 유지한다.

핵심 원칙:

    입력 / 가져오기
    → 조회 / 수정 / 삭제
    → 기준월 또는 기준기간 정리
    → 보고서 생성 팝업
    → Excel / HWPX / PDF 출력
    → 로컬 DB / output / template 경로 관리

## 3. Reference Implementation

현재 기준 화면은 WasteManager Local Edition이다.

WasteManager는 한국그린환경 반복 행정·실무 문서를 편하게 만들기 위해 개발된 로컬 Windows 앱이며, Document Studio Core의 첫 실사용 자산이다.

확인된 UI 구성:

- 상단 메뉴
  - 보고서
  - 조회
  - 설정
  - 도움말

- 빠른 실행 버튼
  - 템플릿 가져오기
  - 생활폐기물 빠른 입력
  - 계근표 PDF
  - 재활용 엑셀 가져오기
  - 월별 매출 관리
  - 보고서 생성

- 기준월 / 조회 영역
  - 기준 월 선택
  - 자료 유형 선택
  - 월별 조회
  - 수정
  - 선택 삭제

- 출력파일 목록
  - 생성된 파일명 표시
  - 수정일시 표시
  - output folder 기준 관리

- 로컬 경로 표시
  - local SQLite DB path
  - outputs folder path
  - templates folder path

## 4. Current WasteManager Report Dialog

WasteManager의 보고서 생성 팝업은 Pack별 출력물 버튼을 모아 제공한다.

현재 확인된 보고서 생성 항목:

- 월별/연간 통합자료 점검표 생성
- 생활폐기물 통합보고서 생성
- 생활폐기물 HWPX 청구서 생성
- 생활일반반입현황 생성
- 적환장작업일보 생성
- 음식물 실적보고 생성
- 재활용 작업일보 생성
- 재활용 전용차량 생성
- 재활용 HWPX 실적보고 생성
- 민원대장 생성

이 구조는 Document Studio Pack 확장 시에도 유지한다.

Pack이 늘어나도 사용자는 다음 방식으로 이해해야 한다.

    입력자료를 넣는다.
    기준월을 선택한다.
    필요한 보고서를 누른다.
    기존 양식이 보존된 출력물이 생성된다.

## 5. Core UI Pattern

Document Studio Core의 기본 화면 패턴은 다음을 따른다.

### Top Menu

필수 메뉴 후보:

- 보고서
- 조회
- 설정
- 도움말

Pack에 따라 추가 가능하지만, 기본 메뉴를 복잡하게 늘리지 않는다.

### Quick Action Area

자주 쓰는 기능은 상단 또는 첫 화면에 빠른 버튼으로 배치한다.

예:

- 템플릿 가져오기
- 빠른 입력
- PDF 가져오기
- Excel 가져오기
- 월별 관리
- 보고서 생성

### Filter / Query Area

관리창은 기준월 또는 기준기간 중심으로 조회한다.

필수 후보:

- 기준월
- 자료유형
- 검색어
- 구분
- 조회 버튼
- 수정 저장
- 선택 삭제

### Data Table / Record Area

로컬 DB에 저장된 자료는 표 형태로 확인한다.

필수 기능:

- 월별 조회
- 행 선택
- 수정
- 저장
- 선택 삭제
- 중복자료 확인
- 생성/수정 시각 확인

### Output Area

출력파일 목록은 사용자가 바로 확인할 수 있어야 한다.

표시 후보:

- 생성 파일명
- 생성일시 또는 수정일시
- 출력 형식
- output folder 열기
- template folder 열기

### Local Path Area

로컬 앱이므로 현재 저장 위치를 사용자가 알 수 있어야 한다.

표시 후보:

- local DB path
- outputs path
- templates path
- project folder path

단, 고객에게 불필요하게 기술적인 오류문구를 노출하지 않는다.

## 6. Report Dialog Pattern

보고서 생성은 별도 팝업 또는 전용 창으로 제공한다.

기본 구성:

- 생성 기준월
- Pack별 보고서 버튼
- 출력 성공/실패 안내
- 생성 파일 위치 안내

버튼명은 고객이 이해할 수 있는 실제 문서명으로 쓴다.

좋은 예:

- 생활폐기물 통합보고서 생성
- HWPX 청구서 생성
- 민원대장 생성
- 작업계획서 생성
- 완료보고서 생성
- 사진대장 생성

피해야 할 예:

- XML render
- raw export
- DB snapshot
- schema output
- API sync
- internal payload

## 7. Pack UI Mapping

Document Studio Core는 동일한 UI 패턴을 유지하고, Pack별 버튼과 입력창만 달라진다.

### WasteManager Pack

빠른 실행 후보:

- 생활폐기물 빠른 입력
- 계근표 PDF
- 재활용 엑셀 가져오기
- 월별 매출 관리
- 보고서 생성

보고서 후보:

- 생활폐기물 통합보고서
- 생활폐기물 HWPX 청구서
- 음식물 실적보고
- 재활용 작업일보
- 재활용 HWPX 실적보고
- 민원대장

### Forklift Work Plan Pack

빠른 실행 후보:

- 작업 프로필 등록
- 당일 작업 확인
- 사진 가져오기
- 작업 전 확인자료 정리
- 작업계획서 생성

보고서 후보:

- 지게차 작업계획서
- 작업 전 확인서
- 당일 변경사항 확인서
- 지게차 작업 사진대장
- 월간 지게차 작업 운영요약 부록

### Hoist Work Report Pack

빠른 실행 후보:

- 작업지시서 가져오기
- 완료보고 입력
- 전후사진 정리
- AS 기록 정리
- 완료보고서 생성

보고서 후보:

- 작업지시서 정리본
- 설치/정비 완료보고서
- 전후사진대장
- AS 처리보고서
- 고객 확인서

Hoist Work Report Pack은 현대호이스트 샘플 수령 후 확정한다.
자료 없이 추측 개발하지 않는다.

### Food Factory / HACCP Operation Pack

빠른 실행 후보:

- 점검표 가져오기
- 위생·안전 확인자료 입력
- 사진 정리
- 월간 운영자료 생성

보고서 후보:

- 월간 위생·안전 운영자료
- 점검표 정리본
- 사진대장
- 확인자료 부록

주의: HACCP 적합 판단 또는 인증 보장 표현은 사용하지 않는다.

## 8. Form Preservation Rule

Document Studio의 핵심은 새 문서를 예쁘게 다시 그리는 것이 아니다.

기존 양식을 보존하면서 데이터만 정확히 채운다.

임의 변경 금지:

- Excel cell size
- row height
- column width
- merged cells
- font
- alignment
- border
- fill
- print area
- page setup
- repeated title rows
- formulas
- dropdowns
- hidden sheets
- protected sheets
- HWPX XML structure
- HWPX hp:t
- HWPX lineBreak
- HWPX table/cell structure
- PDF extraction coordinates without review

Pack이 달라져도 이 원칙은 바뀌지 않는다.

## 9. Local-First Rule

Document Studio Local Edition은 인터넷 없이 로컬 PC에서 사용할 수 있어야 한다.

기본 원칙:

- local SQLite DB
- local project folder
- local template folder
- local output folder
- local import/export
- PyInstaller Windows executable

인터넷 의존 기능은 선택사항이어야 한다.

v1에서는 다음을 직접 연결하지 않는다.

- SafeMetrica production DB
- Supabase production data
- Notion production DB
- customer login
- SafeMetrica Vercel routes
- service role
- production DB direct write

## 10. Input and Import Pattern

입력 방식은 Pack별로 다를 수 있지만 Core는 같은 원칙을 따른다.

입력 후보:

- 빠른 입력
- Excel template import
- PDF extraction
- HWPX field mapping
- photo import
- manual edit
- monthly fixed value management

검증 후보:

- 필수값 누락
- 날짜 형식
- 중복 import
- 차량번호 정규화
- 금액 계산
- 톤수/수량 합계
- 누계
- 주소 자동분류
- 월별 잠금
- 출력 전 점검

## 11. Output File Pattern

출력파일은 사용자가 찾기 쉬운 이름으로 생성한다.

파일명 후보:

    {pack_name}_{document_type}_{YYYY-MM}_{site_or_company}.xlsx
    {pack_name}_{document_type}_{YYYY-MM}_{site_or_company}.hwpx
    {pack_name}_{document_type}_{YYYY-MM}_{site_or_company}.pdf
    {pack_name}_{document_type}_{YYYY-MM}_{site_or_company}.zip

출력 위치:

    DocumentStudioProjects/
      {pack}/
        {project_or_month}/
          output/

생성 후 출력파일 목록에 표시한다.

## 12. Settings Pattern

설정창은 Pack별 기본값을 관리한다.

공통 설정 후보:

- 회사명
- 사업장명
- 주소
- 대표자
- 문서번호 prefix
- 시행일자 기본값
- 보고월
- 출력 폴더
- 템플릿 폴더
- 기본 템플릿
- 월별 잠금 여부

WasteManager 특화 설정 후보:

- 생활폐기물 HWPX 기본값
- 재활용 HWPX 기본값
- 휴일 설정
- 월별 매출
- 차량 정보
- 주소 자동분류 규칙

Forklift / Hoist Pack 특화 설정은 별도 Pack에서 정의한다.

## 13. Error and User Copy Rule

고객 화면에는 기술 오류를 그대로 노출하지 않는다.

피해야 할 표현:

- SQLite schema error
- XML parse failure
- raw payload
- stack trace
- internal path exception
- API failed
- Supabase
- Notion
- service role

사용 가능한 표현:

- 입력값을 다시 확인해 주세요.
- 원본 양식 구조가 변경되어 확인이 필요합니다.
- 같은 자료가 이미 저장되어 있습니다.
- 출력 파일을 생성하지 못했습니다. 템플릿 파일을 확인해 주세요.
- 실행 중인 파일이 있어 갱신할 수 없습니다. 프로그램을 종료한 뒤 다시 시도해 주세요.

## 14. Build and Release Pattern

WasteManager 실행파일 갱신 전에는 기존 실행 중인 exe를 확인한다.

권장 검증:

    python -m compileall .
    pytest
    .\build_exe.ps1

빌드 결과 후보:

    dist\WasteManager\WasteManager.exe

빌드 전 확인:

- 기존 WasteManager.exe 실행 여부
- template folder 존재 여부
- output folder 생성 여부
- local DB migration 필요 여부
- sample import/export 테스트
- 주요 보고서 생성 테스트

## 15. SafeMetrica Bridge Pattern

Document Studio와 SafeMetrica는 v1에서 직접 연결하지 않는다.

향후 연결은 evidence package 방식으로 검토한다.

허용 후보:

- PDF output 첨부 후보
- Excel output 첨부 후보
- HWPX output 첨부 후보
- ZIP evidence package
- Monthly Report appendix
- Evidence Book attachment candidate
- PTW Lite review material

원장 반영은 관리자 승인 후 후보로 처리한다.

Document Studio 또는 AI가 자동 확정하지 않는다.

- 법적 적합성
- 위험성평가 완료
- 작업허가 승인
- 안전조치 완료
- 무재해
- 과태료 방지
- 중대재해 면책

## 16. Current Decision

현재 결정:

    WasteManager UI/report flow는 Document Studio Core의 첫 기준 참고다.
    Document Studio Pack은 서로 달라도 같은 Core UI 패턴을 따른다.
    Pack별 차이는 빠른 버튼, 입력창, 보고서 생성 버튼, 검증 규칙에서 분리한다.
    SafeMetrica Core는 현장 QR/확인/검토/월간 운영기록 중심으로 슬림하게 유지한다.
    복잡한 Excel/HWPX/PDF 양식 보존과 출력은 Document Studio가 담당한다.
