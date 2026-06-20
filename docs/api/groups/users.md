# Users APIs

All endpoints in this file are mounted under `/api/v1` with `middleware.Clerk()`.

Common source references:

- Route files: `apps/api/src/internal/transport/http/domain_user.go`, `apps/api/src/internal/transport/http/domain_user_extra.go`
- Services: `apps/api/src/internal/app/user`, `apps/api/src/internal/infra/supax`
- Auth middleware: `apps/api/src/internal/transport/http/middleware/clerk.go`

## [GET] /api/v1/users/me

### Summary

Returns the current user row by Clerk subject. Also reads Cloudflare country headers and passes them to user lookup.

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
| `cf-ipcountry` | No | Passed to `user.GetMe` when present. |
| `x-cf-ipcountry` | No | Fallback country header. |

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
  "clerk_user_id": "user_x",
  "email": "person@example.com",
  "first_name": "A",
  "last_name": "B",
  "avatar_url": null,
  "role": "member",
  "country": "US",
  "deleted": false,
  "deleted_at": null,
  "created_at": "2026-06-20T00:00:00Z",
  "updated_at": "2026-06-20T00:00:00Z"
}
```

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Returned by Clerk middleware or when user ID is missing from token. See `../api-errors.md`.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch user data.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUserMe`
* Service: `user.GetMe`
* DTO/Validator: `supax.UserRow`
* Middleware/Guard: `middleware.Clerk()`

## [PATCH] /api/v1/users/me/country

### Summary

Updates a user's country using a Clerk user ID supplied in the body.

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
  "clerk_user_id": "user_x",
  "country": "US"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `clerk_user_id` | string | Yes | Must be non-empty. | Clerk user ID to update. |
| `country` | string | Yes | Must be non-empty. | Country value. |

### Responses

#### 200 OK

Returns `supax.UserRow`.

#### 400 Bad Request

`country` missing.

#### 401 Unauthorized

`clerk_user_id` missing or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to update user country.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUpdateMeCountry`
* Service: `user.UpdateCountry`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [PATCH] /api/v1/users/timezone

### Summary

Validates that a timezone string is non-empty and returns it. No persistence call is found in this handler.

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
  "timezone": "Asia/Bangkok"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `timezone` | string | Yes | Trimmed value must be non-empty. Error message says valid IANA timezone, but code does not validate IANA names. | Timezone string. |

### Responses

#### 200 OK

```json
{
  "timezone": "Asia/Bangkok"
}
```

#### 400 Bad Request

Timezone missing or empty.

#### 401 Unauthorized

Clerk middleware failure or missing user ID in token.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

See global HTTP error handler in `../api-errors.md`.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUpdateTimezone`
* Service: `user.InternalIDFromClerk`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/level/me

### Summary

Returns current user level and experience progress.

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

See `User Level` in `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User or user level not found.

#### 500 Internal Server Error

Failed to fetch user level.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUserLevelMe`
* Service: `user.GetUserLevelData`
* DTO/Validator: `user.UserLevelData`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/streak/me

### Summary

Returns current user streak data.

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

See `User Streak` in `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User or user streak not found.

#### 500 Internal Server Error

Failed to fetch user streak.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUserStreakMe`
* Service: `user.GetUserStreakData`
* DTO/Validator: `user.UserStreakData`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/streak/me/history

### Summary

Lists streak day history for the current user.

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
| `limit` | integer | No | `50` | Must be `<= 100` when supplied. Values `<=0` become `50`. | Page size. |
| `offset` | integer | No | `0` | Must be non-negative. | Page offset. |

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
      "id": "uuid",
      "userId": "uuid",
      "date": "2026-06-20",
      "totalCallSeconds": 300,
      "isValid": true,
      "createdAt": "2026-06-20T00:00:00Z"
    }
  ],
  "count": 1
}
```

#### 400 Bad Request

Limit greater than 100 or negative offset.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch user streak history.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleStreakHistory`
* Service: `supax.GetUserStreakDays`
* DTO/Validator: mapped `supax.UserStreakDayRow`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/streak/calendar

