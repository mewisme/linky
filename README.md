# Linky

A real-time video chat platform built as a monorepo with domain-driven architecture, featuring peer-to-peer video calls, real-time messaging, user matchmaking, and comprehensive user management.

## Project Structure

This is a Turborepo monorepo containing:

- **`apps/api`**: Express.js backend server with domain-driven architecture
- **`apps/web`**: Next.js 16 frontend application (App Router)
- **`packages/ui`**: Shared React component library
- **`packages/eslint-config`**: Shared ESLint configurations
- **`packages/typescript-config`**: Shared TypeScript configurations
- **`packages/logger`**: Shared logging utility

### Directory Overview

```
linky/
├── apps/
│   ├── api/                    # Backend API server
│   │   ├── src/
│   │   │   ├── domains/        # Business logic organized by domain
│   │   │   ├── infra/          # Infrastructure layer (Redis, Supabase, MQTT, S3)
│   │   │   ├── routes/         # HTTP route composition
│   │   │   ├── socket/         # Socket.IO composition
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── contexts/       # Cross-domain orchestration
│   │   │   └── types/          # Shared types
│   │   └── migrations/         # Database migrations
│   │
│   └── web/                    # Frontend Next.js app
│       └── src/
│           ├── app/            # Next.js App Router pages
│           ├── components/     # React components
│           ├── hooks/          # Custom React hooks
│           ├── providers/     # React context providers
│           ├── lib/            # Client libraries
│           └── types/          # Frontend types
│
└── packages/
    ├── ui/                     # Shared UI component library
    ├── eslint-config/          # ESLint configurations
    ├── typescript-config/      # TypeScript configurations
    └── logger/                 # Logging utility
```

## Architecture Principles

### Backend Architecture

The backend follows a strict domain-driven design with clear separation of concerns:

**Domain Layer (`apps/api/src/domains`)**
- Each domain owns its business logic, types, and public API
- Domains: `user`, `video-chat`, `matchmaking`, `reports`, `admin`
- Domains must not import other domains directly
- Cross-domain coordination happens via orchestration layer (`contexts/`)

**Infrastructure Layer (`apps/api/src/infra`)**
- Encapsulates all external system integrations
- Redis (caching and operational state)
- Supabase (database access via repositories)
- MQTT (presence signaling)
- S3 (object storage operations)
- No business logic belongs here

**Composition Layer (`apps/api/src/routes`, `apps/api/src/socket`)**
- Wires domains together
- Mounts HTTP routes and Socket.IO handlers
- Applies middleware and authentication
- No business logic beyond request/response handling

**Key Rules:**
- Business logic belongs in domain services, not routes or infrastructure
- Domains depend on infra, not on other domains
- Redis is used for read optimization only (not source of truth)
- Supabase is the single source of truth for persistent data

### Frontend Architecture

The frontend follows Next.js App Router conventions with clear separation:

**Structure:**
- `app/`: Next.js pages organized by route groups `(app)`, `(auth)`, `(marketing)`
- `components/`: React components organized by feature/domain
- `hooks/`: Custom React hooks for reusable logic
- `providers/`: React context providers for global state
- `lib/`: Client-side libraries and utilities

**Shared Components:**
- Use `@repo/ui` for shared UI components
- Import from `@repo/ui/components/*` for UI primitives
- Import from `@repo/ui/internal-lib/*` for shared utilities (e.g., `date-fns`)

**Dependency Rules:**
- Do not install duplicate dependencies in `@repo/web` if available in `@repo/ui`
- Prefer `@repo/ui` components over installing new UI libraries
- Backend logic must not be hardcoded in frontend

## Conventions

### Backend Conventions

**File Naming:**
- Use kebab-case for all files: `user-profile.route.ts`, `call-history.service.ts`

**Services vs Repositories:**
- **Repositories** (`infra/supabase/repositories/`): Data access only, no business logic
- **Services** (`domains/*/service/`): Business logic and domain rules

**HTTP Routes:**
- Routes validate input and delegate to domain services
- No business logic in route handlers
- Routes are mounted in `routes/api.ts` or domain-specific routers

**Redis Cache Usage:**
- Cache is for read optimization only
- Use `getOrSet()` from `infra/redis/cache/index.ts`
- Define TTLs in `infra/redis/cache/policy.ts`
- Define cache keys in `infra/redis/cache/keys.ts`
- Always invalidate cache on writes
- Supabase remains the source of truth

**Type Checking:**
- Run `pnpm check-types --filter @repo/api` before committing backend changes

### Frontend Conventions

**Icons:**
- Use `@tabler/icons-react` for icons (preferred)
- Avoid `lucide-react` for new code (legacy usage exists but should be migrated)

**Component Imports:**
- Import UI components from `@repo/ui/components/*`
- Import shared utilities from `@repo/ui/internal-lib/*`
- Example: `import { format } from '@repo/ui/internal-lib/date-fns'`

**Dependencies:**
- Do not install packages in `@repo/web` if they exist in `@repo/ui`
- Check `@repo/ui/package.json` before adding new dependencies

## Development Workflow

### Prerequisites

