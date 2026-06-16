# SafeMetrica TBM Voice Input Quality v1

기준일: 2026-06-16
작업명: TBM 음성 입력 품질 / 노이즈 대응 v1

## 1. 목적

TBM 음성작성 기능은 이미 음성 인식, TBM 내용 자동 정리, 사진 첨부, 앱 직접 저장 흐름까지 구현되어 있다.

다음 단계는 현장 소음 환경에서 음성 입력 품질을 안정화하는 것이다.

v1의 목적은 서버 AI denoise가 아니라 브라우저 입력 품질 개선과 현장 UX 개선이다.

## 2. 현재 상태

현재 가능:

- 음성 인식
- TBM 내용 자동 정리
- 사진 4종 분리 첨부
- 앱에서 TBM 바로 저장
- Notion TBM DB 저장
- 중복 저장 방지
- 업체별 일부 매핑

아직 부족:

- 현장 소음 대응
- 마이크 입력 품질 안내
- noiseSuppression 적용 여부 확인
- echoCancellation 적용 여부 확인
- autoGainControl 적용 여부 확인
- 녹음 전 테스트
- 재녹음 UX
- STT 실패 시 수동 보정 흐름
- 음성 intent 분류
- 업체별 업종 프로필 태깅

## 3. v1 범위

v1에서 적용할 것:

- getUserMedia audio constraints 적용
- noiseSuppression: true
- echoCancellation: true
- autoGainControl: true
- 녹음 전 안내문 추가
- 짧게 말하기 안내
- 주변 소음이 큰 경우 재녹음 안내
- STT 결과를 바로 확정하지 않고 수정 가능하게 유지
- 음성 인식 실패 시 수동 입력으로 전환

v1에서 하지 않을 것:

- 서버 음성파일 저장
- 서버 AI denoise
- 음성 원본 장기 보관
- 녹음파일 고객 전달
- AI가 TBM 실시 여부를 확정 판단
- 법적 교육 완료 확정 표현

## 4. 권장 audio constraints

브라우저 마이크 요청 시 권장값:

audio:
  echoCancellation: true
  noiseSuppression: true
  autoGainControl: true

주의:

- 모든 기기와 브라우저가 동일하게 지원하지 않는다.
- 지원하지 않는 옵션은 브라우저가 무시할 수 있다.
- 따라서 UI 문구는 “노이즈캔슬링 보장”이 아니라 “소음 억제 설정을 요청합니다” 수준으로 표현한다.

## 5. 현장 UX 문구

사용 가능:

- 주변 소음이 크면 가까이 말해주세요.
- 10초 정도 짧게 나눠 말하면 인식률이 좋아집니다.
- 인식 결과는 저장 전 수정할 수 있습니다.
- 소음이 큰 경우 다시 녹음하거나 직접 입력할 수 있습니다.
- 음성 인식 결과는 초안이며 관리자가 확인 후 저장합니다.

금지:

- 자동 교육완료 판정
- 법적 증빙 완료 보장
- 노이즈 제거 보장
- AI 확정 판단
- 무재해 보장
- 중대재해 면책

## 6. 음성 intent 분류 후보

음성 내용은 아래 intent 후보로 분리한다.

- work_tbm: 일반 작업 전 TBM
- policy_briefing: 안전보건경영방침 공유
- risk_assessment_share: 위험성평가 주지
- action_followup: 조치사항 공유
- incident_near_miss: 아차사고/위험제보
- training_notice: 교육/공지
- unknown: 분류 불가

중요:

intent는 저장 분류 후보일 뿐이다.
AI 확정값이 아니다.
최종 정리는 관리자 확인 후 저장한다.

## 7. 업체별 업종 프로필 후보

생활폐기물:

- 수거
- 차량후진
- 골목길
- 보행자
- 끼임
- 찔림
- 우천
- 미끄럼
- 새벽작업

물류:

- 상하차
- 포장
- 이동장비
- 적재
- 지게차
- 랙
- 보행자 동선
- 낙하물

환경/재활용:

- 선별
- 압축
- 컨베이어
- 절단
- 찔림
- 분진
- 악취
- 미끄럼

## 8. 저장 정책

v1에서는 음성 원본 파일을 장기 저장하지 않는다.

저장 후보:

- STT 텍스트
- 관리자 수정 후 최종 TBM 내용
- intent 후보
- 인식 실패 여부
- 수동 보정 여부
- 녹음 방식: voice / manual / mixed
- 입력 품질 메모

저장 금지:

- 원본 음성파일 장기보관
- 민감 대화 원문
- 개인정보 과다 저장
- API Key
- token
- 내부 환경변수
- 고객 민감정보 원문

## 9. 후속 작업 순서

1. 현재 TBM voice UI 파일 위치 확인
2. getUserMedia audio constraints 적용
3. 녹음 전 안내문 추가
4. 재녹음 / 수동입력 UX 보강
5. intent 분류 v1 문서화
6. 업체별 업종 프로필 태깅
7. Supabase 원본 저장 확장
8. 서버 denoise는 비용·개인정보·저장정책 확정 후 검토

## 10. 결론

TBM 음성 기능은 이미 입력과 저장의 1차 흐름은 갖췄다.

다음 고도화는 서버 AI denoise가 아니라 현장 입력 품질과 신뢰 UX를 먼저 개선한다.

SafeMetrica의 음성 기능은 AI가 교육 여부를 확정하는 도구가 아니라,
관리자가 현장 TBM 내용을 더 쉽게 기록하고 확인하도록 돕는 입력 보조 기능이다.
