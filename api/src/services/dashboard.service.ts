import { supabase } from '../data/supabase-client.js';

/** FR-025/SC-008: one aggregate call so the dashboard never needs to cross-reference multiple endpoints. */
export async function getDashboard(locationId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todaysShiftsResult, openShiftsResult, pendingSwapsResult, pendingTimeOffResult] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, status')
      .eq('location_id', locationId)
      .gte('end_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString()),
    supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('location_id', locationId).eq('status', 'open'),
    supabase
      .from('shift_swap_requests')
      .select('id, shift:shifts!inner(location_id)', { count: 'exact', head: true })
      .eq('shift.location_id', locationId)
      .eq('status', 'coworker_accepted'),
    supabase
      .from('time_off_requests')
      .select('id, employee:profiles!inner(location_id)', { count: 'exact', head: true })
      .eq('employee.location_id', locationId)
      .eq('status', 'pending'),
  ]);

  const todaysShifts = todaysShiftsResult.data ?? [];
  const unfilledToday = todaysShifts.filter((s) => s.status === 'draft').length;

  return {
    todaysShiftCount: todaysShifts.length,
    todaysUnfilledCount: unfilledToday,
    openUnfilledShiftCount: openShiftsResult.count ?? 0,
    pendingSwapApprovalCount: pendingSwapsResult.count ?? 0,
    pendingTimeOffApprovalCount: pendingTimeOffResult.count ?? 0,
  };
}