### Summary

Returns streak calendar rows for a required year and month.

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
| `year` | integer | Yes | Not found in code | Must parse to non-zero integer. | Calendar year. |
| `month` | integer | Yes | Not found in code | Must parse to integer from 1 through 12. | Calendar month. |

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
[
  {
    "date": "2026-06-20",
    "isValid": true,
    "totalCallSeconds": 300,
    "isToday": true
  }
]
```

#### 400 Bad Request

Missing or invalid `year` or `month`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch user streak calendar.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleStreakCalendar`
* Service: `supax.GetUserStreakDaysByMonth`
* DTO/Validator: mapped streak calendar objects
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/progress/me

### Summary

Returns progress insights for the current user.

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

See `Progress Insights` in `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User or progress data not found.

#### 500 Internal Server Error

Failed to fetch user progress.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleUserProgressMe`
* Service: `user.GetProgressInsights`
* DTO/Validator: `progress.Insights`
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/blocks/me

### Summary

Lists users blocked by the current user.

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
  "blocked_users": []
}
```

`blocked_users` row shape is inferred from Supabase join map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch blocked users.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleBlocksMe`
* Service: `user.ListBlocks`
* DTO/Validator: Supabase map rows, exact fields not found in route code
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/users/blocks

### Summary

Blocks another user for the current user.

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
  "blocked_user_id": "uuid"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `blocked_user_id` | string | Yes | Must be non-empty and cannot equal current internal user ID. | User to block. |

### Responses

#### 201 Created

```json
{
  "id": "uuid",
  "blocker_user_id": "uuid",
  "blocked_user_id": "uuid"
}
```

Response shape is inferred from Supabase insert map.

#### 400 Bad Request

Missing target, self-block, or duplicate/validation error.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to block user.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleCreateBlock`
* Service: `user.CreateBlock`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [DELETE] /api/v1/users/blocks/:blocked_user_id

### Summary

Removes a block for the current user.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `blocked_user_id` | string | Yes | User to unblock. |

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

Missing `blocked_user_id`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found or target is not blocked.

#### 500 Internal Server Error

Failed to unblock user.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user.go`
* Controller: `handleDeleteBlock`
* Service: `user.DeleteBlock`
* DTO/Validator: path param check
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/details/me

### Summary

Returns expanded user details with interest tags for the current user.

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

Returns `user_details_expanded` as `map[string]any`; exact expanded fields are not found in code.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Missing user ID in token or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User or details not found.

#### 500 Internal Server Error

Failed to fetch user details.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserDetailsGet`
* Service: `supax.GetUserDetailsWithTags`
* DTO/Validator: expanded map, exact fields not found in code
* Middleware/Guard: `middleware.Clerk()`

## [PUT] /api/v1/users/details/me

### Summary

Upserts current user details. Removes `user_id` from the body before writing.

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
  "bio": "Hello",
  "date_of_birth": "2000-01-01",
  "languages": ["en"],
  "interest_tags": ["tag_id"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `interest_tags` | string[] | No | Must be array; IDs must exist and be active. | Interest tag IDs. |
| `date_of_birth` | string | No | Must parse as `YYYY-MM-DD` or RFC3339 and cannot be in the future. | Date of birth. |
| `bio` | string | No | Plain text only; sanitized; max 300 characters; empty becomes `null`. | Profile bio. |
| `languages` | string[] | No | Must be array; each string must not contain dangerous markup; sanitized; empty becomes `null`. | Languages. |
| Any other field | any | No | Not found in code | Passed through to Supabase. |

### Responses

#### 200 OK

Returns expanded user details map from `supax.GetUserDetailsWithTags`.

#### 400 Bad Request

Invalid `interest_tags`, `date_of_birth`, `bio`, or `languages`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to update user details or validate tags.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserDetailsPut`
* Service: `supax.UpsertUserDetails`, `supax.GetUserDetailsWithTags`
* DTO/Validator: `validateAndApplyDetails`
* Middleware/Guard: `middleware.Clerk()`

