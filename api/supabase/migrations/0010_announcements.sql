-- announcements: a manager broadcast scoped to a team, a location, or a specific shift's staff.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id),
  target_scope text not null check (target_scope in ('team', 'location', 'shift')),
  target_location_id uuid references public.locations (id),
  target_shift_id uuid references public.shifts (id),
  message text not null check (length(trim(message)) > 0),
  created_at timestamptz not null default now(),
  constraint announcements_target_shape check (
    (target_scope in ('team', 'location') and target_location_id is not null and target_shift_id is null)
    or (target_scope = 'shift' and target_shift_id is not null)
  )
);

create index if not exists announcements_sender_id_idx on public.announcements (sender_id);
create index if not exists announcements_target_location_idx on public.announcements (target_location_id);
create index if not exists announcements_target_shift_idx on public.announcements (target_shift_id);
