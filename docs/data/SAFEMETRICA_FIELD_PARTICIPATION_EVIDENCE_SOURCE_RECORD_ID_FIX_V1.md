# SafeMetrica Field Participation Evidence Source Record ID Fix v1

작업명: `fix: align field participation evidence source record id`

기준일: 2026-06-14

## 1. 배경

초기 SafeMetrica 고객사인 대도환경, 동우환경, 버블몬코리아, 한국그린환경은 Notion-first 구조로 운영되었다.

이후 Supabase 원장화가 추가되면서 현장참여 제출은 다음 흐름으로 전환 중이다.

1. Notion 현장 의견 DB 저장
2. Supabase `field_participation_submissions` shadow-write
3. Blob 사진 URL 저장
4. `evidence_items` 파일 단위 메타데이터 저장

## 2. 문제

`evidence_items.source_record_table`은 `field_participation_submissions`로 저장하면서, `source_record_id`에는 Notion page id가 우선 저장되는 문제가 있었다.

이 구조는 단기 조회에는 문제가 없지만, 장기적으로 Export, 월간보고서, 사고 후 증빙 조회에서 원장 연결 기준이 흔들릴 수 있다.

## 3. 수정 기준

앞으로 field participation 증빙은 아래 기준으로 저장한다.

- `source_record_table`: `field_participation_submissions`
- `source_record_id`: `field_participation_submissions.id`
- Notion page id: `raw_payload.notionPageId`에 보존
- client submission id: `raw_payload.clientSubmissionId`에 보존

## 4. 운영 원칙

Notion은 기존 고객 운영허브와 백오피스 역할을 유지한다.

다만 장기 원장과 Export 기준은 Supabase row id를 우선한다.

## 5. 주의

- 기존 Notion 저장 흐름은 유지한다.
- 기존 현장 제출 성공 UX는 변경하지 않는다.
- `evidence_items` 저장 실패가 현장 제출 실패로 이어지지 않도록 유지한다.
- token, API Key, service role, 환경변수 실제 값은 기록하지 않는다.
