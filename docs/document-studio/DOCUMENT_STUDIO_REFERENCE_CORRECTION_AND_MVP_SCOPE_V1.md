# Document Studio Reference Correction and MVP Scope v1

## 1. Classification

- Work type: D. 별도 제품축 / 정정 문서 / MVP 범위 정의
- Product axis: Document Studio Local Edition
- Target customer: 반복 행정·실무 문서를 작성하는 여러 업종 고객
- Current status: Correction and MVP scope document
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Correction Summary

이 문서는 Document Studio 관련 기존 문서에서 과하게 표현된 부분을 정정한다.

정정 대상:

    WasteManager / 생폐 DS 화면을
    현재 보유 중인 실제 코드·실행파일·운영 자산처럼 단정한 표현

정확한 기준:

    WasteManager / 생폐 DS 화면은 Document Studio Local Edition의 참고 컨셉이다.
    현재 보유한 실사용 코드나 실행파일로 단정하지 않는다.
    Document Studio는 이 참고 컨셉에서 영감을 받아 새로 설계·구현할 별도 제품축이다.

## 3. What Does Not Change

제품 방향 자체는 바뀌지 않는다.

유지되는 기준:

    Document Studio는 SafeMetrica Vercel route가 아니다.
    Document Studio는 별도 로컬 Windows 문서자동화 제품군이다.
    기존 Excel / HWPX / PDF 양식 보존이 핵심이다.
    SafeMetrica와 직접 DB 연결하지 않는다.
    연결은 PDF / Excel / HWPX / ZIP evidence package 후보 방식으로 검토한다.
    AI와 Agent는 후보 제안자이며 최종 확정자는 관리자와 사업주다.

## 4. Correct Interpretation

기존 계층을 다음과 같이 정정한다.

기존 과한 표현:

    WasteManager는 이미 작동 중인 첫 실사용 자산이다.
    WasteManager Pack 안정화가 1순위다.
    현재 로컬 앱 기준으로 compileall / pytest / build_exe.ps1을 돌린다.

정정된 표현:

    WasteManager / 생폐 DS는 Document Studio Local Edition의 참고 컨셉이다.
    현재 확보된 코드나 실행파일이 있다고 단정하지 않는다.
    Document Studio MVP는 새로 설계·구현해야 한다.
    WasteManager Pack은 첫 reference workflow 후보로 본다.
    build / compileall / pytest / build_exe.ps1은 실제 repo와 코드가 확보된 뒤 적용한다.

## 5. Reference Source Position

생폐 DS 참고 화면에서 얻은 아이디어:

- 로컬 PC 저장형 GUI
- 상단 메뉴
- 빠른 실행 버튼
- 기준월 조회
- 월별 자료 관리
- 보고서 생성 팝업
- 출력파일 목록
- 로컬 DB / output / template 경로 표시
- Excel / HWPX / PDF 출력물 중심 업무흐름

이 아이디어는 유효하다.

다만 현재 기준에서는 다음처럼 표현한다.

    Reference concept
    Inspiration
    Baseline workflow idea
    MVP design reference

다음처럼 표현하지 않는다.

    현재 보유 중인 실행 프로그램
    이미 운영 중인 제품
    확보된 코드베이스
    실사용 배포 자산

## 6. MVP Direction

Document Studio MVP는 기존 코드를 전제로 하지 않고 새로 만든다.

MVP 목표:

    인터넷 없이 로컬 PC에서
    반복 업무자료를 입력·검증하고
    기존 Excel / HWPX / PDF 양식을 최대한 보존하여
    보고서 / 청구서 / 작업계획서 / 사진대장 출력 후보를 만드는
    Windows Local Document Automation prototype

## 7. MVP Product Boundary

MVP에 포함:

- Local Windows app concept
- PySide6 GUI candidate
- SQLite local DB candidate
- local project folder
- local template folder
- local output folder
- Excel template preservation using openpyxl
- simple PDF text/table extraction candidate
- HWPX XML mapping research candidate
- report generation dialog
- output file list
- sample data only
- redacted/synthetic data only

