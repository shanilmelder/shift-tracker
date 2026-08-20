-- shift_reminders_sent: marks that the upcoming-shift reminder push has already been sent for
-- a given shift assignment, so the node-cron job (research.md #8) never double-sends if the
-- process restarts mid-window.
create table if not exists public.shift_reminders_sent (
  shift_assignment_id uuid primary key references public.shift_assignments (id) on delete cascade,
  sent_at timestamptz not null default now()
);
