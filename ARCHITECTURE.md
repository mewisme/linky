## ARCHITECTURE

This document describes the current architecture of the production backend located in `apps/api` (Node.js + TypeScript). It is intended to onboard developers quickly and to prevent accidental architectural regressions.

## 1. Overview

The backend is a single Node.js service that exposes:

- **REST APIs** via an Express server (mounted under `/api/v1` plus a small number of non-versioned endpoints like `/health`).
- **Realtime features** via Socket.IO (served on the same HTTP server, mounted at path `/ws`, using namespaces such as `/chat` and `/admin`).
- **Caching and coordination** via Redis (presence state, matchmaking sets, short-lived caches).
- **Database access** via Supabase (Postgres) using a service-role client and typed query/repository functions.
- **Presence signaling** via MQTT (presence messages are consumed and translated into Redis state + admin socket broadcasts).

Core goals of the architecture:

- **Keep business logic owned by a single domain** (user, video-chat, matchmaking, reports, admin).
- **Keep infrastructure concerns isolated** (Redis/Supabase/MQTT/S3 clients, caches, repositories).
- **Make composition explicit** (routes and sockets wire domains together; domains do not reach across boundaries).
- **Support realtime + request/response consistently** (shared auth model and shared types).

## 2. Architectural Principles

- **Domain-driven organization**: Business logic is grouped by domain under `apps/api/src/domains`. A domain owns its vocabulary (types) and its behavior (services), and may expose HTTP routes and/or socket handlers.
- **Separation of concerns**:
  - HTTP concerns (routing, Express specifics) stay in route modules.
  - Socket.IO concerns (namespaces, middleware, connection lifecycle) stay in socket composition modules.
  - Data access and third-party SDK usage stay in the infrastructure layer.
- **Clear ownership of business logic**:
  - Domain services are the primary home for business rules.
  - The infra layer provides primitives (clients, repositories, adapters) but does not decide “what the product should do”.
- **Explicit boundaries between domains, infra, and composition**:
  - Composition code wires dependencies and mounts routers/handlers.
  - Domains are designed to be wired from the outside (dependency injection where needed).
  - Cross-domain coordination is only allowed via the orchestration layer (see section 6).

## 3. Folder Structure Overview

All paths below are relative to `apps/api/src`.

### `src/infra`

- **What goes here**: Integrations with external systems and low-level primitives:
  - Redis client and Redis-backed helpers
  - Supabase client and repositories (data access)
  - MQTT client and message handlers
  - S3 client and helper modules (presigned URLs, multipart, object operations)
  - Cache modules (e.g. admin role cache)
- **What must not go here**: Product/business rules, HTTP/Socket routing, or domain coordination logic.

### `src/domains`

- **What goes here**: Business modules, grouped by domain. Each domain may expose HTTP routes, socket handlers, services, and types (see section 5).
- **What must not go here**: Cross-domain imports and cross-domain orchestration (with one exception: a domain may accept injected functions/interfaces from outside; it must not import the other domain directly).

### `src/routes`

- **What goes here**: Express route composition and mounting. This is where routers from domains (and a few non-domain modules) are connected to URL paths and middleware.
- **What must not go here**: Business logic beyond basic request handling/validation and delegating to domain services.

### `src/socket`

- **What goes here**: Socket.IO server creation, namespace setup, shared socket middleware (authentication), and wiring domain socket handlers into namespaces.
- **What must not go here**: Domain-specific business rules; those belong in `src/domains/<domain>/socket` and `src/domains/<domain>/service`.

### `src/types`

- **What goes here**: Shared, cross-cutting types used across multiple domains and layers:
  - Generated/maintained database types (Supabase)
  - Socket context/event types shared between composition and domains
  - Webhook payload types
  - Express type augmentation (e.g. `req.auth`)
- **What must not go here**: Domain-specific types (keep those inside the domain).

### `src/contexts`

- **What goes here**: Thin orchestration wrappers that coordinate across domains without creating cross-domain imports inside domain modules.
- **What must not go here**: Large business workflows; if a workflow belongs to a single domain, keep it inside that domain and expose a narrow API.

### `src/middleware`

