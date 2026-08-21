-- Makes "auth user with no profile" impossible, rather than something the API has to undo
-- after the fact. Before this, creating an account was two calls against two subsystems with
-- no shared transaction (auth.admin.createUser, then an insert into profiles), and a crash or
-- a failed compensating delete between them left an account that could sign in but got a
-- 401 "No profile for this account" on every request afterwards.
--
-- Now the profile row is created by a trigger inside the same transaction as the auth user:
-- either both exist or neither does.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
  v_name text;
  v_role text;
begin
  -- raw_APP_meta_data, never raw_user_meta_data. user_metadata is writable by the user
  -- themselves through GoTrue's PATCH /auth/v1/user with nothing but their own access token,
  -- so trusting it for role or location would let an employee provision themselves a manager
  -- account at another location. app_metadata is only writable with the service-role key,
  -- which lives solely in the API.
  v_location_id := nullif(new.raw_app_meta_data ->> 'location_id', '')::uuid;
  v_name        := nullif(new.raw_app_meta_data ->> 'name', '');
  v_role        := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'employee');

  -- No location means this user was not provisioned through the manager-only invite flow.
  -- Refusing here enforces the closed-account-creation rule (FR-002/FR-005) at the database,
  -- not just by declining to wire a signup route: an account created any other way -- the
  -- Supabase dashboard, a provider enabled by accident -- is rejected outright instead of
  -- silently becoming a broken half-account.
  if v_location_id is null then
    raise exception using
      errcode = 'check_violation',
      message = 'Cannot create an auth user without profile metadata',
      detail  = 'raw_app_meta_data must carry location_id, and normally name and role too.',
      hint    = 'Accounts are created only via the API''s manager-only invite (POST /v1/admin/users) or scripts/seed-first-manager.ts, both of which pass app_metadata to admin.createUser().';
  end if;

  insert into public.profiles (id, name, role, phone, location_id, job_role, pay_rate, created_by)
  values (
    new.id,
    -- Falls back to the email's local part so `name` (NOT NULL) always has something real.
    coalesce(v_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New user'),
    v_role,
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
