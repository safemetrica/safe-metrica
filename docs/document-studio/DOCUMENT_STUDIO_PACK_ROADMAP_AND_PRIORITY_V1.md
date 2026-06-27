# Document Studio Pack Roadmap and Priority v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 로드맵 정의
- Product axis: Document Studio Local Edition
- Target customer: 반복 행정·실무 문서를 작성하는 여러 업종 고객
- Current status: Pack roadmap / priority document only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Current Document Studio Baseline

Document Studio는 SafeMetrica 본체 기능이 아니다.

Document Studio는 별도 로컬 Windows 문서자동화 제품축이다.

현재 완료된 기준 문서:

- Document Studio Origin/Core Lock v1
- Forklift Work Plan Pack Spec v1
- Document Studio Sample Intake Protocol v1
- Document Studio Core UI Report Pattern v1
- Hyundai Hoist Sample Intake Note v1
- Document Studio Business Model v1
- Document Studio Agent Assist Layer v1
- Document Studio Staging Inbox Data Model v1

현재 제품 구조:

    Document Studio Core
    → WasteManager 기반 로컬 문서자동화 엔진

    Sample Intake Protocol
    → 여러 업체 샘플 공통 수집 기준

    Core UI / Report Pattern
    → WasteManager 실제 화면 기반 공통 UI·출력 패턴

    Agent Assist Layer
    → 자료 수집·OCR·분류·필드 후보 생성

    Staging Inbox
    → 원본/비식별/추출후보/검토/반려/import 대기함

    SafeMetrica Bridge
    → PDF / Excel / HWPX / ZIP evidence package 후보 연결

## 3. Core Product Principle

Document Studio는 업체별 완전 맞춤 개발로 가면 안 된다.

기본 원칙:

    Core는 단순하게.
    Pack은 별도로.
    Template은 업체별로.
    Agent는 후보만.
    문서는 담당자 검토 후.
    SafeMetrica 연결은 evidence package 방식으로.
    고객별 커스터마이징은 요청·계약·반복성 확인 후.

## 4. Pack Priority Decision

현재 Pack 우선순위는 다음과 같다.

    1. WasteManager Pack 안정화
    2. Forklift Work Plan Pack
    3. Hoist Work Report Pack
    4. Safety Binder Pack
    5. Food Factory / HACCP Operation Pack

이 순서는 코드 구현 순서가 아니라 제품화·샘플수집·문서화·검증 우선순위다.

## 5. Priority 1 — WasteManager Pack

### Position

WasteManager Pack은 Document Studio의 첫 실사용 자산이다.

한국그린환경 반복 행정·실무 문서 편의 필요에서 출발했고, 이미 로컬 Windows 앱으로 구현되어 있다.

### Current Scope

- 생활폐기물 입력자료 관리
- 음식물 입력자료 관리
- 재활용 입력자료 관리
- 계근표 PDF 추출
- 차량 관리
- 월별 조회 / 수정 / 선택 삭제
- 생활폐기물 통합보고서
- 생활폐기물 HWPX 청구서
- 음식물 실적보고
- 재활용 작업일보
- 재활용 HWPX 실적보고
- 민원대장
- 월별/연간 통합자료 점검표
- 월별 매출 관리
- 로컬 SQLite DB
- PySide6 GUI
- PyInstaller exe build

### Why Priority 1

- 이미 작동하는 원형이다.
- 실제 고객 업무에서 출발했다.
- Document Studio Core 추출 기준이 된다.
- Excel / HWPX / PDF 양식 보존 원칙을 검증할 수 있다.
- Pack 구조를 실사용 기준으로 다듬을 수 있다.

### Next Actions

- 현재 기능 목록 정리
- 주요 출력물별 template preservation checklist 작성
- build / compileall / pytest 기준 정리
- sample data와 real customer data 분리
- 향후 Core로 빼낼 기능과 WasteManager 전용 기능 분리