MVP에서 제외:

- SafeMetrica production DB connection
- Supabase production data connection
- Notion production DB connection
- customer login
- SafeMetrica Vercel route
- service role
- customer original sensitive data
- automatic legal judgment
- automatic risk assessment completion
- automatic work permit approval
- automatic safety action completion

## 8. Sample Acquisition Reality

실제 업체 내부문서를 받지 못할 수 있다.

따라서 Document Studio MVP는 내부문서 원본 제공을 전제로 하지 않는다.

샘플 수집 우선순위:

    1. 빈 양식
    2. 비식별 작성 예시
    3. 화면 캡처
    4. 항목 리스트
    5. 작성 순서 인터뷰
    6. 공개 제출양식
    7. 합성 샘플
    8. 사용자가 직접 만든 가짜 샘플

받지 않아도 되는 것:

- 기존 프로그램 소스코드
- 기존 프로그램 DB
- 고객 개인정보 원본
- 계약금액
- 단가
- 계좌번호
- 서명 이미지
- 내부 담당자 연락처
- 로그인 정보
- 포털 계정
- API Key
- 환경변수
- service role

## 9. Safe Sample Request Strategy

업체에 요청할 때는 코드나 내부 시스템을 요구하지 않는다.

요청 문구 기준:

    소스코드는 필요 없습니다.
    내부 시스템 접근도 필요 없습니다.
    실제 업무에서 쓰는 양식의 구조와 반복 작성 흐름만 알고 싶습니다.
    민감정보는 모두 지우고 주셔도 됩니다.
    빈 양식이나 비식별 예시 1~2개만 있어도 됩니다.
    목적은 양식을 바꾸는 것이 아니라 반복 입력과 출력 정리를 줄일 수 있는지 검토하는 것입니다.

## 10. If Real Forms Are Not Provided

실제 양식을 못 받으면 다음 방식으로 진행한다.

### Option A. Interview-Based Model

담당자에게 문서 작성 순서만 듣고 필드 구조를 만든다.

수집 항목:

- 문서명
- 누가 작성하는지
- 언제 작성하는지
- 어떤 자료를 보고 입력하는지
- 매번 바뀌는 값
- 고정값
- 자주 틀리는 값
- 최종 출력물
- 제출 또는 보관 위치

### Option B. Screenshot-Based Model

양식 전체 파일을 받지 못하면 화면 일부 또는 인쇄물 사진만 참고한다.

주의:

- 개인정보와 금액은 가린다.
- 사진만으로 실제 양식 구현을 확정하지 않는다.
- 레이아웃 후보만 만든다.

### Option C. Public Form Model

공개 양식이나 일반 양식을 참고해 prototype을 만든다.

주의:

- 실제 고객 양식이라고 표현하지 않는다.
- 공개 샘플 기반 demo라고 표시한다.

### Option D. Synthetic Sample Model

가상의 회사명과 샘플 데이터로 prototype을 만든다.

사용 예:

- 샘플환경
- 샘플제조
- 샘플물류
- 샘플호이스트

## 11. MVP Candidate 1 — Waste Document Demo Pack

기존 WasteManager 실사용 코드가 없더라도 생폐 문서 자동화 demo는 만들 수 있다.

MVP 후보:

    Waste Document Demo Pack

목표:

- 빈 Excel template
- 샘플 월별 입력자료
- 샘플 PDF 텍스트 추출 후보
- 월별 집계
- 보고서 생성 팝업
- 출력파일 목록
- local output folder

주의:

    실제 한국그린환경 문서라고 표현하지 않는다.
    실제 고객 내부문서를 사용하지 않는다.
    샘플/가상 데이터 기반 demo로 만든다.

## 12. MVP Candidate 2 — Forklift Work Plan Demo Pack

Forklift Work Plan Pack은 실제 내부문서 없이도 demo 가능성이 높다.

이유:

- 작업계획서 구조를 샘플로 만들 수 있다.
- 반복 작업 프로필과 당일 변경사항 구조가 명확하다.
- SafeMetrica 현장 QR / 작업 전 확인 / PTW Lite 후보와 설명 연결이 쉽다.
- 민감한 내부문서가 없어도 synthetic sample로 시연 가능하다.

