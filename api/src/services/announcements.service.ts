import { supabase } from '../data/supabase-client.js';
import { publishToProfiles } from './realtime.service.js';
import { sendPushToProfiles } from './notifications.service.js';
import type { CallerProfile } from '../types.js';

export interface CreateAnnouncementInput {
  targetScope: 'team' | 'location' | 'shift';
  targetShiftId?: string;
  message: string;
}

/** FR-035: resolves the exact recipient set server-side — the client never computes this. */
export async function resolveRecipients(caller: CallerProfile, input: CreateAnnouncementInput): Promise<string[]> {
  if (input.targetScope === 'shift') {
    if (!input.targetShiftId) throw new Error('targetShiftId is required for shift-scoped announcements');
    const { data, error } = await supabase.from('shift_assignments').select('employee_id').eq('shift_id', input.targetShiftId);
    if (error) throw error;
    return (data ?? []).map((row) => row.employee_id as string);
  }

  // 'team' and 'location' both resolve to every active profile at the manager's own location
  // in v1 (a manager is scoped to one location — no distinction between "team" and "location"
  // scope exists yet since there's only ever one team per location's manager).
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('location_id', caller.locationId)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

export async function createAnnouncement(caller: CallerProfile, input: CreateAnnouncementInput) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      sender_id: caller.id,
      target_scope: input.targetScope,
      target_location_id: input.targetScope !== 'shift' ? caller.locationId : null,
      target_shift_id: input.targetScope === 'shift' ? input.targetShiftId : null,
      message: input.message,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create announcement');

  const recipientIds = await resolveRecipients(caller, input);
  publishToProfiles(recipientIds, 'announcement.new', { announcementId: data.id });
  await sendPushToProfiles(recipientIds, 'Announcement', input.message);

  return { announcement: data, recipientIds };
}

export async function listMyAnnouncements(caller: CallerProfile) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .or(`target_location_id.eq.${caller.locationId},sender_id.eq.${caller.id}`);
  if (error) throw error;
  return data ?? [];
}
