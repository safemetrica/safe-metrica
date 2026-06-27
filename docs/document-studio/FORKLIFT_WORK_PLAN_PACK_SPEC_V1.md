# Forklift Work Plan Pack Product Spec v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 제품정의
- Product axis: Document Studio + SafeMetrica connection pack
- Target customer: 특정 고객 아님
- Current status: Product spec only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection

## 2. Position

Forklift Work Plan Pack은 Document Studio의 출발점이 아니다.

Document Studio의 출발 자산은 WasteManager Local Edition이다.

Forklift Work Plan Pack은 Document Studio Core와 SafeMetrica 운영 원장을 연결하는 신규 Safety Pack 후보다.

정확한 계층:

    SafeMetrica Core
    → 현장 QR / 확인·서명 / 익명 의견 / TBM / 관리자 검토 / 월간 운영기록

    Document Studio Local Edition
    → 기존 Excel / HWPX / PDF 양식 보존 / 입력값 검증 / 반복 문서 자동정리 / 보고서·청구서·작업계획서 출력

    Forklift Work Plan Pack
    → 지게차·중량물 반복작업 사전등록 / 당일 변경사항 확인 / 작업 전 확인·서명 / PTW Lite 후보 / 월간 운영기록 반영 / DS 문서 자동정리

## 3. Product Intent

Forklift Work Plan Pack의 목적은 반복되는 지게차·중량물 작업을 매번 새로 작성하지 않고, 사전등록된 작업 기준과 당일 변경사항을 결합해 작업 전 확인자료와 문서 결과물을 정리하는 것이다.

핵심은 세 가지다.

1. 반복 작업은 사전등록한다.
2. 당일에는 변경사항과 작업 전 확인만 받는다.
3. 결과물은 SafeMetrica 운영기록과 Document Studio 문서팩으로 나눠 정리한다.

## 4. Target Users

- 산업안전 담당자
- 현장관리자
- 물류창고 관리자
- 제조업 지게차 작업 관리자
- 중량물 상하차 담당자
- 외부 납품·상하차 인력이 혼재되는 현장 관리자
- 반복 작업계획서와 확인서를 수기로 정리하는 담당자

## 5. Target Work Types

v1 대상 작업:

- 지게차 상하차 작업
- 지게차 적재·이동 작업
- 중량물 운반 작업
- 공장 내 지게차 이동 작업
- 창고 내 지게차 이동 작업
- 외부 차량 입출고 연계 작업
- 시야제한 구역 작업
- 보행자 동선과 지게차 동선이 겹치는 작업

v1에서 제외:

- 크레인 작업계획서 자동 작성
- 호이스트 설치·정비 완료보고
- 고위험 작업허가 자동 승인
- 위험성평가 자동 확정
- 법적 적합성 자동 판단

## 6. Problem

현장에서는 지게차·중량물 작업이 반복되지만, 문서와 확인 흐름은 매번 흩어진다.

주요 문제:

1. 작업계획서, 사진, 확인서, TBM, 점검기록이 따로 관리된다.
2. 반복 작업인데도 매번 같은 내용을 다시 입력한다.
3. 당일 변경사항만 확인하면 되는데 전체 문서를 다시 작성한다.
4. 지게차 동선, 보행자 동선, 시야제한, 외부인력 참여 여부가 월간 기록으로 잘 남지 않는다.
5. 작업 전 확인은 했지만 누가 어떤 조건을 확인했는지 정리하기 어렵다.
6. 문서 출력물은 별도 양식으로 다시 만들어야 한다.

## 7. Core Flow

기본 흐름:

    반복 지게차·중량물 작업 사전등록
    → 당일 작업 선택
    → 당일 변경사항 확인
    → Safety Priority 확인
    → 작업 전 확인·서명
    → 관리자 검토
    → 필요 시 PTW Lite 후보 생성
    → SafeMetrica 월간 운영기록 반영
    → Document Studio 작업계획서/확인서 자동정리

## 8. Pre-Registered Work Profile

사전등록 항목 후보:

- work_profile_id
- work_profile_name
- company_code
- site_name
- work_area
- regular_work_type
- forklift_type
- forklift_capacity
- regular_operator
- regular_signal_person
- regular_route
- loading_point
- unloading_point
- load_type
- expected_load_weight
- pedestrian_overlap
- blind_spot_area
- floor_condition
- slope_or_ramp
- nearby_vehicle_flow
- nearby_worker_flow
- external_worker_involved
- required_ppe
- required_safety_check_items
- default_document_template_id
- active_status

## 9. Daily Work Check

당일 확인 항목 후보:

- work_date
- selected_work_profile_id
- actual_operator
- actual_signal_person
- actual_forklift_id
- actual_load_type
- actual_load_weight
- actual_route_changed
- route_change_note
- weather_or_floor_change
- pedestrian_flow_changed
- external_worker_present
- blind_spot_changed
- additional_risk_note
- manager_note
- worker_confirmation_required
- signature_required
- photos_required

## 10. Safety Priority Strip

작업 전 화면에는 전체 정보를 길게 보여주지 않고, 당일 확인이 필요한 우선순위만 짧게 보여준다.

Safety Priority 후보:

- 교차동선 있음
- 보행자 동선 겹침
- 시야제한 구역
- 외부 인력 참여
- 중량물 취급
- 당일 동선 변경
- 바닥상태 변경
- 경사로 또는 단차
- 적재물 고정 확인 필요
- 신호수 확인 필요

표현 기준:

