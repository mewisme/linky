# 01 -- Platform Overview

## Purpose

This document provides a comprehensive overview of the Linky platform: its business purpose, technology stack, monorepo structure, application architecture, and development toolchain.

## Scope

Covers the entire platform from repository root through all workspaces, packages, and applications.

## Dependencies

None. This is the foundational document.

## Cross References

- [02-architecture.md](02-architecture.md) for detailed layer model
- [17-deployment.md](17-deployment.md) for infrastructure topology

---

## 1. Platform Purpose

Linky is a production-grade real-time video chat platform enabling random peer-to-peer video conversations. The platform combines WebRTC-based video calling with a sophisticated engagement system including:

- Interest-based matchmaking with semantic profile embedding
- A full virtual coin economy with wallets, shops, boosts, prestige, and seasonal mechanics
- Streak and progression systems tied to call duration
- Real-time notifications via Socket.IO and Web Push
- User presence tracking via MQTT
- Administrative tools for content moderation, economy simulation, and user management

The system is designed for production deployment with observability (Sentry + Pino), graceful shutdown, rate limiting, and horizontal scaling capabilities.

---

## 2. Technology Stack

### Backend (apps/api)

| Component | Technology | Version/Details |
|-----------|-----------|-----------------|
| Runtime | Node.js | 20+ |
| Framework | Express.js | TypeScript |
| Real-Time | Socket.IO | WebSocket transport, `/chat` and `/admin` namespaces |
| Database | Supabase (Postgres) | Service role client, pgvector extension |
| Cache | Redis | 8-alpine, cache-aside pattern |
| Authentication | Clerk | JWT verification, webhook sync |
| Embeddings | Ollama | nomic-embed-text:v1.5 model |
| Storage | AWS S3 | Media file storage with presigned URLs |
| Messaging | MQTT | User presence (online/offline) |
| WebRTC | Cloudflare TURN | NAT traversal for peer connections |
| Push | Web Push (VAPID) | Browser push notifications |
| Logging | Pino (@ws/logger) | Structured JSON logging |
| Monitoring | Sentry | Error tracking, performance monitoring |

### Frontend (apps/web)

| Component | Technology | Version/Details |
|-----------|-----------|-----------------|
| Framework | Next.js | 16, App Router |
| UI Library | React | 19 |
| Styling | Tailwind CSS | 4 |
| Components | Radix UI + shadcn | Via @ws/ui package |
| State | Zustand | Client-side stores |
| Server State | TanStack React Query | Cache management |
| Auth | Clerk (@clerk/nextjs) | Client + server components |
| Icons | @tabler/icons-react | Primary icon set |
| Real-Time | Socket.IO Client | WebSocket connections |
| Presence | MQTT.js | User online status |
| Monitoring | Sentry (@sentry/nextjs) | Error + performance |

### Shared Packages

| Package | Path | Purpose |
|---------|------|---------|
| @ws/ui | packages/ui | Radix UI + shadcn component library |
| @ws/logger | packages/logger | Pino-based structured logging |
| @ws/eslint-config | packages/eslint-config | Shared ESLint configurations |
| @ws/typescript-config | packages/typescript-config | Shared TypeScript configurations |

### Build and Development

| Tool | Purpose |
|------|---------|
| Turborepo | Monorepo orchestration, task caching |
| pnpm | 10.28.2, workspace package management |
| Vitest | Backend unit testing |
| Playwright | End-to-end testing |
| Prettier | Code formatting |
| ESLint | Static analysis |

---

## 3. Monorepo Structure

