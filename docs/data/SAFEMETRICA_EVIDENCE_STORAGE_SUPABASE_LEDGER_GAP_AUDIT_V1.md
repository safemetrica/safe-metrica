# SafeMetrica Evidence Storage / Supabase Ledger Gap Audit v1

작업명: `docs: audit current evidence storage and supabase ledger gaps v1`

기준일: 2026-06-14

## 1. 목적

이 문서는 SafeMetrica의 사진·제보·TBM·공유확인·근로자대표 확인 기록이 현재 어디에 저장되는지 감사하고, Supabase 원장화가 완료된 영역과 아직 Notion, Vercel Blob, 임시 snapshot, 문서 기준에 머무는 영역을 분리하기 위한 기준 문서다.

핵심 확인 대상은 다음과 같다.

- field participation submissions
- worker share confirmations
- worker reports
- worker representative confirmations
- tbm voice submissions
- contractor submissions
- evidence items
- Vercel Blob 저장 구조
- Supabase 테이블 구조
- Notion fallback 구조
- 고객용 Export 반영 여부
- 월간보고서 반영 여부

## 2. 감사 기준

SafeMetrica의 장기 원장은 Supabase를 기준으로 한다.

사진 원본은 DB에 직접 저장하지 않는다. 사진·파일 원본은 Vercel Blob 또는 향후 정한 Storage에 저장하고, Supabase에는 URL, 연결 대상, 제출자, 제출시각, evidenceId, riskId, sourceType 등 메타데이터를 저장하는 구조를 목표로 한다.

Notion은 기존 고객 백오피스, 운영 확인, RAG 자료, 과거 기록 확인용으로 유지할 수 있으나 신규 고객과 장기 운영 기준에서는 Supabase-first 원장 구조를 우선한다.

## 3. 현재 저장구조 감사표

| 기록 유형 | 현재 입력 화면/API | 현재 원본 저장 위치 | 사진/파일 저장 위치 | Supabase 원장 여부 | Notion fallback 여부 | Export 반영 여부 | 월간보고서 반영 여부 | 남은 gap | 다음 PR 후보 |
|---|---|---|---|---|---|---|---|---|---|
| 근로자 공유확인 | `/field/participation`, `/api/field/participation/submit` | `field_participation_submissions` 후보 | Vercel Blob 후보, `file_urls` 후보 | 부분 완료 | 기존 고객 Notion 병행 가능 | `worker_share_confirmations` CSV 후보 | Risk Share Pack 월간요약 후보 | 공유확인과 위험제보가 같은 원장에 저장되므로 dataset 분리 view 기준 확인 필요 | `docs: define worker share confirmation ledger mapping v1` |
| 위험제보 / 아차사고 / 개선제안 | `/field/participation`, `/api/field/participation/submit` | `field_participation_submissions` | Vercel Blob 후보, `file_urls` 후보 | 부분 완료 | 기존 고객 Notion 병행 가능 | `worker_reports` CSV 후보 | Risk Share Pack 월간요약 후보 | 사진 메타데이터가 `evidence_items`로 독립 연결되는지 확인 필요 | `feat: map field participation files to evidence items` |
| 근로자대표 참여확인 | `/field/representative-confirmation?linkId=...`, `/api/worker-representative/confirmation/submit` | `worker_representative_confirmations` | 현재 기본 폼은 파일첨부 없음 | 완료 후보 | Notion fallback 없음 또는 제한 | `worker_representative_confirmations` CSV 반영 후보 | 월간보고서 반영 후보 | 상태 변경, 정정 이력, audit event 연결 확인 필요 | `feat: add representative confirmation review status update` |
| 근로자대표 확인 링크 | `/manager/representative-confirmations`, `/api/manager/representative-confirmation-links/create`, `/revoke` | `worker_representative_confirmation_links` | 해당 없음 | 완료 후보 | 없음 | 직접 고객 Export 대상 아님 | 월간보고서에는 상태 요약 후보 | 생성/폐기/접근 audit event 연결 확인 필요 | `feat: add representative link audit events` |
| TBM 음성작성 | `/api/tbm/voice-submit` | `tbm_voice_submissions` 후보 | Vercel Blob, `uploaded_files` 후보 | 부분 완료 | Notion TBM DB 직접저장 병행 | `tbm_records` CSV 후보 | 일반 월간보고서 반영 후보 | Notion 저장 성공 후 shadow-write인지, Supabase-first인지 구분 필요 | `docs: audit tbm voice submit storage order v1` |
| TBM 사진첨부 | `TbmVoiceDraftHelper`, `/api/tbm/voice-submit` | Notion TBM files + Supabase snapshot 후보 | Vercel Blob | 부분 완료 | Notion TBM DB files 병행 | `evidence_manifest` 후보 | 증빙 요약 후보 | 사진별 evidenceId, sourceType, risk/action 연결 부족 가능 | `feat: write tbm voice uploaded files to evidence_items` |
| 협력사 제출자료 | `/contractor/mons` 등 | Notion Contractor Submissions 후보 | Vercel Blob | Supabase 원장 미확정 | Notion 중심 | Export 미확정 | 월간보고서 일부 반영 후보 | Risk Share Pack 원장과 별도. 신규 고객에서 Supabase-first 재설계 필요 | `docs: audit contractor submission storage v1` |
| evidence_items | 문서상 표준 원장 후보 | Supabase `evidence_items` 목표 | Storage/Blob URL 메타데이터 | 실제 사용 여부 확인 필요 | 없음 | `evidence_manifest` 후보 | 월간보고서 증빙 목록 후보 | 실제 migration, insert 경로, source 연결 확인 필요 | `feat: add evidence_items metadata write v1` |

