-- Links a dated shift back to the template it was generated from, so deleting a template
-- removes the shifts it produced (and, through 0005's own cascade, their staffing rows).
-- Nullable: shifts created before this migration, and any created directly rather than via
-- the Build screen's Assign step, simply have no template and are unaffected by its deletion.
alter table public.shifts
  add column if not exists template_id uuid references public.shift_templates (id) on delete cascade;

create index if not exists shifts_template_id_idx on public.shifts (template_id);

-- Deleting a shift now has to be possible at all: these two referenced `shifts` with the
-- default NO ACTION, so any shift with a swap request or a targeted announcement could not be
-- deleted -- the delete failed with a foreign-key violation instead.
--
-- A swap request for a shift that no longer exists is meaningless, so it goes with it.
alter table public.shift_swap_requests
  drop constraint if exists shift_swap_requests_shift_id_fkey;
alter table public.shift_swap_requests
  add constraint shift_swap_requests_shift_id_fkey
    foreign key (shift_id) references public.shifts (id) on delete cascade;

-- An announcement is a message that was really sent and read; it outlives its subject, so the
-- link is cleared rather than the announcement destroyed (the column is already nullable).
alter table public.announcements
  drop constraint if exists announcements_target_shift_id_fkey;
alter table public.announcements
  add constraint announcements_target_shift_id_fkey
    foreign key (target_shift_id) references public.shifts (id) on delete set null;

-- `time_entries.shift_id` is deliberately NOT made to cascade. A clock-in/clock-out pair is
-- payroll history, and no amount of schedule tidying should silently erase it -- the API
-- refuses to delete a shift that has any (see shifts.service.ts / shift-templates.service.ts)
-- and tells the manager to cancel it instead.
