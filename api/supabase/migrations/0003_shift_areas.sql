-- shift_areas: manager-defined tags (e.g. Floor, Till, Stockroom), scoped to a location.
-- Manager-write-only (FR-032); employees only ever see the label already on a shift (FR-033).
create table if not exists public.shift_areas (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (location_id, name)
);

create index if not exists shift_areas_location_id_idx on public.shift_areas (location_id);
