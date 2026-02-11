# Linky

A production-grade real-time video chat platform enabling random 1-to-1 video conversations. Built as a Turborepo monorepo with domain-driven backend architecture and modern React frontend.

## Architecture

Linky separates concerns across three layers:

**Frontend (apps/web)**: Next.js 16 application handling user interface, authentication, WebRTC peer connections, and real-time messaging. Communicates with backend via REST API, Socket.IO for signaling, and MQTT for presence updates.

**Backend (apps/api)**: Express.js server managing matchmaking queues, WebRTC signaling, user data, and real-time events. Organized into isolated business domains with no cross-domain dependencies.

**Shared packages**: UI component library, logger, and configuration presets used across applications.

### Frontend-Backend Communication

- **REST API**: User data, favorites, progress tracking, file uploads, ICE server configuration
- **Socket.IO (/chat namespace)**: WebRTC signaling, matchmaking queue, call control, chat messages
- **Socket.IO (/admin namespace)**: Real-time admin dashboard updates
- **MQTT**: User presence broadcasts (online, matching, in_call, offline)

### Real-Time Layer

WebRTC handles peer-to-peer video and audio streams. Socket.IO relays signaling data (SDP offers/answers, ICE candidates) to establish connections. Backend manages matchmaking queues and room lifecycle, but does not route media streams.

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Express.js + TypeScript |
| Frontend | Next.js 16 (App Router) + React 19 |
| Database | Supabase (PostgreSQL + pgvector) |
| Cache | Redis (read optimization) |
| Real-time | Socket.IO + MQTT |
| Authentication | Clerk |
| Video | WebRTC + Cloudflare TURN |
| Storage | AWS S3 |
| UI | Radix UI + shadcn + Tailwind CSS 4 |
| State | Zustand + TanStack React Query |
| Testing | Vitest (unit) + Playwright (e2e) |

## Monorepo Structure

```
linky/
├── apps/
│   ├── api/              Express.js backend
│   │   ├── src/
│   │   │   ├── domains/  Business logic by domain (user, video-chat, matchmaking, etc.)
│   │   │   ├── infra/    External integrations (Redis, Supabase, MQTT, S3, Clerk)
│   │   │   ├── socket/   Socket.IO server setup and namespaces
│   │   │   ├── routes/   HTTP route composition
│   │   │   └── contexts/ Cross-domain orchestration
│   │   └── __tests__/    Vitest unit tests
│   │
│   └── web/              Next.js 16 frontend
│       ├── src/
│       │   ├── app/      Next.js pages (route groups: (app), (auth), (marketing))
│       │   ├── components/ React components
│       │   ├── hooks/    Custom React hooks (WebRTC, Socket.IO, state)
│       │   ├── stores/   Zustand stores
│       │   └── lib/      Client libraries (API, Socket.IO, MQTT, WebRTC)
│       └── playwright/   E2E tests
│
└── packages/
    ├── ui/               Shared React component library (Radix UI + shadcn)
    ├── logger/           Pino-based logging
    ├── eslint-config/    Shared ESLint configurations
    └── typescript-config/ Shared TypeScript configurations
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 10.28.2+

### Installation

```bash
pnpm install
```

### Running Locally

Start both frontend and backend:

```bash
pnpm dev
```

The web app runs on `http://localhost:3000` and API on `http://localhost:3001`.

Start individual apps:

```bash
pnpm dev:web    # Frontend only
pnpm dev:api    # Backend only
```

### Building

```bash
pnpm build         # All packages
pnpm build:web     # Frontend only
pnpm build:api     # Backend only
```

### Code Quality

```bash
pnpm lint          # ESLint all packages
pnpm lint:web      # ESLint frontend
pnpm lint:api      # ESLint backend

pnpm check-types   # TypeScript check all
pnpm format        # Prettier format all
```

### Testing

**Backend unit tests (Vitest):**

```bash
cd apps/api
pnpm vitest run                                      # All tests
pnpm vitest run src/__tests__/cache                  # Test directory
pnpm vitest run src/__tests__/domains/user.test.ts   # Single file
```

**E2E tests (Playwright):**

```bash
pnpm test          # All e2e tests
pnpm test:ui       # Playwright UI mode
pnpm test:debug    # Debug mode
pnpm test:report   # View HTML report
```

## Backend Architecture

