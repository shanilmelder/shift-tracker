# Shift Tracker

A mobile shift scheduling app for hourly/shift-based workplaces. See
[specs/001-shift-scheduling-app](specs/001-shift-scheduling-app/spec.md) for the full
specification, plan, data model, API contracts, and task breakdown.

## Repository layout

This repo holds two independently deployed projects:

- **`api/`** — the Node.js/TypeScript (Fastify) backend. This is the **only** thing that talks
  to Supabase (Postgres, Auth, Storage, Realtime). It owns all business logic and
  authorization: role checks, shift-leader scoped permissions, schedule conflict detection,
  overtime calculation, geofence validation, and swap/time-off approval routing.
- **`app/`** — the Expo/React Native mobile app. It never calls Supabase directly; it only
  calls `api/`'s REST endpoints (see `specs/001-shift-scheduling-app/contracts/rest-api.md`).

## Getting started

```bash
cd api && npm install && npm run dev
```

```bash
cd app && npm install && npx expo start
```

See `api/.env.example` and `app/.env.example` for required environment variables, and
`specs/001-shift-scheduling-app/plan.md`'s Deployment Notes for how they differ across
dev/staging/production.

## Account model

There is no sign-up screen or endpoint anywhere in this codebase. The first manager account is
seeded via `api/scripts/seed-first-manager.ts`, run once outside the app. Every other account
is created by an existing manager through the app.
