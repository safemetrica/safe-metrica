# SafeMetrica Risk Share Monthly Evidence Summary v1

작업명: `feat: show evidence summary in risk share monthly report`

기준일: 2026-06-14

## 1. 목적

Risk Share Pack 월간보고서에 `evidence_items` 원장 기준 증빙 요약을 표시한다.

## 2. 구현 범위

이번 PR은 읽기 전용 화면 보강이다.

- `/monthly-report/risk-share`에서 `evidence_items` 조회
- 월간 기간 기준 증빙 수 집계
- 공유확인 첨부, 위험제보 첨부, 아차사고 첨부, 개선제안 첨부, 현장참여 첨부 전체, TBM 보완 증빙 수 표시
- 고객 민감정보, raw_payload, 내부 UUID, Notion URL은 표시하지 않음

## 3. 표시 기준

표시 항목:

- 이번 달 증빙 파일 수
- 근로자 공유확인 첨부 수
- 위험제보 첨부 수
- 아차사고 첨부 수
- 개선제안 첨부 수
- 현장참여 첨부 전체 수
- TBM 보완 증빙 수

## 4. 운영 원칙

사진·파일 증빙은 운영 확인을 위한 참고자료다.

앱은 증빙 첨부 여부만으로 조치완료, 법적 적합성, 사고 예방 완료를 확정하지 않는다.

AI는 법적 판단자나 조치 확정자가 아니라 후보 제안자다.

## 5. 후속 작업

- TBM voice uploaded files를 `evidence_items`에 직접 연결
- Risk Share Pack 월간보고서 증빙 상세 다운로드 연결
- 고객용 PDF/Excel Export와 evidence manifest 연결