## [PATCH] /api/v1/users/details/me

### Summary

Same implementation and behavior as `PUT /api/v1/users/details/me`.

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
  "bio": "Hello"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Same as PUT body | any | No | Same as PUT body validation. | Same as PUT body. |

### Responses

#### 200 OK

Returns expanded user details map.

#### 400 Bad Request

Same as PUT.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Same as PUT.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserDetailsPatch`
* Service: `handleUserDetailsPut`
* DTO/Validator: `validateAndApplyDetails`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/users/details/me/interest-tags

### Summary

Adds interest tag IDs to the current user's details.

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
  "tagIds": ["tag_id"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `tagIds` | string[] | Yes | Must be non-empty; each ID must exist and be active. | Tags to add. |

### Responses

#### 200 OK

Returns expanded user details map.

#### 400 Bad Request

Missing or invalid `tagIds`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch details, validate tags, or mutate tags.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleAddInterestTags`
* Service: `mutateInterestTags`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [DELETE] /api/v1/users/details/me/interest-tags

### Summary

Removes interest tag IDs from the current user's details.

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
  "tagIds": ["tag_id"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `tagIds` | string[] | Yes | Must be non-empty. Active-tag validation is not applied for remove mode. | Tags to remove. |

### Responses

#### 200 OK

Returns expanded user details map.

#### 400 Bad Request

Missing `tagIds`.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch details or mutate tags.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleRemoveInterestTags`
* Service: `mutateInterestTags`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [PUT] /api/v1/users/details/me/interest-tags

### Summary

Replaces the current user's interest tag list.

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
  "tagIds": ["tag_id"]
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `tagIds` | string[] | Yes | Must be an array; IDs must exist and be active when non-empty. Duplicates are removed. | Replacement tag list. |

### Responses

#### 200 OK

Returns expanded user details map.

#### 400 Bad Request

Missing non-array `tagIds` or invalid tag IDs.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch details, validate tags, or mutate tags.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleReplaceInterestTags`
* Service: `mutateInterestTags`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [DELETE] /api/v1/users/details/me/interest-tags/all

### Summary

Clears all interest tags for the current user.

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

Returns expanded user details map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to clear interest tags.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleClearInterestTags`
* Service: `supax.UpsertUserDetails`
* DTO/Validator: Not found in code
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/settings/me

### Summary

Returns user settings for the current user.

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

See `User Settings` in `../api-types.md`; exact fields beyond row map are not found in code.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User or settings not found.

#### 500 Internal Server Error

Failed to fetch user settings.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserSettingsGet`
* Service: `supax.GetUserSettings`
* DTO/Validator: map from `user_settings`
* Middleware/Guard: `middleware.Clerk()`

## [PUT] /api/v1/users/settings/me

### Summary

Upserts user settings for the current user. Removes `user_id` before writing.

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
  "theme": "dark",
  "language": "en",
  "settings": {}
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field except `user_id` | any | No | No validation found in route code. | Passed to `supax.UpsertUserSettings`. |

### Responses

#### 200 OK

Returns updated user settings map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to update user settings.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserSettingsPut`
* Service: `supax.UpsertUserSettings`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`

## [PATCH] /api/v1/users/settings/me

### Summary

Same implementation and behavior as `PUT /api/v1/users/settings/me`.

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
  "theme": "dark"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| Any field except `user_id` | any | No | No validation found in route code. | Passed to `supax.UpsertUserSettings`. |

### Responses

#### 200 OK

Returns updated user settings map.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to update user settings.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserSettingsPut`
* Service: `supax.UpsertUserSettings`
* DTO/Validator: raw body map
* Middleware/Guard: `middleware.Clerk()`

## [GET] /api/v1/users/profile/me

### Summary

Returns aggregate profile data for the current Clerk user.

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

See `User Profile Aggregate` in `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Missing user ID in token or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch user profile.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleUserProfileGet`
* Service: `supax.GetUserProfileAggregate`
* DTO/Validator: aggregate map
* Middleware/Guard: `middleware.Clerk()`
