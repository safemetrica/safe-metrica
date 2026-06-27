# Document Studio Origin and Core Lock v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 제품정의
- Target customer: 특정 고객 아님
- Product axis: Document Studio Local Edition
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection

## 2. Origin

Document Studio는 처음부터 지게차 Pack으로 시작한 제품이 아니다.

출발점은 한국그린환경 반복 행정·실무 문서를 편하게 만들기 위해 개발한 WasteManager 로컬 Windows 앱이다.

WasteManager는 기존 Excel, HWPX, PDF 기반 업무 양식을 보존하면서 사용자가 입력한 데이터를 정확히 채워 넣고, 검증하고, 보고서·청구서·대장으로 출력하는 로컬 문서자동화 구현체다.

## 3. Correct Product Hierarchy

    한국그린환경 반복문서 편의 필요
    → WasteManager Local Windows App
    → Document Studio Local Edition Core
    → WasteManager Pack
    → Forklift Work Plan Pack
    → Hoist Work Report Pack
    → Safety Document Pack

## 4. Document Studio Local Edition

Document Studio Local Edition은 SafeMetrica Vercel 앱 안의 route가 아니다.

Document Studio는 별도 제품축이다.

핵심 기능:

- 기존 Excel / HWPX / PDF 양식 보존
- 입력값 검증
- 반복 문서 자동 정리
- 보고서 / 청구서 / 작업계획서 출력
- 로컬 PC 중심 운영
- 인터넷 없이 사용 가능한 Windows 데스크탑 앱

## 5. WasteManager Baseline

WasteManager는 Document Studio Core의 첫 실사용 자산이다.

기술 구조:

- Local Windows desktop app
- PySide6 GUI
- SQLite DB
- openpyxl 기반 Excel 입출력
- HWPX 내부 XML 직접 조작
- 일부 PDF 자료의 로컬 텍스트/표 추출
- PyInstaller build
- Output executable: `dist\\WasteManager\\WasteManager.exe`

주요 파일:

- `qt_app.py`: main GUI and management windows
- `waste_manager/db.py`: SQLite schema and CRUD logic
- `waste_manager/excel_io.py`: input templates, Excel report generation/import
- `waste_manager/hwpx_io.py`: HWPX report/billing document generation
- `waste_manager/complaints.py`: complaint management and complaint ledger generation
- `waste_manager/address_rules.py`: complaint address classification rules
- `waste_manager/address_lookup.py`: address lookup helper
- `waste_manager/scale_pdf.py`: scale ticket PDF extraction
- `waste_manager/audit_report.py`: monthly/yearly audit Excel reports
- `templates/output/`: output templates
- `data/waste_manager.db`: local SQLite DB

## 6. Non-Negotiable Form Preservation Principle

Document Studio의 핵심은 새 문서를 예쁘게 다시 그리는 것이 아니다.

기존 양식을 보존하면서 데이터만 정확히 채우는 것이 핵심이다.

임의 변경 금지:

- Excel cell size
- row height
- column width
- font
- alignment
- border
- print area
- page layout
- line breaks
- HWPX `hp:t`
- HWPX `lineBreak`
- HWPX table/cell XML structure

## 7. Document Studio Core

WasteManager에서 추출할 Core 후보:

- Local project folder
- Local SQLite DB
- Import template generation
- Duplicate import prevention
- Monthly query / edit / selected delete
- Template-preserving Excel output
- Template-preserving HWPX output
- Local PDF text/table extraction
- Domain-specific validation rules
- Default settings and monthly lock
- Output folder generation
- PyInstaller build/release workflow

## 8. Pack Separation Principle

Core는 단순하게 유지한다.

Pack은 별도로 둔다.

    Document Studio Core
    → local DB / template engine / validation / output engine

    WasteManager Pack
    → 생활폐기물 / 음식물 / 재활용 / 민원 / 청구 / 실적보고

    Forklift Work Plan Pack
    → 지게차·중량물 반복작업 사전등록 / 당일 변경사항 / 작업 전 확인 / PTW Lite 후보 / DS 문서 자동정리

    Hoist Work Report Pack
    → 작업지시 / 설치·정비 / 완료보고 / 전후사진 / AS 기록 / DS 문서 자동정리

## 9. Forklift Pack Position

Forklift Work Plan Pack은 Document Studio의 출발점이 아니다.

Forklift Work Plan Pack은 Document Studio Core와 SafeMetrica 운영 원장을 연결하는 신규 Safety Pack 후보다.

후보 흐름:

    반복 지게차·중량물 작업 사전등록
    → 당일 변경사항 확인
    → 작업 전 확인·서명
    → 필요 시 PTW Lite 후보
    → 월간 운영기록 반영
    → DS 작업계획서/확인서 자동정리

BM/IP는 검토 후보로만 관리한다.
특허 가능성은 선행기술 조사와 변리사 검토가 필요하다.

## 10. Hoist Pack Position

Hoist Work Report Pack은 현대호이스트 작업지시서, 완료보고서, 설치/AS 전후사진 샘플을 받은 뒤 설계한다.

자료 없이 추측 개발하지 않는다.

## 11. SafeMetrica Boundary

SafeMetrica Core는 슬림하게 유지한다.

SafeMetrica Core 담당:

- 현장 QR
- 확인·서명
- 익명 의견
- TBM
- 관리자 검토
- 월간 운영기록

Document Studio 담당:

- 기존 양식 보존
- 입력값 검증
- 문서 자동정리
- 출력물 생성

Forklift / Hoist Pack 담당:

- 업종별 반복업무 흐름
- 작업계획서 / 확인서 / 완료보고서 후보
- SafeMetrica 원장 연결 후보
- 월간 운영기록 첨부 후보

## 12. Future Connection Rule

Document Studio v1은 다음을 직접 연결하지 않는다.

- SafeMetrica production DB
- Supabase production data
- Notion production DB
- customer login
- SafeMetrica Vercel routes

향후 연결은 evidence package 방식으로만 검토한다.

예:

- PDF / Excel / ZIP output
- Evidence Book attachment candidate
- Monthly Report appendix candidate
- Risk Assessment candidate reference
- PTW Lite review material

모든 원장 반영은 관리자 승인 후 후보로 처리한다.

## 13. AI and Legal Copy Guard

AI는 후보 제안자다.

Document Studio 또는 AI가 다음을 자동 확정하지 않는다.

- 법적 적합성
- 위험성평가 완료
- 작업허가 승인
- 안전조치 완료
- 중대재해 면책
- 무재해
- 과태료 방지

사용 가능한 표현:

- 문서 작성 지원
- 반복 입력 정리
- 확인자료 정리
- 출력물 생성
- 관리자 검토용 초안
- 운영기록 첨부 후보

## 14. Build Rule for WasteManager

WasteManager 실행파일 갱신 전에는 기존 실행 중인 `WasteManager.exe`를 확인한다.

권장 검증:

    python -m compileall .
    pytest
    .\build_exe.ps1

실행 중인 exe가 있으면 종료 후 빌드한다.

## 15. Current Decision

현재 결정:

    Document Studio = WasteManager 기반 로컬 문서자동화 Core
    WasteManager Pack = 첫 실사용 자산
    Forklift Work Plan Pack = DS와 SafeMetrica 연결 Safety Pack 후보
    Hoist Work Report Pack = 현대호이스트 자료 수령 후 설계
    SafeMetrica Core = 슬림한 운영 원장
