import { env } from '../config/env.js';

/**
 * A minimal Ollama `/api/chat` client. Hand-rolled rather than pulling in the `ollama` npm
 * package: this uses exactly one endpoint with a stable, documented request shape, and the
 * package would add a dependency (and its own fetch/agent handling) for a single POST.
 *
 * Nothing here is assistant-specific — it knows about messages and tools, not about shifts.
 */

export interface OllamaToolCall {
  function: {
    name: string;
    /** Ollama returns already-parsed arguments, unlike the OpenAI wire format's JSON string. */
    arguments: Record<string, unknown>;
  };
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  /** Echoed back on a `tool` message so the model can match a result to its call. */
  tool_name?: string;
}

export interface OllamaToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

interface OllamaChatResponse {
  message?: OllamaMessage;
  error?: string;
}

/**
 * Long, because a cold cloud model can take a while to produce a first token, and the agent
 * loop may spend several round trips here. Still bounded: an unreachable daemon must fail
 * loudly rather than hold a request open until the platform's own timeout kills it.
 */
const REQUEST_TIMEOUT_MS = 60_000;

export class OllamaError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

export async function ollamaChat(
  messages: OllamaMessage[],
  tools: OllamaToolDefinition[],
): Promise<OllamaMessage> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(new URL('/api/chat', env.OLLAMA_BASE_URL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.OLLAMA_API_KEY ? { Authorization: `Bearer ${env.OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages,
        tools,
        // The agent loop needs the whole message (tool calls included) before it can act, so
        // there is nothing to gain from streaming deltas it would only have to reassemble.
        stream: false,
        // Near-zero: this answers questions about real records, where an invented employee
        // name or a re-worded number is a defect, not creative variation.
        options: { temperature: 0.1 },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    // 503 rather than 500: the API itself is fine, its upstream model host is not — and that
    // distinction is exactly what a manager staring at a broken chat screen needs to see.
    throw new OllamaError(
      controller.signal.aborted
        ? `The AI model at ${env.OLLAMA_BASE_URL} did not respond in time.`
        : `Could not reach the AI model at ${env.OLLAMA_BASE_URL}. Check that Ollama is running and reachable from the API.`,
      503,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as OllamaChatResponse | null;
    throw new OllamaError(body?.error ?? `The AI model returned status ${response.status}.`, 503);
  }

  const body = (await response.json()) as OllamaChatResponse;
  if (!body.message) throw new OllamaError('The AI model returned an empty response.', 503);
  return body.message;
}
