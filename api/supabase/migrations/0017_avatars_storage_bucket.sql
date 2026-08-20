-- Creates the Storage bucket profile avatars are uploaded into (T089/FR-023). Uploads only
-- ever go through the API's service-role client (POST /v1/profile/avatar) — never directly
-- from the Expo app, per the plan's rule that the client never talks to Supabase directly.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
