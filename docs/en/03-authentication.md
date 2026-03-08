# 03 -- Authentication System

## Purpose

This document describes the complete authentication and authorization architecture of the Linky platform, including Clerk integration, JWT verification flows, webhook synchronization, middleware chains, and admin role management.

## Scope

Covers authentication for HTTP routes, Socket.IO connections, admin access control, and the Clerk webhook user lifecycle.

## Dependencies

- [01-overview.md](01-overview.md) for Clerk configuration
- [02-architecture.md](02-architecture.md) for middleware positioning

## Cross References

- [09-admin-system.md](09-admin-system.md) for admin role details
- [11-security-model.md](11-security-model.md) for security implications
- [14-api-contracts.md](14-api-contracts.md) for per-endpoint auth requirements

---

## 1. Authentication Provider: Clerk

Linky uses Clerk as its identity provider. Clerk manages:
- User registration and login (email/password, social providers)
- Session management and JWT issuance
- User profile data (name, email, avatar)
- Webhook notifications for user lifecycle events

### 1.1 Configuration

Backend environment variables:
- `CLERK_SECRET_KEY` -- Server-side Clerk API key for JWT verification and user management
- `CLERK_WEBHOOK_SECRET` -- Secret for validating Clerk webhook signatures

Frontend uses `@clerk/nextjs` for client-side authentication with automatic token management.

---

## 2. HTTP Authentication Flow

### 2.1 Middleware Chain

```
Incoming Request
  │
  ├── /webhook/*                    → NO AUTH (webhook signature verification instead)
  ├── /api/v1/interest-tags         → NO AUTH (public resource)
  ├── /api/v1/changelogs            → NO AUTH (public resource)
  ├── /api/v1/matchmaking           → NO AUTH (queue status)
  ├── /healthz, /health             → NO AUTH (health checks)
  │
  └── All other /api/v1/* routes
       │
       ▼
  clerkMiddleware
       │ Extract Bearer token from Authorization header
       │ Verify JWT via Clerk SDK (verifyToken)
       │ Attach payload to req.auth
       │ Return 401 if missing or invalid
       │
       ▼
  Route Handler (authenticated)
       │
       ├── /api/v1/admin/*
       │    │
       │    ▼
       │  adminMiddleware
       │    │ Extract req.auth.sub (Clerk user ID)
       │    │ Check admin role via checkIfUserIsAdmin()
       │    │   → Redis cache lookup (admin:role:{clerkUserId})
       │    │   → Database fallback (users.role column)
       │    │   → Cache result with 5-min TTL
       │    │ Return 403 if not admin or superadmin
       │    │
       │    ▼
       │  Admin Route Handler
       │
       └── Standard authenticated route
```

### 2.2 Clerk Middleware Implementation

Location: `apps/api/src/middleware/clerk.ts`

The middleware:
1. Extracts the `Authorization` header
2. Strips the `Bearer ` prefix
3. Calls `verifyToken(token, { secretKey })` from `@clerk/backend`
4. On success: attaches the JWT payload to `req.auth` and calls `next()`
5. On failure: returns HTTP 401 with `{ error: "Unauthorized" }`

The `req.auth.sub` field contains the Clerk user ID, which is the primary identity reference throughout the system.

### 2.3 Admin Middleware Implementation

Location: `apps/api/src/middleware/admin.ts`

The middleware:
1. Reads `req.auth.sub` (set by clerkMiddleware)
2. Calls `checkIfUserIsAdmin(clerkUserId)` from `infra/admin-cache/`
3. This function uses a Redis-cached lookup:
   - Cache key: `admin:role:{clerkUserId}`
   - Cache values: `"admin"`, `"superadmin"`, or `"user"`
   - TTL: 300 seconds (5 minutes)
   - On cache miss: queries `users` table `role` column via Supabase
4. Returns HTTP 403 if user is not `admin` or `superadmin`

---

## 3. Socket.IO Authentication Flow

### 3.1 Chat Namespace (/chat)

Location: `apps/api/src/socket/auth.ts`

```
Socket.IO handshake
  │
  ▼
socketAuthMiddleware
  │ Extract token from:
  │   1. socket.handshake.auth.token (preferred)
  │   2. socket.handshake.query.token (fallback)
  │ Verify token via Clerk verifyToken()
  │ Fetch user profile from Clerk API (clerk.users.getUser)
  │ Attach to socket.data:
  │   - userId (Clerk sub)
  │   - userName
  │   - userImageUrl
  │   - auth (full JWT payload)
  │ Call next() on success
  │ Return Error("Authentication required") if no token
  │ Return Error("Authentication failed") on verification failure
```

### 3.2 Admin Namespace (/admin)

The admin namespace applies two middleware in sequence:
1. `socketAuthMiddleware` -- Same JWT verification as chat namespace
2. `adminNamespaceAuthMiddleware` -- Additional admin role check

```
Socket.IO /admin handshake
  │
  ▼
socketAuthMiddleware (JWT verification)
  │
  ▼
adminNamespaceAuthMiddleware
  │ Extract socket.data.userId (set by previous middleware)
  │ Call checkIfUserIsAdmin(clerkUserId)
  │ Return Error("Admin access required") if not admin
```

