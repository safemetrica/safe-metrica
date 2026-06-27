# Document Studio Repo Skeleton Plan v1

## 1. Classification

- Work type: D. 별도 제품축 / MVP 구현 전 repo skeleton 계획
- Product axis: Document Studio Local Edition
- Target customer: 특정 고객 아님
- Current status: Repo skeleton planning only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes
  - Customer original sensitive documents

## 2. Purpose

이 문서는 Document Studio MVP를 SafeMetrica repo 안에 구현하지 않고, 별도 repo에서 로컬 Windows 데스크탑 앱으로 시작하기 위한 skeleton 계획이다.

현재 기준:

    SafeMetrica = 산업안전 운영기록 SaaS
    Document Studio = 별도 로컬 Windows 문서자동화 제품군
    SafeMetrica repo = 제품정의 docs 중심
    Document Studio repo = 실제 로컬 앱 구현

## 3. Repo Decision

권장 repo:

    safemetrica-document-studio

이 repo는 SafeMetrica Vercel 앱과 분리한다.

분리 이유:

- SafeMetrica는 Vercel / Next.js 기반 SaaS다.
- Document Studio는 Python 기반 로컬 Windows 앱이다.
- 빌드·배포·테스트·고객 데이터 경계가 다르다.
- DS 기능을 SafeMetrica route로 넣으면 본체가 무거워진다.
- 로컬 문서 자동화와 운영 원장을 분리해야 한다.

## 4. MVP Tech Stack

MVP 우선 기술스택:

    Python
    PySide6
    SQLite
    openpyxl
    PyInstaller

역할:

- Python: business logic
- PySide6: desktop GUI
- SQLite: local database
- openpyxl: Excel template read/write
- PyInstaller: Windows executable build

후순위 후보:

- HWPX XML direct manipulation
- PDF text/table extraction
- OCR
- local folder watcher
- Agent Assist Layer
- ZIP evidence package generator

## 5. Initial Repo Structure

권장 초기 구조:

    safemetrica-document-studio/
      README.md
      pyproject.toml
      requirements.txt
      .gitignore
      src/
        document_studio/
          __init__.py
          app.py
          main_window.py
          db.py
          models.py
          validation.py
          sample_data.py
          excel_output.py
          file_paths.py
          report_dialog.py
      templates/
        forklift/
          forklift_work_plan_basic_v1.xlsx
          forklift_prework_confirmation_basic_v1.xlsx
          forklift_photo_ledger_basic_v1.xlsx
      samples/
        forklift/
          sample_daily_work_check.json
          photos/
            README.md
      tests/
        test_validation.py
        test_sample_data.py
        test_excel_output.py
      scripts/
        build_exe.ps1
        run_dev.ps1
      dist/
      output/
      data/

