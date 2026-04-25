# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For dependency boundaries between apps and shared packages (workers, queues, what must stay in `apps/api`), see [.cursor/skills/project-architecture-operating-manual/SKILL.md](.cursor/skills/project-architecture-operating-manual/SKILL.md).

## Project Overview

Linky is a real-time video chat platform. Turborepo monorepo with pnpm 10.33.0 (see root `package.json` `packageManager`) and Node.js 20+.

## Common Commands

```bash
# Development
pnpm dev                  # All apps (turbo)
pnpm dev:api              # API only (Express; default PORT 7270, override via env)
pnpm dev:web              # Frontend only (Next.js, port 3000)
pnpm dev:worker           # Background worker (AI + general Redis queues; calls internal HTTP API)

# Build
pnpm build                # All packages
pnpm build:api            # API only
pnpm build:web            # Web only
pnpm start:api            # Production API (after build)
pnpm start:web # Production web (after build)
pnpm start:worker # Production worker (after build)

# Lint & Type Check
pnpm lint                 # ESLint all
pnpm lint:api             # ESLint API
pnpm lint:web             # ESLint web
pnpm check-types          # TypeScript all workspaces
pnpm check-types:api      # API only
pnpm check-types:web      # Web only
pnpm format               # Prettier

# Testing - Backend Unit (Vitest)
cd apps/api
pnpm vitest run                            # All unit tests
pnpm vitest run src/__tests__/cache        # Test directory
pnpm vitest run src/__tests__/domains/user.test.ts  # Single file

# Testing - E2E (Playwright, from root)
pnpm test                 # All e2e tests
pnpm test:ui              # Playwright UI mode
pnpm test:debug           # Debug mode
pnpm test:trace           # With trace
pnpm test:report          # View HTML report
```

## Monorepo Structure

```
apps/
  api/           Express backend (DDD); enqueues work to Redis queues
  web/           Next.js 16 frontend (App Router)
  worker/        Dequeues AI and general jobs; invokes private HTTP routes on the API
packages/
  config/             Shared env parsing (Zod); @ws/config
  database-types/     Supabase-oriented DB types; @ws/database-types
  eslint-config/      Shared ESLint configs
  logger/             Pino bootstrap; @ws/logger
  sdk-internal/       Redis queue enqueue/dequeue helpers; @ws/sdk-internal
  shared-types/       Cross-app queue keys and job envelope types; @ws/shared-types
  typescript-config/  Shared TS configs
  ui/                 Shared React library (Radix + shadcn); @ws/ui
  validation/         Shared Zod schemas for job envelopes; @ws/validation
  internal-worker-api/ Internal worker HTTP paths, env parsing, auth header helpers; @ws/internal-worker-api
```

**Queue contracts:** payload shapes and keys live in `@ws/shared-types` and `@ws/validation`. The API enqueues via `apps/api/src/jobs/` and Redis; the worker uses `@ws/sdk-internal` to dequeue and calls authenticated internal routes under `/internal/worker/v1` on `apps/api` to execute jobs (no direct imports from `@ws/api` in the worker runtime).

## Backend Architecture (apps/api)

The API follows strict domain-driven design. Key rule: **domains must NOT import other domains**.

### Layer Structure (apps/api/src/)

