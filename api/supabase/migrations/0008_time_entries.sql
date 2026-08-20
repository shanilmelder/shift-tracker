-- time_entries: one row per shift's clock-in/clock-out pair. idempotency_key is
-- client-generated so a retried offline-queued clock action (FR-040) can never be double
-- applied if the network flaps mid-sync.
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  employee_id uuid not null references public.profiles (id),
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_out_lat double precision,
  clock_out_lng double precision,
  flagged_for_review boolean not null default false,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  constraint time_entries_clock_out_after_in check (clock_out_at is null or clock_out_at > clock_in_at)
);

create index if not exists time_entries_employee_id_idx on public.time_entries (employee_id);
create index if not exists time_entries_shift_id_idx on public.time_entries (shift_id);
create index if not exists time_entries_flagged_idx on public.time_entries (flagged_for_review) where flagged_for_review;
