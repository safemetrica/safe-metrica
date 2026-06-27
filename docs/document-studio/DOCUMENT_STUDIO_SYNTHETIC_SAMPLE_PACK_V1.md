# Document Studio Synthetic Sample Pack v1

## 1. Classification

- Work type: D. 별도 제품축 / MVP 샘플팩 정의
- Product axis: Document Studio Local Edition
- Target customer: 특정 고객 아님
- Current status: Synthetic sample design only
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes
  - Customer original sensitive documents

## 2. Purpose

Document Studio MVP는 실제 고객 내부문서 없이도 시작할 수 있어야 한다.

Synthetic Sample Pack은 실제 고객명, 개인정보, 계약금액, 차량번호, 서명, 사고정보를 사용하지 않고 Document Studio의 핵심 기능을 시연하기 위한 가상 샘플팩이다.

목표:

    로컬 PC에서
    가상 샘플 데이터를 입력하고
    입력값을 검증한 뒤
    Excel template에 데이터를 채우고
    출력파일을 생성하며
    evidence package 후보를 만드는 흐름을 검증한다.

## 3. Key Rule

Synthetic Sample Pack은 실제 고객 자료가 아니다.

고객 화면 또는 데모자료에는 반드시 다음 문구를 둔다.

    이 자료는 기능 시연용 가상 샘플입니다.
    실제 고객 데이터가 아닙니다.

금지:

- 실제 고객명 사용
- 실제 사업자등록번호 사용
- 실제 차량번호 전체 사용
- 실제 휴대폰번호 사용
- 실제 주소 상세 사용
- 실제 계약금액 사용
- 실제 서명 이미지 사용
- 실제 사고정보 사용
- 실제 내부문서라고 표현

## 4. Sample Company Set

가상 회사명 후보:

### 샘플제조

- industry: manufacturing
- use case: 지게차·중량물 작업계획서
- pack: Forklift Work Plan Demo Pack

### 샘플물류

- industry: logistics
- use case: 상하차 / 적재 / 출고장 동선
- pack: Forklift Work Plan Demo Pack

### 샘플호이스트

- industry: equipment_service
- use case: 작업지시서 / 완료보고서 / 전후사진
- pack: Hoist Work Report Demo Candidate

### 샘플환경

- industry: waste_service
- use case: 월별 실적보고 / 계근표 / 민원대장
- pack: Waste Document Demo Candidate

MVP v1은 `샘플제조` 기준 Forklift Work Plan Demo Pack을 우선한다.

## 5. MVP First Demo Pack

현재 첫 MVP demo 후보:

    Forklift Work Plan Demo Pack

선정 이유:

- 실제 내부문서 없이 synthetic sample로 구현 가능
- SafeMetrica 운영 원장과 연결 설명이 쉬움
- 작업 전 확인, PTW Lite 후보, 월간 운영기록 후보와 연결 가능
- 산업안전 문서팩으로 설명하기 쉬움
- 고객 민감자료 의존도가 낮음

## 6. Forklift Demo Scenario

시나리오:

    샘플제조 출고장에서
    매일 반복되는 지게차 상하차 작업이 있다.
    기본 작업경로와 장비는 사전등록되어 있다.
    당일에는 적재물 중량과 동선 변경 여부만 확인한다.
    보행자 동선 겹침과 시야제한 구역이 있어 Safety Priority로 표시한다.
    작업자는 작업 전 확인을 하고 관리자가 검토한다.
    DS는 작업계획서와 작업 전 확인서, 사진대장을 출력한다.

## 7. Synthetic Work Profile

가상 작업 프로필:

- work_profile_id: SAMPLE-FORKLIFT-001
- company_alias: 샘플제조
- site_name: 샘플제조 1공장
- work_area: 출고장 A구역
- regular_work_type: 지게차 상하차
- forklift_type: 전동 지게차
- forklift_capacity: 2.5톤
- regular_operator: 샘플작업자A
- regular_signal_person: 샘플신호수A
- regular_route: 출고장 A구역 → 적재장 B구역
- loading_point: 출고장 A구역
- unloading_point: 적재장 B구역
- load_type: 박스 적재물
- expected_load_weight: 850kg
- pedestrian_overlap: yes
- blind_spot_area: yes
- floor_condition: 양호
- external_worker_involved: no
- required_ppe: 안전화, 안전조끼, 안전모
- active_status: active

