# SafeMetrica Richi Trial Raw Payload Ledger Audit v1

기준일: 2026-06-19  
대상: Richi Korea trial worker confirmation flow  
목적: 리치코리아 체험판에서 근로자가 확인·체크·자필서명·의견제출한 내용이 Supabase 원장에 실제로 어떻게 저장되는지 점검한다.

## 1. 판단 기준

SafeMetrica는 화면이 아니라 운영기록 원장을 만든다.

따라서 리치 체험판은 아래 질문에 답할 수 있어야 한다.

1. 근로자가 무엇을 봤는가
2. 근로자가 무엇을 체크했는가
3. 근로자가 어떤 신원정보 또는 확인번호를 남겼는가
4. 모바일 자필 확인서명이 남았는가
5. 의견·불편사항·사진첨부가 남았는가
6. 관리자 확인과 주간요약 후보로 이어질 수 있는가

## 2. 현재 점검 대상

Supabase table:

field_participation_submissions

Richi filter candidates:

- tenant_code = richi
- company_name like 리치
- raw_payload contains richi

## 3. 반드시 확인할 raw_payload 필드

### 3.1 route/client context

필수 후보:

- source_route
- user_agent
- client_submission_id
- company_code
- tenant_code
- site_id
- service_mode
- enabled_modules

판단:

- source_route와 user_agent는 최소한 저장되어야 한다.
- company_code 또는 tenant_code가 raw_payload에도 있어야 추후 export/debug가 쉽다.

### 3.2 confirmation source snapshot

v1에서 필요한 후보:

- confirmation_sources
- daily_summary_snapshot
- company_confirm_snapshot
- risk_share_snapshot, 있을 때만
- checked_sources
- checked_labels
- checked_at

현재 리치 Step 1 화면은 오늘 확인 요약과 위생·안전 확인 체크를 보여준다.

따라서 제출 시점에는 최소한 아래 정보가 남아야 한다.

- 오늘 확인 요약 snapshot
- 체크한 항목 label
- 체크한 시각
- 추후 위험성평가 공유 snapshot이 있으면 version metadata

### 3.3 handwritten signature

필수 후보:

- signature_confirmation_method
- signature_confirmation_label
- signature_confirmation_snapshot_json
- handwritten_signature_signed_at
- handwritten_signature_data_url 또는 signature_data_url_present
- source_route
- user_agent

v1은 raw_payload 중심으로 확인한다.

v2에서는 private Supabase Storage와 worker_signature_confirmations 후보 테이블로 분리해야 한다.

### 3.4 identity

필수 후보:

- 이름 또는 별칭
- 소속 또는 작업조
- 확인번호: 휴대폰 뒷4자리 또는 사번
- anonymous 여부

주의:

- 익명 의견과 확인서명은 논리적으로 분리해야 한다.
- 완전 익명 보장 표현은 쓰지 않는다.

### 3.5 feedback/evidence

필수 후보:

- submission_type
- title
- content
- location
- feedback_type
- file_urls
- evidence_payload

리치 운영본에서는 관리자 접수함과 주간요약 후보로 이어져야 한다.

## 4. 점검 SQL

SQL 파일:

scripts/sql/richi_trial_raw_payload_audit_v1.sql

Supabase SQL Editor에서 실행한다.

주의:

- SQL 결과에 실제 근로자 개인정보가 있으면 채팅이나 GitHub에 그대로 붙이지 않는다.
- 필요한 경우 true/false, count, field existence 중심으로 공유한다.
- raw_payload 전체 원문은 내부 점검용으로만 본다.

## 5. 판정표

### A. 운영본 전환 가능에 가까움

- source_route 저장됨
- user_agent 저장됨
- tenant_code 또는 company_code 저장됨
- signature method/label/signed_at 저장됨
- checked source 또는 checked label 저장됨
- 제출유형/status가 관리자 확인으로 분류 가능
- notion_page_id/null이어도 Supabase 원장 기준으로 조회 가능

### B. 보완 필요

- 서명은 있지만 확인요약 snapshot이 없음
- 체크 label은 있지만 source_id/source_type이 없음
- signature data URL만 있고 metadata가 없음
- 관리자 접수함에서 실제 원장 조회가 안 됨
- 주간요약 후보가 샘플 숫자에 머무름

### C. 운영본 부적합

- 제출은 되지만 raw_payload가 비어 있음
- 서명 여부를 나중에 판별할 수 없음
- 근로자가 본 내용을 알 수 없음
- tenant_code 기준 조회가 안 됨
- 실제 제출과 샘플 화면이 분리되지 않음

## 6. 다음 조치 기준

점검 후 다음 PR 후보:

