/**
 * Supabase's invite/recovery redirect appends tokens as a URL fragment (`#access_token=...`),
 * not a query string, so expo-router's own param parsing never sees them. `URLSearchParams`
 * isn't polyfilled in this RN setup, hence the manual split/decode here.
 */
export function parseFragmentParams(url: string): Record<string, string> {
  const fragment = url.split('#')[1];
  if (!fragment) return {};

  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}
