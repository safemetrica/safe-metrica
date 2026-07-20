-- Commercial Core: auditable manager review/action for Version confirmations.

alter table public.field_participation_submissions
  add column if not exists manager_review_status text,
  add column if not exists manager_action_note text,
  add column if not exists manager_reviewed_at timestamptz,
  add column if not exists manager_reviewed_by_membership_id uuid;

alter table public.field_participation_submissions
  drop constraint if exists field_participation_manager_review_status_check;

alter table public.field_participation_submissions
  add constraint field_participation_manager_review_status_check
  check (manager_review_status is null or manager_review_status in ('unreviewed', 'in_review', 'completed'));

alter table public.field_participation_submissions
  drop constraint if exists field_participation_manager_action_note_length_check;

alter table public.field_participation_submissions
  add constraint field_participation_manager_action_note_length_check
  check (manager_action_note is null or char_length(manager_action_note) <= 500);

create table if not exists public.risk_share_confirmation_review_events (
  id uuid primary key default gen_random_uuid(),
  tenant_code text not null,
  submission_id uuid not null references public.field_participation_submissions(id) on delete restrict,
  from_status text not null check (from_status in ('unreviewed', 'in_review', 'completed')),
  to_status text not null check (to_status in ('unreviewed', 'in_review', 'completed')),
  action_note text,
  actor_membership_id uuid not null references public.tenant_membership(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.risk_share_confirmation_review_events
  drop constraint if exists risk_share_confirmation_review_events_action_note_length_check;

alter table public.risk_share_confirmation_review_events
  add constraint risk_share_confirmation_review_events_action_note_length_check
  check (action_note is null or char_length(action_note) <= 500);

create index if not exists risk_share_confirmation_review_events_tenant_submission_idx
  on public.risk_share_confirmation_review_events (tenant_code, submission_id, created_at desc);

alter table public.risk_share_confirmation_review_events enable row level security;
revoke all on public.risk_share_confirmation_review_events from anon, authenticated, public;
grant select, insert on public.risk_share_confirmation_review_events to service_role;

create or replace function public.update_risk_share_confirmation_review_status(
  p_company_code text,
  p_actor_membership_id uuid,
  p_submission_id uuid,
  p_expected_status text,
  p_next_status text,
  p_action_note text default null
)
returns table(ok boolean, code text, review_status text)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_current text;
begin
  if not (
       (p_expected_status = 'unreviewed' and p_next_status = 'in_review')
       or (p_expected_status = 'in_review' and p_next_status = 'completed')
     )
     or char_length(coalesce(p_action_note, '')) > 500 then
    return query select false, 'validation_failed', null::text; return;
  end if;

  if not exists (
    select 1 from public.tenant_membership tm
    where tm.id = p_actor_membership_id and tm.tenant_code = p_company_code
      and tm.status = 'active' and tm.role in ('tenant_admin', 'tenant_manager')
  ) then
    return query select false, 'forbidden', null::text; return;
  end if;

  select coalesce(fps.manager_review_status, 'unreviewed') into v_current
  from public.field_participation_submissions fps
  where fps.id = p_submission_id and fps.tenant_code = p_company_code
    and fps.version_lock_id is not null
    and fps.raw_payload->>'source' = 'risk_share_participation_submit_v1'
    and fps.raw_payload->>'mode' = 'monthly'
  for update;

  if v_current is null then
    return query select false, 'not_found', null::text; return;
  end if;
  if v_current <> p_expected_status then
    return query select false, 'status_conflict', v_current; return;
  end if;

  update public.field_participation_submissions
  set manager_review_status = p_next_status,
      manager_action_note = nullif(btrim(p_action_note), ''),
      manager_reviewed_at = now(),
      manager_reviewed_by_membership_id = p_actor_membership_id
  where id = p_submission_id;

  insert into public.risk_share_confirmation_review_events
    (tenant_code, submission_id, from_status, to_status, action_note, actor_membership_id)
  values (p_company_code, p_submission_id, v_current, p_next_status,
          nullif(btrim(p_action_note), ''), p_actor_membership_id);

  return query select true, 'ok', p_next_status;
end;
$$;

revoke all on function public.update_risk_share_confirmation_review_status(text, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.update_risk_share_confirmation_review_status(text, uuid, uuid, text, text, text) to service_role;
