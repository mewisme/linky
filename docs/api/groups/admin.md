# Admin APIs

All endpoints in this file are mounted under `/api/v1/admin` with:

- `middleware.Clerk()`
- `middleware.Admin()`
- `middleware.RateLimit(cfg)`

Authentication applies to every endpoint:

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

Common source references:

- Route files: `apps/api/src/internal/transport/http/admin_routes.go`, `admin_extra.go`, `admin_clerk_users.go`, `admin_ai.go`, `admin_user_soft_delete.go`, `s3_routes.go`
- Auth middleware: `apps/api/src/internal/transport/http/middleware/clerk.go`
- Admin guard: `apps/api/src/internal/transport/http/middleware/admin.go`
- Rate limit middleware: `apps/api/src/internal/transport/http/middleware/ratelimit.go`

Common admin auth errors:

- `401 Unauthorized`: missing or invalid Clerk bearer token, or missing actor user ID.
- `403 Forbidden`: non-admin actor, Clerk admin forbidden error, or endpoint-specific forbidden validation.
- `429 Too Many Requests`: admin group rate limit exceeded.

## [GET] /api/v1/admin/config

### Summary

Lists admin config rows with AI config values redacted when needed.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [
    {
      "key": "ai",
      "value": {}
    }
  ]
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch admin config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminConfigList`
* Service: `supax.ListAdminConfig`, `aiconfig.RedactAdminConfigRow`
* DTO/Validator: `supax.AdminConfigRow`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/config/:key

### Summary

Returns one admin config row by key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `key` | string | Yes | Admin config key. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns `supax.AdminConfigRow`.

#### 400 Bad Request

Missing `key`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Admin config not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch admin config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminConfigGet`
* Service: `supax.ListAdminConfig`
* DTO/Validator: path param check
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/config

### Summary

Creates or upserts an admin config row.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "some_key",
  "value": {}
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty; `user_embeddings` is rejected as deprecated. | Config key. |
| `value` | object | No | Defaults to `{}`. AI config key is validated by `prepareAIConfigMap`. | Config value. |

### Responses

#### 201 Created

Returns upserted config row as a map.

#### 400 Bad Request

Missing key, deprecated key, or invalid AI config.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to upsert admin config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminConfigPost`
* Service: `supax.UpsertAdminConfig`, `prepareAIConfigMap`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/config/:key

### Summary

Upserts an admin config value by path key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `key` | string | Yes | Admin config key. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "value": {}
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `value` | object | No | Defaults to `{}`. AI config key is validated by `prepareAIConfigMap`. | Config value. |

### Responses

#### 200 OK

Returns upserted config row as a map.

#### 400 Bad Request

Missing key, deprecated key, or invalid AI config.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to upsert admin config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminConfigUpsert`
* Service: `supax.UpsertAdminConfig`, `prepareAIConfigMap`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/config/:key

### Summary

Deletes an admin config row by key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `key` | string | Yes | Admin config key. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Missing `key`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to delete admin config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminConfigDelete`
* Service: `supax.DeleteAdminConfig`
* DTO/Validator: path param check
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/ai/config

### Summary

Returns AI admin config, effective public config, environment defaults, admin overlay status, and API-key configured status.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "key": "ai",
  "admin": {},
  "effective": {},
  "env_defaults": {},
  "has_admin_config": true,
  "api_key_configured": true
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch AI config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_ai.go`
* Controller: `handleAdminAIConfigGet`
* Service: `supax.GetAdminConfigValue`, `aiconfig.*`
* DTO/Validator: AI config maps, see `../api-types.md`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PUT] /api/v1/admin/ai/config

### Summary

Saves AI admin config and refreshes model cache.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "value": {
    "base_url": "https://api.example.com/v1",
    "models": {}
  }
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `value` | object | Yes | Must parse through `aiconfig.SettingsFromMap`. | AI settings. |

### Responses

#### 200 OK