## 6. Priority 2 — Forklift Work Plan Pack

### Position

Forklift Work Plan Pack은 Document Studio와 SafeMetrica 사이의 연결 Safety Pack 후보이다.

Document Studio의 출발점은 아니며, WasteManager 기반 Core를 산업안전 문서팩으로 확장하는 후보이다.

### Core Flow

    반복 지게차·중량물 작업 사전등록
    → 당일 변경사항 확인
    → Safety Priority 확인
    → 작업 전 확인·서명
    → 관리자 검토
    → 필요 시 PTW Lite 후보 생성
    → SafeMetrica 월간 운영기록 반영 후보
    → DS 작업계획서 / 확인서 / 사진대장 자동정리

### Why Priority 2

- 산업안전 실무 수요가 넓다.
- 제조·물류·식품·폐기물 현장에 공통 설명 가능하다.
- SafeMetrica 현장 QR / 확인·서명 / PTW Lite / 월간 운영기록과 연결성이 높다.
- BM/IP 검토 후보로 구조화할 가치가 있다.
- 시연 흐름이 비교적 명확하다.

### Not Yet

- 코드 구현 바로 시작 금지
- SafeMetrica route로 직접 구현 금지
- PTW 자동 승인 금지
- 위험성평가 자동 확정 금지

### Next Actions

- 실제 지게차 작업계획서 샘플 확보
- 반복 작업 프로필 예시 작성
- Safety Priority 항목 확정 후보 정리
- PTW Lite 후보 조건 정리
- DS 출력물 template 후보 수집

## 7. Priority 3 — Hoist Work Report Pack

### Position

Hoist Work Report Pack은 현대호이스트 샘플 수령 후 설계한다.

현대호이스트는 Document Studio 전체 기준이 아니라 첫 검증 사례 중 하나다.

### Candidate Flow

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

### Why Priority 3

- 현대호이스트 샘플을 받을 가능성이 높다.
- 작업지시서 / 완료보고서 / 전후사진 / AS 기록은 DS와 잘 맞는다.
- SafeMetrica의 본사관리자 검토, PTW Lite, Evidence Book 후보와 연결성이 있다.

### Not Yet

- 자료 없이 추측 개발하지 않는다.
- 최종 DB schema 확정하지 않는다.
- 최종 UI 확정하지 않는다.
- Hoist Pack Spec 완성본 작성은 샘플 수령 후 진행한다.

### Next Actions

- Hyundai Hoist Sample Intake Note 기준으로 샘플 요청
- 작업지시서 / 완료보고서 / 전후사진 / 고객확인서 확보
- AS 접수와 완료보고 매칭 흐름 확인
- 청구/정산 연결 여부 확인
- Hoist Work Report Pack Requirements v1 작성

## 8. Priority 4 — Safety Binder Pack

### Position

Safety Binder Pack은 여러 업체의 안전문서·사진·점검표·교육자료를 묶어 월간 안전운영 부록 또는 Evidence Book appendix로 정리하는 Pack 후보이다.

### Candidate Inputs

- 점검표
- 교육자료
- 사진대장
- 작업 전 확인자료
- TBM 자료
- PTW Lite 검토자료
- 위험성평가 공유확인 증빙자료
- 조치 전/후 사진
- 월간 안전운영 부록

### Why Priority 4

- 여러 업체에 공통 적용 가능성이 있다.
- SafeMetrica Evidence Book / Monthly Report와 연결성이 높다.
- Agent Assist Layer와 Staging Inbox의 자료 분류 구조를 검증하기 좋다.

### Risk

- 너무 넓게 잡으면 범용 파일관리 프로그램이 된다.
- 법적 증빙 완성 또는 면책 보장처럼 보이면 위험하다.
- 고객별 자료 형식이 다양해 Pack 경계가 흐려질 수 있다.

### Next Actions

