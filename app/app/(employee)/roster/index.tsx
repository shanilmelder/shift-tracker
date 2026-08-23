/**
 * Employee-side entry to the shared roster. Both roles render the exact same screen — the view
 * is identical by design — so this is a thin route file over one component rather than two
 * parallel implementations that would drift.
 */
export { RosterScreen as default } from '../../../src/features/roster/RosterScreen';
