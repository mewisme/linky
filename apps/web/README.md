# Linky Web (`@ws/web`)

Next.js 16 (App Router) frontend for Linky: matchmaking UI, WebRTC calls, in-call chat, user profile and progress, settings, notifications, and admin dashboards. Auth via Clerk; data via the Express API and Socket.IO.

Monorepo overview: [../../README.md](../../README.md).

## Quick start

From the repo root (API should be running on `NEXT_PUBLIC_API_URL`, default `http://localhost:7270`):

```bash
pnpm dev:web
# or
cd apps/web && pnpm dev
```

App: `http://localhost:3000`.

```bash
pnpm check-types
pnpm lint
pnpm build && pnpm start
```

E2E tests run from the **repo root** with Playwright: `pnpm test`, `pnpm test:ui`, `pnpm test:debug`.

## Architecture

Dependency direction is **inward**:

```text
app → features → entities → shared → lib
```

| Layer | Role | Must not import |
| --- | --- | --- |
| `app/` | Routes, layouts, RSC pages, Next.js route handlers under `app/api/` | — |
| `features/` | Use-case UI, hooks, API clients per feature | Other features (except allowed e.g. `realtime`) |
| `entities/` | Core models/types shared across features | `features/` |
| `shared/` | Generic UI, hooks, utils, env wrappers | `features/`, `entities/` |
| `lib/` | HTTP, auth token, realtime, telemetry, push | `entities/`, `features/` |

**Server vs client pages:** `page.tsx` fetches on the server (`serverFetch`, `withSentryQuery`); interactive UI lives in a sibling `*-client.tsx`. Server actions use `withSentryAction` from `lib/monitoring/with-action.ts`.

## Internationalization

- Locales: `en` (default), `vi` — configured in `src/i18n/routing.ts` with `localePrefix: "as-needed"` (English has no `/en` prefix; Vietnamese uses `/vi/...`).
- Use `Link`, `useRouter`, `usePathname` from `src/i18n/navigation.ts` (pathname without locale prefix).
- Messages: `src/messages/en.json` and `vi.json` (keep key parity).
- UI copy: `useTranslations('namespace')` in client components; data-table columns via `useXxxColumns()` hooks in `shared/ui/data-table/`.

## Data access

| Concern | Location |
| --- | --- |
| API base URLs | `lib/http/backend-url.ts` — never hardcode backend paths |
| Server fetch | `lib/http/server-api.ts` + `{ token: true }` or `preloadedToken` |
| Client fetch | `lib/http/client-api.ts` (native `fetch`, `ApiError`) |
| BFF proxies | `app/api/**/route.ts` forward to backend where needed |
| Auth token | `lib/auth/token.ts` (Clerk) |

Example server page:

```tsx
// app/.../page.tsx
import { serverFetch } from "@/lib/http/server-api";
import { backendUrl } from "@/lib/http/backend-url";

export default async function Page() {
  const user = await serverFetch(backendUrl.users.me(), { token: true });
  return <ProfileClient initialUser={user} />;
}
```

## Environment variables

Validated modules — **do not read `process.env` directly in app code.**

| Module | Import | Use in |
| --- | --- | --- |
| `@/shared/env/public-env` | `publicEnv` | Client, shared code |
| `@/shared/env/server-env` | `serverEnv` | Server Components, route handlers, actions |

