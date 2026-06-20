# Call History APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route files: `apps/api/src/internal/transport/http/domain_user.go`, `apps/api/src/internal/transport/http/domain_user_extra.go`
- Services: `apps/api/src/internal/app/videochat`, `apps/api/src/internal/infra/supax/calls_repo.go`

## [GET] /api/v1/call-history

### Summary

Lists call history for the current user.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user

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
  "count": 0,
  "limit": 50,
  "offset": 0
}
```

Rows are enriched call history objects; see `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch call history.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleListCallHistory`
* Service: `videochat.ListCallHistory`
* DTO/Validator: `supax.CallHistoryRow`, `videochat.EnrichedCall`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/call-history/:id

### Summary

Returns one call history item if it belongs to the current user.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Call history record ID. |

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

Returns one call history row; see `../api-types.md`.

#### 400 Bad Request

Missing `id`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

The record exists but does not belong to the current user.

#### 404 Not Found

User or call history record not found.

#### 500 Internal Server Error

Failed to fetch call history.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleGetCallHistoryItem`
* Service: `videochat.GetCallHistoryItem`
* DTO/Validator: path param check
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/call-history

### Summary

Creates a call history record for a call involving the current user.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user

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
  "caller_id": "uuid",
  "callee_id": "uuid",
  "started_at": "2026-06-20T00:00:00Z",
  "ended_at": "2026-06-20T00:05:00Z",
  "duration_seconds": 300
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `caller_id` | string | Yes | Must be non-empty. Either caller or callee must be current user. | Caller internal user ID. |
| `callee_id` | string | Yes | Must be non-empty. Either caller or callee must be current user. | Callee internal user ID. |
| `started_at` | string | No | RFC3339 if supplied; invalid value silently falls back to current time. | Start time. |
| `ended_at` | string | No | RFC3339 if supplied; invalid value ignored. | End time. |
| `duration_seconds` | integer | No | Not found in code | Duration seconds. |

### Responses

#### 201 Created

Returns `supax.CallHistoryRow`; see `../api-types.md`.

#### 400 Bad Request

Missing `caller_id` or `callee_id`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Neither `caller_id` nor `callee_id` is the current user.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to create call history.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleCreateCallHistory`
* Service: `supax.CreateCallHistory`
* DTO/Validator: inline request struct, `supax.CreateCallHistoryParams`
* Middleware/Guard: `middleware.Clerk()`
