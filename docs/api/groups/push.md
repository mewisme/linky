# Push APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route file: `apps/api/src/internal/transport/http/domain_push.go`
- Services: `apps/api/src/internal/infra/supax`, `apps/api/src/internal/lib/pushendpoint`

## [POST] /api/v1/push/subscribe

### Summary

Creates or updates the current user's web push subscription.

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
  "subscription": {
    "endpoint": "https://push.example/sub",
    "keys": {
      "p256dh": "key",
      "auth": "secret"
    }
  }
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `subscription.endpoint` | string | Yes | Must be non-empty and allowed by `pushendpoint.IsAllowed`. | Push endpoint URL. |
| `subscription.keys.p256dh` | string | Yes | Must be non-empty. | Push public key. |
| `subscription.keys.auth` | string | Yes | Must be non-empty. | Push auth secret. |

### Responses

#### 201 Created

Returns `PushSubscriptionRow`; see `../api-types.md`.

#### 400 Bad Request

Missing or invalid subscription.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to subscribe to push notifications.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_push.go`
* Controller: inline handler in `registerPushRoutes`
* Service: `supax.UpsertPushSubscription`
* DTO/Validator: `subscribeBody`, `pushendpoint.IsAllowed`
* Middleware/Guard: `middleware.Clerk()`

## [DELETE] /api/v1/push/unsubscribe

### Summary

Deletes a push subscription endpoint for the current user.

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
  "endpoint": "https://push.example/sub"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `endpoint` | string | Yes | Trimmed value must be non-empty and allowed by `pushendpoint.IsAllowed`. | Push endpoint URL. |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Missing or invalid endpoint.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to unsubscribe from push notifications.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_push.go`
* Controller: inline handler in `registerPushRoutes`
* Service: `supax.DeletePushSubscription`
* DTO/Validator: inline request struct, `pushendpoint.IsAllowed`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/push/vapid-public-key

### Summary

Returns the configured VAPID public key.

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
  "publicKey": "vapid-public-key"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

Not found in code.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

#### 503 Service Unavailable

Push notifications are not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_push.go`
* Controller: inline handler in `registerPushRoutes`
* Service: `config.Config.VAPIDPublicKey`
* DTO/Validator: Not found in code
* Middleware/Guard: `middleware.Clerk()`
