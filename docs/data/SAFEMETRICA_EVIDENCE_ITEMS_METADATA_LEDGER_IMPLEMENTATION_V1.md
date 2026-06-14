# SafeMetrica Evidence Items Metadata Ledger Implementation v1

작업명: `feat: add evidence items metadata ledger v1`

기준일: 2026-06-14

## 1. 목적

이 문서는 SafeMetrica의 사진·파일 증빙을 제출 row 내부 URL 배열에만 두지 않고, 파일 단위 메타데이터 원장인 `evidence_items`로 분리 저장하기 위한 실제 구현 기준을 기록한다.

## 2. 구현 범위

#477의 구현 범위는 다음과 같다.

- Supabase `evidence_items` migration 추가
- 기존 테이블이 이미 있을 경우를 고려한 `add column if not exists` 보강
- RLS 활성화
- source record 기준 index 추가
- file URL 기준 index 추가
- `insertEvidenceItemMetadataRecords` server helper 추가

## 3. 실제 운영 DB 확인 결과

운영 Supabase의 기존 `evidence_items`는 action 기반 증빙 테이블 구조를 갖고 있었다.

기존 확인 컬럼:

- `id`
- `created_at`
- `action_id`
- `evidence_type_code`
- `file_url`
- `verified`
- `verified_by`
- `verified_at`

따라서 현장참여 파일 증빙을 연결하려면 기존 action 기반 구조를 보존하면서, field participation / TBM / contractor submission 파일 메타데이터를 함께 저장할 수 있도록 호환 migration이 필요하다.

## 4. 운영 원칙

- 사진 원본 binary는 DB에 저장하지 않는다.
- 원본 파일은 Blob 또는 Storage에 저장한다.
- DB에는 파일 URL, 파일명, MIME, 크기, source linkage, 제출자 표시명, 익명 여부, 제출 시각 등 메타데이터만 저장한다.
- 기존 action 기반 증빙 row는 보존한다.
- field participation 첨부파일은 action_id가 없을 수 있으므로 action_id는 nullable을 허용한다.
- AI는 사진만으로 조치완료를 확정하지 않는다.

## 5. 다음 작업

#477 이후에는 바로 기능 연결로 가지 않고, 실제 운영 DB와 schema compatibility를 먼저 맞춘다.

후속 보정 PR:

`fix: align evidence items metadata ledger with existing schema v1`

그 다음 코드 PR:

`feat: write field participation files to evidence_items`
