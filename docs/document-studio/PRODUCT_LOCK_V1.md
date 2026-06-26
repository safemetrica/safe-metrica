# Document Studio Product Lock v1

## 1. Product Position

Document Studio is a separate local document automation product line from SafeMetrica.

SafeMetrica is an industrial safety operation-record SaaS.
Document Studio is a local Windows desktop document automation tool for repetitive field, administrative, and regulatory-style forms.

Document Studio can later export evidence or report artifacts that may be referenced by SafeMetrica, but it must not be treated as the same product.

## 2. Core Concept

Document Studio preserves existing Excel, HWPX, PDF, and field-form workflows while reducing repetitive input, validation, and output work.

It is not a general AI writing tool.
It is a workflow-specific form automation product.

## 3. Product Architecture

### Document Studio Core

Common local desktop foundation.

- Local project folder
- Template library
- Input form
- Validation rules
- Output generator
- PDF/HWPX/Excel export candidate
- Evidence attachment folder
- Local backup/export
- No customer SaaS login requirement in v1

### Industry / Task Packs

Document Studio should grow through task-specific packs.

- WasteManager Pack
- Forklift Work Plan Pack
- Hoist Work Report Pack
- Food Factory / HACCP Operation Pack

## 4. First Pack Candidates

### WasteManager Pack

For 생활폐기물, 건설폐기물, 폐기물 실무 document workflows.

Candidate outputs:
- 운행/수거/처리 관련 반복 양식
- 현장점검표
- 작업일지
- 보고자료
- 증빙 정리 폴더

### Forklift Work Plan Pack

For forklift and loading/unloading work planning.

Candidate outputs:
- 지게차 작업계획서
- 작업 전 점검표
- 운전자/작업자 확인
- 위험요인 확인
- 사진 증빙 첨부
- PDF output

### Hoist Work Report Pack

For Hyundai Hoist-style installation, AS, maintenance, and completion reporting.

Candidate outputs:
- 작업지시서
- 설치/AS 전후사진 정리
- 작업완료보고서
- 고객 확인 후보
- 설비·호이스트·크레인 위험요인 memo

### Food Factory / HACCP Operation Pack

For food factory operation documents.

Candidate outputs:
- 위생·안전 확인
- 포장실/세척구역 점검
- 작업 전 확인자료
- 현장 의견 정리
- 월간 운영자료 후보

## 5. Relationship with SafeMetrica

Document Studio and SafeMetrica are separate products.

Possible future connection:
- Document Studio output can be attached to SafeMetrica evidence records.
- Document Studio report output can become a monthly report attachment candidate.
- Document Studio extracted risks can become risk assessment candidate inputs.

Non-goal in v1:
- Direct Supabase write
- Direct Notion DB write
- SafeMetrica tenant login
- Customer production data sync
- Automatic legal or safety judgment

## 6. AI Role

AI may help classify, summarize, validate, and suggest fields.

AI does not make final legal, safety, or compliance decisions.
Final review and responsibility remain with the user, manager, or business owner.

## 7. v1 Implementation Order

1. Product lock document
2. Local folder/project structure draft
3. One pack selection
4. Template inventory
5. Input schema draft
6. Output sample draft
7. Local prototype
8. Packaging and pricing memo

## 8. Immediate Decision Needed

Choose the first pack:

- WasteManager Pack
- Forklift Work Plan Pack
- Hoist Work Report Pack
- Food Factory / HACCP Operation Pack

Recommended first build:
Forklift Work Plan Pack or Hoist Work Report Pack.

Reason:
They are easier to demonstrate visually with input, photo, confirmation, and PDF output.

## 9. Repository Strategy

Document Studio must be developed as a separate product repository, not as a route inside the SafeMetrica Vercel app.

Recommended repository:

- `safemetrica-document-studio`

SafeMetrica repository role:

- Product lock documents
- Integration policy notes
- Future evidence-package connection policy
- No Document Studio app code in v1

Document Studio repository role:

- Local Windows desktop app source code
- Local template library
- Input schemas
- Output generator
- Pack-specific implementation
- Packaging and release artifacts

Do not build Document Studio as:

- a SafeMetrica Vercel route
- a Supabase-first SaaS module
- a Notion-connected production workflow
- a customer-login feature inside SafeMetrica
- a direct existing-customer data sync tool

## 10. First Build Decision

The first implementation should be a local desktop prototype, not a cloud feature.

Recommended technical direction:

- Python local desktop app
- PySide6 or Flet for UI
- local project folder
- local template folder
- local output folder
- PDF / Excel / HWPX output candidates
- no production customer data connection in v1

Recommended first pack:

1. Forklift Work Plan Pack
2. Hoist Work Report Pack

Forklift Work Plan Pack is the fastest first commercial demo because it is easy to explain, input, validate, and export.

Hoist Work Report Pack is a strong second pack because it connects to Hyundai Hoist-style work orders, installation, AS, before/after photos, and completion reports.

SafeMetrica integration should come later through evidence packages:

Document Studio output → PDF / Excel / ZIP evidence package → SafeMetrica evidence or monthly report attachment candidate.

