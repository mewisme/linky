# Notifications APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route file: `apps/api/src/internal/transport/http/domain_user.go`
- Services: `apps/api/src/internal/app/user`, `apps/api/src/internal/infra/supax`

## [GET] /api/v1/notifications/me

### Summary

Lists notifications for the current user.

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
| `unread_only` | boolean string | No | `false` | Only literal `"true"` enables filtering. | Return only unread notifications. |

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
  "notifications": []
}
```

Rows are `NotificationRow`; see `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch notifications.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleListNotifications`
* Service: `user.ListNotifications`
* DTO/Validator: `supax.NotificationRow`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/notifications/me/unread-count

### Summary

Returns unread notification count for the current user.

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

Failed to fetch unread count.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUnreadCount`
* Service: `user.UnreadNotificationCount`
* DTO/Validator: Not found in code
* Middleware/Guard: `middleware.Clerk()`

## [PATCH] /api/v1/notifications/:id/read

### Summary

Marks one notification as read for the current user.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Notification ID. |

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

Missing `id`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to mark notification as read.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleMarkRead`
* Service: `user.MarkNotificationRead`
* DTO/Validator: path param check
* Middleware/Guard: `middleware.Clerk()`

## [PATCH] /api/v1/notifications/read-all

### Summary

Marks all unread notifications as read for the current user.

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

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to mark all notifications as read.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleMarkAllRead`
* Service: `user.MarkAllNotificationsRead`
* DTO/Validator: Not found in code
* Middleware/Guard: `middleware.Clerk()`
