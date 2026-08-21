-- Fixes 0022, which rejected every account it was supposed to create.
--
-- 0022 assumed `admin.createUser({ app_metadata })` inserts the row with that metadata
-- already on it. It does not. GoTrue INSERTs the auth.users row first and applies
-- app_metadata in a second statement, so an AFTER INSERT trigger observes only:
--
--     {"provider": "email", "providers": ["email"]}
--
-- location_id was therefore always NULL at insert time and 0022's guard raised on every
-- single create, surfacing to managers as "Database error creating new user".
--
-- The work is now split across two triggers:
--
--   on_auth_user_created           fires on INSERT *and* on UPDATE OF raw_app_meta_data, so it
--                                  runs again once GoTrue attaches the metadata, and creates
--                                  the profile at the point the data to build it exists. It
--                                  never raises, and is idempotent — it returns early if a
--                                  profile is already there, so the two firings cannot double
--                                  insert.
--
--   on_auth_user_requires_profile  a DEFERRABLE INITIALLY DEFERRED constraint trigger, which
--                                  fires at COMMIT rather than at statement time — by which
--                                  point the metadata update has happened and the profile
--                                  should exist. It re-queries `profiles` by new.id (an id
--                                  never changes, so this does not depend on the possibly
--                                  stale NEW tuple a deferred trigger carries) and aborts the
--                                  commit if there is still no profile. This is what preserves
--                                  0022's actual goal: no auth user can exist without one.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
begin
  -- Idempotent: this fires on the insert and again on the metadata update.
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  -- Nothing to build a profile from yet. Not an error: on the INSERT firing this is simply
  -- GoTrue not having attached app_metadata yet. The constraint trigger below is what decides
  -- whether the transaction is allowed to finish without one.
  v_location_id := nullif(new.raw_app_meta_data ->> 'location_id', '')::uuid;
  if v_location_id is null then
    return new;
  end if;

  insert into public.profiles (id, name, role, phone, location_id, job_role, pay_rate, created_by)
  values (
    new.id,
    coalesce(nullif(new.raw_app_meta_data ->> 'name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New user'),
    coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'employee'),
    nullif(new.raw_app_meta_data ->> 'phone', ''),
    v_location_id,
    nullif(new.raw_app_meta_data ->> 'job_role', ''),
    (nullif(new.raw_app_meta_data ->> 'pay_rate', ''))::numeric,
    nullif(new.raw_app_meta_data ->> 'created_by', '')::uuid
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.require_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.id) then
    raise exception using
      errcode = 'check_violation',
      message = 'Cannot create an auth user without profile metadata',
      detail  = 'No profile was created for this account, because raw_app_meta_data carried no location_id.',
      hint    = 'Accounts are created only via the API''s manager-only invite (POST /v1/admin/users) or scripts/seed-first-manager.ts, both of which pass app_metadata to admin.createUser().';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_app_meta_data on auth.users
  for each row execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_requires_profile on auth.users;
create constraint trigger on_auth_user_requires_profile
  after insert on auth.users
  deferrable initially deferred
  for each row execute function public.require_profile_for_auth_user();
