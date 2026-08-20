-- availability: either a recurring weekly window (day_of_week set, blocked_date null) or a
-- one-off blocked-out date (blocked_date set, day_of_week null) — never both, enforced below.
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id),
  day_of_week smallint check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  recurring boolean not null,
  blocked_date date,
  created_at timestamptz not null default now(),
  constraint availability_shape check (
    (recurring and day_of_week is not null and blocked_date is null)
    or (not recurring and blocked_date is not null and day_of_week is null)
  )
);

create index if not exists availability_employee_id_idx on public.availability (employee_id);