- Bubblemon / 덕승 / 기타 샘플은 Safety Binder 후보로 보관하되 즉시 코드화하지 않는다.
- 점검표 / 사진대장 / 교육자료 / 월간 부록 유형별 sample intake 진행
- SafeMetrica Evidence Book 연결 후보만 문서화

## 9. Priority 5 — Food Factory / HACCP Operation Pack

### Position

Food Factory / HACCP Operation Pack은 식품공장 운영문서 자동정리 후보이다.

리치코리아 운영형과 혼동하지 않는다.

리치코리아는 Full SafeMetrica 운영형 고객이며, Food Factory Pack 또는 체험판이 아니다.

### Candidate Inputs

- 위생 점검표
- 안전 점검표
- 설비 점검표
- 작업 전 확인자료
- 사진대장
- 월간 운영자료
- 외부 인력 확인자료
- 개선조치 기록

### Why Priority 5

- 식품공장에는 반복 점검표와 문서가 많다.
- Document Studio 양식 보존 가치가 있다.
- SafeMetrica 월간 운영기록과 연결 가능성이 있다.

### Risk

- HACCP 적합 판단 또는 인증 보장으로 오해될 수 있다.
- 리치 납품형 운영화면과 혼동될 수 있다.
- 현재 리치 범용 Core에 복잡도를 이식하면 안 된다.

### Next Actions

- 리치에는 즉시 투입하지 않는다.
- 샘플 확보 후 Sample Intake Protocol 기준으로 분류한다.
- HACCP 인증 보장 표현 금지.
- 운영자료 정리 지원, 확인자료 정리 후보로만 표현한다.

## 10. Pack Stage Gate

모든 Pack은 다음 단계를 거친다.

    Stage 0. Idea
    Stage 1. Sample Intake
    Stage 2. Requirements
    Stage 3. Product Spec
    Stage 4. Template Mapping
    Stage 5. Prototype
    Stage 6. Pilot
    Stage 7. Pack Release

### Stage 0 — Idea

아이디어 후보.
아직 제품 아님.

### Stage 1 — Sample Intake

실제 업체 샘플 수령.
원본/비식별/출력물/업무흐름 확인.

### Stage 2 — Requirements

필요 입력값, 검증규칙, 출력물, 양식 보존 위험 정리.

### Stage 3 — Product Spec

Pack 구조, UI 흐름, 출력물, SafeMetrica 연결 후보 정리.

### Stage 4 — Template Mapping

Excel / HWPX / PDF 실제 양식 매핑.

### Stage 5 — Prototype

로컬 DS에서 샘플 출력 검증.

### Stage 6 — Pilot

실제 고객 또는 샘플 고객 업무흐름에서 제한 테스트.

### Stage 7 — Pack Release

가격, 유지보수, template policy, 고객 안내자료 정리 후 출시.

## 11. Current Stage by Pack

현재 Pack별 단계:

| Pack | Current Stage | Note |
|---|---|---|
| WasteManager Pack | Stage 5~6 candidate | 이미 작동 중인 로컬 앱. 안정화와 Core 추출 필요 |
| Forklift Work Plan Pack | Stage 3 | Product Spec v1 완료. 실제 template/sample 필요 |
| Hoist Work Report Pack | Stage 1 준비 | Hyundai Hoist Sample Intake Note v1 완료. 샘플 수령 필요 |
| Safety Binder Pack | Stage 0~1 candidate | 샘플 보관 후보. 즉시 코드화 금지 |
| Food Factory / HACCP Operation Pack | Stage 0 candidate | 리치와 혼동 금지. 샘플 수령 후 판단 |

## 12. SafeMetrica Bridge Priority

SafeMetrica와 DS 연결은 다음 순서로만 검토한다.

    1. No Connection
    2. Evidence Attachment Candidate
    3. Monthly Report Appendix Candidate
    4. PTW Lite Review Material Candidate
    5. Ledger Metadata Candidate
    6. Workflow Candidate

