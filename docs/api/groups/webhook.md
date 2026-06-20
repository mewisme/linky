# Webhook APIs

Source references:

- Route file: `apps/api/src/internal/transport/http/webhook.go`
- Server registration: `apps/api/src/internal/server/server.go`
- Service: `apps/api/src/internal/app/clerkwebhook`

## [POST] /webhook/clerk

### Summary

Receives Clerk webhook deliveries, optionally verifies Svix signatures when `CLERK_WEBHOOK_SECRET` is configured, then processes the delivery.

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
| `svix-id` | Yes | Clerk/Svix delivery ID. |
| `svix-timestamp` | Yes | Clerk/Svix timestamp. |
| `svix-signature` | Yes | Clerk/Svix signature. |
| `X-Request-ID` | No | Global middleware reads this or generates one. |

#### Body

```json
{
  "type": "user.created",
  "data": {}
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any JSON field | object | Not found in code | Body must be valid JSON object; exact event schema is not validated in route code. | Passed as `map[string]interface{}` to `clerkwebhook.ProcessDelivery`. |

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "Webhook processed",
  "userMessage": {
    "code": "WEBHOOK_OK",
    "i18n": {
      "key": "api.webhookProcessed"
    },
    "fallbackMessage": "Webhook processed"
  }
}
```

#### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Missing svix headers",
  "userMessage": {
    "code": "MISSING_SVIX",
    "i18n": {
      "key": "api.missingSvixHeaders"
    },
    "fallbackMessage": "Missing svix headers"
  }
}
```

Also returned for body read failure, JSON parse failure, or Svix verification failure.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

See global route-not-found format in `../api-errors.md`.

#### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to process webhook",
  "userMessage": {
    "code": "FAILED_PROCESS_WEBHOOK",
    "i18n": {
      "key": "api.failedProcessWebhook"
    },
    "fallbackMessage": "Failed to process webhook"
  }
}
```

### Source References

* Route file: `apps/api/src/internal/transport/http/webhook.go`
* Controller: inline handler in `RegisterWebhook`
* Service: `clerkwebhook.ProcessDelivery`
* DTO/Validator: Svix header check and optional `svix.NewWebhook(...).Verify(...)`
* Middleware/Guard: global middleware plus `middleware.RateLimit(cfg)` on `/webhook`
