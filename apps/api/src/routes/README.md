# Backend Routes Documentation

This directory contains all API route handlers for the backend Express server. Routes are organized by resource category to improve maintainability and scalability.

## Directory Structure

```
routes/
├── admin/              # Admin-only routes (protected by adminMiddleware)
│   ├── analytics.ts   # Admin analytics endpoints
│   ├── users.ts        # Admin user management
│   └── visits.ts       # Admin visitor tracking
├── users/              # User-related routes
│   ├── users.ts        # User profile endpoints (/me, /me/country)
│   └── user-details.ts # User details endpoints (/me)
├── resources/          # Other resource routes
│   ├── call-history.ts # Call history endpoints
│   └── interest-tags.ts # Interest tags endpoints (public)
├── media/              # Media and storage routes
│   ├── s3.ts           # S3 storage endpoints
│   └── ice-servers.ts  # WebRTC ICE servers endpoint
├── admin.ts            # Admin router (mounts admin/* routes)
├── analytics.ts        # Public analytics endpoints
├── api.ts              # Main API router (mounts protected routes)
├── index.ts            # Route setup and middleware configuration
├── s3.ts               # (deprecated - moved to media/s3.ts)
└── webhook.ts          # Webhook handlers (Clerk, etc.)
```

## Route Organization Principles

### 1. Resource-Based Grouping
Routes are grouped by resource type rather than HTTP method or feature. This makes it easier to:
- Find related endpoints
- Maintain consistency across similar resources
- Scale by adding new resources without cluttering the root directory

### 2. Category Folders
- **`users/`**: All user-related routes (profile, details)
- **`resources/`**: General resources (call history, interest tags)
- **`media/`**: Media and storage-related routes (S3, ICE servers)
- **`admin/`**: Administrative routes (separate from regular API)

### 3. Route Mounting
Routes are mounted in `routes/index.ts` with appropriate middleware:
- Public routes (no auth): `/api/v1/analytics`, `/api/v1/interest-tags`
- Protected routes (clerkMiddleware): `/api/v1/*` (via `api.ts`)
- Admin routes (clerkMiddleware + adminMiddleware): `/api/v1/admin/*`

## Route Categories

### Users Routes (`users/`)
- **`users.ts`**: User profile management
  - `GET /api/v1/users/me` - Get current user
  - `PATCH /api/v1/users/me/country` - Update user country
  
- **`user-details.ts`**: Extended user information
  - `GET /api/v1/user-details/me` - Get user details with expanded tags
  - `PUT /api/v1/user-details/me` - Full update user details
  - `PATCH /api/v1/user-details/me` - Partial update user details

### Resources Routes (`resources/`)
- **`call-history.ts`**: Call history management
  - `GET /api/v1/call-history` - List call history
  - `GET /api/v1/call-history/:id` - Get specific call
  - `POST /api/v1/call-history` - Create call record

- **`interest-tags.ts`**: Interest tags (public)
  - `GET /api/v1/interest-tags` - List all active tags
  - `GET /api/v1/interest-tags/:id` - Get specific tag

### Media Routes (`media/`)
- **`s3.ts`**: S3 storage operations
  - Presigned URLs, object management, multipart uploads
  
- **`ice-servers.ts`**: WebRTC ICE servers
  - `GET /api/ice-servers` - Get ICE server configuration

### Admin Routes (`admin/`)
- **`users.ts`**: Admin user management
- **`analytics.ts`**: Admin analytics
- **`visits.ts`**: Visitor tracking

## Adding New Routes

### Step 1: Create Route File
Create a new file in the appropriate category folder:
```typescript
// routes/users/new-feature.ts
import { Router, type Router as ExpressRouter } from "express";
const router: ExpressRouter = Router();

router.get("/", async (req, res) => {
  // Implementation
});

export default router;
```

### Step 2: Mount in Router
Add to the appropriate router file:
- For user-related: Add to `routes/api.ts` or create `routes/users/router.ts`
- For new category: Create new folder and mount in `routes/index.ts`

### Step 3: Update Documentation
Update this README with the new route information.

## Middleware Order

Routes are mounted in this order in `routes/index.ts`:
1. Webhook routes (before auth - signature verified)
2. Public routes (analytics, interest-tags)
3. `clerkMiddleware` applied
4. Protected API routes
5. Admin routes (with `adminMiddleware`)

## Best Practices

1. **Consistent Error Handling**: Use the same error response format
2. **Validation**: Validate input data before processing
3. **Logging**: Use logger utility for consistent logging
4. **Type Safety**: Use TypeScript types from `database.types.ts`
5. **Query Functions**: Use functions from `lib/supabase/queries/` instead of direct Supabase calls
6. **One Route Per File**: Keep routes focused and single-purpose

## Route Naming Conventions

- Use kebab-case for route paths: `/api/v1/user-details`
- Use camelCase for TypeScript files: `user-details.ts`
- Use descriptive names that indicate the resource: `call-history.ts`, `interest-tags.ts`

## Related Files

- **Queries**: `src/lib/supabase/queries/` - Database query functions
- **Middleware**: `src/middleware/` - Authentication and authorization
- **Types**: `src/types/database.types.ts` - Database type definitions
