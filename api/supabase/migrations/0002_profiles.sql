-- profiles: one row per person able to sign in. id matches the Supabase Auth user id.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('employee', 'manager')),
  phone text,
  avatar_url text,
  location_id uuid not null references public.locations (id),
  job_role text,
  pay_rate numeric(10, 2),
  is_active boolean not null default true,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted')),
  notification_prefs jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists profiles_location_id_idx on public.profiles (location_id);

comment on table public.profiles is
  'role is the account class (employee/manager); job_role is the position/title. '
  'created_by is NULL only for the single pre-provisioned first manager account (FR-003). '
  'A manager''s own location_id is their single home location (FR-031a).';