```json
{
  "key": "ai",
  "effective": {},
  "api_key_configured": true
}
```

#### 400 Bad Request

Missing `value` or invalid AI config JSON.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to save AI config.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_ai.go`
* Controller: `handleAdminAIConfigPut`
* Service: `aiconfig.SettingsFromMap`, `supax.UpsertAdminConfig`
* DTO/Validator: inline request struct, AI config maps
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/ai/models

### Summary

Lists AI models for one capability or all capabilities.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `capability` | string | No | empty | Cast to `openaix.Capability`; enum values not validated in route code. | Capability filter. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

With `capability`:

```json
{
  "capability": "embedding",
  "data": [],
  "object": "list"
}
```

Without `capability`:

```json
{
  "capabilities": {}
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code.

#### 502 Bad Gateway

Failed to list AI models.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_ai.go`
* Controller: `handleAdminAIModelsList`
* Service: `openaix.ListModels`, `openaix.ListAllCapabilityModels`
* DTO/Validator: upstream model list
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/users

### Summary

Lists users with admin-facing enrichment such as presence, details, tags, embedding metadata, and computed level.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `page` | integer | No | `1` in service when `<1` | Parse failure becomes `0`. | Page number. |
| `limit` | integer | No | `50` in service when `<=0`; max `100` in service. | Parse failure becomes `0`. | Page size. |
| `role` | string | No | empty | Service filters only `admin`, `member`, or `superadmin`. | Role filter. |
| `search` | string | No | empty | Not found in route code. | Search string. |
| `deleted` | boolean string | No | unset | Any non-empty value other than `"true"` becomes false. | Deleted filter. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "count": 0
}
```

Rows use the admin user list row shape in `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch users.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminUserList`
* Service: `supax.ListAdminUsersUnified`, `presence.SnapshotPresence`
* DTO/Validator: `supax.AdminUsersOptions`, `mapAdminUserRow`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/users/:id

### Summary

Returns a user row by internal user ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Internal user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns raw user map from Supabase.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

User not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch user.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminUserGet`
* Service: `supax.GetUserByID`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PUT] /api/v1/admin/users/:id

### Summary

Updates a user row. Assigning `superadmin` is explicitly forbidden.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Internal user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "role": "admin"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | `role: "superadmin"` is rejected. | Passed to `supax.PatchUser`. |

### Responses

#### 200 OK

Returns `supax.UserRow`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

Cannot assign superadmin role.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update user.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminUserPut`
* Service: `supax.PatchUser`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/users/:id

### Summary

Patches a user row. If body contains `deleted: true`, also deletes the linked Clerk user when present.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Internal user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "deleted": true
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Passed to user patch or soft-delete flow. |

### Responses

#### 200 OK

Returns `supax.UserRow`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

Clerk admin forbidden error.

#### 404 Not Found

User not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update or delete user.

#### 503 Service Unavailable

Clerk not configured during soft-delete flow.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminUserPatch`
* Service: `supax.PatchUser`, `adminSoftDeleteUser`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/users/batch

### Summary

Batch-updates users for deleted/deleted_at fields. If `deleted` is true, uses soft-delete flow for each user.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "ids": ["uuid"],
  "deleted": true,
  "deleted_at": "2026-06-20T00:00:00Z"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `ids` | string[] | Yes | Must be non-empty. | User IDs. |
| `deleted` | boolean | No | Not found in code | Deleted flag. |
| `deleted_at` | string | No | Defaults to current timestamp when `deleted` is true and omitted. | Deleted timestamp. |

### Responses

#### 200 OK

```json
{
  "updated": 1
}
```

#### 400 Bad Request

Missing `ids`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code; per-item errors are skipped.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminUserBatchPatch`
* Service: `supax.PatchUser`, `adminSoftDeleteUser`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/users/batch

### Summary

Hard-deletes multiple user rows from the `users` table.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "ids": ["uuid"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `ids` | string[] | Yes | Must be non-empty. | User IDs. |

### Responses

#### 200 OK

```json
{
  "deleted": 1
}
```

#### 400 Bad Request

Missing `ids`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code; per-item errors are skipped.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminUserBatchDelete`
* Service: `supax.DeleteGeneric`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/users/:id

### Summary

Soft-deletes a user and deletes the linked Clerk user when present.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Internal user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Clerk admin forbidden error.

#### 404 Not Found

User not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to delete user.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminUserSoftDelete`
* Service: `adminSoftDeleteUser`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## Clerk User Admin Endpoints

These endpoints proxy administrative operations to Clerk. Request and response bodies are pass-through maps unless noted.

## [GET] /api/v1/admin/users/clerk

### Summary

Lists Clerk users through Clerk admin integration.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `page` | integer | No | Not found in code | Used to calculate offset when `>0`. | Page number. |
| `limit` | integer | No | `50` | Values `<=0` become `50`; values `>500` become `500`. | Page size. |
| `search` | string | No | empty | Falls back to `query` when empty. | Search query. |
| `query` | string | No | empty | Used only when `search` is empty. | Search query fallback. |
| `banned` | boolean string | No | unset | Any non-empty value other than `"true"` becomes false. | Banned filter. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "count": 0
}
```

#### 400 Bad Request

May be returned from Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserList`
* Service: `clerkadmin.ListUsers`
* DTO/Validator: `clerkadmin.ListUsersOptions`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/users/clerk/:id

### Summary

Returns one Clerk user by Clerk ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Clerk user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns Clerk user JSON map.

#### 400 Bad Request

May be returned from Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserGet`
* Service: `clerkadmin.GetUser`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PUT] /api/v1/admin/users/clerk/:id

### Summary

Updates one Clerk user with an arbitrary JSON map.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Clerk user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "first_name": "A"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | Body must be valid JSON object. Exact allowed Clerk fields are not found in code. | Passed to Clerk admin update. |

### Responses

#### 200 OK

Returns Clerk user JSON map.

#### 400 Bad Request

Invalid JSON body or Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserPut`, `handleAdminClerkUserUpdate`
* Service: `clerkadmin.UpdateUser`
* DTO/Validator: `readJSONBodyMap`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/users/clerk/:id

### Summary

Same behavior as `PUT /api/v1/admin/users/clerk/:id`.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Clerk user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "first_name": "A"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | Body must be valid JSON object. Exact allowed Clerk fields are not found in code. | Passed to Clerk admin update. |

### Responses

#### 200 OK

Returns Clerk user JSON map.

#### 400 Bad Request

Invalid JSON body or Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserPatch`, `handleAdminClerkUserUpdate`
* Service: `clerkadmin.UpdateUser`
* DTO/Validator: `readJSONBodyMap`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/users/clerk/:id

### Summary

Deletes one Clerk user by Clerk ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Clerk user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

May be returned from Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserDelete`
* Service: `clerkadmin.DeleteUser`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/users/clerk/batch

### Summary

Batch-updates Clerk users. The update body may be supplied as `body` or as flat fields alongside `ids`.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "ids": ["user_x"],
  "body": {
    "first_name": "A"
  }
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `ids` | string[] | Yes | Must be non-empty. | Clerk user IDs. |
| `body` | object | No | Defaults to flat body minus `ids`, then `{}`. Exact allowed Clerk fields are not found in code. | Update body. |

### Responses

#### 200 OK

```json
{
  "updated": 1
}
```

#### 400 Bad Request

Missing `ids`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code; per-item errors are skipped.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserBatchPatch`
* Service: `clerkadmin.UpdateUser`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/users/clerk/batch

### Summary

Batch-deletes Clerk users.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "ids": ["user_x"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `ids` | string[] | Yes | Must be non-empty. | Clerk user IDs. |

### Responses

#### 200 OK

```json
{
  "deleted": 1
}
```

#### 400 Bad Request

Missing `ids`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code; per-item errors are skipped.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserBatchDelete`
* Service: `clerkadmin.DeleteUser`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/users/clerk/:id/password/set-compromised

### Summary

Marks a Clerk user's password as compromised.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Clerk user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "revoke_all_sessions": true
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `revoke_all_sessions` | boolean | No | Exact struct fields come from `clerkadmin.SetPasswordCompromisedParams`. | Revoke sessions flag. |

### Responses

#### 200 OK

Returns Clerk response map, or empty body with status 200 when Clerk returns nil.

#### 400 Bad Request

May be returned from Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserSetPasswordCompromised`
* Service: `clerkadmin.SetPasswordCompromised`
* DTO/Validator: `clerkadmin.SetPasswordCompromisedParams`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/users/clerk/:id/password/unset-compromised

### Summary

Unsets a Clerk user's compromised password flag.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Clerk user ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns Clerk response map, or empty body with status 200 when Clerk returns nil.

#### 400 Bad Request

May be returned from Clerk admin error status.

#### 401 Unauthorized

Actor required.

#### 403 Forbidden

Actor is not admin.

#### 404 Not Found

May be returned from Clerk admin error status.

#### 429 Too Many Requests

Admin route rate limit or Clerk admin error status.

#### 500 Internal Server Error

Not found in code for handler-local failures.

#### 502 Bad Gateway

Default status for Clerk admin upstream errors when no status is available.

#### 503 Service Unavailable

Clerk not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_clerk_users.go`
* Controller: `handleAdminClerkUserUnsetPasswordCompromised`
* Service: `clerkadmin.UnsetPasswordCompromised`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## Generic Admin CRUD Endpoints

The same generic handler is registered for `/interest-tags` backed by table `interest_tags` and `/exp-bonuses` backed by table `exp_bonuses`. The `/exp-bonuses` routes reload the exp bonus cache after mutations.

## [GET] /api/v1/admin/interest-tags

### Summary

Lists `interest_tags` records.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `limit` | integer | No | `50` | Values `<=0` become `50`. | Page size. |
| `offset` | integer | No | `0` | Parse failure becomes `0`. | Page offset. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "count": 0
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch records.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD list handler
* Service: `supax.ListGenericTable`
* DTO/Validator: raw table map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/interest-tags/:id

### Summary

Gets one `interest_tags` record by ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Record not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD get handler
* Service: `supax.GetGeneric`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/interest-tags

### Summary

Inserts one `interest_tags` record from arbitrary JSON.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "name": "Music",
  "is_active": true
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Insert body passed to Supabase. |

### Responses

#### 201 Created

Returns inserted raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to insert record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD insert handler
* Service: `supax.InsertGeneric`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PUT] /api/v1/admin/interest-tags/:id