```
linky/
├── apps/
│   ├── api/                    # Express.js backend
│   │   ├── src/
│   │   │   ├── config/         # Environment variable loading
│   │   │   ├── contexts/       # Cross-domain orchestration
│   │   │   ├── domains/        # Business logic (domain-driven)
│   │   │   │   ├── admin/
│   │   │   │   ├── economy/
│   │   │   │   ├── economy-boost/
│   │   │   │   ├── economy-daily/
│   │   │   │   ├── economy-monthly/
│   │   │   │   ├── economy-prestige/
│   │   │   │   ├── economy-season/
│   │   │   │   ├── economy-shop/
│   │   │   │   ├── economy-weekly/
│   │   │   │   ├── embeddings/
│   │   │   │   ├── matchmaking/
│   │   │   │   ├── notification/
│   │   │   │   ├── reports/
│   │   │   │   ├── user/
│   │   │   │   └── video-chat/
│   │   │   ├── infra/          # External system integrations
│   │   │   │   ├── admin-cache/
│   │   │   │   ├── clerk/
│   │   │   │   ├── mqtt/
│   │   │   │   ├── ollama/
│   │   │   │   ├── push/
│   │   │   │   ├── redis/
│   │   │   │   ├── s3/
│   │   │   │   └── supabase/
│   │   │   ├── jobs/           # Scheduled background tasks
│   │   │   ├── logic/          # Pure business logic functions
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── routes/         # Route composition and mounting
│   │   │   ├── services/       # Legacy cross-domain services
│   │   │   ├── socket/         # Socket.IO server setup
│   │   │   ├── types/          # Cross-domain shared types
│   │   │   ├── utils/          # Utility functions
│   │   │   └── webhook/        # Clerk webhook handlers
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── actions/        # Server actions
│       │   ├── app/            # App Router pages
│       │   │   ├── (app)/      # Authenticated pages
│       │   │   ├── (auth)/     # Login/signup
│       │   │   └── (marketing)/ # Public pages
│       │   ├── entities/       # Domain models
│       │   ├── features/       # Feature modules
│       │   ├── lib/            # Infrastructure utilities
│       │   ├── providers/      # React context providers
│       │   └── shared/         # Reusable components/utils
│       └── package.json
│
├── packages/
│   ├── ui/                     # Shared component library
│   ├── logger/                 # Pino logging package
│   ├── eslint-config/          # ESLint configurations
│   └── typescript-config/      # TypeScript configurations
│
├── docker-compose.yml          # Production deployment
├── Dockerfile                  # API container build
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace definitions
└── package.json                # Root scripts and dependencies
```

---

## 4. Application Architecture Summary

### Backend: Domain-Driven Design

The API follows strict domain-driven design with the fundamental rule: **domains must NOT import other domains**. Each domain is self-contained with:

- `http/` -- Express route handlers
- `service/` -- Business logic
- `socket/` -- Real-time event handlers (where applicable)
- `types/` -- Domain-specific type definitions
- `repository/` -- Data access layer (where applicable)
- `index.ts` -- Public exports

Cross-domain coordination occurs exclusively through the `contexts/` layer.

### Frontend: Layered Architecture

The frontend follows a strict layered architecture with inward dependency direction:

```
app → features → entities → shared → lib
```

Each layer must not import from layers above it. Features must not import from other features (with documented exceptions).

---

## 5. Development Commands

```bash
# Development
pnpm dev              # All apps concurrently
pnpm dev:api          # Backend only (port 7270)
pnpm dev:web          # Frontend only (port 3000)

# Build
pnpm build            # All packages
pnpm build:api        # API only
pnpm build:web        # Web only

# Quality
pnpm lint             # ESLint all workspaces
pnpm check-types      # TypeScript type checking
pnpm format           # Prettier formatting

# Testing
cd apps/api && pnpm vitest run          # Backend unit tests
pnpm test                               # E2E tests (Playwright)
pnpm test:ui                            # Playwright UI mode
```

---

## 6. Environment Configuration

The backend loads configuration from environment variables via `apps/api/src/config/index.ts`. Required variables are grouped by service:

| Group | Variables | Purpose |
|-------|----------|---------|
| Server | `PORT`, `NODE_ENV`, `CORS_ORIGIN` | HTTP server configuration |
| Clerk | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | Authentication |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Database access |
| Redis | `REDIS_URL`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` | Caching |
| S3 | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Media storage |
| MQTT | `MQTT_CLIENT_URL`, `MQTT_CLIENT_PORT`, `MQTT_CLIENT_USERNAME`, `MQTT_CLIENT_PASSWORD` | Presence |
| Cloudflare | `CLOUDFLARE_TURN_API_TOKEN`, `CLOUDFLARE_TURN_KEY_ID` | WebRTC TURN |
| Ollama | `OLLAMA_URL`, `OLLAMA_EMBEDDING_TIMEOUT` | Embeddings |
| VAPID | `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push |
| Tuning | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `REDIS_TIMEOUT`, `SUPABASE_TIMEOUT`, `SHUTDOWN_TIMEOUT`, `JSON_BODY_SIZE_LIMIT`, `SOCKET_MAX_HTTP_BUFFER_SIZE` | Operational parameters |
| Feature Flags | `USE_REDIS_MATCHMAKING` | Matchmaking store selection |
| Cache | `CACHE_NAMESPACE_VERSION` | Cache key versioning |

---

## Related Components

- All subsequent documents in this specification build upon the structures described here
- Docker deployment details in [17-deployment.md](17-deployment.md)
- Security model in [11-security-model.md](11-security-model.md)

## Risk Considerations

- The platform depends on multiple external services (Clerk, Supabase, Cloudflare TURN) creating vendor lock-in
- Self-hosted Ollama requires GPU resources for embedding generation at scale
- MQTT broker must be externally managed; no built-in broker is included