The backend follows strict domain-driven design with clear boundaries:

**domains/**: Business logic grouped by domain (user, video-chat, matchmaking, reports, admin, embeddings, notification). Each domain contains `http/` (routes), `service/` (business logic), `socket/` (real-time handlers), and `types/`. Domains must NOT import other domains.

**infra/**: External system integrations. No business logic allowed. Includes Redis cache, Supabase repositories, MQTT client, S3 operations, Clerk authentication, Ollama embeddings.

**socket/**: Socket.IO server composition. Creates namespaces (`/chat`, `/admin`), applies auth middleware, wires domain socket handlers.

**routes/**: HTTP route composition. Mounts domain routers to URL paths. Applies middleware but contains no business logic.

**contexts/**: Cross-domain orchestration. The ONLY place multiple domains can be coordinated together.

**Key principles:**
- Supabase is the single source of truth
- Redis is read optimization only (cache-aside pattern)
- Domains depend on infra, never on other domains
- Business logic belongs in domain services, not routes or infra

## Frontend Architecture

Next.js App Router with route groups for clean URL structure:
- `(app)/`: Authenticated application pages (chat, dashboard, profile)
- `(auth)/`: Authentication flows (sign-in, sign-up)
- `(marketing)/`: Public pages (landing, about)

**State management:**
- Zustand stores for client-side state (user, video chat, notifications)
- TanStack React Query for server state (API data fetching, caching)
- Custom hooks for WebRTC peer connections and Socket.IO signaling

**Real-time communication:**
- Socket.IO client connects to backend namespaces
- WebRTC peer connections handle media streams
- MQTT client publishes user presence state

## Production Considerations

### Scalability

**Matchmaking**: Feature flag `USE_REDIS_MATCHMAKING` switches between Redis-backed (multi-instance) and in-memory (single-instance) matchmaking stores. Redis implementation uses Lua scripts for atomic operations.

**Real-time**: Socket.IO namespaces isolate concerns. Video chat signaling runs on `/chat`, admin events on `/admin`. Both support horizontal scaling with Redis adapter (not yet implemented).

**Database**: Supabase PostgreSQL with pgvector for semantic matching (embeddings). Views optimize common queries. Connection pooling via Supabase pooler.

**Cache**: Redis cache with TTL-based expiration. Keys organized by namespace prefix. Invalidation on writes to maintain consistency.

### Resilience

**Socket disconnect handling**: Frontend detects transient disconnects and keeps users in queue with updated socketId. Backend only dequeues on transport-level disconnect or when in active room.

**Cleanup mechanisms**: Backend runs periodic cleanup (30s interval) for stale queue entries and abandoned rooms. Heartbeat pings (4s interval) verify room health.

**ICE/TURN**: Cloudflare TURN API provides relay servers for NAT traversal. Credentials fetched on-demand and cached (1 hour TTL).

## Architectural Boundaries

**Backend restrictions:**
- Do NOT import domains from other domains
- Do NOT put business logic in routes, middleware, or infra
- Do NOT use Redis as source of truth
- Do NOT bypass domain services from routes

**Frontend restrictions:**
- Do NOT hardcode backend business logic
- Do NOT install dependencies that exist in `@ws/ui`
- Do NOT use `axios` (native fetch only)
- Do NOT use `lucide-react` for new icons (use `@tabler/icons-react`)

**Monorepo restrictions:**
- Do NOT create circular dependencies between packages
- Do NOT duplicate shared code across apps

## Common Commands Reference

```bash
# Development
pnpm dev                   # All apps
pnpm dev:api               # Backend only
pnpm dev:web               # Frontend only

# Build
pnpm build                 # All packages
pnpm build:api             # Backend only
pnpm build:web             # Frontend only

# Lint & Type Check
pnpm lint                  # ESLint all
pnpm lint:api              # ESLint backend
pnpm lint:web              # ESLint frontend
pnpm check-types           # TypeScript check all
pnpm format                # Prettier format all

# Testing
cd apps/api && pnpm vitest run           # Backend unit tests
pnpm test                  # Frontend e2e tests
pnpm test:ui               # Playwright UI mode
pnpm test:report           # View test report
```

See [`apps/web/README.md`](apps/web/README.md) and [`apps/api/README.md`](apps/api/README.md) for application-specific details.