### Summary

Patches one `interest_tags` record by ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "name": "Music"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Patch body passed to Supabase. |

### Responses

#### 200 OK

Returns patched raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD put handler
* Service: `supax.PatchGeneric`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/interest-tags/:id

### Summary

Patches one `interest_tags` record by ID. Same behavior as PUT.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "name": "Music"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Patch body passed to Supabase. |

### Responses

#### 200 OK

Returns patched raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD patch handler
* Service: `supax.PatchGeneric`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/interest-tags/:id

### Summary

Deletes one `interest_tags` record by ID using the generic delete helper.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to delete record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD delete handler
* Service: `supax.DeleteGeneric`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/interest-tags/import

### Summary

Imports interest tags from `tags` maps or normalized `items` entries.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "items": [
    {
      "display_name": "Music",
      "category": "hobbies",
      "icon": "music",
      "description": "Optional",
      "is_active": true
    }
  ]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `tags` | object[] | No | Entries with empty `name` are skipped. | Raw insert maps. |
| `items` | object[] | No | `display_name` is trimmed; empty names skipped. | Normalized import items. |
| `items[].display_name` | string | No | Required to create row from `items`. | Tag display name. |
| `items[].category` | string | No | Empty omitted. | Category. |
| `items[].icon` | string | No | Empty omitted. | Icon. |
| `items[].description` | string | No | Empty omitted. | Description. |
| `items[].is_active` | boolean | No | Defaults to true when omitted. | Active flag. |

