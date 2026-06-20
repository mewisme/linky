# Matchmaking APIs

Source references:

- Route file: `apps/api/src/internal/transport/http/public_misc.go`
- Server registration: `apps/api/src/internal/server/server.go`

## [GET] /api/v1/matchmaking/queue-status

### Summary

Returns current matchmaking queue size and an estimated wait time when the queue has at least two users.

### Authentication

* Required: No
* JWT Required: No
* Roles/Permissions: Not found in code

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `X-Request-ID` | No | Global middleware reads this or generates one. |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 200 OK

```json
{
  "queueSize": 2,
  "estimatedWaitSeconds": 24
}
```

`estimatedWaitSeconds` is `null` when queue size is less than 2.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 429 Too Many Requests

This route uses `middleware.RateLimit(cfg)`. See `../api-errors.md`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

### Source References

* Route file: `apps/api/src/internal/transport/http/public_misc.go`
* Controller: inline handler in `RegisterQueueStatus`
* Service: `QueueSizeFn`
* DTO/Validator: Not found in code
* Middleware/Guard: global middleware plus `middleware.RateLimit(cfg)`
