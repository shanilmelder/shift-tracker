-- shift_swap_requests: a request to move a shift's staffing from one employee to a coworker.
create table if not exists public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  requesting_employee_id uuid not null references public.profiles (id),
  target_employee_id uuid not null references public.profiles (id),
  status text not null default 'pending'
    check (status in ('pending', 'coworker_accepted', 'coworker_declined', 'manager_approved', 'denied')),
  decided_by uuid references public.profiles (id),
  manager_comment text,
  created_at timestamptz not null default now(),
  constraint shift_swap_requests_distinct_parties check (requesting_employee_id <> target_employee_id)
);

create index if not exists shift_swap_requests_shift_id_idx on public.shift_swap_requests (shift_id);
create index if not exists shift_swap_requests_requesting_idx on public.shift_swap_requests (requesting_employee_id);
create index if not exists shift_swap_requests_target_idx on public.shift_swap_requests (target_employee_id);
