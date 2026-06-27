# Document Studio Business Model v1

## 1. Classification

- Work type: D. 별도 제품축 / 사업화 문서
- Product axis: Document Studio Local Edition
- Target customer: 반복 행정·실무 문서를 매월 작성하는 중소 사업장
- Current status: Business model draft
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Product Position

Document Studio는 SafeMetrica 본체의 기능이 아니다.

Document Studio는 별도 제품축이다.

한 줄 정의:

    기존 Excel / HWPX / PDF 양식을 최대한 보존하면서
    로컬 PC에서 입력값을 검증하고
    반복 문서와 보고서·청구서·작업계획서·사진대장을 자동 정리하는
    Windows Local Document Automation 제품군

SafeMetrica와의 관계:

    SafeMetrica = 산업안전 운영기록 SaaS / 운영 원장
    Document Studio = 로컬 문서 자동정리 / 출력물 생성
    Pack = 업종별 반복업무 자동화
    Bridge = DS 출력물을 SafeMetrica Evidence Book / Monthly Report / PTW Lite 검토자료 후보로 연결

## 3. Origin

Document Studio의 출발 자산은 WasteManager Local Edition이다.

WasteManager는 한국그린환경 반복 행정·실무 문서를 편하게 만들기 위해 개발된 로컬 Windows 앱이다.

출발점:

    한국그린환경 반복문서 편의 필요
    → WasteManager Local Windows App
    → Document Studio Local Edition Core
    → WasteManager Pack
    → Forklift Work Plan Pack
    → Hoist Work Report Pack
    → Safety Document Pack

Forklift Work Plan Pack과 Hoist Work Report Pack은 Document Studio의 출발점이 아니라, Document Studio Core를 산업안전·제조·설비 현장으로 확장하는 신규 Pack 후보다.

## 4. Customer Pain

대상 고객은 반복 문서를 매월, 매주, 매일 작성하지만 기존 양식을 바꾸기 어렵다.

주요 문제:

1. 기존 Excel / HWPX / PDF 양식을 계속 써야 한다.
2. 셀 크기, 행높이, 열너비, 테두리, 줄바꿈, 인쇄범위가 깨지면 업무상 문제가 된다.
3. 담당자는 매번 같은 값을 반복 입력한다.
4. PDF, 사진, 엑셀, 수기자료, 카톡 메모가 흩어진다.
5. 월말에 다시 합산하고 검증한다.
6. 청구서, 실적보고, 작업계획서, 완료보고서, 민원대장, 사진대장이 따로 논다.
7. 담당자가 바뀌면 작성 방식이 흔들린다.
8. SaaS보다 로컬 PC에서 바로 쓰는 프로그램을 선호하는 현장이 있다.

## 5. Product Value

Document Studio의 핵심 가치는 새 문서를 예쁘게 만드는 것이 아니다.

핵심 가치는 다음이다.

    기존 양식 보존
    반복 입력 감소
    입력값 검증
    월별 자료 정리
    출력물 자동 생성
    로컬 PC 저장
    SafeMetrica evidence package 후보 연결

고객이 체감하는 결과물:

- 보고서
- 청구서
- 작업계획서
- 완료보고서
- 사진대장
- 민원대장
- 월간 점검표
- 월간 운영자료
- ZIP evidence package

## 6. Target Customer Segments

### Waste / Environmental Service Companies

반복 문서:

- 생활폐기물 실적보고
- 음식물 실적보고
- 재활용 실적보고
- 계근표 PDF 정리
- 민원대장
- HWPX 청구서
- 월별/연간 점검자료

Pack:

    WasteManager Pack

### Manufacturing / Logistics / Forklift Sites

반복 문서:

- 지게차 작업계획서
- 중량물 작업 확인서
- 작업 전 확인서
- 사진대장
- 당일 변경사항 확인서
- 월간 지게차 작업 운영요약

Pack:

    Forklift Work Plan Pack

### Hoist / Crane / Equipment Service Companies

반복 문서:

- 작업지시서
- 설치 완료보고서
- 정비 완료보고서
- AS 처리보고서
- 전후사진대장
- 고객 확인서
- 청구 첨부자료

Pack:

    Hoist Work Report Pack

### Food Factory / HACCP Operation Sites

