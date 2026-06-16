# SafeMetrica Risk Share Version Lock v1

기준일: 2026-06-16  
작업명: Risk Share Pack Version Lock 기준 잠금 v1

## 1. 목적

Version Lock은 Risk Share Pack에서 고객 확인이 끝난 공유 준비 항목을 근로자 QR 공유와 월별 보관함에 사용할 수 있도록 고정하는 운영 원장 기준이다.

Version Lock은 단순 상태값 변경이 아니다.

다음 흐름을 분리하기 위한 기준이다.

```text
candidate
→ Owner 검토
→ risk_share_items draft
→ customer_check_status 확인
→ customer_confirmed
→ Version Lock
→ worker QR 공유
→ 월별 보관함
```

## 2. 고정 경계

아래 경계는 반드시 분리한다.

```text
accepted candidate ≠ 고객 확인 완료
risk_share_items draft ≠ worker QR 확정 노출
customer_confirmed ≠ Version Lock
Version Lock 전 항목 ≠ 최종 공유 항목
AI 후보 ≠ 관리자 확정
```

## 3. Version Lock 가능 조건

Version Lock 대상은 아래 조건을 모두 만족해야 한다.

```text
share_status = customer_confirmed
customer_check_status = confirmed
customer_confirmed = true
version_lock_id is null
```

v1에서는 `worker_visible`을 Version Lock 생성 시점에 최종 결정한다.

## 4. Version Lock 불가 조건

아래 항목은 Version Lock 대상이 아니다.

```text
share_status = draft
share_status = needs_customer_check
share_status = excluded
share_status = locked
customer_check_status != confirmed
customer_confirmed = false
version_lock_id exists
```

## 5. Version Lock 생성 결과

Version Lock 생성 시 최소 결과는 아래와 같다.

```text
1. risk_share_version_locks 원장 생성
2. 대상 risk_share_items에 version_lock_id 기록
3. 대상 risk_share_items share_status = locked
4. worker_visible 최종값 기록
5. locked snapshot은 직접 수정하지 않음
```

수정이 필요하면 기존 lock을 수정하지 않고 새 Version Lock을 생성한다.

## 6. 권장 테이블

권장 테이블명:

```text
risk_share_version_locks
```

권장 필드:

```text
id
created_at
company_code
company_name
site_name
source_title
lock_title
lock_month
item_count
customer_confirmed_count
worker_visible_count
lock_status
locked_by
notes
raw_payload
```

## 7. risk_share_items 변경 기준

Version Lock 생성 후 대상 `risk_share_items`에는 아래 값을 반영한다.

```text
share_status = locked
version_lock_id = 생성된 lock id
worker_visible = lock 생성 시 선택한 값
updated_at = now
```

`customer_confirmed`는 true 상태를 유지한다.

## 8. Worker QR 노출 기준

근로자 QR 위험요약 화면은 v1에서 아래 조건을 모두 만족하는 항목만 노출한다.

```text
share_status = locked
customer_confirmed = true
worker_visible = true
version_lock_id exists
```

이 조건을 만족하지 않으면 고객 확인이 끝났더라도 근로자 QR 확정 노출값으로 사용하지 않는다.

## 9. 월별 보관함 연결

월별 보관함에는 Version Lock 기준으로 아래 요약을 표시할 수 있다.

```text
Version Lock 생성일
대상월
Lock 항목 수
근로자 공유 노출 항목 수
고객 확인 완료 항목 수
제외 항목 수
```

고객 전달자료에는 아래 항목을 포함하지 않는다.

```text
raw_payload
Supabase 내부 UUID
Owner 링크
Admin 링크
API 링크
환경변수명과 값
토큰 또는 토큰 유사 문자열
내부 디버그 메시지
```

## 10. 금지 표현

다음 표현은 사용하지 않는다.

```text
법적 완료
면책 보장
과태료 방지
무재해 보장
AI 확정 판단
위험성평가 대행 완료
안전관리대행 완료
```

사용 가능한 표현:

```text
공유 확정 스냅샷
고객 확인 후 잠금
근로자 공유 기준 항목
월별 보관 기준 항목
관리자 확인 필요
```

## 11. 개발 순서

```text
#531 Version Lock 문서 기준
#532 Version Lock migration
#533 Version Lock 생성 API
#534 Worker Risk Summary는 locked item만 노출
#535 월별 보관함에 locked share items 반영
```

## 12. 결론

`customer_confirmed`는 고객 확인 완료 상태다.

Version Lock은 고객 확인 완료 항목을 근로자 공유와 월별 보관 기준으로 고정하는 별도 단계다.

SafeMetrica는 이 경계를 분리해 AI 후보, Owner 검토, 고객 확인, 근로자 공유, 월별 보관함이 섞이지 않게 관리한다.