- **What goes here**: Express middleware: authentication (`clerkMiddleware`), authorization (`adminMiddleware`), request plumbing (CORS, body parsing), client IP, and shared error handlers.
- **What must not go here**: Domain logic or data access beyond the minimum required for auth/authorization checks.

### `src/utils`

- **What goes here**: Small cross-cutting utilities (e.g. logger, CORS origin parsing).
- **What must not go here**: Business rules, HTTP handlers, or infrastructure SDK clients.

### Also present (not part of the required list, but important)

- **`src/config`**: Centralized runtime configuration loaded from environment variables (`dotenv/config`), including CORS settings and credentials for Clerk/Supabase/Redis/MQTT/S3.
- **`src/services`**: Thin application-level facades (currently used to re-export orchestration functions such as `collectReportContext` from `src/contexts`).

## 4. Infrastructure Layer (`src/infra`)

### What the infra layer is responsible for

The infra layer encapsulates all interaction with external systems and SDKs. It provides stable, testable primitives for the rest of the application:

- **Connection setup and clients** (e.g. Redis client, Supabase client, MQTT client, S3 client).
- **Repositories / data-access helpers** (e.g. Supabase repositories for users, reports, call history, etc.).
- **Cross-cutting caches and adapters** that turn external data into app-friendly data.

### Why Redis, Supabase, MQTT, S3 live here

These are infrastructure dependencies, not business concepts:

- **Redis**: operational state and fast lookups (presence hashes, matchmaking sets, short-lived caches).
- **Supabase**: database access with typed queries.
- **MQTT**: external messaging channel for presence, translated into internal state and realtime notifications.
- **S3**: object storage operations exposed via API routes (presigned URLs, multipart uploads, object listing/deletion).

Keeping these modules under `src/infra` prevents domain services from directly embedding SDK usage and makes swapping or refactoring implementations localized.

### The role of repositories vs services

- **Repositories (infra)**: “How to talk to the database.” They should be narrowly focused on reads/writes and mapping data shapes. In this codebase, Supabase repositories live under `src/infra/supabase/repositories`.
- **Services (domain)**: “What the system does.” Services apply business rules, call repositories, coordinate domain invariants, and provide an API to route/socket layers.

### The `admin-cache` module and its purpose

`src/infra/admin-cache` provides a Redis-backed cache for determining whether a Clerk user is an admin:

- **Primary responsibility**: Accelerate admin checks (both HTTP and Socket.IO `/admin` namespace auth) by caching the user role for a short TTL.
- **Data source**: Supabase `users` table (`role`) keyed by `clerk_user_id`.
- **Consumers**: `src/middleware/admin.ts` (HTTP admin routes) and `src/socket/auth.ts` / `src/domains/admin/socket/admin.socket.ts` (admin namespace auth).

This cache is infrastructure because it’s an optimization/adapter around storage and authentication, not a domain behavior.

## 5. Domain Layer (`src/domains`)

### What a domain represents in this backend

A domain is a cohesive area of business functionality with clear ownership. Domains define:

- **Use-cases and rules** (services)
- **Public APIs** to the rest of the app (HTTP routers, socket handlers, exported service functions)
- **Domain types** (request/response payload shapes, domain entities, enums)

### Common internal structure of a domain

Most domains follow a consistent internal layout:

- **`http/`**: Express routers for that domain’s endpoints. These should validate inputs, call domain services, and shape HTTP responses.
- **`service/`**: Domain business logic and orchestration over repositories/infra.
- **`socket/`** (if applicable): Domain socket handlers. These are mounted by `src/socket` (composition layer) and should receive dependencies from the outside where needed.
- **`types/`**: Domain-specific types and payload definitions.
- **`index.ts`**: The domain’s public surface area (exports routers, public functions, and types).

### Existing domains

Current domains in `src/domains`:

- **`user`**: User identity data and user profile/details/settings endpoints.
- **`video-chat`**: Video chat lifecycle, room/session tracking, and chat socket handlers.
- **`matchmaking`**: Match selection/scoring and Redis-backed matchmaking operations.
- **`reports`**: User reports, admin report moderation endpoints, and report-context collection.
- **`admin`**: Admin APIs and admin Socket.IO namespace rules; composes admin-only functionality.

