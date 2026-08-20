-- device_push_tokens: supports FR-022 push notifications. Not in the user's original table
-- list; added because push delivery requires somewhere to store each device's Expo push token.
create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists device_push_tokens_profile_id_idx on public.device_push_tokens (profile_id);