### Responses

#### 200 OK

```json
{
  "total": 1,
  "created": 1,
  "updated": 0,
  "skipped_invalid": 0
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code; per-item insert errors are skipped.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminImportInterestTags`
* Service: `supax.InsertGeneric`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/interest-tags/:id/hard

### Summary

Hard-deletes an interest tag by ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Interest tag ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to delete interest tag.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminInterestTagHardDelete`
* Service: `supax.DeleteGeneric`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/exp-bonuses

### Summary

Lists `exp_bonuses` records using generic CRUD.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `limit` | integer | No | `50` | Values `<=0` become `50`. | Page size. |
| `offset` | integer | No | `0` | Parse failure becomes `0`. | Page offset. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "count": 0
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch records.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD list handler
* Service: `supax.ListGenericTable`
* DTO/Validator: raw table map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/exp-bonuses/:id

### Summary

Gets one `exp_bonuses` record by ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Record not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD get handler
* Service: `supax.GetGeneric`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/exp-bonuses

### Summary

Inserts one `exp_bonuses` record and reloads exp bonus config.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Insert body passed to Supabase. |

### Responses

#### 201 Created

Returns inserted raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to insert record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD insert handler
* Service: `supax.InsertGeneric`, `expbonus.Reload`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PUT] /api/v1/admin/exp-bonuses/:id

### Summary

Patches one `exp_bonuses` record and reloads exp bonus config.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Patch body passed to Supabase. |

### Responses

#### 200 OK

Returns patched raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD put handler
* Service: `supax.PatchGeneric`, `expbonus.Reload`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/exp-bonuses/:id

### Summary

Patches one `exp_bonuses` record and reloads exp bonus config. Same behavior as PUT.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Patch body passed to Supabase. |

### Responses

#### 200 OK

Returns patched raw table map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD patch handler
* Service: `supax.PatchGeneric`, `expbonus.Reload`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/exp-bonuses/:id

### Summary

Deletes one `exp_bonuses` record and reloads exp bonus config.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Record ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to delete record.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: inline generic CRUD delete handler
* Service: `supax.DeleteGeneric`, `expbonus.Reload`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## Broadcasts, Embeddings, S3, and Reports

The remaining admin endpoints are documented below with their endpoint-specific request and response behavior.

## [GET] /api/v1/admin/broadcasts

### Summary

Lists saved broadcast history.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `limit` | integer | No | `50` | Values `<=0` become `50`; values `>100` become `100`. | Page size. |
| `offset` | integer | No | `0` | Values `<0` become `0`. | Page offset. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 0,
    "totalPages": 0
  }
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch broadcasts.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminBroadcastsList`
* Service: `supax.ListBroadcastHistory`
* DTO/Validator: `supax.BroadcastHistoryRow`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/broadcasts

