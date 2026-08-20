import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../data/supabase-client.js';
import '../types.js';

const RegisterDeviceSchema = z.object({ expoPushToken: z.string().min(1) });

export async function devicesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/devices', async (request, reply) => {
    const parsed = RegisterDeviceSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      return;
    }
    const { error } = await supabase
      .from('device_push_tokens')
      .upsert({ profile_id: request.caller!.id, expo_push_token: parsed.data.expoPushToken }, { onConflict: 'expo_push_token' });
    if (error) throw error;
    await reply.code(204).send();
  });

  app.delete('/v1/devices/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const { error } = await supabase.from('device_push_tokens').delete().eq('expo_push_token', token).eq('profile_id', request.caller!.id);
    if (error) throw error;
    await reply.code(204).send();
  });
}
