-- Fixes infinite recursion in three RLS helper functions from 0013_rls_policies.sql.
--
-- current_location_id() and is_manager() each select from public.profiles, but they are also
-- used inside policies defined ON public.profiles (profiles_select_own_or_same_location,
-- profiles_manager_update_same_location, profiles_manager_insert). Likewise is_shift_leader()
-- selects from public.shift_assignments and is used inside a policy ON
-- public.shift_assignments (shift_assignments_leader_write). Because these are STABLE SQL
-- functions, Postgres inlines them directly into the calling query — so evaluating the policy
-- re-triggers RLS on the same table, which re-evaluates the same policy, which calls the same
-- function again, forever, until Postgres aborts with "stack depth limit exceeded" (54001).
--
-- Marking them SECURITY DEFINER makes them run as their owner (a bypassrls role), so the
-- self-select they perform no longer re-enters RLS on that table. `search_path` is pinned
-- for the same reason the 0018 migration pinned it elsewhere: a SECURITY DEFINER function
-- must not resolve unqualified identifiers against a caller-controlled search_path.

create or replace function public.current_location_id()
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select location_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'manager' and p.is_active
  );
$$;

create or replace function public.is_shift_leader(target_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.shift_assignments sa
    where sa.shift_id = target_shift_id
      and sa.employee_id = auth.uid()
      and sa.is_leader
  );
$$;
