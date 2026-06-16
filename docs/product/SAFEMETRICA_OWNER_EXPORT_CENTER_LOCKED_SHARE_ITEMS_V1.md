# SafeMetrica Owner Export Center — locked_share_items v1

기준일: 2026-06-16  
작업명: Owner Export Center locked_share_items 운영 기준 v1

## 1. 목적

`locked_share_items` Export는 Risk Share Pack에서 Version Lock이 완료된 공유항목만 고객 전달용 CSV로 정리하는 흐름이다.

이 Export는 고객에게 직접 다운로드 버튼을 노출하는 기능이 아니라, Owner 또는 내부 운영자가 확인 후 고객에게 전달하는 운영자료다.

## 2. 현재 연결 상태

현재까지 연결된 흐름은 아래와 같다.

```text
#538 고객용 CSV Export에 locked_share_items dataset 추가
#539 Risk Share Pack Export Panel에 Version Lock 공유항목 CSV 안내 추가
```

즉, API와 관리자 안내는 연결되어 있다.

## 3. Export 대상 조건

`locked_share_items` CSV는 아래 조건을 모두 만족하는 항목만 대상으로 한다.

```text
share_status = locked
customer_confirmed = true
worker_visible = true
version_lock_id exists
```

아래 항목은 고객 전달 CSV에 포함하지 않는다.

```text
draft
needs_customer_check
customer_confirmed 상태지만 version_lock_id 없는 항목
worker_visible = false
excluded
raw_payload
Owner 링크
Admin 링크
API 링크
토큰 또는 토큰 유사 문자열
환경변수명과 값
내부 디버그 메시지
```

## 4. CSV 용도

`locked_share_items` CSV는 아래 목적의 확인자료다.

```text
이번 달 고객 확인 후 근로자에게 공유한 위험요인 목록
근로자 QR에 실제 노출 가능한 공유 기준 항목
월별 보관함에 포함할 공유항목 목록
고객에게 전달 가능한 운영기록 요약
```

이 CSV는 법적 판단, 면책, 조치완료, 무재해 보장, AI 확정 판단을 의미하지 않는다.

## 5. 고객 전달 방식

권장 방식:

```text
1. Owner가 Export Center에서 locked_share_items CSV 생성
2. 내부 운영자가 항목 수, 기간, 고객코드 확인
3. raw_payload, 내부 링크, 토큰 유사 문자열 포함 여부 확인
4. 월간보고서 또는 고객용 보관폴더에 첨부
5. 고객에게 “월별 공유항목 확인자료”로 전달
```

고객에게 직접 API URL을 전달하지 않는다.

## 6. 파일명 기준

권장 파일명:

```text
safemetrica-customer-locked_share_items-{companyKey}-{startDate}-{endDate}.csv
```

예시:

```text
safemetrica-customer-locked_share_items-woogwang-2026-06-01-2026-06-30.csv
```

## 7. 발표자료용 쉬운 설명

심사·멘토링 자료에서는 아래처럼 설명한다.

```text
SafeMetrica는 위험성평가표를 만든 뒤 끝내지 않습니다.
고객 확인이 끝난 항목만 Version Lock으로 고정하고,
근로자에게 실제 공유된 항목을 월별 CSV로 남깁니다.
```

더 쉬운 표현:

```text
“이번 달 근로자에게 어떤 위험요인을 공유했는지 파일로 남기는 기능입니다.”
```

## 8. 금지 표현

아래 표현은 사용하지 않는다.

```text
법적 완료
면책 보장
과태료 방지
무재해 보장
AI 확정 판단
위험성평가 대행 완료
안전관리대행 완료
```

## 9. 후속 작업 후보

```text
#541 발표용 SafeMetrica 기능 요약 문서
#542 상시 Work Signal v1 문서
#543 살아있는 위험성평가 v1 문서
#544 말로 PTW v1 문서
```

## 10. 결론

`locked_share_items` Export는 Risk Share Pack의 고객 전달자료 중 핵심 항목이다.

SafeMetrica는 Version Lock 전 항목과 고객 확인 전 항목을 고객용 Export에서 분리해, 근로자 공유 기준이 확정된 항목만 월별 보관자료로 남긴다.
