# Reports APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
- Services: `apps/api/src/internal/app/report`, `apps/api/src/internal/infra/supax`

## [GET] /api/v1/reports

### Summary

Lists reports created by the current user.

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
| `limit` | integer | No | `20` | Values `<=0` become `20`. | Page size. |
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

Rows are `supax.ReportRow`; see `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch reports.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleListReports`
* Service: `supax.ListReports`
* DTO/Validator: `supax.ReportRow`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/reports/me

### Summary

Alias for `GET /api/v1/reports`; lists reports created by the current user.

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
| `limit` | integer | No | `20` | Values `<=0` become `20`. | Page size. |
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

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch reports.

### Source References

* Route file: `apps/api/src/internal/transport/http/api_routes.go`
* Controller: `handleListReports`
* Service: `supax.ListReports`
* DTO/Validator: `supax.ReportRow`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/reports

### Summary

Creates a report against another user and enqueues post-create report handling.

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
  "reported_user_id": "uuid",
  "reason": "harassment",
  "description": "Optional description",
  "metadata": {
    "call_id": "uuid"
  }
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `reported_user_id` | string | Yes | Must be non-empty and cannot equal current internal user ID. | Report target. |
| `reason` | string | Yes | Must be non-empty. | Report reason. |
| `description` | string | No | Parsed but not written by handler code. | Description. |
| `metadata` | object | No | `call_id`, `room_id`, and `behavior_flags` may be copied into report context. | Extra report context. |

### Responses

#### 201 Created

Returns `supax.ReportRow`; status is set to `pending` by handler.

#### 400 Bad Request

Missing target, missing reason, or self-report.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to create report.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleCreateReport`
* Service: `supax.CreateReport`, `supax.CreateReportContext`, `report.OnReportCreated`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`
