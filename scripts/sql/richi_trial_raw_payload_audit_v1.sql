-- SafeMetrica Richi Trial Raw Payload Ledger Audit v1
-- Purpose:
-- Check what is actually saved in field_participation_submissions for tenant_code/company richi.
-- Run this in Supabase SQL Editor.
-- Do not paste actual personal information or token values into GitHub, docs, or chat.

-- 1. Confirm table columns.
select
  ordinal_position,
  column_name,
  data_type
from information_schema.columns
where table_name = 'field_participation_submissions'
order by ordinal_position;

-- 2. Latest Richi submissions summary.
select
  id,
  tenant_code,
  company_name,
  submission_type,
  title,
  anonymous,
  status,
  notion_page_id,
  notion_url,
  created_at
from field_participation_submissions
where tenant_code = 'richi'
   or company_name like '%리치%'
   or raw_payload::text ilike '%richi%'
order by created_at desc
limit 20;

-- 3. Check whether key ledger fields exist inside raw_payload.
select
  id,
  tenant_code,
  company_name,
  submission_type,
  created_at,

  raw_payload ? 'source_route' as has_source_route,
  raw_payload ? 'user_agent' as has_user_agent,
  raw_payload ? 'company_code' as has_company_code,
  raw_payload ? 'tenant_code' as has_raw_tenant_code,
  raw_payload ? 'site_id' as has_site_id,
  raw_payload ? 'confirmation_type' as has_confirmation_type,

  raw_payload ? 'confirmation_sources' as has_confirmation_sources,
  raw_payload ? 'checked_sources' as has_checked_sources,
  raw_payload ? 'daily_summary_snapshot' as has_daily_summary_snapshot,
  raw_payload ? 'company_confirm_snapshot' as has_company_confirm_snapshot,
  raw_payload ? 'risk_share_snapshot' as has_risk_share_snapshot,

  raw_payload ? 'signature_confirmation_method' as has_signature_method,
  raw_payload ? 'signature_confirmation_label' as has_signature_label,
  raw_payload ? 'signature_confirmation_snapshot_json' as has_signature_snapshot,
  raw_payload ? 'handwritten_signature_signed_at' as has_signature_signed_at,
  raw_payload ? 'handwritten_signature_data_url' as has_signature_data_url,

  raw_payload ? 'signature_metadata' as has_signature_metadata,
  raw_payload ? 'signature_data_url_present' as has_signature_data_url_present,

  raw_payload ? 'feedback_payload' as has_feedback_payload,
  raw_payload ? 'evidence_payload' as has_evidence_payload
from field_participation_submissions
where tenant_code = 'richi'
   or company_name like '%리치%'
   or raw_payload::text ilike '%richi%'
order by created_at desc
limit 20;

-- 4. Inspect latest Richi raw_payload shape.
-- Use this only for internal inspection. Do not export raw personal information.
select
  id,
  created_at,
  jsonb_pretty(raw_payload) as raw_payload_pretty
from field_participation_submissions
where tenant_code = 'richi'
   or company_name like '%리치%'
   or raw_payload::text ilike '%richi%'
order by created_at desc
limit 3;

-- 5. Check signature-related extracted values.
select
  id,
  created_at,
  raw_payload ->> 'signature_confirmation_method' as signature_method,
  raw_payload ->> 'signature_confirmation_label' as signature_label,
  raw_payload ->> 'handwritten_signature_signed_at' as signed_at,
  case
    when raw_payload ? 'handwritten_signature_data_url' then true
    else false
  end as has_signature_data_url,
  length(coalesce(raw_payload ->> 'handwritten_signature_data_url', '')) as signature_data_url_length
from field_participation_submissions
where tenant_code = 'richi'
   or company_name like '%리치%'
   or raw_payload::text ilike '%richi%'
order by created_at desc
limit 20;

-- 6. Check submitted identity fields without exposing full raw values.
select
  id,
  created_at,
  anonymous,
  case when nullif(trim(coalesce(submitter, '')), '') is not null then true else false end as has_submitter_column,
  case when raw_payload ? 'worker_name' then true else false end as has_worker_name,
  case when raw_payload ? 'worker_team' then true else false end as has_worker_team,
  case when raw_payload ? 'worker_phone_last4' then true else false end as has_worker_phone_last4,
  case when raw_payload ? 'worker_employee_no' then true else false end as has_worker_employee_no
from field_participation_submissions
where tenant_code = 'richi'
   or company_name like '%리치%'
   or raw_payload::text ilike '%richi%'
order by created_at desc
limit 20;

-- 7. Count recent Richi records by submission_type/status.
select
  submission_type,
  status,
  count(*) as count
from field_participation_submissions
where tenant_code = 'richi'
   or company_name like '%리치%'
   or raw_payload::text ilike '%richi%'
group by submission_type, status
order by count desc;
