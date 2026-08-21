import Constants from 'expo-constants';
import { useSessionStore } from '../stores/session.store';
import { ApiError, type ApiErrorBody } from '../types/api/common';

/**
 * The ONLY module in this app that knows the backend's base URL or issues a raw `fetch`.
 * Every feature area's `src/api/*.api.ts` file calls through this — never `fetch` directly,
 * and never any Supabase client, per the plan's rule that the Expo app talks to Supabase
 * through no path at all, only through this API.
 */
const API_BASE_URL: string = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ?? 'http://localhost:3000';

/**
 * How long a single request may take before it is aborted. Without this, an unreachable API
 * host (a stale `API_BASE_URL`, a laptop that changed networks, a server that isn't up) leaves
 * `fetch` pending on a TCP connect that never completes — the caller's promise never settles
 * and the UI sits on its "submitting" state forever with nothing to show the user. Failing
 * loudly after a bounded wait is always better than hanging silently.
 */
const REQUEST_TIMEOUT_MS = 15_000;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Overrides the stored session token — used only for the sign-in flow's immediate follow-up
   * call to `/auth/me`, before a role is known and the session store can be populated. */
  overrideAccessToken?: string;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), `${API_BASE_URL}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', body, query, overrideAccessToken } = options;
  const accessToken = overrideAccessToken ?? useSessionStore.getState().accessToken;

  // Hand-rolled rather than `AbortSignal.timeout()`, which Hermes does not implement.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(`/v1${path}`, query), {
      method,
      // Content-Type is set ONLY when there is a body to describe. On a bodiless POST/PUT/PATCH
      // this header makes Fastify select its JSON parser, which then rejects the empty body
      // with FST_ERR_CTP_EMPTY_JSON_BODY (400) before the route handler ever runs. (GET and
      // DELETE are unaffected — Fastify doesn't parse a body for those.) Several endpoints
      // legitimately take no body: break-start/break-end, claim, post-open, confirm.
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // Both the abort above and an outright connection failure land here. Neither carries an
    // HTTP status, so status 0 stands in for "never reached the server" — screens already
    // render `ApiError.message`, so this surfaces instead of hanging.
    const aborted = controller.signal.aborted;
    throw new ApiError(0, {
      error: {
        code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: aborted
          ? `The server at ${API_BASE_URL} didn't respond in time. Check your connection and that the API is reachable.`
          : `Couldn't reach the server at ${API_BASE_URL}. Check your connection and that the API is running.`,
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody ?? { error: { code: 'UNKNOWN', message: `Request failed with status ${response.status}` } },
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
}

export { API_BASE_URL };