반복 문서:

- 점검표
- 위생·안전 확인자료
- 사진대장
- 월간 운영자료
- 확인자료 부록

Pack:

    Food Factory / HACCP Operation Pack

주의:

    HACCP 적합 판단 또는 인증 보장 표현은 사용하지 않는다.

### Safety Document Binder Customers

반복 문서:

- 점검표
- 교육자료
- 사진대장
- 안전보건 문서 묶음
- 월간 안전운영 부록
- Evidence Book appendix

Pack:

    Safety Binder Pack

## 7. Product Structure

Document Studio는 Core + Pack + Template 구조로 간다.

### Core

공통 기능:

- Local Windows app shell
- PySide6 GUI
- SQLite local DB
- Local project folder
- Local template folder
- Local output folder
- Excel import/export
- HWPX XML mapping
- PDF text/table extraction candidate
- photo import
- validation rules
- report dialog
- output file list
- PyInstaller build flow

### Pack

업종별 업무 흐름:

- WasteManager Pack
- Forklift Work Plan Pack
- Hoist Work Report Pack
- Food Factory / HACCP Operation Pack
- Safety Binder Pack

### Template

업체별 실제 양식:

- Excel template
- HWPX template
- PDF extraction rule
- report layout
- output naming rule
- fixed value mapping
- validation rule set

## 8. SafeMetrica Bridge

SafeMetrica와 Document Studio는 직접 DB 연결부터 하지 않는다.

v1 연결 방식:

    DS에서 문서 생성
    → PDF / Excel / HWPX / ZIP output
    → 관리자가 확인
    → SafeMetrica Evidence Book / Monthly Report / PTW Lite 검토자료 후보로 첨부

허용 후보:

- Evidence Book attachment candidate
- Monthly Report appendix candidate
- PTW Lite review material
- Risk Assessment candidate reference
- Safety Operation Pack attachment

금지:

- SafeMetrica production DB 직접 연결
- Supabase production data 직접 연결
- Notion production DB 직접 연결
- customer login 구현
- SafeMetrica Vercel route 내부 구현
- service role 보유
- production DB 직접쓰기
- 고객 데이터 자동 sync

## 9. Revenue Model Candidate

가격은 아직 확정하지 않는다.

후보 구조:

### A. Initial Setup Fee

초기 세팅비 후보:

- 업체 양식 분석
- 입력항목 매핑
- Excel / HWPX / PDF template 등록
- 검증 규칙 설정
- 샘플 출력 테스트
- 담당자 교육

금액은 업체 문서 수, 양식 난이도, HWPX 여부, PDF 추출 여부에 따라 별도 산정한다.

### B. Pack License

Pack별 사용료 후보:

- WasteManager Pack
- Forklift Work Plan Pack
- Hoist Work Report Pack
- Safety Binder Pack

과금 방식 후보:

- 월 구독
- 연 구독
- 일시 구축 + 유지보수
- SafeMetrica 고객 옵션 Pack

### C. Template Customization Fee

업체별 특수 양식 수정은 별도 비용 후보로 둔다.

예:

- 새로운 HWPX 양식 추가
- 인쇄범위가 복잡한 Excel 양식 추가
- PDF 좌표 추출 규칙 추가
- 사진대장 양식 추가
- 월별 합산 규칙 추가

### D. Maintenance Fee

유지보수 후보:

- 양식 변경 대응
- 법정 양식 또는 제출 양식 변경 대응
- 오류 수정
- 신규 출력물 추가
- Windows exe 재배포
- 담당자 변경 교육

## 10. Commercial Position

Document Studio를 범용 AI 문서작성기로 팔지 않는다.

Document Studio는 반복 행정·실무 문서에 특화된 로컬 문서 자동정리 제품이다.

강한 표현:

    기존 양식을 보존하는 반복문서 자동정리
    로컬 PC 기반 문서 입력·검증·출력
    업체별 반복 업무 Pack
    SafeMetrica 운영기록 첨부 후보 생성
    보고서·청구서·작업계획서·사진대장 출력 지원

약한 표현:

    AI 문서작성
    모든 문서 자동화
    법적 문서 완벽 생성
    행정업무 완전 자동화
    안전관리 자동대행

## 11. Differentiation