주의:

    dist/
    output/
    data/*.db
    실제 고객자료
    실제 출력물
    실제 사진자료
    환경변수 파일
    토큰 파일

위 항목은 git에 올리지 않는다.

## 6. Python Package Layout

패키지명 후보:

    document_studio

초기 모듈 역할:

### app.py

프로그램 entry point.

역할:

- QApplication 생성
- MainWindow 실행
- 기본 폴더 초기화

### main_window.py

메인 GUI.

역할:

- 상단 메뉴
- 빠른 실행 버튼
- 기준 정보 영역
- 입력자료 목록
- 검증 결과 표시
- 출력파일 목록

### db.py

SQLite 연결과 schema 생성.

역할:

- local DB 생성
- projects table
- work_profiles table
- daily_work_checks table
- validation_results table
- output_files table

### models.py

간단한 dataclass 또는 typed model 후보.

역할:

- Project
- WorkProfile
- DailyWorkCheck
- ValidationResult
- OutputFile

### validation.py

입력값 검증.

역할:

- 필수값 확인
- 날짜 형식 확인
- 중복 작업 확인
- 작업자 누락 확인
- 사진 누락 확인
- template 누락 확인

### sample_data.py

synthetic sample seed.

역할:

- 샘플제조 데이터 생성
- forklift work profile 생성
- daily work check 생성

### excel_output.py

openpyxl 기반 Excel 출력.

역할:

- template load
- cell mapping
- output file save
- print area / style preservation 검토

### file_paths.py

로컬 폴더 경로 관리.

역할:

- project folder
- template folder
- output folder
- data folder
- sample folder

### report_dialog.py

보고서 생성 팝업.

역할:

- 작업계획서 생성
- 작업 전 확인서 생성
- 사진대장 생성
- output file list refresh

## 7. Initial SQLite Schema Candidate

MVP 후보 테이블:

### projects

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
- created_at
- updated_at

### validation_results

- id
- project_id
- target_table
- target_record_id
- validation_type
- validation_status
- validation_message
- created_at

### output_files

- id
- project_id
- output_type
- file_path
- file_name
- created_at
- note

## 8. First GUI Scope

MVP 첫 화면 범위:

### Top Menu

- 파일
- 보고서
- 조회
- 설정
- 도움말

### Quick Actions

- 새 프로젝트
- 샘플 데이터 불러오기
- 작업계획서 생성
- 출력 폴더 열기
- 템플릿 폴더 열기

### Project Info Panel

- Pack
- 회사명
- 현장명
- 기준월
- 작업일

### Work Data Area

- 작업 프로필 목록
- 당일 작업 확인 목록
- 검증 상태

### Validation Area

- 누락값
- 주의 항목
- 출력 전 확인 항목

### Output Area

- 생성 파일명
- 생성일시
- 파일형식
- 열기 버튼 후보

## 9. First Demo Pack

첫 demo pack:

    Forklift Work Plan Demo Pack

사용 데이터:

    Synthetic Sample Pack v1
    company_alias = 샘플제조
    site_name = 샘플제조 1공장
    work_profile_id = SAMPLE-FORKLIFT-001

첫 출력 후보:

1. 지게차 작업계획서 Excel
2. 작업 전 확인서 Excel
3. 사진대장 Excel

PDF는 v1.1 후보.
HWPX는 research candidate.

## 10. Excel Template Strategy

v1은 openpyxl 기반 Excel output을 우선한다.

초기 template 후보:

- forklift_work_plan_basic_v1.xlsx
- forklift_prework_confirmation_basic_v1.xlsx
- forklift_photo_ledger_basic_v1.xlsx

원칙:

- cell size 보존
- row height 보존
- column width 보존
- merged cells 보존
- font 보존
- border 보존
- print area 보존
- number format 보존
- formulas 보존
- dropdown 보존 여부 확인

주의:

    Excel template은 DS가 새로 꾸미는 대상이 아니다.
    기존 양식 또는 샘플 양식에 값을 채우는 방식으로 간다.

## 11. Synthetic Data Rule

MVP는 synthetic sample만 사용한다.

금지:

- 실제 고객명
- 실제 개인정보
- 실제 차량번호 전체
- 실제 사업자등록번호
- 실제 계약금액
- 실제 서명 이미지
- 실제 사고정보
- 실제 내부문서
- 실제 고객 사진

표기:

    이 자료는 기능 시연용 가상 샘플입니다.
    실제 고객 데이터가 아닙니다.

## 12. SafeMetrica Boundary

Document Studio MVP는 SafeMetrica와 직접 연결하지 않는다.

금지:

- SafeMetrica production DB direct write
- Supabase production connection
- Notion production connection
- customer login
- service role
- SafeMetrica Vercel route
- finalized monthly report 처리
- PTW 승인
- 조치완료 확정

허용 후보:

- output Excel
- output PDF candidate
- ZIP evidence package candidate
- Evidence Book attachment candidate
- Monthly Report appendix candidate
- PTW Lite review material candidate

## 13. Build Strategy

초기에는 exe build보다 개발 실행과 output 검증이 우선이다.

개발 실행 후보:

    python -m document_studio.app

검증 후보:

    python -m compileall src
    pytest

Windows build 후보:

    pyinstaller
    scripts/build_exe.ps1

빌드 결과 후보:

    dist/DocumentStudio/DocumentStudio.exe

주의:

    build_exe.ps1은 skeleton 이후 작성한다.
    exe 실행 중 여부 확인은 실제 build 단계에서 적용한다.

## 14. Initial Merge Plan in New Repo

별도 repo 생성 후 예상 merge 단위:

### Merge 1. Repo skeleton

- README
- pyproject / requirements
- src 구조
- app entry point
- empty MainWindow

### Merge 2. SQLite schema

- db.py
- schema creation
- local data folder
- basic tests

### Merge 3. Synthetic sample seed

- sample_data.py
- 샘플제조 work profile
- daily work check sample
- validation sample

### Merge 4. Basic GUI

- main window layout
- quick buttons
- data display placeholder
- output list placeholder

### Merge 5. Validation

- required field validation
- date validation
- duplicate candidate validation
- user-facing messages

### Merge 6. Excel output v1

- openpyxl template load
- cell mapping
- output file save

### Merge 7. Output list / folder open

- output folder listing
- generated file display
- open folder action

### Merge 8. Sample demo polish

- demo disclaimer
- no real customer data notice
- copy guard review

### Merge 9. PyInstaller build candidate

- build script
- dist output
- Windows run smoke test

## 15. What Not To Build Yet

MVP에서 아직 만들지 않는다.

- HWPX XML mapping
- OCR
- Agent Assist automation
- browser automation
- external AI integration
- SafeMetrica upload
- Supabase sync
- Notion sync
- customer login
- real customer template import
- legal/safety decision automation

## 16. README Requirements

초기 README에 포함할 내용:

- Document Studio 소개
- Local-only MVP 설명
- synthetic sample 사용
- 실제 고객 데이터 미포함
- 설치 방법
- 실행 방법
- 테스트 방법
- build는 후순위
- SafeMetrica production 미연결
- copy guard

## 17. Security and Privacy Rule

repo에 올리지 않는 것:

- 실제 고객 문서
- 실제 고객 사진
- 개인정보
- 계약금액
- 계좌번호
- 서명 이미지
- API key
- token
- service role
- environment variable values
- local DB with real data
- output files with real data

## 18. Current Decision

현재 결정:

    Document Studio 실제 구현은 별도 repo safemetrica-document-studio에서 시작한다.
    SafeMetrica repo에는 docs만 둔다.
    MVP 기술스택은 Python + PySide6 + SQLite + openpyxl이다.
    첫 demo는 Forklift Work Plan Demo Pack synthetic sample 기준으로 한다.
    Excel output을 v1 우선순위로 둔다.
    PDF는 v1.1 후보, HWPX는 research candidate다.
    SafeMetrica와 직접 연결하지 않고 evidence package 후보 방식만 열어둔다.