- **domains/** - Business logic grouped by domain (user, video-chat, matchmaking, reports, admin, embeddings, notification). Each domain has: `http/` (route handlers), `service/` (business logic), `socket/` (realtime handlers), `types/`, `index.ts` (public exports)
- **infra/** - External system integrations (Redis, Supabase/Postgres, MQTT, S3, Clerk, Ollama). No business logic here.
- **routes/** - Express route composition and mounting. Wires domain routers to URL paths. No business logic.
- **socket/** - Socket.IO server setup, namespace wiring (`/chat`, `/admin`, `/video-chat`), auth middleware
- **contexts/** - Cross-domain orchestration. The ONLY place where multiple domains can be coordinated.
- **jobs/** - Enqueue helpers and job modules invoked from domains or contexts (Redis-backed)
- **worker/** - Job execution helpers used by internal worker HTTP routes and in-process enqueue fallbacks
- **middleware/** - Express middleware (Clerk auth, admin check, rate limiting, graceful shutdown)
- **types/** - Cross-domain shared types, database types, socket event types
- **config/** - Environment variable loading and validation

### Cross-Domain Coordination

When a feature needs data from multiple domains, use `src/contexts/` for orchestration. Never import between domains directly. Inject functions/interfaces instead.

### Cache Pattern

Redis is read-optimization only, never source of truth. Uses cache-aside pattern with `getOrSet()`. Cache keys in `infra/redis/keys.ts`, TTLs in `infra/redis/policy.ts`. All Redis operations are wrapped with `withRedisTimeout()` (default 5s) to prevent hanging — cache failures are logged and swallowed, never rethrown.

### Logging (Pino)

For all levels: `logger.<level>([mergingObject], [message], [...interpolationValues])`. Put the merging object (error or context) first, then the message, then any interpolation values (e.g. `logger.error(err, "Unexpected error in GET /users")` or `logger.warn(err, "Failed for user %s", userId)`).

### Backend Error Response Format

All route handlers return `{ error: "ErrorType", message: "description" }` on failure with standard HTTP status codes (400, 401, 403, 404, 500). Errors are logged with `logger.error()` before responding.

## Frontend Architecture (apps/web)

**Full contract:** [docs/FRONTEND_ARCHITECTURE_GUIDELINES.md](docs/FRONTEND_ARCHITECTURE_GUIDELINES.md) — layers, import rules, checklists, migration, and step-by-step guides for adding features/entities.

Next.js 16 App Router with route groups:
- `(app)/` - Authenticated pages
- `(auth)/` - Login/signup
- `(marketing)/` - Public pages

State: Zustand stores + TanStack React Query for server data. Real-time: Socket.IO client + MQTT. Auth: Clerk (`@clerk/nextjs`).

### Layer Structure (apps/web/src/)

Dependency direction is **inward**: app → features → entities → shared → lib.

| Layer | Responsibility | Must NOT import from |
|-------|----------------|----------------------|
| **app/** | Routing, layouts, page composition, API route handlers | — |
| **features/** | Use-case and UI per feature (admin, auth, call, chat, marketing, notifications, realtime, user) | Other features (except allowed e.g. realtime) |
| **entities/** | Domain models and types (call-history, notification, user) | features |
| **shared/** | Reusable, domain-agnostic code (layouts, generic data-table, hooks, utils) | features, entities |
| **lib/** | HTTP, auth, cache, realtime, telemetry, push, messaging, monitoring | entities, features |
| **actions/** | Server actions | features (only lib, entities, shared types/env) |
| **providers/** | React context | — |

- **Entity vs feature:** Entity = core data concept used by multiple features (types, optional model/api). Feature = user-facing capability (ui, hooks, api, model, types). Single-feature-only types can live in that feature.
- **shared** must not contain domain-specific UI; put column definitions in the owning feature and pass to generic DataTable.
- **lib** must not depend on entities or features; use minimal types in lib or pass types from caller.

### lib Submodules (apps/web/src/lib/)

| Submodule | Contents |
|-----------|----------|
| `http/` | `server-api.ts` (serverFetch), `client-api.ts`, `backend-url.ts` (URL builders), `api-url.ts`, `urls/` (grouped URL builders), `adapters/` |
| `auth/` | `token.ts` — Clerk token retrieval |
| `cache/` | `tags.ts` — Next.js cache tag constants |
| `monitoring/` | `with-action.ts` — `withSentryAction()`, `withSentryQuery()` |
| `telemetry/` | Analytics event helpers |
| `realtime/` | Socket.IO client factory, health tracking |
| `messaging/` | MQTT client |
| `push/` | Push notification service worker |

### Server vs Client Component Pattern

Pages follow a consistent split: `page.tsx` is a server component that fetches data via `serverFetch()` and passes it as props to a `*-client.tsx` sibling that handles interactivity. The `-client.tsx` suffix naming is the project convention for client components.

Server actions use `withSentryAction()` from `@/lib/monitoring/with-action` and `serverFetch()` from `@/lib/http/server-api` with `{ token: true }` to auto-inject Clerk auth tokens:

```typescript
'use server'
export async function myAction(params) {
  return withSentryAction("myAction", async () => serverFetch(url, { token: true, ... }));
}
```

Server page queries with Next.js data cache use `withSentryQuery()`:

```typescript
return withSentryQuery("queryName", (token) => serverFetch(url, { preloadedToken: token }), {
  keyParts: ["key"],
  tags: ["cache-tag"],
});
```

### Centralized API URL Builders

Never hardcode API URLs. Use `backendUrl` from `@/lib/http/backend-url`:
- `backendUrl.users.*` — user profile, settings, blocks, interest-tags, streak, level, progress
- `backendUrl.admin.*` — admin CRUD for all admin resources
- `backendUrl.resources.*` — changelogs, call-history, favorites, interest-tags, reports
- `backendUrl.notifications.*`, `backendUrl.push.*`, `backendUrl.media.*`
- `backendUrl.economy.*` — economy/shop/boost endpoints
- `backendUrl.videoChat.*`, `backendUrl.matchmaking.*`

### API Type Namespaces

Large API types are organized as namespaces in the owning feature's `types/` folder (e.g. `features/admin/types/admin.types.ts`). Pattern: `AdminAPI.Broadcasts.Get.Response`, `AdminAPI.Users.Patch.Body`.

### Admin Role System

Two-tier roles: `admin` and `superadmin`. Use utilities in `apps/web/src/shared/utils/roles.ts`:
- `isAdmin(role)` — true for both admin and superadmin
- `isSuperAdmin(role)` — true only for superadmin

Backend: role is cached in Redis (5-min TTL) via `apps/api/src/infra/admin-cache/`. Admin middleware and Socket.IO admin namespace middleware both use this cache.

### Import Aliases

- `@/*` maps to `src/*` (both apps)
- `@ws/ui/*` maps to shared UI components
- Workspace packages use `@ws/<package>` imports

### Frontend Environment Variables

**Never access process.env directly in apps/web.** Use the validated env modules:

| Module | Import | Use In |
|--------|--------|--------|
| @/env/public-env | publicEnv | Client components, hooks, shared lib |
| @/env/server-env | serverEnv | Server Components, Route Handlers, Server Actions |

- NEXT_PUBLIC_* vars go in public-env.ts (strip NEXT_PUBLIC_ prefix in export)
- Server-only secrets go in server-env.ts
- Both use Zod .strict() validation at startup


### Internationalization (next-intl)

- **Locales:** `en` (default) and `vi`. **`localePrefix: "as-needed"`** in [`apps/web/src/i18n/routing.ts`](apps/web/src/i18n/routing.ts): English has **no** prefix (`/call`), Vietnamese uses **`/vi/...`** (`/vi/call`). Use **`Link`**, **`useRouter`**, and **`usePathname`** from [`apps/web/src/i18n/navigation.ts`](apps/web/src/i18n/navigation.ts); `usePathname()` returns the pathname **without** the locale prefix. Keep **`useSearchParams`** from `next/navigation` where needed.
- **UI language preference** is **not** stored in Postgres; it lives in the persisted client store [`apps/web/src/shared/model/locale-preference-store.ts`](apps/web/src/shared/model/locale-preference-store.ts) (`localStorage`). [`apps/web/src/providers/i18n/locale-sync.tsx`](apps/web/src/providers/i18n/locale-sync.tsx) aligns the URL with that preference after hydration.
- **Wiring:** `createNextIntlPlugin("./src/i18n/request.ts")` in [`apps/web/next.config.ts`](apps/web/next.config.ts); [`apps/web/src/i18n/request.ts`](apps/web/src/i18n/request.ts) loads [`apps/web/src/messages/{locale}.json`](apps/web/src/messages/en.json). Root layout uses `NextIntlClientProvider`; locale-aware navigation helpers live under `src/i18n/`. [`apps/web/src/proxy.ts`](apps/web/src/proxy.ts) composes Clerk with next-intl; **`/api`** and **`/trpc`** skip `intlMiddleware` (return `NextResponse.next()`).
- **Messages:** Add user-facing copy to `en.json` and keep **`vi.json` in key-for-key parity**. Use nested objects and ICU placeholders (`{count}`, `{name}`) for dynamic segments. Common top-level namespaces include `common`, `errors`, `errorsPage`, `notFoundPage`, `user`, `admin`, `dataTable` (with nested sections such as `dataTable.users`, `dataTable.importInterestTags`), `chat`, `call`, `settings`, `notifications`, `development`, etc.
- **Client UI:** Use `useTranslations('namespace')` from `next-intl` in client components and client hooks (e.g. hooks that call `toast`). For nested keys, use dot paths: `t('dataTable.importInterestTags.dialogTitle')`.
- **Data tables:** Column definitions live in `shared/ui/data-table/**/define-data.tsx`. Export **`useXxxColumns(callbacks?)`** hooks that call `useTranslations` and return `useMemo`’d column defs; sibling `*-data-table.tsx` files call that hook (do not export a static `columns` factory for new work). Translate headers, action labels, `aria-label`s, and confirmation copy.
- **API errors / realtime:** Prefer typed `BackendUserMessage` / `BackendI18nPayload` from `@ws/shared-types` on the server; the web app resolves copies via helpers such as `resolveBackendMessage` and HTTP `ApiError` parsing where those flows exist. Do not hardcode user-facing English in API bodies when a structured `userMessage` is available.
- **Env:** For any new public env vars used by the frontend, follow [`.cursor/skills/frontend-env/SKILL.md`](.cursor/skills/frontend-env/SKILL.md).

## Code Conventions

- **Comments are forbidden by default.** Only add comments to explain WHY, never WHAT. Prefer clear naming and structure.
- **No emojis** in code, docs, or responses unless user explicitly requests them. Exception: toast strings and Interest Tags icon input.
- **File naming**: All files should be in kebab-case.
- **Type placement**: Feature-specific types in `features/<feature>/types/`. Cross-domain entity types in `entities/<entity>/types/`. Generic shared types in `shared/types/`. Backend: domain-specific in `domains/<domain>/types/`, cross-domain in `src/types/`.
- **Icons**: Use `@tabler/icons-react` for new icons (migrating away from lucide-react).

## Tech Stack Quick Reference

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Express.js + TypeScript |
| Frontend | Next.js 16 + React 19 |
| Database | Supabase (Postgres) + pgvector |
| Cache | Redis |
| Background jobs | Redis queues; `worker` app |
| Auth | Clerk |
| Realtime | Socket.IO + MQTT |
| Storage | AWS S3 |
| UI | Radix UI + shadcn + Tailwind CSS 4 |
| State | Zustand + TanStack React Query |
| i18n | next-intl (messages in `apps/web/src/messages/`) |
| Testing | Vitest (unit) + Playwright (e2e) |
| Logging | Pino (@ws/logger) |

## Docker

Root build context (`.`) with per-app Dockerfiles: `apps/api/Dockerfile`, `apps/worker/Dockerfile`. See [docker-compose.yml](docker-compose.yml): services `api` (maps host port 7270), `worker`, `redis`, `ollama`. API container health: `node dist/healthcheck.js`. Local `.env` is loaded via Compose `env_file` where configured. Workers require `INTERNAL_API_BASE_URL` and `INTERNAL_WORKER_SECRET` (same value as on the API) for internal HTTP calls.

HTTP health: `GET /healthz` on the API.

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output CLAUDE.md|01-app:{04-glossary.mdx}|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-fetching-data.mdx,07-mutating-data.mdx,08-caching.mdx,09-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{ai-agents.mdx,analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching-without-cache-components.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instant-navigation.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,migrating-to-cache-components.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,preserving-ui-state.mdx,production-checklist.mdx,progressive-web-apps.mdx,public-static-pages.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,streaming.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions/02-route-segment-config:{dynamicParams.mdx,instant.mdx,maxDuration.mdx,preferredRegion.mdx,runtime.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,catchError.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,turbopackIgnoreIssue.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-params.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,logging.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->