---

## 4. Clerk Webhook User Lifecycle

### 4.1 Webhook Endpoint

Location: `apps/api/src/routes/webhook.ts` and `apps/api/src/webhook/clerk-webhook-handler.ts`

The webhook endpoint at `/webhook` receives events from Clerk and maintains user data synchronization between Clerk and the Supabase database.

### 4.2 Event Handlers

#### user.created

```
Clerk user.created event
  │
  ├── Extract email, name, avatar from event data
  │
  ├── Check if email exists in database
  │    ├── If exists and deleted=true → Reactivate user (update clerk_user_id, undelete)
  │    ├── If exists and different clerk_user_id → Update clerk_user_id (re-link)
  │    ├── If exists with same clerk_user_id → Skip (idempotent)
  │    └── If not exists → Continue to creation
  │
  ├── Check if email is automation test email (canAutoRemoveUserEmail)
  │    ├── If yes → Delete user from Clerk immediately
  │    └── If no → Create user in Supabase
  │
  └── Invalidate user profile cache if reactivated
```

#### user.updated

```
Clerk user.updated event
  │
  ├── Find existing user by clerk_user_id
  │    └── If not found → Log and return
  │
  ├── Update user record (email, name, avatar)
  │
  └── Invalidate user profile cache (REDIS_CACHE_KEYS.userProfile)
```

#### user.deleted

```
Clerk user.deleted event
  │
  ├── Soft delete user (set deleted=true, deleted_at=now)
  │    (NOT hard delete -- preserves referential integrity)
  │
  └── Invalidate admin users cache prefix
```

### 4.3 Soft Delete Strategy

User deletion is always soft:
- The `deleted` column is set to `true`
- The `deleted_at` timestamp is recorded
- The user record is preserved for referential integrity with call history, reports, favorites, etc.
- If the user re-registers with the same email, the record is reactivated

---

## 5. Frontend Authentication

### 5.1 Clerk Integration

The frontend uses `@clerk/nextjs` which provides:
- `<SignIn />` and `<SignUp />` components at `/sign-in` and `/sign-up`
- `auth()` function for server components to get the current user
- `getToken()` for retrieving JWT tokens for API calls
- Automatic session management and token refresh

### 5.2 Token Flow for Server Actions

```
Server Action
  │
  ├── withSentryAction wraps the action
  │
  └── serverFetch(url, { token: true })
       │
       ├── getToken() from @/lib/auth/token
       │    └── Calls Clerk getToken({ template: 'server_action' })
       │
       ├── Set Authorization: Bearer {token} header
       │
       └── fetch(url, { headers }) to backend API
```

### 5.3 Token Flow for Server Queries (Data Cache)

```
Page Server Component
  │
  └── withSentryQuery("name", fetchFn, cacheOptions)
       │
       ├── auth() → getToken() → preloadedToken
       │
       ├── unstable_cache(
       │     () => fetchFn(preloadedToken),
       │     keyParts: [userId, ...],
       │     tags: [...]
       │   )
       │
       └── Cached result returned (revalidated by tags)
```

### 5.4 Socket.IO Token Management

```
Client Component mounts
  │
  ├── Get Clerk session token
  │
  ├── createNamespaceSockets(token)
  │    → Socket.IO Manager with auth: { token }
  │
  ├── On token refresh → updateToken(socket, newToken)
  │    → Update socket.auth.token
  │    → Reconnect socket with new token
  │
  └── On unmount → destroySockets()
```

---

## 6. Admin Role System

### 6.1 Two-Tier Model

| Role | Capabilities |
|------|-------------|
| `admin` | Full access to admin CRUD operations, reports, economy stats, broadcasts |
| `superadmin` | All admin capabilities plus user role management and destructive operations |

### 6.2 Role Storage

- Primary store: `users.role` column in Supabase
- Cache: Redis key `admin:role:{clerkUserId}` with 5-minute TTL
- Values: `"admin"`, `"superadmin"`, or `"user"` (for non-admin cache entries)

### 6.3 Cache Initialization

On server startup, `initializeAdminCache()` preloads all admin/superadmin user roles into Redis to avoid cold-start latency.

### 6.4 Frontend Role Utilities

Location: `apps/web/src/shared/utils/roles.ts`

- `isAdmin(role)` -- Returns true for both `admin` and `superadmin`
- `isSuperAdmin(role)` -- Returns true only for `superadmin`

---

## Related Components

- Admin operations: [09-admin-system.md](09-admin-system.md)
- Rate limiting: [11-security-model.md](11-security-model.md)
- Database user tables: [12-database-schema.md](12-database-schema.md)

## Risk Considerations

- Clerk JWT secret rotation requires coordinated deployment
- Admin role cache TTL (5 minutes) means role changes take up to 5 minutes to propagate
- Webhook endpoint must be publicly accessible and is protected only by signature verification
- Soft-deleted users retain database records indefinitely (no cleanup job implemented)
- Automation test email auto-deletion logic handles Playwright test users but relies on email pattern matching
