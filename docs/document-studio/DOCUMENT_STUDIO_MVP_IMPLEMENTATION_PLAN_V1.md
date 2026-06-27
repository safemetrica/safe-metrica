# Document Studio MVP Implementation Plan v1

## 1. Classification

- Work type: D. 별도 제품축 / MVP 구현계획 문서
- Product axis: Document Studio Local Edition
- Target customer: 특정 고객 아님
- Current status: MVP implementation planning only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes
  - Customer original sensitive documents

## 2. Current Baseline

Document Studio 방향은 유지한다.

단, WasteManager / 생폐 DS 이미지는 현재 보유한 실사용 코드 자산이 아니라 참고 컨셉과 영감이다.

따라서 Document Studio MVP는 새로 설계·구현한다.

현재 기준:

    Document Studio = 별도 로컬 Windows 문서자동화 제품축
    Waste/Life-waste DS screen = reference concept / inspiration
    Forklift Work Plan Pack = 첫 Safety Demo Pack 후보
    Hoist Work Report Pack = 현대호이스트 샘플 수령 후 설계
    SafeMetrica Bridge = evidence package 후보 방식
    Agent Assist Layer = DS 이전 단계의 자료 수집·추출·분류 보조 레이어

## 3. MVP Goal

Document Studio MVP의 목표는 다음이다.

    인터넷 없이 로컬 PC에서
    synthetic sample 또는 비식별 샘플을 입력하고
    입력값을 검증한 뒤
    기존 Excel / PDF 양식에 데이터를 채우고
    보고서 / 작업계획서 / 사진대장 후보를 출력하는
    Windows Local Document Automation prototype

MVP는 실사용 고객 데이터 없이도 시연 가능해야 한다.

## 4. Repository Decision

MVP는 SafeMetrica repo 안에 구현하지 않는다.

권장 repo:

    safemetrica-document-studio

이유:

- SafeMetrica는 Vercel 기반 산업안전 운영기록 SaaS다.
- Document Studio는 로컬 Windows 데스크탑 앱이다.
- 기술스택, 빌드, 배포, 테스트 방식이 다르다.
- DS 기능을 SafeMetrica route로 넣으면 본체가 무거워진다.
- 고객 데이터와 로컬 문서 자동화 경계를 분리해야 한다.

SafeMetrica repo에는 docs와 제품정의만 둔다.

## 5. Recommended Tech Stack

MVP 권장 기술스택:

    Python
    PySide6
    SQLite
    openpyxl
    PyInstaller

후보 역할:

- Python: business logic
- PySide6: Windows desktop GUI
- SQLite: local database
- openpyxl: Excel template import/output
- PyInstaller: Windows exe build

후순위 연구 후보:

- HWPX XML direct manipulation
- PDF text/table extraction
- OCR
- local folder watcher
- Agent Assist Layer

## 6. MVP Scope

MVP에 포함:

- Local Windows desktop app shell
- Main window
- Project folder selection
- Template folder selection
- Output folder selection
- Local SQLite DB
- Synthetic sample data
- Excel template loading
- Excel output generation
- Basic validation
- Output file list
- Report generation dialog
- Simple photo attachment folder
- No internet requirement

MVP에서 제외:

- SafeMetrica production DB connection
- Supabase connection
- Notion connection
- customer login
- real customer internal documents
- service role
- API key
- automated legal judgment
- automated risk assessment completion
- automated work permit approval
- automated safety action completion
- automatic external AI upload

## 7. First Demo Pack Decision

MVP 첫 Demo Pack은 다음 둘 중 하나로 검토한다.

### Option A. Forklift Work Plan Demo Pack

장점:

- 실제 내부문서 없이 synthetic sample로 시연 가능
- SafeMetrica와 연결 설명이 쉽다
- 작업 전 확인·서명, PTW Lite 후보, 월간 운영기록 후보와 잘 맞는다
- BM/IP 후보로 구조화 가능하다

시연 출력물 후보:

- 지게차 작업계획서 Excel/PDF
- 작업 전 확인서
- 당일 변경사항 확인서
- 사진대장
- 월간 작업 운영요약 후보

### Option B. Waste Document Demo Pack

장점:

- 생폐 DS reference concept와 연결된다
- 반복 월별 문서 정리 흐름 설명이 쉽다
- Excel/PDF 기반 demo에 적합하다

주의:

- 실제 한국그린환경 내부문서라고 표현하지 않는다
- 실제 고객 프로그램을 재현한다고 표현하지 않는다
- synthetic sample 기반 demo로만 만든다

