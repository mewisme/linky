# Video Chat APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route files: `apps/api/src/internal/transport/http/api_routes.go`, `apps/api/src/internal/transport/http/realtime_routes.go`
- Services: `apps/api/src/internal/app/videochat/realtime`, `apps/api/src/internal/domain/rooms`, `apps/api/src/internal/infra/cloudflarerealtime`

## [POST] /api/v1/video-chat/end-call-unload

### Summary

Processes best-effort call cleanup from an unload event for a socket owned by the current Clerk user.

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
  "socketId": "socket_id"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `socketId` | string | Yes | Must be non-empty. | Socket ID to clean up. |

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "End-call processed",
  "userMessage": {
    "code": "API_END_CALL_OK",
    "i18n": {
      "key": "api.endCallProcessed"
    },
    "fallbackMessage": "End-call processed"
  }
}
```

#### 400 Bad Request

Missing `socketId`.

#### 401 Unauthorized

Missing Clerk user ID or Clerk middleware failure.

#### 403 Forbidden

Socket does not belong to caller.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

Uses `CustomRateLimit(10000, 5, true)`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

#### 503 Service Unavailable

Video chat cleanup service unavailable.

### Source References

* Route file: `apps/api/src/internal/transport/http/api_routes.go`
* Controller: `handleEndCallUnload`
* Service: `EndCallUnloadHandler`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`, `middleware.CustomRateLimit(10000, 5, true)`

## [POST] /api/v1/video-chat/realtime/session

### Summary

Ensures a Cloudflare Realtime session for a room participant and returns session ID plus peer snapshot.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user authorized for the room/socket.

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
  "roomId": "room_id",
  "socketId": "socket_id"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `roomId` | string | Yes | Must be non-empty. | Video room ID. |
| `socketId` | string | Yes | Must be non-empty. | Participant socket ID. |

### Responses

#### 200 OK

```json
{
  "sessionId": "session_id",
  "peer": {}
}
```

Peer shape is in `../api-types.md`.

#### 400 Bad Request

Invalid JSON or missing `roomId`/`socketId`.

#### 401 Unauthorized

Missing Clerk user ID or Clerk middleware failure.

#### 403 Forbidden

Authorization failure from realtime service.

#### 404 Not Found

May be returned by realtime authorization/upstream errors; exact condition depends on service.

#### 429 Too Many Requests

Uses `CustomRateLimit(10000, 30, false)`.

#### 500 Internal Server Error

Realtime internal or authorization error.

#### 503 Service Unavailable

Realtime context or Cloudflare Realtime not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/realtime_routes.go`
* Controller: `handleRealtimeSession`
* Service: `realtimeCtx.SFU.EnsureSession`
* DTO/Validator: `baseRealtimeBody`
* Middleware/Guard: `middleware.Clerk()`, `middleware.CustomRateLimit(10000, 30, false)`

## [POST] /api/v1/video-chat/realtime/publish

### Summary

Publishes local media tracks to Cloudflare Realtime.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user authorized for the room/socket.

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
  "roomId": "room_id",
  "socketId": "socket_id",
  "sessionId": "session_id",
  "sdp": {
    "sdp": "v=0...",
    "type": "offer"
  },
  "tracks": [
    {
      "mid": "0",
      "trackName": "camera",
      "kind": "video"
    }
  ]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `roomId` | string | Yes | Must be non-empty. | Video room ID. |
| `socketId` | string | Yes | Must be non-empty. | Participant socket ID. |
| `sessionId` | string | Yes | Must be non-empty. | Realtime session ID. |
| `sdp` | object | Yes | Must be non-null. | SDP description. |
| `tracks` | array | Yes | At least one valid track after filtering. | Tracks to publish. |
| `tracks[].mid` | string | Yes | Must be non-empty for track to be accepted. | MID. |
| `tracks[].trackName` | string | Yes | Must be non-empty for track to be accepted. | Track name. |
| `tracks[].kind` | string | Yes | Must be `audio` or `video` for track to be accepted. | Track kind. |

### Responses

#### 200 OK

```json
{
  "sessionDescription": {},
  "tracks": [],
  "requiresImmediateRenegotiation": false
}
```

#### 400 Bad Request

Invalid JSON, missing session/SDP, or invalid tracks.

#### 401 Unauthorized

Missing Clerk user ID or Clerk middleware failure.

#### 403 Forbidden

Authorization failure from realtime service.

#### 404 Not Found

May be returned by realtime authorization/upstream errors.

#### 425 Too Early

Realtime session not ready; includes `retryable: true`.

#### 429 Too Many Requests

Uses `CustomRateLimit(10000, 30, false)`.

#### 500 Internal Server Error

Realtime internal error.

#### 503 Service Unavailable

Realtime context or Cloudflare Realtime not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/realtime_routes.go`
* Controller: `handleRealtimePublish`
* Service: `realtimeCtx.SFU.Publish`
* DTO/Validator: `publishRealtimeBody`, `publishTrack`
* Middleware/Guard: `middleware.Clerk()`, `middleware.CustomRateLimit(10000, 30, false)`

