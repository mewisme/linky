---
name: new-feature-conventions
description: Enforces project conventions when implementing new features in the Linky monorepo. Use when implementing any new feature that involves API calls from the frontend, adding Next.js API proxy routes, or tracking user/server events with OpenPanel analytics. Covers: API proxy pattern, fetch utility usage, and event tracking enum registration for both client and server.
---

# New Feature Conventions

## 1. API Calls Must Go Through the Next.js Proxy

Never call the backend Express API (`publicEnv.API_URL`) directly from client components or hooks. All backend calls must be proxied through a Next.js route handler under `apps/web/src/app/api/`.

**Client-side** calls use `apps/web/src/lib/api/fetch/client-api.ts`:
```ts
import { fetchData, postData, putData, patchData, deleteData } from "@/lib/api/fetch/client-api";
import { apiUrl } from "@/lib/api/fetch/api-url";

export async function getThings(token: string): Promise<ThingsResponse> {
  return fetchData<ThingsResponse>(apiUrl.things.list(), { token });
}
```

**Server-side** (Server Components / Server Actions) use `apps/web/src/lib/api/fetch/server-api.ts`:
```ts
import { fetchData } from "@/lib/api/fetch/server-api";
import { apiUrl } from "@/lib/api/fetch/api-url";

const data = await fetchData<ThingsResponse>(apiUrl.things.list());
```

Wrapper functions live in `apps/web/src/lib/api/<domain>.ts` and are imported by hooks/components.

## 2. Register New API URL Methods

When you add a new proxy route, add a corresponding URL builder method to the appropriate class in `apps/web/src/lib/api/fetch/urls/`.

**Existing classes and their files:**

| Class | File | Route prefix |
|---|---|---|
| `UserApi` | `urls/user-api.ts` | `/api/users/...` |
| `ResourcesApi` | `urls/resources-api.ts` | `/api/resources/...` |
| `AdminApi` | `urls/admin-api.ts` | `/api/admin/...` |
| `MediaApi` | `urls/media-api.ts` | `/api/media/...` |
| `NotificationsApi` | `urls/notifications-api.ts` | `/api/notifications/...` |
| `PushApi` | `urls/push-api.ts` | `/api/push/...` |
| `MatchmakingApi` | `urls/matchmaking-api.ts` | `/api/matchmaking/...` |

For a new domain, create a new class extending `BaseApiUrl`, add it to `urls/index.ts`, and wire it in `api-url.ts`.

Example method:
```ts
thingById(id: string) {
  return this.buildUrl('/api/things/:id', { pathParams: { id } });
}
```

## 3. Next.js Proxy Route Handler Pattern

Each `apps/web/src/app/api/<path>/route.ts` must follow this structure:

```ts
import { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/env/public-env";
import { trackEventServer } from "@/lib/analytics/events/server";

export async function GET(request: NextRequest) {
  trackEventServer({ name: "api_things_get" });
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No authentication token found" },
        { status: 401 }
      );
    }

    const response = await fetch(`${publicEnv.API_URL}/api/v1/things`, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/things:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch things" },
      { status: 500 }
    );
  }
}
```

## 4. Tracking Event Registration (Required)

Every new proxy route handler **must** call `trackEventServer` at the top of the handler. Every new client-side user action **should** call `trackEvent` at the appropriate point.

### Naming Convention

Server events follow the pattern `api_<path_segments>_<method>`:
- Path separators become `_`
- Dynamic segments like `[id]` become the param name (e.g., `id`)
- HTTP method appended as suffix

Examples:
| Route | Method | Event name |
|---|---|---|
| `/api/things` | GET | `api_things_get` |
| `/api/things` | POST | `api_things_post` |
| `/api/things/[id]` | PATCH | `api_things_id_patch` |
| `/api/admin/things/[id]/hard` | DELETE | `api_admin_things_id_hard_delete` |

Client events are descriptive past-tense user actions: `thing_created`, `thing_deleted`, `thing_shared`.

### Registering Server Events

Add the new name to `SERVER_EVENT_NAMES` in `apps/web/src/lib/analytics/events/server.ts`:

```ts
export const SERVER_EVENT_NAMES = [
  // ...existing events...
  "api_things_get",
  "api_things_post",
  "api_things_id_patch",
] as const;
```

Then use it in the route handler:
```ts
import { trackEventServer } from "@/lib/analytics/events/server";
trackEventServer({ name: "api_things_get" });
// optionally with properties:
trackEventServer({ name: "api_things_post", properties: { thing_id: id } });
```

### Registering Client Events

Add to `CLIENT_EVENT_NAMES` in `apps/web/src/lib/analytics/events/client.ts`:

```ts
export const CLIENT_EVENT_NAMES = [
  // ...existing events...
  "thing_created",
  "thing_deleted",
] as const;
```

Then use it in a hook or component:
```ts
import { trackEvent } from "@/lib/analytics/events/client";
trackEvent({ name: "thing_created", properties: { thing_id: id } });
```

`trackEvent` uses `useOpenPanel()` so it must be called from client context. For server context use `trackEventServer`.

## 5. Checklist for New Feature with API

- [ ] Created Next.js proxy route in `apps/web/src/app/api/<path>/route.ts`
- [ ] Added URL builder method to the appropriate `urls/<domain>-api.ts` class
- [ ] Added wrapper function in `apps/web/src/lib/api/<domain>.ts`
- [ ] Registered new server event name(s) in `SERVER_EVENT_NAMES`
- [ ] Called `trackEventServer` at the top of each route handler
- [ ] Registered new client event name(s) in `CLIENT_EVENT_NAMES` (if user action)
- [ ] Called `trackEvent` in the hook/component at the right moment (if user action)
