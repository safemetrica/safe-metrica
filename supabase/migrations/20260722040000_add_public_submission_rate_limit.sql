-- Serverless-safe abuse control for unauthenticated risk-share submissions.
-- Requester identity is an application-generated HMAC digest; raw network
-- addresses and form payloads are never stored in this ledger.

create table if not exists public.public_submission_rate_limit_buckets (
  tenant_code text not null,
  submission_kind text not null,
  requester_digest text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  expires_at timestamptz not null,

  primary key (tenant_code, submission_kind, requester_digest),

  constraint public_submission_rate_limit_kind_check
    check (submission_kind in (
      'anonymous_feedback',
      'visitor_confirmation',
      'representative_confirmation'
    )),

  constraint public_submission_rate_limit_digest_check
    check (requester_digest ~ '^[0-9a-f]{64}$'),

  constraint public_submission_rate_limit_count_check
    check (request_count between 1 and 21),

  constraint public_submission_rate_limit_expiry_check
    check (expires_at > window_started_at)
);

alter table public.public_submission_rate_limit_buckets enable row level security;

revoke all privileges
  on table public.public_submission_rate_limit_buckets
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.public_submission_rate_limit_buckets
  to service_role;

comment on table public.public_submission_rate_limit_buckets is
  'Short-lived, tenant-scoped public submission abuse-control buckets. Stores HMAC requester digests only; no raw IP, payload, name, phone, or signature data.';

drop function if exists public.consume_public_submission_rate_limit(text, text, text, integer, integer);

create function public.consume_public_submission_rate_limit(
  p_tenant_code text,
  p_submission_kind text,
  p_requester_digest text,
  p_limit integer default 10,
  p_window_seconds integer default 600
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant_code text := lower(btrim(coalesce(p_tenant_code, '')));
  v_kind text := btrim(coalesce(p_submission_kind, ''));
  v_digest text := lower(btrim(coalesce(p_requester_digest, '')));
  v_now timestamptz := clock_timestamp();
  v_bucket public.public_submission_rate_limit_buckets%rowtype;
begin
  if v_tenant_code !~ '^[a-z0-9][a-z0-9-]{0,63}$'
     or v_kind not in ('anonymous_feedback', 'visitor_confirmation', 'representative_confirmation')
     or v_digest !~ '^[0-9a-f]{64}$'
     or p_limit not between 1 and 20
     or p_window_seconds not between 60 and 3600 then
    return query select false, p_window_seconds;
    return;
  end if;

  if not exists (
    select 1 from public.tenant_registry tr
    where tr.company_code = v_tenant_code and tr.status = 'active'
  ) then
    return query select false, p_window_seconds;
    return;
  end if;

  -- Opportunistic retention cleanup. It is bounded to expired pseudonymous
  -- buckets and does not touch submission or customer records.
  delete from public.public_submission_rate_limit_buckets b
  where b.expires_at < v_now - interval '1 day';

  insert into public.public_submission_rate_limit_buckets as b (
    tenant_code, submission_kind, requester_digest,
    window_started_at, request_count, expires_at
  ) values (
    v_tenant_code, v_kind, v_digest,
    v_now, 1, v_now + make_interval(secs => p_window_seconds)
  )
  on conflict (tenant_code, submission_kind, requester_digest) do update
  set window_started_at = case when b.expires_at <= v_now then v_now else b.window_started_at end,
      request_count = case when b.expires_at <= v_now then 1 else least(b.request_count + 1, p_limit + 1) end,
      expires_at = case when b.expires_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
        else b.expires_at end
  returning b.* into v_bucket;

  return query select
    v_bucket.request_count <= p_limit,
    case when v_bucket.request_count <= p_limit then 0
      else greatest(1, ceil(extract(epoch from (v_bucket.expires_at - v_now)))::integer)
    end;
end;
$$;

revoke all on function public.consume_public_submission_rate_limit(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_submission_rate_limit(text, text, text, integer, integer)
  to service_role;

comment on function public.consume_public_submission_rate_limit(text, text, text, integer, integer) is
  'Atomically consumes one tenant/kind/requester HMAC bucket. Service role only; fail-closed callers must reject malformed or unavailable results.';
