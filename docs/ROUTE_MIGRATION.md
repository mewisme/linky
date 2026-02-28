# API route path migration (old to current)

Base URL for all paths: `/api/v1` (relative to API origin).

## User routes (namespace: `/users/...`)


| Method | Old path                             | Current path                          |
| ------ | ------------------------------------ | ------------------------------------- |
| GET    | `/user-details/me`                   | `/users/details/me`                   |
| PUT    | `/user-details/me`                   | `/users/details/me`                   |
| PATCH  | `/user-details/me`                   | `/users/details/me`                   |
| POST   | `/user-details/me/interest-tags`     | `/users/details/me/interest-tags`     |
| DELETE | `/user-details/me/interest-tags`     | `/users/details/me/interest-tags`     |
| PUT    | `/user-details/me/interest-tags`     | `/users/details/me/interest-tags`     |
| DELETE | `/user-details/me/interest-tags/all` | `/users/details/me/interest-tags/all` |
| GET    | `/user-settings/me`                  | `/users/settings/me`                  |
| PUT    | `/user-settings/me`                  | `/users/settings/me`                  |
| PATCH  | `/user-settings/me`                  | `/users/settings/me`                  |
| GET    | `/user-profile/me`                   | `/users/profile/me`                   |
| GET    | `/user-level/me`                     | `/users/level/me`                     |
| GET    | `/user-streak/me`                    | `/users/streak/me`                    |
| GET    | `/user-streak/me/history`            | `/users/streak/me/history`            |
| GET    | `/user-streak/calendar`              | `/users/streak/calendar`              |
| GET    | `/user-progress/me`                  | `/users/progress/me`                  |
| GET    | `/users/me`                          | `/users/me` (unchanged)               |
| PATCH  | `/users/me/country`                  | `/users/me/country` (unchanged)       |
| POST   | `/users/blocks`                      | `/users/blocks` (unchanged)           |
| GET    | `/users/blocks/me`                   | `/users/blocks/me` (unchanged)        |
| DELETE | `/users/blocks/:id`                  | `/users/blocks/:id` (unchanged)       |


## Economy routes

| Method | Old path                    | Current path                   |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/economy/convert`          | `/economy/convert` (unchanged) |
| GET    | `/economy/daily-progress`   | `/economy/daily/progress`      |
| GET    | `/economy/weekly-progress`  | `/economy/weekly/progress`     |
| POST   | `/economy/weekly-checkin`   | `/economy/weekly/checkin`      |
| GET    | `/economy/monthly-progress` | `/economy/monthly/progress`    |
| POST   | `/economy/monthly-checkin`  | `/economy/monthly/checkin`     |
| POST   | `/economy/monthly-buyback`  | `/economy/monthly/buyback`     |

## Summary

- **Users**: All user-related routes use the `/users` namespace. Sub-resources are under `/users/<resource>` (e.g. `/users/details`, `/users/settings`, `/users/profile`, `/users/level`, `/users/streak`, `/users/progress`, `/users/blocks`). Child route files define only the segment after the mount (e.g. `/me`), so the full path has no duplicated segments.
- **Economy**: Wallet/convert stays at `/economy`. Sub-resources use explicit segments: daily at `/economy/daily`, weekly at `/economy/weekly`, monthly at `/economy/monthly`. Each child router is mounted at `/economy/<segment>` and defines only the route path (e.g. `/progress`, `/checkin`, `/buyback`) with no duplicated segment name.

