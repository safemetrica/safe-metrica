# SafeMetrica Risk Share Source File Intake v1

작업명: `feat: add risk share source file intake v1`

기준일: 2026-06-14

## 1. 목적

Risk Share Pack 신규 고객이 제공한 위험성평가표, 평가결과지, PDF, Excel, 이미지 자료를 Owner Console에서 접수하기 위한 Source File Intake v1을 추가한다.

## 2. v1 범위

- Owner 전용 source intake 화면
- 고객 코드 후보 입력
- 고객명 입력
- 현장명 입력
- source 문서명 입력
- source 유형 선택
- source 파일 업로드
- 접수 메모 입력
- Vercel Blob 파일 저장
- Supabase `risk_share_sources` 메타데이터 저장
- AI 추출 대기 상태 표시

## 3. 저장 기준

고객 위험성평가 원본 파일은 GitHub에 저장하지 않는다.

원칙:

- 원본 파일: Vercel Blob
- 메타데이터: Supabase `risk_share_sources`
- 추출 상태: `raw_text_status`, `extraction_status`, `review_status`
- AI 추출 결과: 후속 `risk_share_item_candidates`

## 4. 운영 기준

Source File Intake는 위험성평가 파일 접수와 AI 추출 대기 상태를 만들기 위한 화면이다.

이 화면은 위험성평가 작성 대행, 법적 완료 판단, 조치완료 확정, 사고 예방 보장을 의미하지 않는다.

## 5. 후속 작업

1. raw text extraction
2. AI extracted share item candidates
3. candidate review UI
4. accepted share items persistence
5. version lock persistence
6. worker risk-summary connection