### Summary

Saves a broadcast message. Delivery fields are parsed but only title and message are persisted by this handler.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "title": "Title",
  "message": "Message",
  "deliveryMode": "not persisted by handler",
  "url": "not persisted by handler"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `message` | string | Yes | Must be non-empty. | Broadcast body. |
| `title` | string | No | Not found in code | Broadcast title. |
| `deliveryMode` | string | No | Parsed but not used by handler. | Delivery mode. |
| `url` | string | No | Parsed but not used by handler. | URL. |

### Responses

#### 201 Created

```json
{
  "message": "Broadcast saved",
  "sent": 0,
  "row": {}
}
```

#### 400 Bad Request

Missing `message`.

#### 401 Unauthorized

Missing actor or common admin auth error.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Actor user not found in database.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch actor or create broadcast.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminBroadcastsCreate`
* Service: `supax.InsertBroadcastHistory`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/broadcasts/ai-generate

### Summary

Generates broadcast copy with the configured AI service.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "audience": "new users",
  "key_points": "Say hello"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `audience` | string | No | Trimmed before service call. | Target audience. |
| `key_points` | string | No | Trimmed before service call. | Prompt input. |

### Responses

#### 200 OK

See `Broadcast AI Output` in `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Missing actor or common admin auth error.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

Broadcast generation already in progress, or admin rate limit.

