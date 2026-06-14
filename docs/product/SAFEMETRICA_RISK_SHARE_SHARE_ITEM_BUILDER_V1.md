# SafeMetrica Risk Share Share Item Builder v1

작업명: `feat: add risk share pack share item builder v1`

기준일: 2026-06-14

## 1. 목적

Risk Share Pack 신규 고객 활성화 과정에서 고객이 제공한 위험성평가 source를 근로자 QR 공유용 항목으로 정리하는 Owner 전용 Builder 화면을 추가한다.

## 2. v1 범위

이번 v1은 저장 기능 없이 정리·미리보기 화면으로 구현한다.

포함 항목:

- 고객 코드 후보
- 고객명
- source 문서명
- 작업명
- 위험요인
- 사고유형
- 위험등급
- 근로자가 확인할 안전조치
- 근로자 QR 표시 여부
- 고객 공유범위 확인 여부

## 3. 운영 기준

Risk Share Pack은 위험성평가 자체를 대신 작성하지 않는다.

이 Builder는 고객 source에서 근로자에게 공유할 요약 항목을 정리하는 도구다.

## 4. 후속 작업

1. Builder 저장
2. Share item version lock
3. 실제 근로자 risk-summary와 share item source 연결
4. QR Poster 자동 생성
5. Go-Live checklist 연동
