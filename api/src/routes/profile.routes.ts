import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { findProfileById, listProfilesByLocation, updateOwnProfile } from '../data/profiles.repo.js';
import { supabase } from '../data/supabase-client.js';
import '../types.js';

const UpdateOwnProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  notificationPrefs: z.record(z.boolean()).optional(),
});

/**
 * FR-021 (coworker directory) and FR-023 (own profile + notification prefs). `updateOwnProfile`
 * deliberately accepts only the fields in `UpdateOwnProfileSchema` — role, pay_rate, and
 * location_id are never in that shape, so a self-update can't touch them even via a malformed
 * request (constitution: Security First, enforced by the type/schema, not by trusting intent).
 */
export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/profile', async (request, reply) => {
    const profile = await findProfileById(request.caller!.id);
    await reply.send(profile);
  });

  app.patch('/v1/profile', async (request, reply) => {
    const parsed = UpdateOwnProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const updated = await updateOwnProfile(request.caller!.id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.notificationPrefs !== undefined ? { notification_prefs: parsed.data.notificationPrefs } : {}),
    });
    await reply.send(updated);
  });

  // Avatar upload: the API is the only thing that ever touches Supabase Storage — the Expo
  // app never uploads directly (per plan.md's rule that the client never calls Supabase).
  app.post('/v1/profile/avatar', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      await reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
      return;
    }
    const buffer = await data.toBuffer();
    const path = `avatars/${request.caller!.id}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, buffer, { upsert: true, contentType: data.mimetype });
    if (uploadError) {
      await reply.code(500).send({ error: { code: 'UPLOAD_FAILED', message: uploadError.message } });
      return;
    }
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
    const updated = await updateOwnProfile(request.caller!.id, { avatar_url: publicUrl.publicUrl });
    await reply.send(updated);
  });

  app.get('/v1/team', async (request, reply) => {
    const team = await listProfilesByLocation(request.caller!.locationId);
    await reply.send(team.filter((p) => p.is_active));
  });
}