- Node.js 20 or higher
- pnpm 10.28.1 or higher

### Installation

```bash
pnpm install
```

### Running Applications

**Start all apps:**
```bash
pnpm dev
```

**Start specific apps:**
```bash
pnpm dev:api    # Backend only (http://localhost:3001)
pnpm dev:web    # Frontend only (http://localhost:3000)
```

### Type Checking

```bash
# Check specific package
pnpm check-types --filter @repo/api
```

### Linting

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm lint:api
pnpm lint:web
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:api
pnpm build:web
```

## Technology Stack

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis
- **Realtime**: Socket.IO
- **Presence**: MQTT
- **Storage**: AWS S3
- **Authentication**: Clerk
- **Language**: TypeScript

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Components**: Radix UI, shadcn/ui (via `@repo/ui`)
- **Styling**: Tailwind CSS
- **Icons**: @tabler/icons-react
- **State Management**: Zustand, React Query
- **Authentication**: Clerk
- **Realtime**: Socket.IO Client, MQTT Client
- **Video**: WebRTC

### Development Tools

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Language**: TypeScript
- **Linting**: ESLint
- **Formatting**: Prettier

## What Belongs Where

### Backend (`apps/api/src`)

**`domains/`** - Business logic organized by domain
- Each domain contains: `http/`, `service/`, `socket/`, `types/`
- Domains own their business rules and vocabulary
- Must not import other domains

**`infra/`** - Infrastructure and external integrations
- Redis clients and cache utilities
- Supabase client and repositories
- MQTT client and handlers
- S3 client and operations
- Must not contain business logic

**`routes/`** - HTTP route composition
- Mounts domain routers
- Applies middleware
- Must not contain business logic

**`socket/`** - Socket.IO composition
- Creates namespaces
- Wires domain socket handlers
- Must not contain business logic

**`contexts/`** - Cross-domain orchestration
- Thin wrappers for multi-domain workflows
- Must remain minimal

**`middleware/`** - Express middleware
- Authentication, authorization, request plumbing
- Must not contain business logic

### Frontend (`apps/web/src`)

**`app/`** - Next.js pages
- Route groups: `(app)`, `(auth)`, `(marketing)`
- API routes: `api/`
- Must be thin, delegate to components/hooks

**`components/`** - React components
- Organized by feature/domain
- Should use `@repo/ui` components when available

**`hooks/`** - Custom React hooks
- Reusable logic and state management
- Should be domain-agnostic when possible

**`providers/`** - React context providers
- Global state and context
- User, theme, realtime providers

**`lib/`** - Client libraries
- API clients, WebRTC utilities, Socket.IO client
- Should not duplicate backend logic

### Shared Packages (`packages/ui`)

**`components/`** - Shared React components
- UI primitives, animated components, custom components
- Exported via package exports

**`internal-lib/`** - Shared utilities
- date-fns, date-fns-tz wrappers
- Import via `@repo/ui/internal-lib/*`

**`lib/`** - Shared helper functions
- Utility functions, formatters, validators

## Adding New Features

### Backend

**Adding a new domain:**
1. Create `apps/api/src/domains/<domain-name>/`
2. Add structure: `http/`, `service/`, `types/`, `index.ts`
3. Export router from `index.ts`
4. Mount router in `routes/api.ts` or appropriate router
5. Keep domain isolated from other domains

**Adding a new route:**
1. If route belongs to existing domain: add to `domains/<domain>/http/`
2. If route is new business area: create new domain
3. Mount route in `routes/api.ts` or domain router
4. Keep route handler thin (validate, delegate to service)

**Adding cache:**
1. Define key in `infra/redis/cache/keys.ts`
2. Define TTL in `infra/redis/cache/policy.ts`
3. Use `getOrSet()` in service layer
4. Invalidate on writes using `invalidate()` or `invalidateByPrefix()`

### Frontend

**Adding a new page:**
1. Create page in `app/` following Next.js App Router conventions
2. Use route groups for layout organization
3. Delegate logic to components and hooks

**Adding a new component:**
1. Check if component exists in `@repo/ui` first
2. If app-specific, add to `components/` organized by feature
3. If reusable, consider adding to `@repo/ui`

**Using shared libraries:**
- Import date utilities from `@repo/ui/internal-lib/date-fns`
- Import UI components from `@repo/ui/components/*`
- Do not install duplicate dependencies

## Architectural Boundaries

### What NOT to Do

**Backend:**
- Do not import domains from other domains
- Do not put business logic in routes, middleware, or infra
- Do not use Redis as source of truth
- Do not bypass domain services from routes

**Frontend:**
- Do not hardcode backend business logic
- Do not install dependencies that exist in `@repo/ui`
- Do not use `lucide-react` for new icons (use `@tabler/icons-react`)

**Monorepo:**
- Do not create circular dependencies between packages
- Do not duplicate shared code across apps

## Further Reading

- **Backend Architecture**: See `apps/api/ARCHITECTURE.md` for detailed backend architecture documentation
- **API Routes**: See `apps/api/src/routes/README.md` for route organization
- **Turborepo**: [Turborepo Documentation](https://turborepo.com/docs)
