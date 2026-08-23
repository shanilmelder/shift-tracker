import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { askAssistant } from '../services/assistant.service.js';
import { requireManager } from '../middleware/require-role.middleware.js';
import '../types.js';

/** Long enough for a real question, short enough that the prompt cannot be used as a bulk
 * upload channel to the model host. */
const ChatRequestSchema = z.object({
  question: z.string().min(1, 'Ask a question.').max(1000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

/**
 * Manager-only, like every other reporting route: these answers span the whole location's
 * staff, hours, and time off, which is not an employee-visible view of the data.
 */
export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/assistant/chat', { preHandler: requireManager }, async (request, reply) => {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid request.' } });
      return;
    }

    const caller = request.caller!;
    const answer = await askAssistant(
      { id: caller.id, name: caller.name, locationId: caller.locationId },
      parsed.data.question,
      parsed.data.history ?? [],
    );
    await reply.send(answer);
  });
}
