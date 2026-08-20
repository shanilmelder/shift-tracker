-- Adds the manager-configurable minimum rest period used by insufficient-rest conflict
-- detection (FR-028), per data-model.md's Assumptions: "configurable by a manager/admin
-- rather than hard-coded, since rest requirements vary by workplace and jurisdiction."
-- Added as a follow-up migration (rather than editing 0001) since 0001 was already applied
-- as part of Phase 2 — additive migrations are the correct way to evolve an applied schema.
alter table public.locations
  add column if not exists min_rest_hours integer not null default 8 check (min_rest_hours >= 0);