#### 500 Internal Server Error

Not found in code.

#### 502 Bad Gateway

Broadcast AI generation failed.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminBroadcastAIGenerate`
* Service: `broadcastai.Generate`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/embeddings

### Summary

Lists `user_embeddings` rows with generic table pagination.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `limit` | integer | No | `50` | Values `<=0` become `50`. | Page size. |
| `offset` | integer | No | `0` | Parse failure becomes `0`. | Page offset. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "count": 0
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch embeddings.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminEmbeddings`
* Service: `supax.ListGenericTable`
* DTO/Validator: raw table map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/embeddings/regenerate

### Summary

Filters out deleted users and enqueues embedding regeneration jobs.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "user_ids": ["uuid"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `user_ids` | string[] | Yes | Must be non-empty. | User IDs to regenerate. |

### Responses

#### 202 Accepted

```json
{
  "enqueued": 1
}
```

#### 400 Bad Request

Missing `user_ids`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to list users. Queue partial failure is logged but still returns accepted.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminEmbeddingsRegenerate`
* Service: `supax.FilterNonDeletedUserIDs`, `jobs.EnqueueUserEmbeddingRegenerateMany`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/embeddings/sync

### Summary

Enqueues embedding regeneration jobs for valid UUID user IDs.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "user_ids": ["uuid"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `user_ids` | string[] | Yes | Must be non-empty; invalid UUIDs are skipped. | User IDs to sync. |

### Responses

#### 202 Accepted

```json
{
  "enqueued": 1
}
```

#### 400 Bad Request

Missing `user_ids`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Not found in code; per-user enqueue errors are skipped.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminEmbeddingsSync`
* Service: `jobs.EnqueueUserEmbeddingRegenerate`
* DTO/Validator: inline request struct, `uuid.Parse`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/embeddings/sync-all

### Summary

Schedules embedding regeneration for all non-deleted users.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 202 Accepted

```json
{
  "scheduled": 10
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to list users.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminEmbeddingsSyncAll`
* Service: `supax.ListAllUserIDs`, `jobs.EnqueueUserEmbeddingRegenerate`
* DTO/Validator: Not found in code
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/embeddings/compare

### Summary

Computes cosine similarity between two users' embeddings.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "user_id_a": "uuid",
  "user_id_b": "uuid"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `user_id_a` | string | Yes | Must be non-empty. | First user ID. |
| `user_id_b` | string | Yes | Must be non-empty. | Second user ID. |

### Responses

#### 200 OK

```json
{
  "user_id_a": "uuid",
  "user_id_b": "uuid",
  "similarity": 0.9
}
```

#### 400 Bad Request

Missing user IDs.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Embedding missing for one or both users.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch embeddings.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminEmbeddingsCompare`
* Service: `supax.ListUserEmbeddings`, `domainembed.CosineSimilarity`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/embeddings/similar

### Summary

Finds similar users by embedding.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "user_id": "uuid",
  "limit": 25,
  "threshold": 0.75
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `user_id` | string | Yes | Must be non-empty. | User ID. |
| `limit` | integer | No | `25` when `<=0`. | Max results. |
| `threshold` | number | No | `0` | Similarity threshold. |

### Responses

#### 200 OK

```json
{
  "results": []
}
```

#### 400 Bad Request

Missing `user_id`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to find similar users.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminEmbeddingsSimilar`
* Service: `embeddings.FindSimilar`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/s3/presign-upload

### Summary

Creates a presigned S3 upload URL for an arbitrary key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "object.png",
  "contentType": "image/png",
  "expires": 600
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | No | Helper returns error when empty. | Object key. |
| `contentType` | string | No | Not found in code | Object content type. |
| `expires` | integer | No | Defaults to `600` when `<=0`. | Expiry seconds. |

### Responses

#### 200 OK

```json
{
  "url": "https://s3.example/presigned",
  "fields": {}
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminS3PresignUpload`
* Service: `s3PresignUpload`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/s3/presign-download

### Summary

Creates a presigned S3 download URL for an arbitrary key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "object.png",
  "expires": 600
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | No | Helper returns error when empty. | Object key. |
| `expires` | integer | No | Defaults to `600` when `<=0`. | Expiry seconds. |

### Responses

#### 200 OK

```json
{
  "url": "https://s3.example/presigned"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminS3PresignDownload`
* Service: `s3PresignDownload`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/s3/delete

### Summary

Deletes one S3 object by key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "object.png"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | No | Helper returns error when empty. | Object key. |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 delete failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminS3Delete`
* Service: `s3Delete`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/s3/presigned/upload

### Summary

Creates a presigned S3 upload URL using query parameters.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `key` | string | Yes | Not found in code | Must be non-empty. | Object key. |
| `expires` | integer | No | `600` | Parse failure becomes default. | Expiry seconds. |
| `contentType` | string | No | empty | Not found in code | Object content type. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "url": "https://s3.example/presigned",
  "fields": {}
}
```

#### 400 Bad Request

Missing `key`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3PresignUploadGET`
* Service: `s3PresignUpload`
* DTO/Validator: query params
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/s3/presigned/download

### Summary

Creates a presigned S3 download URL using query parameters.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `key` | string | Yes | Not found in code | Must be non-empty. | Object key. |
| `expires` | integer | No | `600` | Parse failure becomes default. | Expiry seconds. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "url": "https://s3.example/presigned"
}
```

#### 400 Bad Request

Missing `key`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3PresignDownloadGET`
* Service: `s3PresignDownload`
* DTO/Validator: query params
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/s3/objects

### Summary

Lists S3 objects for an optional prefix.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `prefix` | string | No | empty | Not found in code | S3 key prefix. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "objects": [
    {
      "key": "object.png",
      "size": 123,
      "lastModified": "2026-06-20T00:00:00Z",
      "etag": "etag"
    }
  ]
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 list failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3ListObjects`
* Service: `s3ListObjects`
* DTO/Validator: query params
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [DELETE] /api/v1/admin/s3/objects/:key

### Summary

Deletes one S3 object using the path key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `key` | string | Yes | S3 object key. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Missing `key`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 delete failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3DeleteObject`
* Service: `s3Delete`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/s3/multipart/start

### Summary

Starts a multipart upload for an arbitrary S3 key.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "object.mp4",
  "contentType": "video/mp4"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty. | S3 object key. |
| `contentType` | string | No | Not found in code | Content type. |

### Responses

#### 200 OK

```json
{
  "uploadId": "upload_id",
  "key": "object.mp4"
}
```

#### 400 Bad Request

Missing `key`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 multipart init failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3MultipartStart`
* Service: `s3CreateMultipart`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/s3/multipart/:uploadId/part/:partNumber

### Summary

Creates a presigned upload URL for one multipart part.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `uploadId` | string | Yes | Multipart upload ID. |
| `partNumber` | integer | Yes | Multipart part number. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `key` | string | Yes | Not found in code | Must be non-empty. | S3 object key. |
| `expires` | integer | No | `3600` | Parse failure becomes default. | Expiry seconds. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "url": "https://s3.example/presigned-part"
}
```

#### 400 Bad Request

Missing key, upload ID, or valid part number.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3MultipartSignPart`
* Service: `s3PresignPart`
* DTO/Validator: path and query params
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/s3/multipart/complete

