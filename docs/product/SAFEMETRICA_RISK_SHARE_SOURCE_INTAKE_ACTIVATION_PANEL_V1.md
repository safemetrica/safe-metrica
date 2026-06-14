# SafeMetrica Risk Share Source Intake Activation Panel v1

작업명: `feat: add risk share pack source intake activation panel`

기준일: 2026-06-14

## 1. 목적

신규 고객 Risk Share Pack 도입 시 고객사 코드 후보, 위험성평가 source 접수, 공유항목 정리, 고객 확인, 버전 잠금, QR 활성화 상태를 Owner Console에서 확인하기 위한 상태판을 추가한다.

## 2. 기준

Risk Share Pack은 고객의 위험성평가 source가 준비된 이후 운영된다.

이 화면은 위험성평가를 대신 작성하거나 법적 완료를 보장하는 화면이 아니다.

## 3. v1 범위

- 저장 기능 없음
- 신규 고객 코드 후보 입력
- 고객명 입력
- source 접수 상태 체크
- 공유항목 정리 상태 체크
- 고객 확인 상태 체크
- 버전 잠금 상태 체크
- Companies DB 등록 상태 체크
- QR 링크 후보 생성
- 관리자 공유팩 홈 링크 후보 생성

## 4. 운영 기준

Companies DB에 `companyCode`와 `active=true` row가 등록되기 전에는 실제 운영 라우트가 정상 동작하지 않을 수 있다.

v1은 신규 고객 활성화의 순서를 보이게 하는 상태판이며, v2에서 source 저장과 share item builder를 분리 구현한다.

## 5. 후속

1. Source Intake 저장
2. Share Item Builder
3. Version Lock
4. QR Poster 자동 생성
5. Go-Live Checklist 연동
