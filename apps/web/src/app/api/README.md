# Next.js API Routes Documentation

This directory contains all Next.js API route handlers that proxy requests to the backend Express server. Routes are organized by resource category to mirror the backend structure and improve maintainability.

## Directory Structure

```
app/api/
├── admin/              # Admin-only routes (protected)
│   ├── analytics/
│   └── users/
├── analytics/          # Public analytics routes
│   ├── visit/
│   └── visitor/
├── users/              # User-related routes
│   ├── me/             # Current user endpoints
│   │   ├── country/
│   │   └── route.ts
│   ├── details/
│   │   └── route.ts
│   ├── interest-tags/
│   │   ├── all/
│   │   │   └── route.ts
│   │   └── route.ts
│   ├── progress/
│   │   └── route.ts
│   ├── settings/
│   │   └── route.ts
│   └── streak/
│       ├── calendar/
│       │   └── route.ts
│       └── route.ts
├── resources/          # Other resource routes
│   ├── call-history/   # Call history endpoints
│   │   ├── [id]/
│   │   └── route.ts
│   └── interest-tags/ # Interest tags (public)
│       ├── [id]/
│       └── route.ts
├── media/              # Media and storage routes
│   ├── s3/             # S3 storage endpoints
│   │   ├── multipart/
│   │   ├── objects/
│   │   └── presigned/
│   └── ice-servers/    # WebRTC ICE servers
│       └── route.ts
```

## Route Organization Principles

### 1. Mirror Backend Structure
Next.js API routes mirror the backend route structure to maintain consistency:
- Backend: `/api/v1/users/me` → Frontend: `/api/users/me`
- Backend: `/api/v1/user-details/me` → Frontend: `/api/users/details`
- Backend: `/api/v1/call-history` → Frontend: `/api/resources/call-history`

### 2. Category-Based Grouping
Routes are grouped by resource category:
- **`users/`**: User profile and details
- **`resources/`**: General resources (call history, interest tags)
- **`media/`**: Media and storage (S3, ICE servers)
- **`admin/`**: Administrative routes
- **`analytics/`**: Public analytics

### 3. Next.js App Router Structure
Routes follow Next.js 13+ App Router conventions:
- Each route is a `route.ts` file
- Dynamic segments use `[param]` folder names
- Nested routes create nested URL paths

## Route Categories

### Users Routes (`users/`)
- **`route.ts`**: User root
  - `GET /api/users` → Backend: `/api/v1/users/me`

- **`me/route.ts`**: Current user profile
  - `GET /api/users/me` → Backend: `/api/v1/users/me`
  
- **`me/country/route.ts`**: User country update
  - `PATCH /api/users/me/country` → Backend: `/api/v1/users/me/country`
  
- **`details/route.ts`**: User details management
  - `GET /api/users/details` → Backend: `/api/v1/user-details/me`
  - `PUT /api/users/details` → Backend: `/api/v1/user-details/me`
  - `PATCH /api/users/details` → Backend: `/api/v1/user-details/me`

- **`settings/route.ts`**: User settings management
  - `GET /api/users/settings` → Backend: `/api/v1/user-settings/me`
  - `PUT /api/users/settings` → Backend: `/api/v1/user-settings/me`
  - `PATCH /api/users/settings` → Backend: `/api/v1/user-settings/me`

- **`interest-tags/route.ts`**: User interest tags management
  - `POST /api/users/interest-tags` → Backend: `/api/v1/user-details/me/interest-tags`
  - `PUT /api/users/interest-tags` → Backend: `/api/v1/user-details/me/interest-tags`
  - `DELETE /api/users/interest-tags` → Backend: `/api/v1/user-details/me/interest-tags`

- **`interest-tags/all/route.ts`**: Clear all interest tags
  - `DELETE /api/users/interest-tags/all` → Backend: `/api/v1/user-details/me/interest-tags/all`