1. raw_payload에 daily_summary_snapshot 저장
2. raw_payload에 checked_sources 저장
3. raw_payload에 signature_metadata 저장
4. signature image를 private Supabase Storage에 저장하는 v2 설계
5. manager inbox를 tenant_code=richi 실제 제출 목록에 연결
6. weekly summary candidate를 실제 제출 데이터에 연결

## 7. UI polish와의 관계

Claude/Lovable 스타일 UI 개선은 채택 가능하다.

다만 UI 카드는 반드시 원장 source와 연결되어야 한다.

예:

- DailySummaryCard -> daily_summary_snapshot
- CompanyConfirmCard -> company_confirm_snapshot
- RiskAssessmentSnapshotCard -> risk_share_snapshot
- ConfirmCheckGroup -> checked_sources
- SignaturePad -> signature_metadata 또는 worker_signature_confirmations
- FeedbackForm -> field_participation_submissions + evidence_payload

## 8. 이번 PR 범위

이 PR은 문서와 SQL 점검 파일만 추가한다.

변경 없음:

- route 변경 없음
- Supabase migration 없음
- TSX 변경 없음
- storage 변경 없음
- production behavior 변경 없음

## 9. Local code reference snapshot

아래 내용은 PR 생성 시점의 로컬 코드 grep 결과를 확인하기 위한 참고다. 실제 저장 여부는 Supabase SQL 결과로 최종 확인해야 한다.

# Local code reference snapshot

