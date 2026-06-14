# SafeMetrica Risk Share Item Candidate Schema v1

작업명: `feat: add risk share item candidate schema v1`

기준일: 2026-06-14

## 1. 목적

Risk Share Pack Source Intake로 접수한 고객 위험성평가 source에서 AI가 추출한 위험요인 후보를 저장하기 위한 `risk_share_item_candidates` 원장을 추가한다.

이 테이블은 최종 공유항목이 아니라 후보 원장이다.

## 2. 위치

Source Intake 이후 흐름:

1. `risk_share_sources`
2. `risk_share_item_candidates`
3. 운영자 Review
4. 고객 확인
5. Version Lock
6. Worker Risk Summary 연결

## 3. 핵심 필드

- source_id
- company_code
- company_name
- site_name
- task_name
- hazard
- accident_type
- risk_level
- current_controls
- improvement_plan
- worker_share_summary
- category
- confidence
- ai_generated
- reviewer_status
- worker_visible
- customer_confirmed
- raw_payload

## 4. category 기준

- common: 업종 공통 위험
- non_common: 고객 또는 현장에만 있는 비공통 위험
- site_specific: 현장 구조, 시간대, 동선, 장비 배치 등 특이점
- worker_signal: 근로자 참여, 제보, 아차사고, 개선제안에서 나온 위험
- other: 분류 보류 또는 검토 필요

## 5. reviewer_status 기준

- pending: 검토 대기
- accepted: 채택
- edited: 수정 후 채택
- excluded: 제외
- needs_customer_check: 고객 확인 필요

## 6. 운영 원칙

AI는 후보 제안자다.

AI 후보는 운영자 검토와 고객 확인 전에는 근로자에게 확정 공유하지 않는다.

고객 확인이 끝난 후보만 Version Lock 대상으로 이동한다.

## 7. 노출 금지

근로자 화면과 고객용 Export에는 기본적으로 아래 항목을 노출하지 않는다.

- raw_payload
- internal UUID
- source 원본 전체
- 내부 reviewer_note
- service role
- Owner Token
- API Key
- 환경변수 값

## 8. 금지 표현

- 위험성평가 대행
- 안전관리대행
- 법적 의무 완료 보장
- 과태료 방지 보장
- 중대재해 면책
- 무재해 보장
- AI 법적 판단
- AI 조치완료 확정

## 9. 다음 작업

1. `feat: add extracted candidate review UI v1`
2. `feat: persist accepted share items v1`
3. `feat: persist risk share version lock v1`
4. `feat: connect locked share items to worker risk summary`
5. `feat: generate QR poster from locked share version`