## 8. Synthetic Daily Work Check

가상 당일 확인자료:

- work_date: 2026-06-30
- selected_work_profile_id: SAMPLE-FORKLIFT-001
- actual_operator: 샘플작업자A
- actual_signal_person: 샘플신호수A
- actual_forklift_id: SAMPLE-FL-2500
- actual_load_type: 박스 적재물
- actual_load_weight: 920kg
- actual_route_changed: yes
- route_change_note: 적재장 B구역 앞 임시 적재물로 우회 동선 사용
- weather_or_floor_change: 바닥 일부 젖음
- pedestrian_flow_changed: 점심시간 전후 보행자 통행 증가
- external_worker_present: no
- blind_spot_changed: 기존 시야제한 동일
- additional_risk_note: 우회 동선 구간 신호수 위치 확인 필요
- manager_note: 작업 전 신호수 배치 후 진행
- worker_confirmation_required: true
- signature_required: true
- photos_required: true

## 9. Safety Priority Sample

Safety Priority 후보:

- 보행자 동선 겹침
- 시야제한 구역
- 당일 동선 변경
- 바닥상태 변경
- 중량물 취급
- 신호수 확인 필요

고객용 표현:

    오늘 작업 전 우선 확인할 항목입니다.
    관리자가 확인 후 진행 여부를 판단합니다.

금지 표현:

- 위험 확정
- 사고 발생 예측
- 작업중지 자동명령
- 법적 위반 판단
- AI 승인

## 10. Synthetic Confirmation Data

가상 확인자료:

- confirmer_name: 샘플확인자A
- team: 출고팀
- phone_last4: 0000
- role: 작업자
- checked_items:
  - 보호구 착용 확인
  - 작업 동선 확인
  - 보행자 동선 확인
  - 신호수 위치 확인
  - 적재물 고정 확인
  - 비상연락 확인
- special_note: 특이사항 없음
- signature_status: sample_signature
- confirmed_at: 2026-06-30 08:10

주의:

    실제 서명 이미지를 사용하지 않는다.
    sample_signature는 기능 시연용 상태값이다.

## 11. Synthetic Photo Set

사진 파일 후보:

    photos/
      sample_before_work.jpg
      sample_route.jpg
      sample_load.jpg
      sample_after_work.jpg

사진 설명:

- sample_before_work.jpg: 작업 전 현장
- sample_route.jpg: 지게차 이동 동선
- sample_load.jpg: 적재물 상태
- sample_after_work.jpg: 작업 후 정리 상태

주의:

    실제 고객 현장 사진을 사용하지 않는다.
    공개 이미지나 가상 placeholder를 사용한다.
    사람 얼굴, 차량번호, 회사명, 주소가 보이면 비식별 처리한다.

## 12. Excel Template Fields

Forklift Work Plan Demo Excel template 후보 필드:

### Header

- document_title
- company_alias
- site_name
- work_date
- work_area
- prepared_by
- reviewed_by

### Work Summary

- work_type
- forklift_type
- forklift_capacity
- operator_name
- signal_person_name
- load_type
- load_weight
- loading_point
- unloading_point
- travel_route

### Safety Priority

- pedestrian_overlap
- blind_spot_area
- route_changed
- floor_condition_changed
- external_worker_present
- signal_person_required
- ppe_required

### Daily Change

- route_change_note
- floor_change_note
- additional_risk_note
- manager_note

### Confirmation

- confirmer_name
- confirmer_team
- confirmer_role
- confirmation_status
- confirmed_at
- signature_status

### Evidence

- before_photo_note
- route_photo_note
- load_photo_note
- after_photo_note

## 13. Output Candidates

MVP v1 출력 후보:

1. 지게차 작업계획서 Excel
2. 작업 전 확인서 Excel
3. 사진대장 Excel
4. 월간 작업 운영요약 후보 Excel
5. evidence package ZIP 후보

PDF는 v1.1 후보로 둔다.
HWPX는 research candidate로 둔다.