Document Studio의 차별점은 다음이다.

1. 기존 Excel / HWPX / PDF 양식을 보존한다.
2. 인터넷 없이 로컬 PC에서 사용할 수 있다.
3. 입력값 검증과 중복 방지를 한다.
4. 업체별 반복업무를 Pack으로 분리한다.
5. SafeMetrica 운영 원장과 evidence package 방식으로 연결할 수 있다.
6. 현장 업무 결과물을 월간 운영기록과 연결할 수 있다.
7. 새 문서를 만드는 것이 아니라 기존 담당자 업무흐름을 유지하면서 반복작업을 줄인다.

## 12. Implementation Priority

현재 기준 우선순위:

1. WasteManager 안정화
2. Sample Intake Protocol 기준으로 업체 샘플 수집
3. Core UI / Report Pattern 유지
4. Forklift Work Plan Pack은 문서화 및 BM/IP 후보 정리
5. Hyundai Hoist는 샘플 수령 후 Hoist Work Report Pack Requirements 작성
6. SafeMetrica 연결은 evidence package 방식으로만 검토
7. 실제 코드화는 Pack별 샘플과 반복 수요가 확인된 뒤 진행

## 13. Risk

사업화 리스크:

### Risk 1. 업체별 완전 맞춤 개발화

모든 업체를 새로 개발하면 수익성이 떨어진다.

대응:

    Core + Pack + Template 구조 유지

### Risk 2. SafeMetrica 본체 과부하

DS 기능을 SafeMetrica Vercel 앱에 넣으면 본체가 무거워진다.

대응:

    SafeMetrica Core는 슬림하게 유지
    DS는 별도 로컬 제품축 유지

### Risk 3. 양식 보존 실패

고객은 기존 양식의 셀 크기, 줄바꿈, 글꼴, 테두리, 인쇄범위를 중요하게 본다.

대응:

    양식 보존을 기능보다 우선
    Excel / HWPX / PDF mapping 검증 강화

### Risk 4. 법적 자동화 오해

자동 법적 판단, 위험성평가 완료, 작업허가 승인처럼 보이면 위험하다.

대응:

    AI는 후보만
    문서는 관리자 승인 후
    법적 보장 표현 금지

### Risk 5. 샘플 없는 추측 개발

자료 없이 현대호이스트나 다른 Pack을 추측 개발하면 구조가 꼬인다.

대응:

    Sample Intake Protocol 먼저
    샘플 수령 후 Requirements
    그 다음 Spec
    그 다음 Code

## 14. Sales Narrative

고객 설명 문구 후보:

    Document Studio는 기존에 쓰던 Excel, HWPX, PDF 양식을 최대한 유지하면서
    매월 반복되는 입력, 검증, 보고서, 청구서, 작업계획서 출력을 줄여주는
    로컬 문서 자동정리 프로그램입니다.

    SafeMetrica가 현장 확인과 운영기록을 남긴다면,
    Document Studio는 그 기록과 반복 업무자료를
    고객이 실제로 제출하고 보관하는 문서 결과물로 정리하는 역할을 합니다.

    단, 법적 판단이나 안전조치 확정은 시스템이 대신하지 않으며,
    최종 검토와 확정은 관리자와 사업주가 수행합니다.

## 15. Copy Guard

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
- HACCP 인증 보장
- 완전 자동 법적 대응
- 모든 문서 100% 자동화

사용 가능한 표현:

- 문서 작성 지원
- 반복 입력 정리
- 확인자료 정리
- 관리자 검토 후보
- 출력물 생성
- 문서 결과물 정리
- evidence package 후보
- 월간 운영기록 첨부 후보
- 기존 양식 보존
- 로컬 PC 기반 문서 자동정리

## 16. Current Decision

현재 결정:

    Document Studio는 사업성이 있다.
    단, 범용 문서작성 AI가 아니라 반복 실무문서 자동정리 제품축으로 간다.
    SafeMetrica와 직접 DB 연결하지 않고 evidence package 방식으로 연결한다.
    WasteManager는 첫 실사용 자산이다.
    Forklift / Hoist / Safety Binder는 Pack 후보로 관리한다.
    Core는 단순하게, Pack은 별도로, AI는 후보만, 문서는 관리자 승인 후 처리한다.
