import type { FastifyInstance } from 'fastify';
import { registerSseClient } from '../services/realtime.service.js';
import '../types.js';

export async function realtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/realtime/stream', async (request, reply) => {
    reply.hijack(); // we manage this response's lifecycle manually (long-lived SSE stream)
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    reply.raw.write('retry: 3000\n\n');

    const unregister = registerSseClient(request.caller!, reply);

    const pingInterval = setInterval(() => {
      reply.raw.write(': ping\n\n');
    }, 30_000);

    request.raw.on('close', () => {
      clearInterval(pingInterval);
      unregister();
    });
  });
}
