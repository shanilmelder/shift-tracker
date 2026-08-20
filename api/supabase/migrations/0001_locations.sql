-- locations: one row per physical site a manager account is scoped to.
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  geofence_radius_m integer not null default 150 check (geofence_radius_m > 0),
  timezone text not null,
  created_at timestamptz not null default now()
);

comment on table public.locations is
  'A physical site. geofence_radius_m is manager-configurable per FR-037 (default 150m).';