MVP 후보:

- 반복 지게차 작업 프로필
- 당일 변경사항
- Safety Priority
- 작업 전 확인서
- 사진대장
- PDF output sample

## 13. MVP Candidate 3 — Hoist Work Report Demo Pack

Hoist Work Report Pack은 현대호이스트 샘플 수령 후 설계하는 것이 원칙이다.

다만 샘플이 늦어질 경우 synthetic demo는 가능하다.

주의:

    실제 현대호이스트 양식이라고 표현하지 않는다.
    현대호이스트 전용 Pack으로 확정하지 않는다.
    샘플 수령 전에는 demo / concept 수준으로만 둔다.

## 14. Updated Pack Priority

기존 “WasteManager 안정화” 표현을 정정한다.

정정 전:

    1. WasteManager Pack 안정화
    2. Forklift Work Plan Pack
    3. Hoist Work Report Pack

정정 후:

    1. Document Studio MVP Scope 확정
    2. Template Preservation Checklist 작성
    3. Synthetic Sample Pack 준비
    4. Forklift Work Plan Demo Pack 검토
    5. 생폐/Waste Demo Pack 검토
    6. Hyundai Hoist는 실제 샘플 수령 후 Requirements 작성

## 15. Next Work Candidates

다음 작업 후보:

### A. Document Studio MVP Implementation Plan v1

실제 코드 구현 전 MVP 범위, repo 구조, 기술스택, 화면흐름, 샘플데이터 기준 정리.

### B. Document Studio Template Preservation Checklist v1

Excel / HWPX / PDF 양식 보존 검수표 작성.

### C. Synthetic Sample Pack v1

실제 내부문서 없이 사용할 샘플 회사, 샘플 양식, 샘플 데이터 정의.

### D. Forklift Work Plan Demo Pack MVP v1

내부문서 없이도 구현 가능한 첫 DS demo pack 후보.

### E. Waste Document Demo Pack MVP v1

생폐 DS 참고 컨셉을 실제 고객문서 없이 샘플 기반으로 구현하는 후보.

## 16. Development Rule

실제 코드 구현 전 확인할 것:

- DS는 별도 repo로 둘지 결정
- SafeMetrica repo에는 docs만 둘지 결정
- local-only MVP인지 확인
- 고객 원본자료 사용 여부 확인
- synthetic sample 사용 여부 확인
- Excel/HWPX/PDF 중 v1 우선순위 결정
- Windows exe build는 후순위
- Supabase/Notion 연결 금지 확인

## 17. Copy Guard

금지 표현:

- 이미 WasteManager가 실사용 자산으로 확보됨
- 한국그린환경 실제 내부문서 기반
- 기존 고객 프로그램을 그대로 확장
- 고객 내부 시스템 연동 완료
- 모든 문서 자동 완성
- 법적 제출자료 자동 확정
- 위험성평가 자동 완료
- 작업허가 자동 승인
- 안전조치 자동 완료
- 중대재해 면책
- 과태료 방지 보장
- 무재해 보장

사용 가능한 표현:

- 참고 컨셉
- 샘플 기반 prototype
- 반복 문서 정리 지원
- 기존 양식 보존
- 입력값 검증
- 출력물 생성 후보
- 관리자 검토 후보
- evidence package 후보
- 로컬 PC 기반 문서 자동정리

## 18. Current Decision

현재 결정:

    Document Studio 방향은 유지한다.
    그러나 WasteManager / 생폐 DS를 현재 보유한 실사용 코드 자산으로 단정하지 않는다.
    생폐 DS 이미지는 참고 컨셉과 영감으로 본다.
    Document Studio MVP는 새로 설계·구현해야 한다.
    실제 업체 내부문서를 못 받을 수 있으므로 synthetic sample과 비식별 샘플 전략을 기본으로 둔다.
    SafeMetrica와의 연결은 evidence package 후보 방식으로만 검토한다.