### Ownership and import rules

- **Domains must not import other domains**. A domain cannot reach into `src/domains/<other-domain>/*`.
- **Domains own business logic**. If it affects a domain’s invariants, it belongs in that domain’s `service/` (or, for socket-driven behavior, in that domain’s socket modules).
- **Cross-domain interaction must be inverted**:
  - If a domain needs something from another domain, it should depend on an injected interface/function provided by the orchestration/composition layer.
  - Example pattern present in this codebase: report context collection depends on a “video chat context accessor” injected from outside rather than importing video-chat internals directly.

## 6. Application / Orchestration Layer

### Role of `src/contexts`

`src/contexts` is the home for thin, explicit cross-domain coordination. These wrappers exist to preserve the “no cross-domain imports inside domains” rule while still enabling product workflows that require multiple domains.

In the current codebase, `src/contexts/report-context.ts` is a representative example: it coordinates report-context collection by calling the reports domain service and injecting access to the current video-chat runtime context.

### Top-level application wrappers (e.g. report-context)

There is also a thin wrapper layer under `src/services` which re-exports orchestration functions for convenient consumption from HTTP routes. This keeps routes simple and keeps cross-domain wiring out of domains.

### When cross-domain coordination is allowed

Cross-domain coordination is allowed only when:

- The workflow genuinely spans multiple domains, and
- The integration is expressed via a small, explicit API (functions/interfaces) injected at the boundary.

### Why this layer must remain thin

If orchestration grows large, it becomes an implicit “new domain” with unclear ownership. The rule is:

- **Coordinate** in contexts.
- **Decide and validate** in a domain.
- **Persist and integrate** in infra.

## 7. Routing & Composition

### How `src/routes` works as a composition layer

`src/routes/index.ts` is the top-level router setup. It is responsible for:

- Mounting health/root endpoints.
- Mounting webhooks early.
- Mounting public REST endpoints.
- Applying authentication middleware (`clerkMiddleware`) for protected APIs.
- Mounting domain routers and select non-domain routers.
- Applying admin authorization (`adminMiddleware`) for admin routes.

### How domain HTTP routes are mounted

Protected domain routers are typically mounted under `/api/v1` through `src/routes/api.ts`, which composes:

- User routes (`/users`, `/user-details`, `/user-settings`)
- Reports routes (`/reports`)
- Video chat HTTP routes (`/video-chat`)

Admin HTTP routes are mounted separately under `/api/v1/admin` and require both authentication and admin authorization.

### Why some non-domain routes still exist (media, public resources)

Not all routes are currently represented as full domains. Some endpoints are “resource style” or infrastructure-driven and live under `src/routes`:

- **`routes/media/*`**: S3 operations and ICE server configuration endpoints.
- **`routes/resources/*`**: resource endpoints like call history, favorites, interest tags, changelogs.
- **`routes/analytics.ts`** and **`routes/webhook.ts`**: public analytics and webhook handling.

These modules should remain thin and should rely on infra repositories/services rather than embedding business rules.

### Rule for adding new routes going forward

- If the route belongs to an existing domain’s business capability: **add it to that domain’s `http/` and mount it via `src/routes`**.
- If it is a new business area: **create a new domain** and expose its router via `domains/<domain>/index.ts`.
- Keep `src/routes` focused on **mounting, middleware ordering, and composition**, not decision-making logic.

## 8. Realtime Architecture (Socket.IO & MQTT)

### The role of `src/socket` as a composition layer

`src/socket/index.ts` creates the Socket.IO server and composes namespaces and handlers:

- Socket.IO is served at path **`/ws`**.
- Namespaces are created for **`/chat`** and **`/admin`**.
- Authentication middleware is applied at the namespace level.
- Domain socket handlers are mounted into namespaces and provided dependencies.

### How domain socket handlers are mounted

Domain socket behavior is mounted from the composition layer:

- `setupVideoChatHandlers` (video-chat domain) is called with the `/chat` namespace plus dependencies such as matchmaking, rooms, and user sessions.
- The admin namespace is configured by the admin domain socket module, but is still mounted/configured by `src/socket/index.ts`.

