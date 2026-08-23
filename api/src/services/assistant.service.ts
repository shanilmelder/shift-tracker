import { supabase } from '../data/supabase-client.js';
import { ollamaChat, OllamaError, type OllamaMessage } from './ollama.client.js';
import { ASSISTANT_TOOLS, TOOL_DEFINITIONS, type ToolContext } from './assistant.tools.js';

/**
 * The reporting assistant: a bounded tool-calling loop over ASSISTANT_TOOLS.
 *
 * The model never sees the database and never receives a location id — every executor derives
 * scope from the authenticated caller (see assistant.tools.ts). What the model contributes is
 * choosing a tool, filling in its arguments, and wording the result.
 *
 * NOTE ON WHERE THE DATA GOES: whatever a tool returns is sent to OLLAMA_BASE_URL as part of
 * the next request. With a local daemon and a local model that stays on the machine; with a
 * `-cloud` model, or a hosted base URL, employee names and schedules leave your infrastructure.
 * That is a deployment decision, made by which base URL and model are configured.
 */

/** How many times the model may call tools before it must answer. Each pass is a round trip to
 * the model plus a query, so this bounds both latency and cost; three is enough for the
 * realistic "look something up, then look up a second thing to compare" case, while stopping a
 * model that has got itself into a loop of re-calling the same tool forever. */
const MAX_TOOL_ROUNDS = 3;

/** Trimmed to the most recent exchanges. The whole history is re-sent on every turn, so an
 * unbounded transcript grows the prompt (and the latency) without bound over a long session. */
const MAX_HISTORY_MESSAGES = 12;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantAnswer {
  reply: string;
  /** Which tools ran, in order. Surfaced in the UI so a manager can see that an answer came
   * from a real query and which one — an assistant over payroll-adjacent data should not ask
   * to be taken purely on faith. */
  toolsUsed: string[];
}

function buildSystemPrompt(context: ToolContext, managerName: string): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: context.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: context.timeZone, weekday: 'long' }).format(new Date());

  return [
    `You are the reporting assistant for a shift-scheduling app. You are talking to ${managerName}, a manager.`,
    `Today is ${weekday}, ${today}, in the location's timezone (${context.timeZone}).`,
    '',
    'Resolve all relative dates against today before calling a tool. "Tomorrow" is the day after today,',
    '"this month" runs from the 1st of the current month to today, "this week" starts on Monday.',
    'Tools take absolute YYYY-MM-DD dates only.',
    '',
    'Rules:',
    '- Answer only from tool results. Never invent an employee name, a number, a shift, or a date.',
    '- If no tool can answer the question, say plainly what you cannot look up. Do not guess.',
    '- If a tool comes back empty, say nothing was found for that period. That is a real answer,',
    '  not a failure to retry with different arguments.',
    '- Scheduled shifts and clocked hours are different things. Do not present one as the other.',
    '- Be brief and concrete. Lead with the answer, and give times in the local 24-hour format',
    '  the tools return.',
    '- Reply in plain text. The app renders your answer literally, so Markdown does not format:',
    '  asterisks, backticks and heading marks appear as themselves. For a list, put each item on',
    '  its own line starting with "- ".',
    '- You only have access to this manager\'s own location. Do not claim otherwise.',
  ].join('\n');
}

export async function askAssistant(
  caller: { id: string; name: string; locationId: string },
  question: string,
  history: ChatTurn[] = [],
): Promise<AssistantAnswer> {
  const { data: location } = await supabase.from('locations').select('timezone').eq('id', caller.locationId).single();
  const context: ToolContext = { locationId: caller.locationId, timeZone: location?.timezone ?? 'UTC' };

  const messages: OllamaMessage[] = [
    { role: 'system', content: buildSystemPrompt(context, caller.name) },
    ...history.slice(-MAX_HISTORY_MESSAGES).map((turn) => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: question },
  ];

  const toolsUsed: string[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    // On the final pass the tools are withheld, which forces the model to answer from what it
    // already has instead of opening another round it will not be allowed to complete.
    const message = await ollamaChat(messages, round === MAX_TOOL_ROUNDS ? [] : TOOL_DEFINITIONS);
    messages.push(message);

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: message.content.trim(), toolsUsed };
    }

    for (const call of calls) {
      const tool = ASSISTANT_TOOLS[call.function.name];
      if (!tool) {
        // Models do occasionally invent a plausible-sounding tool name. Telling it so, rather
        // than throwing, lets it recover on the next pass by picking a real one.
        messages.push({
          role: 'tool',
          tool_name: call.function.name,
          content: JSON.stringify({
            error: `No such tool. Available tools: ${Object.keys(ASSISTANT_TOOLS).join(', ')}.`,
          }),
        });
        continue;
      }

      toolsUsed.push(call.function.name);
      try {
        const result = await tool.execute(call.function.arguments ?? {}, context);
        messages.push({ role: 'tool', tool_name: call.function.name, content: JSON.stringify(result) });
      } catch (error) {
        // A failed query is reported back to the model as a tool result, not raised: the model
        // can then tell the manager that this particular lookup failed, which is far more
        // useful than the whole chat turning into a 500.
        messages.push({
          role: 'tool',
          tool_name: call.function.name,
          content: JSON.stringify({ error: error instanceof Error ? error.message : 'Lookup failed.' }),
        });
      }
    }
  }

  throw new OllamaError('The assistant could not settle on an answer. Try asking a narrower question.', 503);
}