## 4. 1차 확인 결과

### 4.1 Supabase 원장화가 비교적 명확한 영역

- `field_participation_submissions`
- `tbm_voice_submissions`
- `worker_representative_confirmations`
- `worker_representative_confirmation_links`

### 4.2 사진 저장이 확인되는 영역

- `/api/field/participation/submit`에서 Vercel Blob 사용 후보
- `/api/tbm/voice-submit`에서 Vercel Blob 사용 후보
- 모바일 입력 컴포넌트에서 사진 압축 후 전송 후보

### 4.3 아직 gap 가능성이 큰 영역

- 사진 원본 URL과 `evidence_items` 메타데이터 원장의 실제 연결
- TBM 사진, 위험제보 사진, 조치사진을 하나의 evidence manifest로 통합하는 기준
- 고객용 Export의 `evidence_manifest`가 실제 `evidence_items` 기반인지, 기존 file URL 기반인지
- 월간보고서에서 사진 증빙 목록이 원장 기준으로 표시되는지
- 협력사 제출자료의 Supabase-first 전환 여부
- Notion 저장 성공 후 Supabase shadow-write인 영역과 Supabase-first 저장 영역의 구분

## 5. 운영상 중요한 판단

현재 Risk Share Pack은 관리형 상용 MVP로 영업 가능하다.

다만 다음 단계 경쟁력은 화면 수가 아니라 원장 정합성이다. 고객에게 제공할 수 있는 운영기록은 다음 조건을 만족해야 한다.

1. 누가 제출했는지 확인 가능해야 한다.
2. 어떤 회사·현장·월·기록유형인지 분리되어야 한다.
3. 사진 원본과 DB 메타데이터가 연결되어야 한다.
4. 공유확인과 위험제보가 KPI에서 섞이면 안 된다.
5. 근로자대표 참여확인은 일반 공유확인과 분리되어야 한다.
6. 고객용 Export에는 내부 UUID, raw payload, token, API key, service role, 환경변수 값이 노출되면 안 된다.
7. AI는 조치완료나 법적 적합성을 확정하지 않는다.

## 6. 후속 PR 우선순위

1. `docs: audit tbm voice submit storage order v1`
2. `docs: audit field participation file evidence mapping v1`
3. `feat: write field participation files to evidence_items`
4. `feat: write tbm voice uploaded files to evidence_items`
5. `feat: add customer evidence manifest from evidence_items`
6. `feat: show evidence manifest in risk share monthly report`
7. `docs: audit contractor submission supabase-first gap v1`

## 7. 금지 표현

아래 표현은 제품 문서, 영업자료, 앱 화면, 보고서에서 사용하지 않는다.

- 위험성평가 대행
- 안전관리대행
- 법적 의무 완료 보장
- 과태료 방지
- 중대재해 면책
- 무재해 보장
- AI가 법적 판단
- AI가 조치완료 확정
- QR 제출만으로 법적 의무 완료
- 완전 익명 보장

## 8. 결론

Risk Share Pack의 다음 개발 기준은 기능 추가가 아니라 저장구조 정합성 확보다.

현재 Supabase 원장화는 근로자 참여, TBM 음성 제출, 근로자대표 확인 영역에서 상당 부분 진행되었다. 그러나 사진 증빙은 아직 파일 원본 저장과 메타데이터 원장 연결이 완전히 닫혔다고 보기 어렵다.

다음 핵심은 `evidence_items`를 실제 사진·파일 메타데이터 원장으로 사용하고, field participation, tbm voice, contractor submissions, action/risk records와 연결하는 것이다.