- **`progress/route.ts`**: User progress insights
  - `GET /api/users/progress` → Backend: `/api/v1/user-progress/me`

- **`streak/route.ts`**: User streak summary
  - `GET /api/users/streak` → Backend: `/api/v1/user-streak/me`

- **`streak/calendar/route.ts`**: User streak calendar
  - `GET /api/users/streak/calendar` → Backend: `/api/v1/user-streak/calendar`

### Resources Routes (`resources/`)
- **`call-history/route.ts`**: List call history
  - `GET /api/resources/call-history` → Backend: `/api/v1/call-history`
  
- **`call-history/[id]/route.ts`**: Get specific call
  - `GET /api/resources/call-history/:id` → Backend: `/api/v1/call-history/:id`

- **`interest-tags/route.ts`**: List interest tags (public)
  - `GET /api/resources/interest-tags` → Backend: `/api/v1/interest-tags`
  
- **`interest-tags/[id]/route.ts`**: Get specific tag (public)
  - `GET /api/resources/interest-tags/:id` → Backend: `/api/v1/interest-tags/:id`

### Media Routes (`media/`)
- **`s3/`**: S3 storage operations
  - All S3 endpoints proxy to `/api/v1/s3/*`
  
- **`ice-servers/route.ts`**: WebRTC ICE servers
  - `GET /api/media/ice-servers` → Backend: `/api/ice-servers`

## Route Proxy Pattern

All routes follow a consistent proxy pattern:

```typescript
import { publicEnv } from "@/env";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/backend-endpoint`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to process request" },
      { status: 500 }
    );
  }
}
```

## Public vs Protected Routes

### Public Routes
Routes that don't require authentication (defined in `proxy.ts`):
- `/api/analytics/*`
- `/api/resources/interest-tags/*`

### Protected Routes
All other routes require authentication via Clerk middleware.

## Adding New Routes

### Step 1: Create Route File
Create a new `route.ts` file in the appropriate category folder:

```typescript
// app/api/users/new-feature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
  // Implementation
}
```

### Step 2: Update Client Code
If the route is used in client code, update the API client:
- `lib/client.ts` - For user-related endpoints
- `lib/api/*.ts` - For specific resource endpoints

### Step 3: Update Proxy Configuration
If the route should be public, add it to `proxy.ts`:
```typescript
const isPublicRoute = createRouteMatcher([
  // ... existing routes
  "/api/your-new-public-route(.*)",
]);
```

### Step 4: Update Documentation
Update this README with the new route information.

## Route Naming Conventions

- **Folder names**: Use kebab-case: `user-details`, `call-history`
- **File names**: Always `route.ts` (Next.js convention)
- **Dynamic segments**: Use `[param]` folder names: `[id]`, `[key]`
- **URL paths**: Match backend structure but without `/api/v1` prefix

## Environment Variables

Routes use `publicEnv.API_URL` from `@/env` (validated at startup). Set `NEXT_PUBLIC_API_URL` in `.env.local` for different environments.

## Error Handling

All routes follow consistent error handling:
1. Check authentication (if required)
2. Proxy request to backend
3. Return backend response (including errors)
4. Log errors for debugging
5. Return 500 for unexpected errors

## Related Files

- **Client Code**: `lib/client.ts`, `lib/api/*.ts` - API client functions
- **Proxy Config**: `proxy.ts` - Clerk middleware and public route configuration
- **Types**: `types/api.types.ts` - API response types

## Best Practices

1. **Always Proxy**: Don't implement business logic in Next.js routes - proxy to backend
2. **Pass Headers**: Forward authorization and other necessary headers
3. **Error Handling**: Use consistent error response format
4. **Logging**: Log errors for debugging but don't expose sensitive info
5. **Type Safety**: Use TypeScript types for request/response
6. **Query Params**: Forward query parameters to backend
7. **Request Body**: Forward request body for POST/PUT/PATCH requests