### Current Recommendation

MVP 첫 구현은 Forklift Work Plan Demo Pack을 우선 검토한다.

이유:

- 실제 내부문서 없이 진행 가능하다.
- 산업안전 SaaS인 SafeMetrica와 연결성이 높다.
- 시연 흐름이 명확하다.
- 고객 민감문서 의존도가 낮다.
- 향후 PTW Lite / 월간 운영기록 / Evidence Package 연결 설명이 쉽다.

Waste Document Demo Pack은 두 번째 demo 후보로 둔다.

## 8. MVP User Flow

기본 사용자 흐름:

    1. 프로그램 실행
    2. 새 프로젝트 생성
    3. Pack 선택
    4. 기준월 또는 작업일 선택
    5. 입력자료 작성 또는 sample import
    6. 입력값 검증
    7. 보고서 생성 팝업 열기
    8. 출력물 생성
    9. output folder에서 파일 확인
    10. evidence package 후보로 정리

## 9. MVP Screen Candidate

### Main Window

구성 후보:

- 상단 메뉴
  - 보고서
  - 조회
  - 설정
  - 도움말

- 빠른 실행 버튼
  - 새 프로젝트
  - 샘플 데이터 불러오기
  - 빠른 입력
  - 보고서 생성
  - 출력 폴더 열기
  - 템플릿 폴더 열기

- 기준 정보 영역
  - Pack
  - 기준월
  - 작업일
  - 프로젝트명
  - 사업장명

- 자료 조회 영역
  - 입력자료 목록
  - 검증 상태
  - 수정
  - 선택 삭제

- 출력파일 목록
  - 파일명
  - 생성일시
  - 파일형식
  - 열기

### Report Dialog

보고서 생성 팝업 후보:

- 작업계획서 생성
- 작업 전 확인서 생성
- 사진대장 생성
- 월간 요약 후보 생성
- ZIP evidence package 생성 후보

## 10. MVP Folder Structure

권장 로컬 구조:

    DocumentStudioProjects/
      forklift-demo/
        2026-06-sample-site/
          input/
          photos/
          output/
          templates/
          staging/
          project.json
          document_studio.db

후보 파일:

- project.json
- document_studio.db
- templates/forklift_work_plan_basic_v1.xlsx
- output/forklift_work_plan_2026-06_sample_site.xlsx
- output/forklift_photo_ledger_2026-06_sample_site.xlsx
- output/evidence_package_2026-06_sample_site.zip

## 11. MVP Local DB Candidate

SQLite 후보 테이블:

- projects
- pack_settings
- templates
- work_profiles
- daily_work_checks
- validation_results
- photo_items
- output_files
- audit_logs

### projects

후보 필드:

- id
- project_name
- pack_name
- company_alias
- site_name
- base_month
- project_folder
- template_folder
- output_folder
- created_at
- updated_at

### work_profiles

후보 필드:

- id
- project_id
- profile_name
- work_type
- work_area
- equipment_type
- regular_route
- load_type
- expected_load_weight
- pedestrian_overlap
- blind_spot
- external_worker_involved
- active_status

### daily_work_checks

후보 필드:

- id
- project_id
- work_profile_id
- work_date
- actual_operator
- actual_signal_person
- actual_load_weight
- route_changed
- route_change_note
- additional_risk_note
- manager_note
- confirmation_status

### validation_results

후보 필드:

- id
- project_id
- target_table
- target_record_id
- validation_type
- validation_status
- validation_message
- created_at

### output_files

후보 필드:

- id
- project_id
- output_type
- file_path
- file_name
- created_at
- note

## 12. MVP Validation Rules

v1 검증 후보:

- 필수값 누락
- 날짜 형식
- 기준월 불일치
- 중복 작업일
- 작업 프로필 누락
- 작업자 누락
- 사진 누락
- 출력 템플릿 없음
- output folder 없음
- 파일명 중복
- Excel template sheet 없음

고객 화면 표현:

- 입력값을 다시 확인해 주세요.
- 같은 작업일 자료가 이미 있습니다.
- 출력 템플릿을 찾을 수 없습니다.
- 사진 파일이 누락되어 확인이 필요합니다.
- 출력 폴더를 확인해 주세요.

피해야 할 표현:

- schema mismatch
- raw payload
- API error
- internal exception
- service role
- production DB
- stack trace

## 13. MVP Template Strategy

v1은 Excel template부터 시작한다.

우선순위:

    1. Excel output
    2. PDF export candidate
    3. ZIP evidence package
    4. HWPX research candidate

