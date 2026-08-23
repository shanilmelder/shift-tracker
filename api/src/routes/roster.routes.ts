import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getRoster } from '../services/roster.service.js';
import { supabase } from '../data/supabase-client.js';
import '../types.js';

const RosterQuerySchema = z.object({
  /** Local calendar dates at the location, inclusive of both ends. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});

/** How far the wall clock in `timeZone` is ahead of UTC at a given instant (DST-aware). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - instant.getTime();
}

/** The UTC instant of local midnight on `date` in `timeZone`. */
function zonedStartOfDay(date: string, timeZone: string): Date {
  const naive = Date.parse(`${date}T00:00:00Z`);
  // Applied twice: the offset depends on the instant being solved for, and one pass can land on
  // the wrong side of a DST change.
  let instant = naive;
  for (let pass = 0; pass < 2; pass += 1) instant = naive - zoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** The calendar date one day after `date`. Pure date arithmetic, so DST cannot affect it. */
function nextCalendarDate(date: string): string {
  const asUtc = new Date(`${date}T00:00:00Z`);
  asUtc.setUTCDate(asUtc.getUTCDate() + 1);
  return asUtc.toISOString().slice(0, 10);
}

/** Guards against a client asking for an unbounded span; a month view needs ~31. */
const MAX_RANGE_DAYS = 62;

/**
 * The shared roster: who is working which shift across the caller's whole location.
 *
 * Authenticated but not role-gated — every user sees the same view, which is the point of the
 * feature. Scope still comes from the caller's own `locationId`, never from the request, so
 * this cannot be used to read another location's schedule.
 */
export async function rosterRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/roster', async (request, reply) => {
    const parsed = RosterQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid range.' } });
      return;
    }
    const { from, to } = parsed.data;
    if (to < from) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'to must not be before from' } });
      return;
    }

    const spanDays = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
    if (spanDays > MAX_RANGE_DAYS) {
      await reply
        .code(400)
        .send({ error: { code: 'RANGE_TOO_LARGE', message: `Ask for at most ${MAX_RANGE_DAYS} days at a time.` } });
      return;
    }

    const locationId = request.caller!.locationId;
    const { data: location } = await supabase.from('locations').select('timezone').eq('id', locationId).single();
    const timeZone = (location?.timezone as string) ?? 'UTC';

    // The dates are the location's, so the window has to be built in the location's timezone —
    // treating them as UTC would shift every boundary by the offset and drop or add a shift at
    // each end of the range.
    const startUtc = zonedStartOfDay(from, timeZone).toISOString();
    const endUtc = zonedStartOfDay(nextCalendarDate(to), timeZone).toISOString();

    await reply.send(await getRoster(locationId, startUtc, endUtc));
  });
}
