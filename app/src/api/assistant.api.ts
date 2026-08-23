import { apiRequest } from './client';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantAnswer {
  reply: string;
  /** Names of the lookups the API actually ran to produce this answer. */
  toolsUsed: string[];
}

/**
 * The model runs behind the API, never in the app: the app has no model host address and no
 * key, and every answer is scoped to the caller's location on the server.
 *
 * `history` is sent explicitly because the API keeps no conversation state — each request
 * carries the context it needs, so nothing has to be reconciled across a reconnect.
 */
export async function askAssistant(question: string, history: ChatTurn[]): Promise<AssistantAnswer> {
  return apiRequest<AssistantAnswer>('/assistant/chat', {
    method: 'POST',
    body: { question, history },
    // The API's own model call is allowed up to 60s, and a cold cloud model regularly uses a
    // good part of that. The default 15s would abort perfectly healthy requests.
    timeoutMs: 70_000,
  });
}