### Summary

Completes an S3 multipart upload.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "object.mp4",
  "uploadId": "upload_id",
  "parts": [
    {
      "partNumber": 1,
      "etag": "etag"
    }
  ]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty. | S3 object key. |
| `uploadId` | string | Yes | Must be non-empty. | Multipart upload ID. |
| `parts` | object[] | Yes | Must be non-empty. | Completed multipart parts. |

### Responses

#### 200 OK

```json
{
  "key": "object.mp4"
}
```

#### 400 Bad Request

Missing key, upload ID, or parts.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 complete failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3MultipartComplete`
* Service: `s3CompleteMultipart`
* DTO/Validator: inline request struct, `multipartPart`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/s3/multipart/abort

### Summary

Aborts an S3 multipart upload.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

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
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "key": "object.mp4",
  "uploadId": "upload_id"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty. | S3 object key. |
| `uploadId` | string | Yes | Must be non-empty. | Multipart upload ID. |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Missing key or upload ID.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

S3 abort failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_extra.go`
* Controller: `handleAdminS3MultipartAbort`
* Service: `s3AbortMultipart`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/reports

### Summary

Lists reports for admin review with optional filters.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| Not found in code | Not found in code | No | Not found in code |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| `limit` | integer | No | `50` | Values `<=0` become `50`. | Page size. |
| `offset` | integer | No | `0` | Parse failure becomes `0`. | Page offset. |
| `status` | string | No | empty | Not found in code | Report status filter. |
| `reporter_user_id` | string | No | empty | Not found in code | Reporter filter. |
| `reported_user_id` | string | No | empty | Not found in code | Reported user filter. |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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
  "data": [],
  "count": 0,
  "limit": 50,
  "offset": 0
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch reports.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminReportsList`
* Service: `supax.ListAdminReports`
* DTO/Validator: `supax.ReportRow`
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [GET] /api/v1/admin/reports/:id

### Summary

Returns one report by ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Report ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

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

Returns `supax.ReportRow`; see `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Report not found.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to fetch report.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminReportGet`
* Service: `supax.GetReport`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [PATCH] /api/v1/admin/reports/:id

### Summary

Patches one report by ID.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Report ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{
  "status": "resolved",
  "admin_notes": "Reviewed"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field | any | No | No validation found in route code. | Patch body passed to Supabase. |

### Responses

#### 200 OK

Returns `supax.ReportRow`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to update report.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminReportPatch`
* Service: `supax.PatchReport`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/reports/:id/ai-summary