## submit route references
89:  const signaturePayload: Record<string, unknown> = {};
91:  const handwrittenSignatureDataUrl = getFormText(formData, "handwritten_signature_data_url");
92:  const handwrittenSignatureSignedAt = getFormText(formData, "handwritten_signature_signed_at");
93:  const signatureConfirmationMethod = getFormText(formData, "signature_confirmation_method");
94:  const signatureConfirmationLabel = getFormText(formData, "signature_confirmation_label");
95:  const signatureConfirmationSnapshotJson = getFormText(formData, "signature_confirmation_snapshot_json");
96:  const signatureClientSourceRoute = getFormText(formData, "signature_client_source_route");
97:  const signatureClientUserAgent = getFormText(formData, "signature_client_user_agent");
98:  const signatureMetaCompanyCode = getFormText(formData, "signature_meta_company_code");
100:  if (handwrittenSignatureDataUrl) {
101:    signaturePayload.handwritten_signature_data_url = handwrittenSignatureDataUrl;
104:  if (handwrittenSignatureSignedAt) {
105:    signaturePayload.handwritten_signature_signed_at = handwrittenSignatureSignedAt;
108:  if (signatureConfirmationMethod) {
109:    signaturePayload.signature_confirmation_method = signatureConfirmationMethod;
112:  if (signatureConfirmationLabel) {
113:    signaturePayload.signature_confirmation_label = signatureConfirmationLabel;
116:  if (signatureConfirmationSnapshotJson) {
118:      signaturePayload.signature_confirmation_snapshot_json = JSON.parse(signatureConfirmationSnapshotJson);
120:      signaturePayload.signature_confirmation_snapshot_json = signatureConfirmationSnapshotJson;
124:  if (signatureClientSourceRoute) {
125:    signaturePayload.signature_client_source_route = signatureClientSourceRoute;
128:  if (signatureClientUserAgent) {
129:    signaturePayload.signature_client_user_agent = signatureClientUserAgent;
132:  if (signatureMetaCompanyCode) {
133:    signaturePayload.signature_meta_company_code = signatureMetaCompanyCode;
136:  return signaturePayload;
556:  const handwrittenSignatureRawPayload = buildHandwrittenSignatureRawPayload(formData);
688:        tenant_code: company.code,
702:        raw_payload: {
703:          ...handwrittenSignatureRawPayload,
751:            company_code: company.code,
756:            source_record_table: "field_participation_submissions",
768:            raw_payload: {
1015:        tenant_code: company.code,
1029:        raw_payload: {
1030:          ...handwrittenSignatureRawPayload,
1066:            company_code: company.code,
1071:            source_record_table: "field_participation_submissions",
1083:            raw_payload: {

## FieldParticipationStepper references
166:  const [riskAssessmentCheck, setRiskAssessmentCheck] = useState(false);
168:  const isFoodFactoryTrial = workerCopy?.code === "richi";
169:  const formStep = isFoodFactoryTrial ? 2 : 3;
170:  const stepLabels = isFoodFactoryTrial ? richiStepLabels : defaultStepLabels;
189:  const [workerPhoneLast4, setWorkerPhoneLast4] = useState("");
190:  const [workerEmployeeNo, setWorkerEmployeeNo] = useState("");
211:  const canGoNextFromStep2 = riskCheck && riskAssessmentCheck && safetyMeasureCheck;
218:  const normalizedWorkerPhoneLast4 = workerPhoneLast4.trim();
219:  const normalizedWorkerEmployeeNo = workerEmployeeNo.trim();
220:  const richiConfirmationCodeValue = workerEmployeeNo || workerPhoneLast4;
244:  const finalFeedbackType = hasOpinion ? normalizeParticipationType(feedbackType) : isFoodFactoryTrial ? "위생·안전 확인" : "공유확인";
248:    : isFoodFactoryTrial ? "작업 전 위생·안전 전자확인 완료" : "위험성평가 공유확인 완료";
349:        <input type="hidden" name="workerPhoneLast4" value={normalizedWorkerPhoneLast4} />
350:        <input type="hidden" name="workerEmployeeNo" value={normalizedWorkerEmployeeNo} />
354:        {riskAssessmentCheck ? <input type="hidden" name="riskAssessmentCheck" value="on" /> : null}
363:              {isFoodFactoryTrial ? "㈜리치코리아 전자확인" : (workerCopy?.title ?? "현장근로자 안전참여")}
366:              {isFoodFactoryTrial
379:                <p className="text-sm font-black text-slate-500">{isFoodFactoryTrial ? "Step 1/3" : "Step 1/4"}</p>
381:                    {isFoodFactoryTrial ? "작업 전 위생·안전 확인" : "오늘 작업 전 핵심 위험 확인"}
384:                  {isFoodFactoryTrial
390:                  {isFoodFactoryTrial
395:                  {isFoodFactoryTrial ? (
397:                      <h3 className="text-sm font-black text-blue-900">오늘 확인 요약</h3>
406:                  {isFoodFactoryTrial ? (
417:                            checked={riskCheck}
418:                            onChange={(event) => setRiskCheck(event.target.checked)}
421:                          <span>오늘 확인 요약을 읽었습니다.</span>
427:                            checked={riskAssessmentCheck}
428:                            onChange={(event) => setRiskAssessmentCheck(event.target.checked)}
437:                            checked={safetyMeasureCheck}
438:                            onChange={(event) => setSafetyMeasureCheck(event.target.checked)}
502:                      : isFoodFactoryTrial
519:            {!isFoodFactoryTrial && step === 2 ? (
523:                    {isFoodFactoryTrial ? "위생·안전 확인 / 의견제출" : riskShareLinkCopy.worker.title}
526:                    {isFoodFactoryTrial
533:                      {isFoodFactoryTrial ? "작업 전 위생·안전 안내" : "산업안전보건법 제36조"}
536:                      {isFoodFactoryTrial
546:                      checked={riskCheck}
547:                      onChange={(event) => setRiskCheck(event.target.checked)}
550:                    <span>{isFoodFactoryTrial ? "오늘 확인 요약을 읽었습니다." : "오늘 작업의 주요 위험요인을 확인했습니다."}</span>
555:                      checked={riskAssessmentCheck}
556:                      onChange={(event) => setRiskAssessmentCheck(event.target.checked)}
559:                    <span>{isFoodFactoryTrial ? "작업 전 위생·안전 주의사항을 확인했습니다." : riskShareLinkCopy.worker.checks.riskAssessment}</span>
564:                      checked={safetyMeasureCheck}
565:                      onChange={(event) => setSafetyMeasureCheck(event.target.checked)}
568:                    <span>{isFoodFactoryTrial ? "불편사항이 있으면 의견으로 남기겠습니다." : riskShareLinkCopy.worker.checks.safetyMeasure}</span>
576:                <p className="text-sm font-black text-slate-500">{isFoodFactoryTrial ? "Step 2/3" : "Step 3/4"}</p>
578:                    {isFoodFactoryTrial ? "의견 제출" : "의견 / 아차사고 제출"}
581:                    {isFoodFactoryTrial
590:                      {isFoodFactoryTrial ? "의견이 없으면 전자확인 기록으로 저장됩니다." : "제목, 내용, 사진을 입력하지 않고 제출하면 공유확인 기록으로 저장됩니다."}
595:                        {isFoodFactoryTrial ? "의견 있음" : "위험·아차사고·개선의견 있음"}
598:                      {isFoodFactoryTrial ? "입력한 의견은 관리자 확인자료로 저장됩니다." : "제목, 내용 또는 사진을 입력하면 관리자 검토대상으로 저장됩니다."}
605:                      {isFoodFactoryTrial ? "의견 제목" : "제보 제목"}
610:                      placeholder={isFoodFactoryTrial ? "예: 포장실 동선이 불편합니다" : "예: 재활용장 바닥 깨진 병 조각 발견"}
618:                      {isFoodFactoryTrial ? "의견 유형" : "제보 유형"}
636:                    placeholder={isFoodFactoryTrial ? "예: 포장실, 세척구역, 원료보관실" : "예: 상차장, 분리수거장, A구역"}
640:                    {isFoodFactoryTrial ? "위치/구역은 어느 공간의 의견인지 확인하기 위한 보조항목입니다." : "위치/구역은 기록 보조항목입니다. 제목, 내용 또는 사진이 있을 때만 관리자 검토대상으로 분류됩니다."}
649:                    rows={isFoodFactoryTrial ? 3 : 4}
650:                      placeholder={isFoodFactoryTrial ? "예: 손 세척 동선이 불편합니다 / 작업대 위치 조정이 필요합니다" : "예: 통로 바닥이 미끄럽습니다 / 적치 위치 조정이 필요합니다"}
659:                        {isFoodFactoryTrial
673:                        checked={hasOpinion && anonymous}
675:                        onChange={(event) => setAnonymous(event.target.checked)}
678:                        <span>{isFoodFactoryTrial ? "익명으로 의견 제출" : "익명으로 제보 제출"}</span>
689:                        ? isFoodFactoryTrial ? "의견 제출자 정보" : "제보 제출자 정보"
690:                        : isFoodFactoryTrial ? "전자확인 최소 확인정보" : "공유확인 최소 확인정보"}
693:                      {isFoodFactoryTrial
729:                      {isFoodFactoryTrial ? (
748:                              value={workerPhoneLast4}
761:                              value={workerEmployeeNo}
772:                        {isFoodFactoryTrial ? "전자확인은 이름, 소속, 확인번호가 필요합니다." : "공유확인은 이름 또는 별칭, 소속 또는 작업조, 그리고 휴대폰 뒷4자리 또는 사번/식별번호 중 하나가 필요합니다."}
778:                {hasOpinion && !isFoodFactoryTrial ? (
782:                      checked={anonymous}
783:                      onChange={(event) => setAnonymous(event.target.checked)}
790:                  {isFoodFactoryTrial ? (
792:                      <HandwrittenSignaturePad enabled={isFoodFactoryTrial} />
807:                    {isFoodFactoryTrial ? "사진은 필요한 경우에만 첨부하세요." : "첨부 사진은 세메앱이 용량을 줄여 저장합니다."}
818:                disabled={isFoodFactoryTrial && !canGoNextFromStep2}
821:                  setStep(isFoodFactoryTrial ? formStep : 2);
825:                {isFoodFactoryTrial ? "체크 후 의견·서명으로 →" : "핵심 위험 확인 완료 →"}
829:            {!isFoodFactoryTrial && step === 2 ? (
839:                {isFoodFactoryTrial ? "확인 기록 남기기 →" : "공유 내용 확인 →"}
845:                  {isFoodFactoryTrial && !hasOpinion && !shareConfirmationIdentityReady ? (
858:                      ? isFoodFactoryTrial ? "전자확인·의견 제출 →" : "위험 또는 개선의견 제출 →"
859:                    : isFoodFactoryTrial ? "의견 없음, 전자확인 제출 →" : riskShareLinkCopy.worker.buttons.confirmOnly}
867:                onClick={() => setStep((current) => isFoodFactoryTrial ? 1 : current === 3 ? 2 : 1)}

## HandwrittenSignaturePad references
6:const SIGNATURE_METHOD = "finger_drawn_internal_confirmation_record_v1";
18:  "handwritten_signature_data_url",
19:  "handwritten_signature_signed_at",
20:  "signature_confirmation_method",
21:  "signature_confirmation_label",
22:  "signature_confirmation_snapshot_json",
23:  "signature_client_source_route",
24:  "signature_client_user_agent",
82:    source_route: sourceRoute,
425:    <section ref={rootRef} aria-label="모바일 자필 확인서명" className="my-3">
587:      <input ref={signatureInputRef} type="hidden" name="handwritten_signature_data_url" defaultValue="" />
588:      <input ref={signedAtInputRef} type="hidden" name="handwritten_signature_signed_at" defaultValue="" />
589:      <input type="hidden" name="signature_confirmation_method" value={SIGNATURE_METHOD} readOnly />
590:      <input type="hidden" name="signature_confirmation_label" value="모바일 자필 확인서명" readOnly />
591:      <input ref={snapshotInputRef} type="hidden" name="signature_confirmation_snapshot_json" defaultValue="" />
592:      <input ref={sourceRouteInputRef} type="hidden" name="signature_client_source_route" defaultValue="" />
593:      <input ref={userAgentInputRef} type="hidden" name="signature_client_user_agent" defaultValue="" />