v1 기본값은 Evidence Attachment Candidate다.

직접 DB 연결은 하지 않는다.

금지:

- SafeMetrica production DB 직접쓰기
- Supabase production 직접쓰기
- Notion production 직접쓰기
- service role 보유
- customer login 구현
- DS를 SafeMetrica Vercel route로 구현
- AI가 finalized 처리
- Agent가 작업허가 승인
- Agent가 조치완료 확정

## 13. Agent Assist Priority

Agent Assist Layer는 Pack 구현보다 앞서 자동화 욕심을 내면 안 된다.

우선 적용 후보:

1. WasteManager 계근표 PDF / 월별 파일 정리
2. Hoist 작업 전/후 사진 정리 후보
3. Forklift 당일 변경사항 메모 정리 후보
4. Safety Binder 사진대장/점검표 분류 후보

Agent는 다음만 한다.

- 수집 후보
- OCR 후보
- 표 추출 후보
- 분류 후보
- DS field mapping 후보

Agent는 확정하지 않는다.

## 14. Business Priority

사업화 우선순위:

1. WasteManager를 실제 작동 사례로 정리
2. DS Local Edition을 별도 제품축으로 설명
3. Forklift Pack을 산업안전 확장 Pack / BM 후보로 정리
4. Hoist Pack은 현대호이스트 샘플 기반으로 구체화
5. Agent Assist Layer는 고급 옵션 또는 내부 운영 보조로 둔다
6. SafeMetrica Bridge는 evidence package 방식으로만 설명

## 15. Pricing Direction

가격은 아직 확정하지 않는다.

후보 구조:

### Initial Setup

- 양식 분석
- template mapping
- 출력물 검증
- 담당자 교육

### Pack License

- WasteManager Pack
- Forklift Work Plan Pack
- Hoist Work Report Pack
- Safety Binder Pack

### Template Customization

- HWPX 추가
- Excel 복잡 양식 추가
- PDF 추출 규칙 추가
- 사진대장 양식 추가

### Maintenance

- 양식 변경 대응
- 오류 수정
- exe 재배포
- 담당자 변경 교육

## 16. Copy Guard

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
- 모든 문서 100% 자동화
- 완전 무인 문서처리

사용 가능한 표현:

- 반복 문서 정리 지원
- 기존 양식 보존
- 입력값 검증
- 관리자 검토 후보
- 문서 결과물 정리
- evidence package 후보
- 월간 운영기록 첨부 후보
- 작업계획서 작성 지원
- 완료보고서 작성 지원
- 사진대장 정리

## 17. Next Work Candidates

다음 작업 후보:

### A. WasteManager Stabilization Checklist v1

현재 로컬 앱 기준으로 안정화/빌드/테스트/출력물 검증 checklist 작성.

### B. Forklift Pack Sample Request v1

지게차 작업계획서, 중량물 작업자료, 사진대장 샘플 요청 문서 작성.

### C. Hoist Work Report Pack Requirements v1

현대호이스트 샘플 수령 후 작성.
샘플 전 작성 금지.

### D. DS Template Preservation Checklist v1

Excel/HWPX/PDF 양식 보존 검수표 작성.

### E. DS Docs-only Vercel Build Skip Policy v1

문서 PR마다 Production build가 도는 문제를 줄이는 정책 검토.

## 18. Current Decision

현재 결정:

    Document Studio Pack 상품화는 WasteManager 안정화에서 시작한다.
    Forklift Pack은 Safety Pack 1순위 확장 후보이다.
    Hoist Pack은 현대호이스트 샘플 수령 후 Requirements로 넘어간다.
    Safety Binder Pack과 Food Factory Pack은 후보로 보관하되 즉시 코드화하지 않는다.
    Agent Assist Layer와 Staging Inbox는 후보 생성/검토 레이어로 유지한다.
    SafeMetrica Core는 슬림하게 유지하고 DS output은 evidence package 방식으로만 연결한다.
