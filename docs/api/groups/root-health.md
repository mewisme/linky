# Root and Health APIs

Source references:

- Route file: `apps/api/src/internal/transport/http/health.go`
- Server registration: `apps/api/src/internal/server/server.go`
- Response helpers: `apps/api/src/internal/httpx/user_message.go`

## [GET] /

### Summary

Returns a minimal API running status.

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
  "status": "running"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

### Source References

* Route file: `apps/api/src/internal/transport/http/health.go`
* Controller: inline handler in `RegisterRoot`
* Service: Not found in code
* DTO/Validator: Not found in code
* Middleware/Guard: global middleware in `apps/api/src/internal/server/server.go`

## [GET] /api

### Summary

Returns an API running message using the shared user-message success envelope.

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
  "message": "API is running",
  "userMessage": {
    "code": "API_RUNNING",
    "i18n": {
      "key": "api.apiRunning"
    },
    "fallbackMessage": "API is running"
  }
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

### Source References

* Route file: `apps/api/src/internal/transport/http/health.go`
* Controller: inline handler in `RegisterRoot`
* Service: Not found in code
* DTO/Validator: `httpx.UserMessage`
* Middleware/Guard: global middleware in `apps/api/src/internal/server/server.go`

## [GET] /healthz

### Summary

Returns health status and package version.

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
  "status": "ok",
  "version": "Inferred from code: readPackageVersion()"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

### Source References

* Route file: `apps/api/src/internal/transport/http/health.go`
* Controller: inline handler in `RegisterHealth`
* Service: `readPackageVersion`
* DTO/Validator: Not found in code
* Middleware/Guard: global middleware in `apps/api/src/internal/server/server.go`

## [GET] /readyz

### Summary

Checks readiness by pinging Supabase with a 5-second timeout.

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
  "status": "ready",
  "supabase": "ok"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

#### 503 Service Unavailable

```json
{
  "status": "not ready",
  "supabase": "error"
}
```

### Source References

* Route file: `apps/api/src/internal/transport/http/health.go`
* Controller: inline handler in `RegisterHealth`
* Service: `supax.Ping`
* DTO/Validator: Not found in code
* Middleware/Guard: global middleware in `apps/api/src/internal/server/server.go`
