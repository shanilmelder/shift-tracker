# Realtime Contract: Server-Sent Events

Per research.md decision #1: the Expo app never subscribes to Supabase Realtime directly. It
connects to one SSE stream on the Node API, which internally relays filtered Supabase Realtime
changes.

## Connecting

```
GET /v1/realtime/stream
Authorization: Bearer <supabase-access-token>
Accept: text/event-stream
```

The connection stays open; the API sends a `: ping` comment every 30s to keep intermediaries
from closing the connection, and the client reconnects with standard SSE auto-retry
(`retry: 3000` sent on connect) on drop — this is also the app's signal to re-fetch via
TanStack Query for anything it may have missed while disconnected (SSE is a live-update
convenience, not the source of truth; a client that reconnects always reconciles via the
normal REST `GET` endpoints).

## Event Types

Each SSE message's `event:` field names the event; `data:` is a JSON payload. All events are
already filtered server-side to only what the connected user is authorized to see (same rules
as the REST endpoints' role gates) — the client performs no additional filtering.

| Event | Payload | Sent to |
|---|---|---|
| `shift.assigned` | `{ shift_id }` | The newly-staffed employee |
| `shift.changed` | `{ shift_id, fields: string[] }` | Every employee currently staffed on that shift |
| `shift.cancelled` | `{ shift_id }` | Every employee currently staffed on that shift |
| `swap.status_changed` | `{ swap_request_id, status }` | The requesting and target employees, and the shift's leader if any |
| `time_off.status_changed` | `{ time_off_request_id, status }` | The requesting employee |
| `open_shift.posted` | `{ shift_id }` | Eligible employees at that location |
| `open_shift.claimed` | `{ shift_id, claim_count }` | Managers at that location (dashboard/claims-list refresh) |
| `open_shift.confirmed` | `{ shift_id }` | All claimants who were not chosen (their claim is now moot) |
| `announcement.new` | `{ announcement_id }` | Resolved recipient set for that announcement |

## Rationale for shape

Payloads are intentionally thin (IDs, not full objects) — the client re-fetches the affected
resource via its normal React Query hook on receipt, so there is exactly one code path that
turns "server data" into "what's on screen," whether the app just launched or just received a
live event. This avoids a second, realtime-only deserialization/caching path that could drift
from the REST responses.
