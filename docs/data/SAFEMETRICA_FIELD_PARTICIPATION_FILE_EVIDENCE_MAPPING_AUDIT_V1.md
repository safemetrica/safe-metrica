# SafeMetrica Field Participation File Evidence Mapping Audit v1

작업명: `docs: audit field participation file evidence mapping v1`

기준일: 2026-06-14

## 1. 목적

이 문서는 근로자 현장참여 제출에서 첨부되는 사진·파일이 현재 어떻게 저장되고, Supabase 원장 및 `evidence_items` 메타데이터 원장과 어떻게 연결되어야 하는지 정리한다.

대상 흐름:

- 근로자 공유확인
- 위험제보
- 아차사고
- 개선제안
- 사진 또는 파일 첨부
- Vercel Blob 저장
- `field_participation_submissions` 저장
- `evidence_items` 메타데이터 연결 후보
- 고객용 Export evidence manifest
- Risk Share Pack 월간보고서 증빙 목록

## 2. 현재 구조 요약

현장참여 제출은 `/field/participation` 화면에서 시작되고, `/api/field/participation/submit` API를 통해 저장된다.

현재 확인 기준:

- 사진·파일 원본은 Vercel Blob 저장 후보
- 제출 원장은 `field_participation_submissions` 저장 후보
- 첨부 URL은 `file_urls` 또는 동등한 배열 필드로 저장 후보
- 고객용 CSV Export는 `worker_share_confirmations`, `worker_reports`, `evidence_manifest` dataset 후보를 가진다
- `evidence_items`는 장기 증빙 메타데이터 원장 후보이나, 현장참여 첨부파일이 실제로 item 단위로 기록되는지는 추가 구현 필요 가능성이 있다

## 3. 현재 gap

| 항목 | 현재 상태 | gap | 후속 방향 |
|---|---|---|---|
| 사진 원본 저장 | Vercel Blob 저장 후보 | 저장 URL은 있으나 증빙 메타데이터 원장과 1:1 연결 불명확 | Blob 저장 후 `evidence_items` row 생성 |
| 제출 원장 | `field_participation_submissions` 후보 | 제출 단위 원장은 있으나 파일 단위 원장 분리가 부족할 수 있음 | submission 1건 : evidence_items N건 구조 |
| 공유확인 첨부 | 가능 후보 | 공유확인과 위험제보 첨부가 같은 파일 구조에 섞일 수 있음 | `source_type`, `submission_type` 명시 |
| 위험제보 첨부 | 가능 후보 | 위험유형·위치·조치상태와 파일 연결이 약할 수 있음 | `related_submission_id`, `related_risk_id` 후보 저장 |
| 고객용 Export | `evidence_manifest` 후보 | 실제 `evidence_items` 기반인지 file URL 기반인지 확인 필요 | evidence manifest를 `evidence_items` 중심으로 전환 |
| 월간보고서 | 증빙 요약 후보 | 사진 목록이 제출 원장 기준인지 증빙 원장 기준인지 불명확 | 월간보고서 증빙 목록은 `evidence_items` 기준으로 표시 |

## 4. 권장 메타데이터 구조

`evidence_items`에는 최소 아래 필드가 필요하다.

| 필드 | 목적 |
|---|---|
| `evidence_id` | 증빙 고유 ID |
| `company_code` | 고객사 구분 |
| `site_id` 또는 `site_name` | 현장 구분 |
| `source_type` | `field_participation` |
| `source_record_id` | `field_participation_submissions` row 참조 |
| `submission_type` | 공유확인 / 위험제보 / 아차사고 / 개선제안 / 기타 |
| `file_url` | Blob URL |
| `file_name` | 파일명 |
| `file_mime_type` | MIME type |
| `file_size` | 파일 크기 |
| `evidence_role` | report_attachment / share_confirmation_attachment / action_photo_candidate 등 |
| `submitted_at` | 제출 시각 |
| `submitted_by_label` | 고객용 표시 제출자 |
| `anonymous` | 익명 여부 |
| `created_at` | 원장 생성 시각 |

## 5. 저장 흐름 권장안

권장 흐름:

1. 근로자 제출
2. 첨부파일 압축
3. Vercel Blob 저장
4. Blob URL 확보
5. `field_participation_submissions`에 제출 원장 저장
6. 저장된 제출 원장 ID 확보
7. 첨부파일별 `evidence_items` row 생성
8. 고객용 Export evidence manifest에 반영
9. 월간보고서 증빙 목록에 반영

## 6. 주의할 점

- 사진 원본을 Supabase DB row에 직접 저장하지 않는다.
- DB에는 URL과 메타데이터만 저장한다.
- 고객용 Export에는 내부 UUID, raw payload, token, API Key, service role, 환경변수 값을 포함하지 않는다.
- 익명 제보라도 완전 익명 보장 표현은 쓰지 않는다.
- AI가 사진만 보고 조치완료를 확정하지 않는다.
- 사진 첨부는 증빙 후보이며, 최종 검토와 조치 판단은 관리자 확인을 거친다.

## 7. 다음 코드 PR 후보

다음 PR:

`feat: write field participation files to evidence_items`

구현 범위 후보:

- `/api/field/participation/submit`에서 Blob 저장 결과를 파일 단위 metadata로 정리
- `field_participation_submissions` 저장 후 source record id 확보
- 첨부파일별 `evidence_items` insert
- 실패 시 제출 자체를 막을지, evidence metadata만 warning 처리할지 정책 결정
- 고객용 `evidence_manifest` Export가 `evidence_items`를 우선 읽도록 보강
- 월간보고서 Risk Share Pack 증빙 목록에 연결

## 8. 결론

현장참여 제출의 핵심 원장은 `field_participation_submissions`다.

하지만 사진·파일 증빙은 제출 row 안의 URL 배열만으로는 장기 운영, Export, 월간보고서, 사고 후 검색, 증빙 무결성 관리에 한계가 있다.

따라서 다음 단계는 현장참여 첨부파일을 `evidence_items` 메타데이터 원장으로 분리 저장하는 것이다.