## [POST] /api/v1/video-chat/realtime/subscribe

### Summary

Subscribes the participant session to remote tracks.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user authorized for the room/socket.

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
  "roomId": "room_id",
  "socketId": "socket_id",
  "sessionId": "session_id"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `roomId` | string | Yes | Must be non-empty. | Video room ID. |
| `socketId` | string | Yes | Must be non-empty. | Participant socket ID. |
| `sessionId` | string | Yes | Must be non-empty. | Realtime session ID. |

### Responses

#### 200 OK

```json
{
  "sessionDescription": {},
  "tracks": [],
  "requiresImmediateRenegotiation": false
}
```

#### 400 Bad Request

Invalid JSON or missing `sessionId`.

#### 401 Unauthorized

Missing Clerk user ID or Clerk middleware failure.

#### 403 Forbidden

Authorization failure from realtime service.

#### 404 Not Found

May be returned by realtime authorization/upstream errors.

#### 425 Too Early

Realtime session not ready.

#### 429 Too Many Requests

Uses `CustomRateLimit(10000, 30, false)`.

#### 500 Internal Server Error

Realtime internal error.

#### 503 Service Unavailable

Realtime context or Cloudflare Realtime not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/realtime_routes.go`
* Controller: `handleRealtimeSubscribe`
* Service: `realtimeCtx.SFU.Subscribe`
* DTO/Validator: `sessionRealtimeBody`
* Middleware/Guard: `middleware.Clerk()`, `middleware.CustomRateLimit(10000, 30, false)`

## [PUT] /api/v1/video-chat/realtime/renegotiate

### Summary

Renegotiates an existing Cloudflare Realtime session.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user authorized for the room/socket.

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
  "roomId": "room_id",
  "socketId": "socket_id",
  "sessionId": "session_id",
  "sdp": {
    "sdp": "v=0...",
    "type": "offer"
  }
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `roomId` | string | Yes | Must be non-empty. | Video room ID. |
| `socketId` | string | Yes | Must be non-empty. | Participant socket ID. |
| `sessionId` | string | Yes | Must be non-empty. | Realtime session ID. |
| `sdp` | object | Yes | Must be non-null. | SDP description. |

### Responses

#### 200 OK

```json
{
  "ok": true
}
```

May include `errorCode` and `errorDescription` when returned by upstream response.

#### 400 Bad Request

Invalid JSON or missing session/SDP.

#### 401 Unauthorized

Missing Clerk user ID or Clerk middleware failure.

#### 403 Forbidden

Authorization failure from realtime service.

#### 404 Not Found

May be returned by realtime authorization/upstream errors.

#### 425 Too Early

Realtime session not ready.

#### 429 Too Many Requests

Uses `CustomRateLimit(10000, 30, false)`.

#### 500 Internal Server Error

Realtime internal error.

#### 503 Service Unavailable

Realtime context or Cloudflare Realtime not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/realtime_routes.go`
* Controller: `handleRealtimeRenegotiate`
* Service: `realtimeCtx.SFU.Renegotiate`
* DTO/Validator: `sessionRealtimeBody`
* Middleware/Guard: `middleware.Clerk()`, `middleware.CustomRateLimit(10000, 30, false)`

## [POST] /api/v1/video-chat/realtime/cleanup

### Summary

Cleans up realtime participant state for a room/socket. If the room is missing, returns success.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user. This handler does not call `authorizeRealtime`.

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
  "roomId": "room_id",
  "socketId": "socket_id"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `roomId` | string | Yes | Must be non-empty. | Video room ID. |
| `socketId` | string | Yes | Must be non-empty. | Participant socket ID. |

### Responses

#### 200 OK

```json
{
  "ok": true
}
```

#### 400 Bad Request

Invalid JSON or missing `roomId`/`socketId`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

Not found in code.

#### 429 Too Many Requests

Uses `CustomRateLimit(10000, 30, false)`.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

#### 503 Service Unavailable

Realtime context or Cloudflare Realtime not configured.

### Source References

* Route file: `apps/api/src/internal/transport/http/realtime_routes.go`
* Controller: `handleRealtimeCleanup`
* Service: `realtimeCtx.SFU.CleanupParticipant`
* DTO/Validator: `baseRealtimeBody`
* Middleware/Guard: `middleware.Clerk()`, `middleware.CustomRateLimit(10000, 30, false)`
