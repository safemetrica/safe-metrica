# SafeMetrica Risk Share Candidate Review Audit Log v1

기준일: 2026-06-16
작업명: Risk Share Pack 후보 검토 감사이력 v1

## 1. 목적

risk_share_item_candidates의 reviewer_status 변경 이력을 별도 이벤트 원장으로 남긴다.

현재 risk_share_item_candidates는 후보의 현재 상태를 저장한다.
하지만 현재 상태만으로는 누가, 언제, 어떤 상태에서 어떤 상태로 변경했는지 설명하기 어렵다.

따라서 후보 상태 변경은 현재값 업데이트와 별개로 감사이력 이벤트를 남긴다.

## 2. 핵심 원칙

risk_share_item_candidates는 현재 후보 상태 원장이다.

risk_share_candidate_review_events는 후보 상태 변경 이력 원장이다.

상태 변경 시 원칙은 다음과 같다.

1. candidate 존재 확인
2. companyCode 범위 확인
3. previous_status 확보
4. risk_share_item_candidates 업데이트
5. risk_share_candidate_review_events insert
6. 후보 검토함으로 redirect

상태 변경 이벤트 없이 reviewer_status만 바꾸는 흐름은 금지한다.

## 3. 상태값 기준

허용 reviewer_status:

- pending
- accepted
- edited
- excluded
- needs_customer_check

의미:

- pending: Owner 검토 대기
- accepted: Owner 승인
- edited: 수정 후 승인
- excluded: 공유팩 후보 제외
- needs_customer_check: 고객 확인 필요

주의:

accepted는 법적 확정, 위험성평가 완료, 근로자 공유 확정이 아니다.
고객 확인과 Version Lock 전에는 근로자 공유 확정값으로 사용하지 않는다.

## 4. 이벤트 원장 후보 필드

권장 테이블명:

risk_share_candidate_review_events

권장 필드:

- id
- created_at
- candidate_id
- source_id
- company_code
- company_name
- previous_status
- next_status
- reviewer_note
- actor_type
- actor_label
- worker_visible
- customer_confirmed
- event_type
- raw_payload

event_type v1 허용값:

- status_change

actor_type v1 허용값:

- owner
- system

## 5. raw_payload 금지 항목

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

예시:

source: owner_candidate_status_update_v1
changedBy: owner
previousStatus: pending
nextStatus: accepted

## 6. 고객 및 근로자 노출 기준

감사이력 원장은 고객에게 원문 그대로 노출하지 않는다.

고객에게는 요약만 제공한다.

예시:

- Owner 검토 완료
- 고객 확인 필요
- 제외 처리
- Version Lock 완료

근로자 화면에는 다음 조건을 만족한 항목만 노출한다.

- Version Lock 이후
- worker_visible=true
- customer_confirmed=true
- 공유 범위에 포함된 항목

## 7. 월별 보관함 연결

월별 보관함에는 다음 요약을 넣을 수 있다.

- 후보 생성 수
- Owner 승인 수
- 고객 확인 필요 수
- 제외 수
- Version Lock 반영 수

단, sourceId, raw_payload, 내부 storage 정보, 내부 링크는 고객 전달자료에 직접 포함하지 않는다.

## 8. 개발 순서

1. 문서 기준 잠금
2. risk_share_candidate_review_events migration
3. event insert helper
4. status update API에 event insert 연결
5. 후보 검토함에 이력 요약 표시
6. Version Lock 이벤트와 연결
7. 월별 보관함 요약에 반영

## 9. 금지 표현

금지:

- AI 확정
- 법적 적합 확정
- 면책 보장
- 과태료 방지 보장
- 위험성평가 완료 보장
- 무재해 보장
- 안전관리대행

## 10. 결론

Risk Share Pack 후보 검토 기능은 상태 변경만으로는 부족하다.

현재 상태는 risk_share_item_candidates에 둔다.
상태 변경의 근거와 흐름은 risk_share_candidate_review_events에 남긴다.

이 구조가 있어야 SafeMetrica가 단순 입력앱이 아니라, 검토와 확인 흐름을 설명할 수 있는 안전운영 기록 SaaS가 된다.