## 14. Validation Rules

검증 후보:

- work_date 필수
- company_alias 필수
- site_name 필수
- work_area 필수
- operator_name 필수
- signal_person_name 조건부 필수
- load_weight 숫자 확인
- route_changed가 yes이면 route_change_note 필수
- pedestrian_overlap이 yes이면 Safety Priority 표시
- blind_spot_area가 yes이면 Safety Priority 표시
- photos_required가 true이면 사진 1개 이상 필요
- signature_required가 true이면 confirmation_status 필요
- 같은 work_date + work_profile_id 중복 확인

고객용 오류문구:

- 작업일자를 입력해 주세요.
- 작업자를 입력해 주세요.
- 동선 변경 내용을 확인해 주세요.
- 사진 파일이 누락되어 확인이 필요합니다.
- 같은 작업일의 자료가 이미 있습니다.

## 15. Synthetic Folder Structure

권장 구조:

    DocumentStudioProjects/
      forklift-demo/
        2026-06-sample-site/
          input/
            sample_daily_work_check.json
          photos/
            sample_before_work.jpg
            sample_route.jpg
            sample_load.jpg
            sample_after_work.jpg
          output/
          templates/
            forklift_work_plan_basic_v1.xlsx
            forklift_prework_confirmation_basic_v1.xlsx
            forklift_photo_ledger_basic_v1.xlsx
          staging/
          project.json
          document_studio.db

## 16. Sample Data JSON Candidate

후보 파일:

    input/sample_daily_work_check.json

내용 후보:

    {
      "company_alias": "샘플제조",
      "site_name": "샘플제조 1공장",
      "work_date": "2026-06-30",
      "work_profile_id": "SAMPLE-FORKLIFT-001",
      "work_area": "출고장 A구역",
      "work_type": "지게차 상하차",
      "operator_name": "샘플작업자A",
      "signal_person_name": "샘플신호수A",
      "load_type": "박스 적재물",
      "load_weight": 920,
      "route_changed": true,
      "route_change_note": "적재장 B구역 앞 임시 적재물로 우회 동선 사용",
      "pedestrian_overlap": true,
      "blind_spot_area": true,
      "floor_condition_changed": true,
      "additional_risk_note": "우회 동선 구간 신호수 위치 확인 필요",
      "manager_note": "작업 전 신호수 배치 후 진행",
      "confirmation_status": "confirmed_sample"
    }

## 17. SafeMetrica Bridge Sample

SafeMetrica 연결은 MVP에서 직접 구현하지 않는다.

다만 output 설명은 다음처럼 둔다.

    이 출력물은 향후 SafeMetrica Evidence Book 또는 Monthly Report appendix 후보로 첨부할 수 있습니다.
    실제 반영은 관리자 검토 후 처리합니다.

금지:

- SafeMetrica production DB 직접쓰기
- Supabase production 직접쓰기
- Notion production 직접쓰기
- finalized monthly report 처리
- PTW 승인 처리
- 조치완료 확정

## 18. Demo Disclaimer

데모 화면과 출력물에는 다음 문구를 둔다.

    이 자료는 Document Studio 기능 시연용 가상 샘플입니다.
    실제 고객 데이터가 아니며, 법적 판단이나 작업허가 승인을 의미하지 않습니다.
    최종 검토와 작업 진행 판단은 관리자와 사업주가 수행합니다.

## 19. Next Step After This Document

이 문서 다음 작업 후보:

1. Document Studio Template Preservation Checklist v1
2. Document Studio Repo Skeleton Plan v1
3. safemetrica-document-studio 별도 repo 생성
4. PySide6 skeleton PR
5. Synthetic Forklift sample seed PR
6. Excel template output PR

## 20. Current Decision

현재 결정:

    Document Studio MVP는 실제 고객 내부문서 없이 synthetic sample로 시작할 수 있다.
    첫 demo 후보는 Forklift Work Plan Demo Pack이다.
    샘플제조 가상 데이터를 사용한다.
    Excel output을 v1 우선순위로 둔다.
    PDF는 v1.1 후보, HWPX는 research candidate로 둔다.
    SafeMetrica 연결은 evidence package 후보 설명까지만 둔다.