- 위험 확정 표현 금지
- 작업중지 자동명령 표현 금지
- 관리자 확인 필요 / 우선 확인 항목 / 보완 검토 후보 표현 사용

## 11. Worker / Operator Confirmation

작업 전 확인·서명 후보:

- 확인자 이름
- 소속
- 휴대폰 뒤 4자리 또는 사번
- 역할: 작업자 / 신호수 / 현장관리자 / 외부 인력
- 확인 항목 체크
- 특이사항 없음 / 있음
- 모바일 자필서명
- 확인 시각
- company_code
- work_profile_id
- daily_work_id

익명 의견과 실명 확인·서명은 섞지 않는다.

## 12. PTW Lite Candidate

Forklift Work Plan Pack은 PTW Lite 후보를 만들 수 있다.

단, 자동 승인하지 않는다.

PTW Lite 후보 조건 예시:

- 중량물 기준 초과
- 외부 인력 참여
- 보행자 동선과 지게차 동선 겹침
- 시야제한 구역
- 당일 동선 변경
- 야간 또는 조도 부족
- 작업구역 통제 미확인
- 신호수 미지정

처리 원칙:

    조건 감지
    → PTW Lite 검토 후보
    → 관리자 확인
    → 보완요청 또는 승인 기록
    → 월간 운영기록 반영

금지:

- 작업허가 자동 승인
- AI가 작업허가 판단
- 법적 적합성 자동 확정
- 위험성평가 자동 완료

## 13. SafeMetrica Connection

SafeMetrica Core에 반영되는 항목:

- 현장 QR 작업 전 확인
- 확인·서명 기록
- 특이사항
- 관리자 검토
- PTW Lite 후보
- 월간 운영기록
- 대표/관리자 브리핑 후보

SafeMetrica Core에 직접 넣지 않는 항목:

- 복잡한 문서 양식 렌더링
- HWPX XML 조작
- Excel 서식 보존 출력
- 로컬 PDF 추출
- 고객별 특수 문서 자동편집

이 항목은 Document Studio가 담당한다.

## 14. Document Studio Output

Document Studio 출력 후보:

1. 지게차 작업계획서
2. 작업 전 확인서
3. 지게차 작업 사진대장
4. 당일 변경사항 확인서
5. 관리자 검토 메모
6. 월간 지게차 작업 운영요약 부록

출력 형식 후보:

- PDF
- Excel
- HWPX
- ZIP evidence package

v1은 PDF/Excel 중심으로 검토하고, HWPX는 실제 양식 확보 후 설계한다.

## 15. Data Boundary

v1에서는 Document Studio가 SafeMetrica production DB에 직접 연결하지 않는다.

금지:

- Supabase production 직접 연결
- Notion production 직접 연결
- SafeMetrica route 내부 구현
- 고객 로그인 기능 구현
- 기존 고객 데이터 직접 sync
- service role 보유
- production DB 직접쓰기

허용 후보:

- 로컬 JSON / SQLite project 저장
- PDF / Excel / ZIP output
- 관리자가 SafeMetrica에 첨부하는 evidence package
- 추후 API 연결은 별도 승인 후 검토

## 16. Document Studio Local Fields Candidate

로컬 프로젝트 구조 후보:

    DocumentStudioProjects/
      forklift-work-plan/
        2026-06-sample-site/
          input/
          photos/
          output/
          templates/
          project.json
          forklift_work_plan.db

로컬 DB 후보 테이블:

- work_profiles
- daily_work_checks
- worker_confirmations
- safety_priority_items
- document_outputs
- photo_evidence
- template_registry

## 17. v1 Demo Scenario

시연 흐름:

1. 반복 지게차 작업 프로필 등록
2. 당일 작업 선택
3. 당일 변경사항 입력
4. Safety Priority 확인
5. 작업자/신호수 확인·서명
6. 관리자 검토 메모 입력
7. 작업계획서 PDF 생성
8. 사진 포함 evidence ZIP 생성
9. 월간 운영기록 첨부 후보로 정리

## 18. IP / BM Candidate

Forklift Work Plan Pack은 BM/IP 검토 후보가 될 수 있다.

강한 구조 후보:

    반복 지게차·중량물 작업 사전등록
    → 당일 변경사항만 모바일로 확인
    → 교차동선·시야제한·외부인력·중량물 조건을 Safety Priority로 표시
    → 관리자 승인/보완요청/PTW Lite 후보 생성
    → 작업 전 확인·서명 기록 저장
    → 월간 운영기록 및 DS 작업계획서/확인서 자동 정리

주의:

- “지게차 안전관리 앱” 같은 넓은 표현은 약하다.
- 권리화 검토는 데이터 흐름, 사용자 절차, 문서 결과물이 묶인 구조로 정리해야 한다.
- 특허 가능성은 선행기술 조사와 변리사 검토가 필요하다.
- 외부 공개 전 내부 문서로 구조화한다.

## 19. Copy Guard

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

- 작업계획서 작성 지원
- 반복 입력 정리
- 확인자료 정리
- 관리자 검토 후보
- PTW Lite 검토 후보
- 월간 운영기록 반영 후보
- 문서 결과물 정리
- evidence package 후보

## 20. Current Decision

현재 결정:

    Forklift Work Plan Pack은 Document Studio의 출발점이 아니다.
    Forklift Work Plan Pack은 DS와 SafeMetrica 사이의 연결 Safety Pack 후보다.
    SafeMetrica Core는 슬림하게 유지한다.
    복잡한 문서 출력과 양식 보존은 Document Studio가 담당한다.
    작업허가, 위험성평가, 안전조치 확정은 관리자 승인 후 처리한다.