### Summary

Enqueues forced AI summary generation for a report.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Report ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 202 Accepted

```json
{
  "queued": true
}
```

#### 400 Bad Request

Missing `id`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to enqueue AI summary job.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminReportAISummary`
* Service: `jobs.EnqueueReportAISummary`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`

## [POST] /api/v1/admin/reports/:id/ai-summary:generate

### Summary

Alias for `POST /api/v1/admin/reports/:id/ai-summary`.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: `admin` or `superadmin`

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Report ID. |

#### Query Params

| Name | Type | Required | Default | Validation | Description |
|---|---|---:|---|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code | Not found in code |

#### Headers

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

#### Body

```json
{}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Not found in code | Not found in code | No | Not found in code | Not found in code |

### Responses

#### 202 Accepted

```json
{
  "queued": true
}
```

#### 400 Bad Request

Missing `id`.

#### 401 Unauthorized

See common admin auth errors.

#### 403 Forbidden

See common admin auth errors.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

See common admin auth errors.

#### 500 Internal Server Error

Failed to enqueue AI summary job.

### Source References

* Route file: `apps/api/src/internal/transport/http/admin_routes.go`
* Controller: `handleAdminReportAISummary`
* Service: `jobs.EnqueueReportAISummary`
* DTO/Validator: path param
* Middleware/Guard: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`
