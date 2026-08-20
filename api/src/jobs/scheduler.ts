import cron from 'node-cron';
import { runShiftRemindersJob } from './shift-reminders.job.js';

/**
 * Registers every scheduled job at boot. See plan.md's Deployment Notes: `node-cron` runs
 * in-process, so this API must run as a single instance in v1, or this job needs to move to a
 * locked/leader-elected runner before scaling to multiple instances.
 */
export function registerScheduledJobs(): void {
  // Every 5 minutes, comfortably inside the 60-minute reminder window (research.md #8).
  cron.schedule('*/5 * * * *', () => {
    runShiftRemindersJob().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('shift-reminders job failed:', error);
    });
  });
}
