import { buildApp } from './app.js';
import { env } from './config/env.js';
import { registerScheduledJobs } from './jobs/scheduler.js';

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  registerScheduledJobs();
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
