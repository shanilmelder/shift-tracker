import { supabase } from '../data/supabase-client.js';
import { sendPushToProfile } from '../services/notifications.service.js';

/** How far ahead of a shift's start to send the "upcoming shift" reminder push (FR-022). */
const REMINDER_WINDOW_MINUTES = 60;

/**
 * Runs on a short interval (see scheduler.ts). Finds shift assignments starting within the
 * reminder window that haven't already been reminded (checked via `shift_reminders_sent`, so
 * a process restart mid-window never double-sends — research.md #8), sends exactly one push
 * per assignment, then marks it sent.
 */
export async function runShiftRemindersJob(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const { data: dueAssignments, error } = await supabase
    .from('shift_assignments')
    .select('id, employee_id, shift:shifts!inner(id, name, start_time)')
    .gte('shift.start_time', now.toISOString())
    .lte('shift.start_time', windowEnd.toISOString());
  if (error) throw error;

  for (const assignment of dueAssignments ?? []) {
    const { data: alreadySent } = await supabase
      .from('shift_reminders_sent')
      .select('shift_assignment_id')
      .eq('shift_assignment_id', assignment.id)
      .maybeSingle();
    if (alreadySent) continue;

    const shift = assignment.shift as unknown as { id: string; name: string; start_time: string };
    await sendPushToProfile(assignment.employee_id as string, 'Upcoming shift', `"${shift.name}" starts soon.`, { shiftId: shift.id });

    const { error: markError } = await supabase.from('shift_reminders_sent').insert({ shift_assignment_id: assignment.id });
    if (markError) throw markError;
  }
}
