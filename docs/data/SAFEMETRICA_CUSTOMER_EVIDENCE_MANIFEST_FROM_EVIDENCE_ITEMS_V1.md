# SafeMetrica Customer Evidence Manifest from Evidence Items v1

작업명: `feat: build customer evidence manifest from evidence_items`

기준일: 2026-06-14

## 1. 목적

고객용 CSV Export의 `evidence_manifest`를 기존 제출 row 내부 파일 배열 중심에서 `evidence_items` 원장 중심으로 전환한다.

## 2. 변경 전 구조

기존 `evidence_manifest`는 다음 데이터를 기준으로 생성됐다.

- `field_participation_submissions.file_urls`
- `tbm_voice_submissions.uploaded_files`

이 방식은 파일 URL은 확인할 수 있지만, 파일 단위 증빙 역할, 원장 연결, 제출자 표시, 익명 여부, source linkage 관리가 약하다.

## 3. 변경 후 구조

변경 후 `evidence_manifest`는 `evidence_items`를 우선 읽는다.

보조 fallback으로 기존 데이터를 유지한다.

- 우선: `evidence_items`
- 보완: `field_participation_submissions.file_urls`
- 보완: `tbm_voice_submissions.uploaded_files`

동일 파일 URL은 중복 출력하지 않는다.

## 4. 고객용 CSV 컬럼

고객용 `evidence_manifest`에는 아래 컬럼만 포함한다.

- 증빙번호
- 제출일시
- 회사명
- 관련 기록 유형
- 제출구분
- 증빙유형
- 증빙역할
- 파일명
- 파일URL
- 제출자 표시
- 익명 여부
- 고객 전달 비고

## 5. 노출 금지

고객용 CSV에는 아래 값을 포함하지 않는다.

- raw_payload
- Supabase 내부 UUID
- notion_url
- notion_page_id
- Owner token
- API Key
- service role
- 환경변수명 또는 값
- 내부 디버그 메시지

## 6. 운영 원칙

`evidence_items`는 파일 원본 저장소가 아니라 파일 단위 메타데이터 원장이다.

사진 또는 파일 원본은 Blob/Storage에 저장하고, 고객용 Export에는 필요한 URL과 정제된 메타데이터만 제공한다.

AI는 증빙의 법적 적합성이나 조치완료를 확정하지 않는다.
