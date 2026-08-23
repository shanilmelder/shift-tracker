import type { QueryClient } from '@tanstack/react-query';

/**
 * The one place that knows which cached queries a given change affects.
 *
 * Every mutation used to invalidate only the key its own screen read from, which is correct for
 * that screen and wrong for every other one showing the same underlying records. An employee
 * submitting time off refreshed their own list but not the manager's approval queue; a manager
 * approving refreshed the queue but not the employee's list; and the dashboard, which
 * aggregates counts across all of it, was invalidated by nothing at all — so its numbers only
 * changed when its 30-second staleTime happened to expire.
 *
 * Grouping the fan-out by *what happened* rather than by *which screen did it* is what stops
 * that recurring: a new screen reading time-off data is covered by `timeOffChanged` without
 * anyone having to remember to add it at each call site.
 *
 * Keys are matched by prefix, so `['shifts']` covers `['shifts','list']` and
 * `['shifts','detail',id]` alike — the lists below are deliberately coarse. Over-invalidating a
 * little costs one refetch; under-invalidating shows someone stale data and reads as a bug.
 */

function invalidateAll(queryClient: QueryClient, keys: string[][]): void {
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * The manager dashboard aggregates counts and a "needs you" list spanning time off, swaps,
 * clock exceptions, open shifts and coverage — so nearly every change invalidates it. It is
 * included in each helper below rather than left to callers, because "I forgot the dashboard"
 * was the single most common instance of this bug.
 */
const DASHBOARD: string[][] = [['dashboard']];

/** A time-off request submitted, approved or denied. */
export function timeOffChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [
    // The employee's own list and the manager's approval queue are separate cache entries of
    // the same records; a decision changes both.
    ['time-off-requests'],
    ...DASHBOARD,
  ]);
}

/** A swap requested, accepted, declined, approved or denied. */
export function swapsChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [
    ['swap-requests'],
    // An approved swap moves who is staffed on the shift, so the schedule and its assignment
    // lists are stale too — not just the swap list itself.
    ['shifts'],
    ['shift-assignments'],
    ['eligible-coworkers'],
    ...DASHBOARD,
  ]);
}

/** Clocking in or out, or starting/ending a break. */
export function timeEntriesChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [
    ['time-entries'],
    // The timesheet is computed from the same entries and is a different cache key entirely.
    ['timesheet'],
    // So are all four reports — hours, overtime, attendance and labor cost are every one of
    // them derived from time entries.
    ['reports'],
    // Clock exceptions feed the dashboard's "needs you" list.
    ...DASHBOARD,
  ]);
}

/** A shift created, edited, deleted, staffed, posted or cancelled. */
export function shiftsChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [
    ['shifts'],
    ['shift-assignments'],
    // Posting a shift open, or filling it, moves it in and out of the open-shifts board.
    ['open-shifts'],
    ['open-shift-claims'],
    // Eligibility depends on who is already staffed when.
    ['eligible-coworkers'],
    // Attendance is scheduled-versus-clocked, so staffing changes move it.
    ['reports'],
    ...DASHBOARD,
  ]);
}

/** An open shift posted, claimed, or a claim confirmed. */
export function openShiftsChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [
    ['open-shifts'],
    ['open-shift-claims'],
    // A confirmed claim staffs the shift.
    ['shifts'],
    ['shift-assignments'],
    ...DASHBOARD,
  ]);
}

/** A staff member created, edited, deactivated, deleted, or given a new temporary password. */
export function staffChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [
    ['admin-users'],
    // The employee-facing team directory reads the same people under its own key.
    ['team'],
    // Who can be offered a swap depends on who exists and is active.
    ['eligible-coworkers'],
    // Labor cost is hours multiplied by pay rate, which is edited on the staff screen.
    ['reports'],
    ...DASHBOARD,
  ]);
}

/** An employee's availability changed. */
export function availabilityChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [['availability'], ['eligible-coworkers'], ...DASHBOARD]);
}

/** A shift area created, renamed or removed. */
export function shiftAreasChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [['shift-areas'], ['shifts']]);
}

/** A shift template created or removed. */
export function shiftTemplatesChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [['shift-templates']]);
}

/** The signed-in user's own profile or notification preferences. */
export function profileChanged(queryClient: QueryClient): void {
  invalidateAll(queryClient, [['profile'], ['team']]);
}
