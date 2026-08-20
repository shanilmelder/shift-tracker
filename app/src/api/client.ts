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

  const response = await fetch(buildUrl(`/v1${path}`, query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