**Public (required):** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_OPENPANEL_CLIENT_ID`, `NEXT_PUBLIC_GIPHY_API_KEY` (optional: Sentry, dev origins).

**Server:** `OPENPANEL_API_URL`, `OPENPANEL_CLIENT_SECRET`, optional Sentry build vars.

**Clerk** (standard `@clerk/nextjs`): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — typically in the repo-root `.env` (merged dev file) or `apps/web/.env.local`.

Clerk dashboard tips:

- Allow redirect URLs `/sign-in` and `/vi/sign-in` (and sign-up / reset-password as needed).
- `NEXT_PUBLIC_APP_URL` = site origin only (no locale path).
- Production custom domains use **live** keys (`pk_live_…` / `sk_live_…`).

## Features (high level)

| Feature | Path / notes |
| --- | --- |
| `call` | WebRTC (`features/call/hooks/webrtc/`), floating PiP (`features/call/ui/floating-call/`) |
| `chat` | In-call UI, controls, message list |
| `realtime` | Socket store, `use-socket`, signaling integration |
| `user` | Profile, settings, progress, security, appearance |
| `admin` | Dashboard, users, reports, broadcasts, interest tags, rewards |
| `auth` | Clerk flows |
| `marketing` | Landing, legal pages |
| `notifications` | Toasts, push-related UI |

## Video chat and realtime

**Flow**

1. User starts matchmaking → `getUserMedia` → Socket.IO `/chat` with Clerk token.
2. `matched` → `RTCPeerConnection` with ICE from `GET /api/ice-servers` (Cloudflare TURN).
3. SDP/ICE exchanged via `signal` events; remote stream attached in UI.
4. Optional PiP when navigating away from `/call` (call state in feature stores).

**Socket events** (representative)

| Client → server | Server → client |
| --- | --- |
| `join`, `skip`, `end-call`, `signal` | `joined-queue`, `matched`, `signal` |
| `chat:send`, `chat:attachment:send` | `chat:message`, `peer-left`, `peer-skipped` |
| `mute-toggle`, `video-toggle`, … | Control sync, favorites notifications |

Socket client: `lib/realtime/socket.ts`; providers under `providers/` and `features/realtime/`.

**During a call:** most app routes keep the call alive in floating video; auth routes and `/admin` tear down or conflict with the admin namespace.

## State management

| Kind | Where |
| --- | --- |
| Client UI / call | Zustand in `features/*/model/`, `shared/model/` (e.g. `socket-store`, sidebar, locale preference) |
| Server data | TanStack React Query in feature hooks |
| Locale preference | `shared/model/locale-preference-store.ts` (`localStorage`) + `providers/i18n/locale-sync.tsx` |

## Conventions

- **HTTP:** native `fetch` only (no axios).
- **UI primitives:** `@ws/ui/components/*`.
- **Icons:** `@tabler/icons-react` for new code (avoid extending `lucide-react`).
- **Files:** kebab-case.
- **No Redis** in the frontend — caching is server-side only.
- **Admin roles:** `shared/utils/roles.ts` — `isAdmin`, `isSuperAdmin`.

## App routes (representative)

Routes live under `src/app/[locale]/`:

| Group | Examples |
| --- | --- |
| `(marketing)/` | `/`, `/privacy`, `/terms` |
| `(auth)/` | `/sign-in`, `/sign-up`, `/reset-password` |
| `(app)/call/` | `/call`, `/call/chat`, `/call/history` |
| `(app)/user/` | `/user`, `/user/profile`, `/user/progress`, `/user/reports` |
| `(app)/settings/` | `/settings`, appearance, notifications |
| `(app)/connections/` | favorites, blocked users |
| `(app)/admin/` | users, reports, broadcasts, interest tags, config, rewards |

Vietnamese URLs prefix with `/vi` (e.g. `/vi/call`).

## Project structure

```text
apps/web/src/
├── app/
│   ├── [locale]/          # Localized App Router pages
│   │   ├── (app)/         # Authenticated shell
│   │   ├── (auth)/
│   │   └── (marketing)/
│   └── api/               # Next.js route handlers (BFF)
├── features/              # Feature modules (call, chat, user, admin, …)
├── entities/              # Shared domain types/API (user, call-history, …)
├── shared/                # Generic UI, hooks, env, utils, data-table
├── lib/                   # http, auth, realtime, messaging, monitoring, telemetry
├── providers/             # React context (Clerk, i18n, user token, …)
├── actions/               # Server actions
├── i18n/                  # next-intl routing and navigation helpers
├── messages/              # en.json, vi.json
└── proxy.ts               # Clerk + intl middleware composition
```

## Testing

Playwright from repository root (`playwright.config.ts`):

```bash
pnpm test
pnpm test:ui
pnpm test:debug
pnpm test:trace
pnpm test:report
```

Covers auth, matching, chat, profile updates, and admin flows (global setup uses Clerk test users).

## Related docs

- [Root README](../../README.md)
- [API README](../api/README.md) — sockets, matchmaking, REST prefixes
- [`CLAUDE.md`](../../CLAUDE.md) — monorepo commands and cross-app rules
