-- open_shift_claims: tracks who has claimed an open shift (FR-029/FR-044-046), distinct from
-- shift_assignments (actual staffing) since a claim is provisional until a manager confirms
-- one claimant (FR-045/FR-046 — claim order must not determine the outcome). This table was
-- described in data-model.md's "Open Shift Posting" entity but missed in the original Phase 2
-- migration pass; added additively here rather than editing an already-applied migration.
create table if not exists public.open_shift_claims (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  employee_id uuid not null references public.profiles (id),
  claimed_at timestamptz not null default now(),
  unique (shift_id, employee_id)
);

create index if not exists open_shift_claims_shift_id_idx on public.open_shift_claims (shift_id);

alter table public.open_shift_claims enable row level security;

create policy open_shift_claims_select on public.open_shift_claims
  for select using (
    employee_id = auth.uid()
    or (
      public.is_manager()
      and exists (select 1 from public.shifts s where s.id = open_shift_claims.shift_id and s.location_id = public.current_location_id())
    )
  );

create policy open_shift_claims_insert_own on public.open_shift_claims
  for insert with check (employee_id = auth.uid());

create policy open_shift_claims_manager_delete on public.open_shift_claims
  for delete using (
    public.is_manager()
    and exists (select 1 from public.shifts s where s.id = open_shift_claims.shift_id and s.location_id = public.current_location_id())
  );
