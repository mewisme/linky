# Favorites APIs

All endpoints require Clerk JWT through `middleware.Clerk()`.

Source references:

- Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
- Services: `apps/api/src/internal/infra/supax/favorites`

## [GET] /api/v1/favorites

### Summary

Lists the current user's favorites with stats.

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
  "data": [],
  "count": 0
}
```

Rows are favorite-with-stats objects; see `../api-types.md`.

#### 400 Bad Request

Not found in code.

#### 401 Unauthorized

Missing user ID in token or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 500 Internal Server Error

Failed to fetch favorites.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleListFavorites`
* Service: `supax.GetFavoritesWithStats`
* DTO/Validator: `supax.FavoriteWithStatsRow`
* Middleware/Guard: `middleware.Clerk()`

## [POST] /api/v1/favorites

### Summary

Adds a user to the current user's favorites, enforcing self-favorite, duplicate, and daily limit checks.

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
  "favorite_user_id": "uuid"
}
```

#### Body Fields

| Field | Type | Required | Validation | Description |
|---|---|---:|---|---|
| `favorite_user_id` | string | Yes | Must be non-empty, cannot equal current user, must not already be favorite, daily limit must not be reached. | User to favorite. |

### Responses

#### 201 Created

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "favorite_user_id": "uuid",
    "created_at": "2026-06-20T00:00:00Z"
  },
  "message": "User added to favorites",
  "userMessage": {
    "code": "USER_ADDED_FAVORITES",
    "i18n": {
      "key": "api.userAddedToFavorites"
    },
    "fallbackMessage": "User added to favorites"
  }
}
```

#### 400 Bad Request

Missing `favorite_user_id` or self-favorite.

#### 401 Unauthorized

Missing user ID in token or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User not found in database.

#### 409 Conflict

Target user is already in favorites.

#### 429 Too Many Requests

Daily favorite limit reached. Response includes `current` and `limit`.

#### 500 Internal Server Error

Failed to add favorite.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleCreateFavorite`
* Service: `supax.CheckDailyFavoriteLimitReached`, `supax.CreateFavorite`
* DTO/Validator: inline request struct
* Middleware/Guard: `middleware.Clerk()`

## [DELETE] /api/v1/favorites/:favorite_user_id

### Summary

Removes a favorite and refunds the daily limit if the favorite was created today.

### Authentication

* Required: Yes
* JWT Required: Yes
* Roles/Permissions: Authenticated Clerk user

### Request

#### Path Params

| Name | Type | Required | Description |
|---|---|---:|---|
| `favorite_user_id` | string | Yes | Favorited user to remove. |

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
  "refunded": true,
  "message": "Favorite removed successfully",
  "userMessage": {
    "code": "FAVORITE_REMOVED",
    "i18n": {
      "key": "api.favoriteRemovedSuccess"
    },
    "fallbackMessage": "Favorite removed successfully"
  }
}
```

#### 400 Bad Request

Missing `favorite_user_id`.

#### 401 Unauthorized

Missing user ID in token or Clerk middleware failure.

#### 403 Forbidden

Not found in code.

#### 404 Not Found

User or favorite not found.

#### 500 Internal Server Error

Failed to remove favorite.

### Source References

* Route file: `apps/api/src/internal/transport/http/domain_user_extra.go`
* Controller: `handleDeleteFavorite`
* Service: `supax.DeleteFavorite`
* DTO/Validator: path param check
* Middleware/Guard: `middleware.Clerk()`
