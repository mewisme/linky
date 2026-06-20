# Me S3 APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route file: `apps/api/src/internal/transport/http/s3_routes.go`
- Services: AWS S3 helpers in the same route file

## [POST] /api/v1/me/s3/presign-upload

### Summary

Creates a presigned upload URL scoped under `users/{clerk_user_id}/`.

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
  "key": "avatar.png",
  "contentType": "image/png",
  "expires": 600
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty; `..` is replaced during sanitization. | User-relative object key. |
| `contentType` | string | No | Not found in code | Object content type. |
| `expires` | integer or numeric string | No | Defaults to `600` inside helper if `<=0`. | Presign expiry seconds. |

### Responses

#### 200 OK

```json
{
  "url": "https://s3.example/presigned",
  "fields": {
    "Content-Type": "image/png"
  },
  "key": "users/user_x/avatar.png"
}
```

#### 400 Bad Request

Missing `key` or invalid body binding.

#### 401 Unauthorized

Missing authenticated Clerk user ID or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

Not found in code.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/s3_routes.go`
* Controller: `handleMyPresignUpload`
* Service: `s3PresignUpload`
* DTO/Validator: `readBody`, `userKeyPrefix`, `sanitizeKey`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/me/s3/multipart/initiate

### Summary

Starts a multipart upload scoped under `users/{clerk_user_id}/`.

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
  "key": "video.mp4",
  "contentType": "video/mp4"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty. | User-relative object key. |
| `contentType` | string | No | Not found in code | Object content type. |

### Responses

#### 200 OK

```json
{
  "uploadId": "upload_id",
  "key": "users/user_x/video.mp4"
}
```

#### 400 Bad Request

Missing `key` or invalid body binding.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

Not found in code.

#### 500 Internal Server Error

S3 multipart init failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/s3_routes.go`
* Controller: `handleMultipartInitiate`
* Service: `s3CreateMultipart`
* DTO/Validator: `readBody`, `userKeyPrefix`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/me/s3/multipart/sign-part

### Summary

Creates a presigned URL for one multipart upload part.

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
  "key": "users/user_x/video.mp4",
  "uploadId": "upload_id",
  "partNumber": 1,
  "expires": 3600
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | Yes | Must be non-empty and start with `users/`. | Scoped object key. |
| `uploadId` | string | Yes | Must be non-empty. | Multipart upload ID. |
| `partNumber` | integer or numeric string | Yes | Must be `>0`. | Part number. |
| `expires` | integer or numeric string | No | Defaults to `3600` inside helper if `<=0`. | Presign expiry seconds. |

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

Clerk middleware failure.

#### 403 Forbidden

Key does not start with `users/`.

#### 404 Not Found

Not found in code.

#### 500 Internal Server Error

S3 presign failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/s3_routes.go`
* Controller: `handleMultipartSignPart`
* Service: `s3PresignPart`
* DTO/Validator: `readBody`, `atoiAny`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/me/s3/multipart/complete

### Summary

Completes a multipart upload.

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
  "key": "users/user_x/video.mp4",
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
| `key` | string | Yes | Must be non-empty. | Object key. |
| `uploadId` | string | Yes | Must be non-empty. | Multipart upload ID. |
| `parts` | array | Yes | Must be non-empty. Items accept `etag` or `ETag`. | Completed parts. |
| `parts[].partNumber` | integer | Yes | Not found in code | Part number. |
| `parts[].etag` | string | Yes | Not found in code | Part ETag. |

### Responses

#### 200 OK

```json
{
  "key": "users/user_x/video.mp4"
}
```

#### 400 Bad Request

Missing key, upload ID, or parts.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

Not found in code.

#### 500 Internal Server Error

S3 complete failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/s3_routes.go`
* Controller: `handleMultipartComplete`
* Service: `s3CompleteMultipart`
* DTO/Validator: `multipartPart`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/me/s3/multipart/abort

### Summary

Aborts a multipart upload.

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
  "key": "users/user_x/video.mp4",
  "uploadId": "upload_id"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `key` | string | No | No explicit required check in handler. | Object key. |
| `uploadId` | string | No | No explicit required check in handler. | Multipart upload ID. |

### Responses

#### 204 No Content

Empty response body.

#### 400 Bad Request

Invalid body binding.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

Not found in code.

#### 500 Internal Server Error

S3 abort failure.

### Source References

* Route file: `apps/api/src/internal/transport/http/s3_routes.go`
* Controller: `handleMultipartAbort`
* Service: `s3AbortMultipart`
* DTO/Validator: `readBody`
* Middleware/Guard: `middleware.Clerk()`
