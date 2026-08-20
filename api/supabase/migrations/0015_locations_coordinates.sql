-- Adds the coordinates a geofence check is actually measured against. Missed in the original
-- 0001 migration: `geofence_radius_m` was added per FR-037, but nothing stored the point that
-- radius is centered on. `address` (free text) isn't usable for a distance calculation.
-- Nullable for now — a location created without coordinates simply never flags a clock-in for
-- geofence review (fails open, matching FR-038's "never blocks" principle) until a manager
-- sets them via PATCH /v1/locations/mine (Phase 10 / US8, T080).
alter table public.locations
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
