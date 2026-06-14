# SafeMetrica Evidence Items Metadata Ledger Implementation v1

작업명: `feat: add evidence items metadata ledger v1`

기준일: 2026-06-14

## 1. 목적

이 문서는 SafeMetrica의 사진·파일 증빙을 제출 row 내부 URL 배열에만 두지 않고, 파일 단위 메타데이터 원장인 `evidence_items`로 분리 저장하기 위한 실제 구현 기준을 기록한다.

## 2. 구현 범위

이번 PR의 범위는 다음과 같다.

- Supabase `evidence_items` migration 추가
- 기존 테이블이 이미 있을 경우를 고려한 `add column if not exists` 보강
- RLS 활성화
- source record 기준 index 추가
- file URL 기준 index 추가
- `insertEvidenceItemMetadataRecords` server helper 추가

## 3. 아직 하지 않는 것

이번 PR에서는 `/api/field/participation/submit`에 직접 연결하지 않는다.

이유는 현장참여 저장 흐름이 현재 Notion 저장 성공 후 Supabase shadow-write로 운영되고 있고, 제출 성공 UX를 깨면 안 되기 때문이다.

다음 PR에서 현장참여 첨부파일을 `evidence_items`로 연결한다.

## 4. 다음 PR

다음 작업:

`feat: write field participation files to evidence_items`

후속 구현 기준:

- Blob upload result를 파일 단위 metadata로 변환
- `field_participation_submissions` shadow-write 이후 evidence metadata insert
- `evidence_items` insert 실패는 v1에서 제출 실패로 처리하지 않고 서버 로그로 남김
- 고객용 Export와 월간보고서 증빙 목록은 후속 PR에서 연결

## 5. 운영 원칙

- DB에는 사진 원본 binary를 저장하지 않는다.
- 원본 파일은 Blob/Storage에 저장한다.
- `evidence_items`에는 URL, 파일명, MIME, 크기, source linkage, 제출자 표시명, 익명 여부만 저장한다.
- 고객용 Export에는 내부 token, API Key, service role, 환경변수 값, raw payload를 노출하지 않는다.
- AI는 사진만으로 조치완료를 확정하지 않는다.
