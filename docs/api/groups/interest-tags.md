# Interest Tags APIs

Source references:

- Route file: `apps/api/src/internal/transport/http/public_misc.go`
- Row type: `apps/api/src/internal/infra/supax/repositories.go`

## [GET] /api/v1/interest-tags

### Summary

Lists active interest tags with optional category/search filtering and pagination.

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
| `category` | string | No | empty | Not found in code | Filter by category. |
| `search` | string | No | empty | Not found in code | Searches name or description. |
| `limit` | integer | No | `100` | If `0` or `>200`, reset to `100`. | Page size. |
| `offset` | integer | No | `0` | Parse failure becomes `0`. | Page offset. |

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
  "data": [
    {
      "id": "uuid",
      "name": "Music",
      "description": "Optional text",
      "icon": "music",
      "category": "hobbies",
      "is_active": true,
      "created_at": "2026-06-20T00:00:00Z",
      "updated_at": "2026-06-20T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1,
    "totalPages": 1
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

```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch interest tags",
  "userMessage": {
    "code": "FAILED_FETCH_INTEREST_TAGS",
    "i18n": {
      "key": "api.failedFetchInterestTags"
    },
    "fallbackMessage": "Failed to fetch interest tags"
  }
}
```

### Source References

* Route file: `apps/api/src/internal/transport/http/public_misc.go`
* Controller: inline handler in `RegisterInterestTagsPublic`
* Service: `supax.GetInterestTags`
* DTO/Validator: `supax.InterestTagRow`
* Middleware/Guard: global middleware only

## [GET] /api/v1/interest-tags/:id

### Summary

Returns one active interest tag by ID.

### Authentication

* Required: No
* JWT Required: No
* Roles/Permissions: Not found in code

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
  "id": "uuid",
  "name": "Music",
  "description": "Optional text",
  "icon": "music",
  "category": "hobbies",
  "is_active": true,
  "created_at": "2026-06-20T00:00:00Z",
  "updated_at": "2026-06-20T00:00:00Z"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Not found in code.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Interest tag not found",
  "userMessage": {
    "code": "INTEREST_TAG_NOT_FOUND",
    "i18n": {
      "key": "api.interestTagNotFound"
    },
    "fallbackMessage": "Interest tag not found"
  }
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch interest tag",
  "userMessage": {
    "code": "FAILED_FETCH_INTEREST_TAG",
    "i18n": {
      "key": "api.failedFetchInterestTag"
    },
    "fallbackMessage": "Failed to fetch interest tag"
  }
}
```

### Source References

* Route file: `apps/api/src/internal/transport/http/public_misc.go`
* Controller: inline handler in `RegisterInterestTagsPublic`
* Service: `supax.GetInterestTagByID`
* DTO/Validator: `supax.InterestTagRow`
* Middleware/Guard: global middleware only