### Separation between socket wiring and business logic

- **Wiring** (namespaces, middleware, instantiation of services) stays in `src/socket`.
- **Domain-specific behavior** stays in `src/domains/<domain>/socket`.
- Dependencies are passed in, rather than created deep inside handler code, to keep boundaries explicit.

### MQTT usage for presence

The MQTT integration lives in `src/infra/mqtt`:

- The MQTT client subscribes to **`presence/+`** topics.
- Presence messages are translated into internal state stored in **Redis** (hashes and sets representing presence and matchmaking availability).
- Presence updates are broadcast to **Socket.IO admin clients** by emitting an event on the `/admin` namespace.

This design keeps MQTT-specific concerns in infra while keeping “how we represent operational state” in Redis consistent across the app.

## 9. Type System Strategy

### Global types vs domain types

- **Domain types** belong under `src/domains/<domain>/types` and are owned by that domain.
- **Global/shared types** belong under `src/types` and are reserved for shapes used across domains and layers (HTTP + socket + infra).

### Where database types live

- Supabase database types live in `src/types/database/supabase.types.ts`.
- The Supabase client in `src/infra/supabase/client.ts` is instantiated with these types to keep queries strongly typed.

### Rules for adding new types

- If a type is only meaningful within one domain, place it in `domains/<domain>/types`.
- If a type is used across multiple domains or is part of shared infrastructure contracts (socket context/events, webhooks, database types), place it in `src/types`.
- Avoid creating “generic” shared types that erase domain ownership; prefer explicit domain exports via each domain’s `index.ts`.

## 10. Adding New Features (IMPORTANT)

This section describes how to extend the system without breaking boundaries.

### How to add a new domain

- Create `src/domains/<new-domain>/` with the standard structure:
  - `http/` for Express routers (if applicable)
  - `service/` for business logic
  - `socket/` for Socket.IO handlers (if applicable)
  - `types/` for domain-owned types
  - `index.ts` exporting the public domain surface
- Keep domain services dependent on **infra repositories** and injected interfaces, not on other domains.

### Where to put new business logic

- Put business rules and workflows inside `src/domains/<domain>/service`.
- Keep HTTP route modules responsible for request validation and translating between HTTP and the domain API.
- Keep socket modules responsible for translating socket events into domain service calls, using a domain context provided by the composition layer.

### Where NOT to put logic

- Do not add business rules to:
  - `src/routes` (composition only)
  - `src/socket` (composition only)
  - `src/infra` (integration/data access only)
  - `src/utils` (utilities only)

### How to avoid breaking architectural boundaries

- Do not import from `src/domains/<other-domain>` inside a domain.
- If you need cross-domain data, introduce an orchestration wrapper in `src/contexts` that injects the required accessors/functions.
- Keep dependency direction consistent:
  - domains → infra (allowed)
  - composition/contexts → domains (allowed)
  - infra → domains (avoid; infra should not depend on business)
  - domain → domain (not allowed)

## 11. What This Architecture Intentionally Avoids

- **No GraphQL**: The backend is REST + Socket.IO. Adding a second API paradigm would duplicate concerns (auth, types, caching, error handling) and weaken the current separation between composition and domain logic.
- **No microservices**: The system is intentionally a single backend service with clear internal modular boundaries. Operational complexity is kept low while still maintaining domain separation in code.
- **No shared “god services”**: There is no central business-logic singleton that everyone depends on. Business logic is domain-owned, and cross-domain coordination is explicit and thin.
- **No cross-domain imports**: Domains remain isolated. Cross-domain workflows must be expressed via orchestration wrappers and dependency injection to preserve ownership and avoid tight coupling.

## 12. Conclusion

This backend architecture is stable because it enforces a small number of non-negotiable boundaries: domains own business logic, infra owns integrations, and routes/sockets/contexts perform composition.

Treat this document as an executable set of constraints for the codebase. If you need to violate a rule, it should be an explicit architectural decision (and this document should be updated accordingly) rather than an accidental shortcut.