HWPX는 v1에서 바로 구현하지 않는다.
HWPX는 XML 구조 보존 난이도가 높으므로 별도 research task로 분리한다.

Excel 원칙:

- cell size 보존
- row height 보존
- column width 보존
- merged cells 보존
- font 보존
- border 보존
- print area 보존
- number format 보존
- formula 보존
- dropdown 보존 여부 확인

## 14. Synthetic Sample Rule

MVP는 synthetic sample을 기본으로 한다.

샘플 회사명 후보:

- 샘플제조
- 샘플물류
- 샘플호이스트
- 샘플환경

샘플 데이터 원칙:

- 실제 고객명 사용 금지
- 실제 개인정보 사용 금지
- 실제 차량번호 전체 사용 금지
- 실제 계약금액 사용 금지
- 실제 사고정보 사용 금지
- 실제 서명 이미지 사용 금지

샘플 표기:

    이 자료는 기능 시연용 가상 샘플입니다.
    실제 고객 데이터가 아닙니다.

## 15. SafeMetrica Bridge Scope

MVP에서 SafeMetrica와 직접 연결하지 않는다.

허용 후보:

- output PDF
- output Excel
- ZIP evidence package
- Monthly Report appendix candidate
- Evidence Book attachment candidate
- PTW Lite review material candidate

금지:

- SafeMetrica production DB 직접쓰기
- Supabase production 직접쓰기
- Notion production 직접쓰기
- customer login
- service role
- production DB direct write
- finalized monthly report 처리
- 작업허가 승인
- 조치완료 확정

## 16. Agent Assist Scope

MVP에서는 Agent Assist Layer를 구현하지 않는다.

단, 향후 연결을 고려해 폴더 구조와 Staging Inbox 개념만 열어둔다.

MVP에서 가능한 수준:

- local staging folder
- manual sample import
- manual reviewed import

후순위:

- OCR
- browser automation
- email attachment collection
- Hermes / external agent integration
- RAG classification
- automated folder watcher

## 17. Build Plan

초기 개발 단계에서는 exe build보다 기능 검증이 우선이다.

개발 검증 후보:

    python -m compileall .
    pytest

빌드 후보:

    pyinstaller
    build_exe.ps1

빌드 결과 후보:

    dist\DocumentStudio\DocumentStudio.exe

주의:

    build_exe.ps1은 실제 코드 repo가 생긴 뒤 작성한다.
    기존 실행 중인 exe 확인 규칙은 실제 exe build 단계에서 적용한다.

## 18. MVP Milestones

### Milestone 1. Repo Skeleton

- 별도 repo 생성
- src 구조 생성
- PySide6 실행 확인
- SQLite DB 생성 확인
- sample project folder 생성

### Milestone 2. Basic GUI

- main window
- top menu
- quick action buttons
- project info panel
- output file list

### Milestone 3. Sample Data

- synthetic forklift sample
- work profile
- daily check
- photo placeholder
- validation sample

### Milestone 4. Excel Output

- Excel template load
- cell value mapping
- output file save
- output list refresh

### Milestone 5. Validation

- required field check
- duplicate check
- date check
- template missing check

### Milestone 6. Evidence Package Candidate

- output folder grouping
- photos folder
- zip candidate
- README note

### Milestone 7. Demo Review

- local run
- sample output
- copy guard review
- next Pack decision

## 19. MVP Success Criteria

MVP 성공 기준:

- 인터넷 없이 실행된다.
- synthetic sample로 동작한다.
- local SQLite에 저장된다.
- Excel template에 데이터를 채운다.
- 출력파일이 output folder에 생성된다.
- 출력파일 목록에 표시된다.
- 필수값 누락을 막는다.
- SafeMetrica production과 연결하지 않는다.
- 고객 민감정보가 없다.
- 법적 자동확정 표현이 없다.

## 20. Current Decision

현재 결정:

    Document Studio MVP는 별도 repo에서 새로 만든다.
    SafeMetrica repo에는 제품정의 docs만 둔다.
    기술스택은 Python + PySide6 + SQLite + openpyxl 우선이다.
    MVP는 synthetic sample 기반으로 시작한다.
    첫 demo 후보는 Forklift Work Plan Demo Pack이다.
    Waste Document Demo Pack은 두 번째 후보로 둔다.
    HWPX는 v1 구현이 아니라 research candidate로 둔다.
    SafeMetrica 연결은 evidence package 후보 방식으로만 검토한다.
