---
name: frontend-env
description: >
  Enforces the correct way to access environment variables in the Next.js frontend (apps/web).
  Use this skill whenever writing, reviewing, or adding env var access in apps/web — including
  React components (client or server), Route Handlers, Server Actions, lib utilities, or hooks.
  Triggers on: referencing process.env, adding new env vars, importing env vars, asking where to
  put a new env variable, or any code that needs configuration values in the frontend.
---

# Frontend Env

The `apps/web` frontend uses two validated, typed env modules. **Never access `process.env` directly anywhere in `apps/web`** — always import from one of these files.

## The Two Modules

| File | Export | Use in |
|---|---|---|
| `@/env/public-env` | `publicEnv` | Client components, shared lib, hooks, anywhere |
| `@/env/server-env` | `serverEnv` | Server Components, Route Handlers, Server Actions, server-only lib |

## Rules

1. **No `process.env` in `apps/web`** — only the two env files themselves may reference `process.env`.
2. **Never import `serverEnv` in client code** — the file throws at the top of module if `typeof window !== "undefined"`, causing a runtime crash. Client components, client-side hooks, and browser-only lib files must only use `publicEnv`.
3. **Both modules validate at startup** — Zod `.strict()` parse runs at import time. Missing required vars crash the app immediately with a descriptive error, rather than failing silently at runtime.

## Usage

```ts
// Client component, hook, or shared lib
import { publicEnv } from "@/env/public-env";

const url = publicEnv.API_URL;
const isDevMode = publicEnv.isDev;
```

```ts
// Route Handler, Server Component, Server Action, or server-only lib
import { serverEnv } from "@/env/server-env";

const secret = serverEnv.OPENPANEL_CLIENT_SECRET;
const isProduction = serverEnv.isProd;
```

```ts
// File that needs both (e.g. server-only analytics init)
import { publicEnv } from "@/env/public-env";
import { serverEnv } from "@/env/server-env";
```

## Adding a New Env Variable

**Step 1 — Classify the variable:**
- `NEXT_PUBLIC_*` prefix → must be public → add to `public-env.ts`
- No prefix / secret → server-only → add to `server-env.ts`

**Step 2 — Add to the correct file following the existing pattern:**

```ts
// In public-env.ts — add to schema, raw object, and export
const publicEnvSchema = z.object({
  // existing...
  NEXT_PUBLIC_MY_VAR: z.string().min(1, "NEXT_PUBLIC_MY_VAR is required"),
});

const raw = {
  // existing...
  NEXT_PUBLIC_MY_VAR: process.env.NEXT_PUBLIC_MY_VAR,
};

export const publicEnv = {
  // existing...
  MY_VAR: parsed.NEXT_PUBLIC_MY_VAR,  // strip NEXT_PUBLIC_ prefix in export
};
```

```ts
// In server-env.ts — same pattern, no prefix stripping needed
const serverEnvSchema = z.object({
  // existing...
  MY_SECRET: z.string().min(1, "MY_SECRET is required"),
});

const raw = {
  // existing...
  MY_SECRET: process.env.MY_SECRET,
};

export const serverEnv = {
  // existing...
  MY_SECRET: parsed.MY_SECRET,
};
```

**Step 3 — Add the variable to `.env.local` (dev) and all deployment environment configs.**

## Key Conventions

- Public env keys in the export **strip the `NEXT_PUBLIC_` prefix** (`NEXT_PUBLIC_API_URL` → `publicEnv.API_URL`).
- Server env keys keep their original names.
- Both exports include convenience booleans: `publicEnv.isDev`, `serverEnv.isDev`, `serverEnv.isProd`, `serverEnv.isTest`.
- Schemas use `.strict()` — undeclared keys are rejected. Add every new var explicitly.
- Optional vars use `.optional()` or `.optional().default(...)`.
