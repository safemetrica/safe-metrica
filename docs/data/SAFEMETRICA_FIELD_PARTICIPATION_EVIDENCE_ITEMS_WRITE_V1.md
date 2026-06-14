# SafeMetrica Field Participation Evidence Items Write v1

작업명: `feat: write field participation files to evidence_items`

기준일: 2026-06-14

## 1. 목적

이 문서는 근로자 현장참여 제출에서 업로드된 사진·파일을 `field_participation_submissions.file_urls`에만 남기지 않고, 파일 단위 메타데이터 원장인 `evidence_items`에도 저장하도록 연결한 구현 기록이다.

## 2. 구현 범위

이번 PR에서는 `/api/field/participation/submit` 저장 흐름에 `evidence_items` 메타데이터 저장을 추가한다.

기존 흐름:

1. 근로자 현장참여 제출
2. Vercel Blob 파일 업로드
3. Notion 현장참여 DB page 생성
4. Supabase `field_participation_submissions` shadow-write

추가 흐름:

5. 업로드된 파일별로 `evidence_items` metadata row 생성

## 3. 저장 기준

`evidence_items`에는 사진 원본 binary를 저장하지 않는다.

저장하는 항목:

- company code
- company name
- source type
- source record table
- source record id
- submission type
- file URL
- file name
- MIME type
- file size
- evidence role
- submitted by label
- anonymous flag
- raw payload metadata

## 4. Evidence role 기준

| 제출구분 | evidence_role |
|---|---|
| 공유확인 | `share_confirmation_attachment` |
| 위험제보 | `worker_report_attachment` |
| 아차사고 | `near_miss_attachment` |
| 개선제안 | `improvement_suggestion_attachment` |
| 기타 | `field_participation_attachment` |

## 5. 실패 처리 기준

`evidence_items` 저장 실패는 v1에서 근로자 제출 실패로 처리하지 않는다.

이유:

- 현장 제출 UX가 우선이다.
- 기존 Notion 저장과 `field_participation_submissions` 원장 흐름을 깨면 안 된다.
- evidence metadata 저장 실패는 서버 로그로 남기고 후속 점검한다.

## 6. 후속 작업

1. 고객용 `evidence_manifest` Export를 `evidence_items` 우선으로 보강
2. Risk Share Pack 월간보고서에 evidence summary 연결
3. TBM voice uploaded files도 `evidence_items`에 연결
4. contractor submissions 파일도 `evidence_items`에 연결
5. Owner Console에서 evidence ledger 조회 추가

## 7. 금지 원칙

- 파일 원본 binary를 DB에 저장하지 않는다.
- token, API Key, service role, 환경변수 실제 값을 저장하거나 노출하지 않는다.
- AI가 사진만으로 조치완료를 확정하지 않는다.
- 사진 첨부만으로 법적 의무 완료를 표현하지 않는다.
