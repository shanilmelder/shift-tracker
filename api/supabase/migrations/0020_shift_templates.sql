-- shift_templates: a manager-defined name + time-of-day (e.g. "Morning floor, 08:00-17:00"),
-- with no calendar date attached. The Build screen's Create step now only captures this — the
-- date(s) it actually runs on are chosen separately in Assign, where one ordinary `shifts` row
-- (with a real start_time/end_time) is created per date picked. Kept manager-write, same
-- location, mirroring shift_areas (0003_shift_areas.sql).
create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  name text not null,
  start_time time not null,
  end_time time not null,
  shift_area_id uuid references public.shift_areas (id),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint shift_templates_end_after_start check (end_time > start_time)
);

create index if not exists shift_templates_location_id_idx on public.shift_templates (location_id);

alter table public.shift_templates enable row level security;

create policy shift_templates_select on public.shift_templates
  for select using (location_id = public.current_location_id());

create policy shift_templates_manager_write on public.shift_templates
  for all using (public.is_manager() and location_id = public.current_location_id())
  with check (public.is_manager() and location_id = public.current_location_id());
