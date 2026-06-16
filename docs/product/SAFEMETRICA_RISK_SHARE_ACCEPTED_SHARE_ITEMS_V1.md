# SafeMetrica Risk Share Accepted Share Items v1

기준일: 2026-06-16
작업명: Risk Share Pack Accepted Share Items v1

## 1. 목적

Risk Share Pack에서 Owner가 후보를 accepted 또는 edited 상태로 변경해도, 해당 항목은 아직 근로자에게 공유할 확정 항목이 아니다.

이 문서는 risk_share_item_candidates에서 검토된 후보를 근로자 공유 준비 항목으로 전환하는 기준을 정의한다.

핵심 원칙:

accepted 후보는 내부 검토 완료 상태다.
share item은 고객 확인과 Version Lock 전 단계의 공유 준비 항목이다.
worker QR에는 Version Lock 이후 항목만 노출한다.

## 2. 현재 구조

현재까지 구성된 원장:

- risk_share_sources
- risk_share_item_candidates
- risk_share_candidate_review_events

현재 흐름:

1. 고객 source 접수
2. AI 또는 수동 후보 생성
3. Owner 후보 검토
4. reviewer_status 변경
5. review event 기록

다음으로 필요한 흐름:

1. accepted 또는 edited 후보를 share item 준비 항목으로 반영
2. 고객 확인 필요 여부 관리
3. 공유 범위 확인
4. Version Lock
5. 근로자 QR 공유
6. 월별 보관함 및 Export 반영

## 3. 용어 정의

candidate:

- 원본 source에서 추출되었거나 Owner가 수동 입력한 위험요인 후보
- AI 제안 또는 수동 후보일 수 있음
- 최종 공유 항목이 아님

accepted candidate:

- Owner가 내부 검토한 후보
- 고객 확인 전이며 근로자 공유 확정값이 아님

share item:

- 고객 확인과 Version Lock을 준비하기 위해 분리한 공유 준비 항목
- worker QR에 바로 노출하지 않음

locked item:

- 고객 확인과 Version Lock을 거친 공유 확정 스냅샷
- worker QR과 월별 보관함에 사용할 수 있는 기준 항목

## 4. 금지 원칙

다음은 금지한다.

- pending 후보를 share item으로 전환
- excluded 후보를 share item으로 전환
- source_id 없는 항목 전환
- candidate_id 없는 항목 전환
- 고객 확인 전 worker QR 확정 노출
- Version Lock 전 worker QR 확정 노출
- AI 후보를 관리자 확인 없이 확정 처리
- accepted를 법적 완료 또는 위험성평가 완료로 표현

## 5. 전환 가능 상태

share item으로 전환 가능한 reviewer_status:

- accepted
- edited

전환 불가:

- pending
- excluded
- needs_customer_check

needs_customer_check는 고객 확인 후 다시 accepted 또는 edited 상태로 정리한 뒤 전환한다.

## 6. 권장 테이블명

권장 테이블명:

risk_share_items

이 테이블은 최종 locked item이 아니라 공유 준비 항목이다.

Version Lock 이후에는 별도 version lock 원장 또는 lock item 원장으로 스냅샷을 남긴다.

## 7. risk_share_items 권장 필드

권장 필드:

- id
- created_at
- updated_at
- source_id
- candidate_id
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
- share_status
- customer_check_status
- customer_confirmed
- worker_visible
- version_lock_id
- source_page
- source_row
- owner_note
- customer_note
- raw_payload

## 8. share_status 기준

권장 share_status:

- draft
- needs_customer_check
- customer_confirmed
- locked
- excluded

의미:

draft:
Owner가 share item으로 전환했지만 고객 확인 전 상태

needs_customer_check:
고객에게 공유 범위 또는 표현 확인이 필요한 상태

customer_confirmed:
고객 확인이 완료된 상태. 단, Version Lock 전에는 근로자 QR 확정 노출 금지

locked:
Version Lock에 포함된 상태

excluded:
share item에서 제외된 상태

## 9. customer_confirmed와 worker_visible 기준

customer_confirmed:

- 고객 확인 또는 공유범위 확인이 완료된 경우 true
- Owner 내부 승인만으로 true 처리하지 않음

worker_visible:

- 근로자 QR 노출 가능 여부
- v1에서는 Version Lock 전까지 false 유지
- worker page에서는 worker_visible=true만 보지 말고 Version Lock 포함 여부까지 함께 확인해야 함

권장 worker 노출 조건:

- customer_confirmed=true
- worker_visible=true
- version_lock_id 존재
- share_status=locked

## 10. Version Lock 전 기준

Version Lock 전 share item은 수정 가능하다.

수정 가능 항목:

- task_name
- hazard
- accident_type
- risk_level
- current_controls
- improvement_plan
- worker_share_summary
- category
- owner_note
- customer_note
- customer_check_status

Version Lock 후에는 해당 lock snapshot을 직접 수정하지 않는다.
수정이 필요하면 새 Version Lock을 만든다.

## 11. 고객 화면 표현

고객 화면에는 다음처럼 표현한다.

사용 가능:

- 공유 준비 항목
- 고객 확인 필요
- 공유범위 확인
- 이번 달 근로자 공유 예정 항목
- Version Lock 전 검토 항목

금지:

- 법적 승인
- 위험성평가 완료 확정
- 면책 항목
- 과태료 방지 항목
- AI 확정 항목
- 위조 불가능 기록

## 12. Owner 화면 표현

Owner 화면에는 다음 정보를 보여준다.

- 후보 원본 source
- candidate 상태
- share item 전환 여부
- 고객 확인 상태
- Version Lock 포함 여부
- worker QR 노출 가능 여부
- 마지막 변경일
- 내부 메모

Owner 화면은 복잡해도 된다.
고객 화면은 단순해야 한다.

## 13. 월별 보관함 연결

월별 보관함에는 다음 요약을 넣을 수 있다.

- 공유 준비 항목 수
- 고객 확인 필요 항목 수
- 고객 확인 완료 항목 수
- Version Lock 반영 항목 수
- 근로자 공유 항목 수
- 제외 항목 수

고객 전달자료에는 내부 source_id, raw_payload, Supabase UUID, Owner 링크를 직접 포함하지 않는다.

## 14. raw_payload 금지 항목

raw_payload에 저장 금지:

- API Key
- service role
- Owner Token
- 환경변수 실제 값
- 내부 관리자 링크
- 고객 민감정보 원문
- 파일 storage key 원문
- 장문 원본 문서 내용
- token 유사 문자열

raw_payload에는 최소 진단 정보만 남긴다.

## 15. 개발 순서

1. accepted share items 기준 문서 잠금
2. risk_share_items migration
3. Supabase table type 추가
4. insert helper 추가
5. accepted 또는 edited candidate를 share item으로 전환하는 Owner API 추가
6. share-items Owner 화면에 실제 risk_share_items 조회 연결
7. 고객 확인 상태 관리
8. Version Lock 원장 추가
9. Worker Risk Summary는 locked item만 노출

## 16. 결론

accepted 후보는 내부 검토 완료일 뿐이다.

SafeMetrica는 accepted 후보를 곧바로 근로자 공유값으로 쓰지 않는다.

accepted 또는 edited 후보는 risk_share_items로 전환한 뒤,
고객 확인과 Version Lock을 거쳐 근로자 QR과 월별 보관함에 반영한다.

이 구조가 있어야 AI 후보, Owner 검토, 고객 확인, 근로자 공유가 섞이지 않고 안전운영 원장으로 남는다.
