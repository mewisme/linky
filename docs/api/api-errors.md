# API Errors

Source references:

- Shared response helpers: `apps/api/src/internal/httpx/user_message.go`
- Global HTTP error handler and middleware registration: `apps/api/src/internal/server/server.go`
- Clerk auth middleware: `apps/api/src/internal/transport/http/middleware/clerk.go`
- Admin guard: `apps/api/src/internal/transport/http/middleware/admin.go`
- Rate limit middleware: `apps/api/src/internal/transport/http/middleware/ratelimit.go`

## Global Middleware

All routes are registered on the Echo app created by `NewPublicApp`.

| Middleware | Applies To | Behavior |
|---|---|---|
| `RequestID()` | All routes | Reads `X-Request-ID` or generates a UUID, stores it, and returns `X-Request-ID` response header. |
| `ClientIP()` | All routes | Stores Echo `RealIP()`, overridden by the first `X-Forwarded-For` value if present. |
| `AccessLog()` | All routes | Logs method, URI, status, bytes, latency, IP, user agent, and request ID. |
| Echo CORS | All routes | Allows configured origins, credentials, methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`, and headers `Origin, Content-Type, Authorization, X-Request-ID, svix-id, svix-timestamp, svix-signature`. |
| Echo BodyLimit | All routes | Body limit from `JSON_BODY_SIZE_LIMIT`, default `500kb`. Echo middleware response shape is not customized in code. |
| Echo Recover | All routes | Recovers panics and forwards errors to the HTTP error handler. |
| Echo Gzip | All routes except `/webhook*` | Compresses responses with level 5 when response length is at least 1024 bytes. |

## Shared Error Body

All explicit errors sent through `httpx.SendError` and related helpers use this shape:

```json
{
  "error": "Bad Request",
  "message": "fallback message",
  "userMessage": {
    "code": "SOME_CODE",
    "i18n": {
      "key": "api.someKey",
      "values": {}
    },
    "fallbackMessage": "fallback message"
  }
}
```

`i18n.values` is omitted when empty. `fallbackMessage` is omitted only if the helper was called without one. Extra fields may appear when handlers call `SendErrorExtra`.

## User Message Success Body

`httpx.SendUserMessage` adds `message` and `userMessage` to the response body supplied by the handler:

```json
{
  "success": true,
  "message": "Operation completed",
  "userMessage": {
    "code": "OPERATION_OK",
    "i18n": {
      "key": "api.operationOk"
    },
    "fallbackMessage": "Operation completed"
  }
}
```

## Common Status Codes

### 400 Bad Request

Used for invalid JSON, missing required request fields, invalid query parameters, validation failures, missing Svix webhook headers, and invalid realtime bodies.

```json
{
  "error": "Bad Request",
  "message": "field is required",
  "userMessage": {
    "code": "FIELD_REQUIRED",
    "i18n": {
      "key": "api.fieldRequired"
    },
    "fallbackMessage": "field is required"
  }
}
```

### 401 Unauthorized

Returned by `middleware.Clerk()` when `Authorization` is missing or token verification fails, and by handlers when authenticated user ID is missing.

```json
{
  "error": "Unauthorized",
  "message": "Unauthorized",
  "userMessage": {
    "code": "UNAUTHORIZED",
    "i18n": {
      "key": "api.unauthorized"
    },
    "fallbackMessage": "Unauthorized"
  }
}
```

Some handlers use:

```json
{
  "error": "Unauthorized",
  "message": "User ID not found in authentication token",
  "userMessage": {
    "code": "USER_ID_NOT_IN_TOKEN",
    "i18n": {
      "key": "api.userIdNotInToken"
    },
    "fallbackMessage": "User ID not found in authentication token"
  }
}
```

### 403 Forbidden

Admin guard response:

```json
{
  "error": "Forbidden",
  "message": "Admin access required",
  "userMessage": {
    "code": "FORBIDDEN_ADMIN",
    "i18n": {
      "key": "api.adminAccessRequired"
    },
    "fallbackMessage": "Admin access required"
  }
}
```

Other handlers use the same shared shape with endpoint-specific `userMessage.code`.

### 404 Not Found

Global route-not-found response:

```json
{
  "error": "Route not found",
  "message": "Route not found",
  "userMessage": {
    "code": "ROUTE_NOT_FOUND",
    "i18n": {
      "key": "api.routeNotFound"
    },
    "fallbackMessage": "Route not found"
  }
}
```

Resource not-found handlers use the same shared shape with endpoint-specific codes.

### 409 Conflict

Used by `POST /api/v1/favorites` when the target is already in favorites.

```json
{
  "error": "Conflict",
  "message": "User is already in favorites",
  "userMessage": {
    "code": "ALREADY_IN_FAVORITES",
    "i18n": {
      "key": "api.alreadyInFavorites"
    },
    "fallbackMessage": "User is already in favorites"
  }
}
```

Realtime upstream errors may also use 409 when the peer is not ready.

### 425 Too Early

Used by realtime Cloudflare session-not-ready handling.

```json
{
  "error": "Too Early",
  "message": "Cloudflare session is not ready yet. Retry after peer connection is connected.",
  "userMessage": {
    "code": "REALTIME_SESSION_NOT_READY",
    "i18n": {
      "key": "api.api.realtime.sessionNotReady"
    },
    "fallbackMessage": "Cloudflare session is not ready yet. Retry after peer connection is connected."
  },
  "code": "REALTIME_SESSION_NOT_READY",
  "retryable": true
}
```

### 429 Too Many Requests

Returned by `middleware.RateLimit` and custom rate limits.

Rate-limit headers:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests in the current window. |
| `X-RateLimit-Remaining` | Remaining requests in the current window, never below `0`. |
| `X-RateLimit-Reset` | UTC RFC3339Nano timestamp when the window resets. |

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "userMessage": {
    "code": "RATE_LIMIT",
    "i18n": {
      "key": "api.rateLimitExceeded"
    },
    "fallbackMessage": "Rate limit exceeded. Please try again later."
  }
}
```

`POST /api/v1/favorites` may also return 429 with extra `current` and `limit` fields when the daily favorite limit is reached.

### 500 Internal Server Error

Explicit handler errors use:

```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch user data",
  "userMessage": {
    "code": "FAILED_FETCH_USER_DATA",
    "i18n": {
      "key": "api.failedFetchUserData"
    },
    "fallbackMessage": "Failed to fetch user data"
  }
}
```

Unhandled errors from the global HTTP error handler use:

```json
{
  "error": "An unexpected error occurred",
  "message": "error detail",
  "userMessage": {
    "code": "UNEXPECTED_SERVER",
    "i18n": {
      "key": "api.errorDetail",
      "values": {
        "detail": "error detail"
      }
    },
    "fallbackMessage": "error detail"
  }
}
```

### 502 Bad Gateway

Used by AI model listing and broadcast AI generation when upstream AI or Clerk Admin API calls fail.

### 503 Service Unavailable

Used by readiness checks, push key configuration checks, S3/Clerk not-configured flows, and realtime service/configuration checks.

## Validation Error Format

No separate validation envelope was found in code. Validation errors are returned through `httpx.SendError` using the shared error body.

## Auth Error Format

No separate auth envelope was found in code. Auth errors are returned through `httpx.Unauthorized` or `httpx.Forbidden` using the shared error body.

## Cookies

No HTTP route, middleware, or response helper in `apps/api/src/internal/transport/http` reads or writes cookies.
