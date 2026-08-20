-- time_off_requests: reason is required per the 2026-08-20 spec clarification (FR-018) — the
-- CHECK constraint enforces this even if a future caller bypasses the API's own validation
-- (defense-in-depth, same rationale as the RLS policies).
create table if not exists public.time_off_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  start_date date not null,
  end_date date not null,
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  manager_comment text,
  decided_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint time_off_requests_end_after_start check (end_date >= start_date)
);

create index if not exists time_off_requests_employee_id_idx on public.time_off_requests (employee_id);
create index if not exists time_off_requests_date_range_idx on public.time_off_requests (employee_id, start_date, end_date);
