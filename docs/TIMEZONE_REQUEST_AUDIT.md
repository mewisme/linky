# Timezone request flow: frontend to backend audit

## Summary

| Path | Frontend sends timezone? | Backend reads it? | Backend source of truth |
|------|--------------------------|-------------------|--------------------------|
| User progress (`GET /users/progress/me`) | Yes (`x-user-timezone` header) | No | `user_details.timezone` (DB), fallback UTC |
| User streak calendar (`GET /users/streak/calendar`) | Yes (`x-user-timezone` header) | No | `user_details.timezone` (DB), fallback UTC |
| Economy daily/weekly/monthly | No header/query from web | N/A | `user_details.timezone` (DB), fallback UTC |
| Persist timezone | No | N/A | `PATCH /users/timezone` exists, **never called by frontend** |
| Video-chat socket | Yes (`client:timezone:init` payload) | Stored in `socket.data.timezone` only | Call recording uses **DB** (`getTimezoneForUser`), not socket |

**Conclusion:** The backend ignores request timezone everywhere and uses only `user_details.timezone` from the DB (or UTC). The frontend sends timezone in two places (HTTP header and socket), but the API does not use the header, and the socket value is never persisted or used for call history. Timezone is only persisted via `PATCH /users/timezone` (body `{ timezone }`), which the frontend never calls, so new users keep `timezone = null` and get UTC everywhere.

---

## 1. Frontend: how timezone is obtained and sent

### 1.1 Source of truth (client)

- **File:** `apps/web/src/utils/timezone.ts`
- **Implementation:** `getUserTimezone()` uses `Intl.DateTimeFormat().resolvedOptions().timeZone` (IANA string, e.g. `America/New_York`). Falls back to `"UTC"` if `Intl` is missing.

### 1.2 HTTP: timezone header (removed)

- **As of the post-audit change:** The frontend no longer sends `x-user-timezone` on any request. `getUserProgress()` and `getStreakCalendar(year, month)` call the API without timezone headers; the backend uses `user_details.timezone` from the DB only.

### 1.3 Socket: where timezone is sent

- **Event:** `client:timezone:init`
- **Payload:** `{ timezone: getUserTimezone() }`
- **When:** On chat socket `connect` in `apps/web/src/components/providers/realtime/socket-provider.tsx` (single emit per connect).

### 1.4 Persist endpoint (called once per session)

- **URL:** `backendUrl.users.timezone()` → `PATCH /api/v1/users/timezone`
- **Usage:** The frontend calls this once per session via the server action `syncUserTimezone(timezone)`, invoked from the socket provider on first `connect` (ref guards so it runs only once per app session). The backend persists the first value and returns 400 "already set" on later sessions; the client ignores that error.

---

## 2. Backend: how timezone is read and used

### 2.1 HTTP routes: no use of `x-user-timezone` or query

- **User progress** (`apps/api/src/domains/user/http/user-progress.route.ts`): Uses `getTimezoneForUser(userId)` only. Does not read `req.headers['x-user-timezone']` or any query param.
- **User streak** (`apps/api/src/domains/user/http/user-streak.route.ts`): Same for `/me`, `/me/history`, and `/calendar` — all use `getTimezoneForUser(userId)` only.
- **Economy daily** (`apps/api/src/domains/economy-daily/http/daily-exp.route.ts`): Uses `getTimezoneForUser(userId)` only.
- **Economy weekly** (`apps/api/src/domains/economy-weekly/http/weekly-checkin.route.ts`): Same.
- **Economy monthly** (`apps/api/src/domains/economy-monthly/http/monthly-checkin.route.ts`): Same.

So every timezone used in these routes comes from **DB** (`user_details.timezone`), with fallback `"UTC"` when null.

### 2.2 Persist endpoint (only way to set DB timezone)

- **Route:** `PATCH /api/v1/users/timezone` in `apps/api/src/domains/user/http/users.route.ts`
- **Input:** Request body `{ timezone: string }` (required, must pass `isValidTimezone()`).
- **Behavior:** Calls `setTimezoneOnceForUser(userId, tz)`. DB trigger makes `user_details.timezone` immutable after first set; later changes return 400 with "Timezone already set and cannot be changed".

### 2.3 Socket: `client:timezone:init`

- **Handler:** `apps/api/src/domains/video-chat/socket/handlers.ts`
- **Behavior:** If `payload.timezone` is a non-empty string and `isValidTimezone(tz)`, sets `socket.data.timezone = tz`. No DB write, no call to `setTimezoneOnceForUser`.

### 2.4 Call history (video-chat)

- **Recording:** `apps/api/src/domains/video-chat/socket/call-history.socket.ts` → `recordCallHistoryInDatabase(...)`.
- **Timezone for caller/callee:** Taken from `getTimezoneForUser(callerId)` and `getTimezoneForUser(calleeId)` (DB), **not** from `socket.data.timezone`. So the timezone sent via `client:timezone:init` is not used when recording the call or applying progress/streak.

---

## 3. Gaps and recommendations

1. **Header removed**  
   The frontend no longer sends `x-user-timezone`; progress and streak calendar rely on the backend’s DB timezone only.

2. **Timezone persisted once per user**  
   On first socket connect each session, the frontend calls `PATCH /api/v1/users/timezone` via `syncUserTimezone(tz)`. The backend persists the first value (DB trigger keeps it immutable); later sessions get 400 "already set" and the client ignores it.

3. **Socket timezone not used for call recording**  
   `socket.data.timezone` is set but call history uses DB only. If you persist timezone from the socket (recommendation above), call recording will automatically use it via `getTimezoneForUser`. No change needed in `call-history.socket.ts` unless you want to prefer live socket timezone over DB for that call only.

4. **Docs vs implementation**  
   `docs/ECONOMY_API_ROUTES.md` states economy endpoints accept optional `x-user-timezone` or `?timezone=`. The implementation does not; update the doc or add header/query support.

5. **Cache keys**  
   Progress and streak calendar are cached with `timezone` in the key/tag on the frontend, while the backend always uses DB timezone. If you later use request timezone on the backend, ensure cache keys align (e.g. same timezone in backend cache keys and frontend tags).

---

## 4. File reference

| Role | File |
|------|------|
| Frontend timezone util | `apps/web/src/utils/timezone.ts` |
| Frontend progress + timezone sync | `apps/web/src/lib/actions/user/profile.ts` (`getUserProgress`, `syncUserTimezone`) |
| Frontend streak calendar | `apps/web/src/lib/actions/user/streak.ts` |
| Frontend socket timezone emit + one-time PATCH | `apps/web/src/components/providers/realtime/socket-provider.tsx` |
| Backend timezone util | `apps/api/src/utils/timezone.ts` |
| Backend user progress route | `apps/api/src/domains/user/http/user-progress.route.ts` |
| Backend user streak route | `apps/api/src/domains/user/http/user-streak.route.ts` |
| Backend users route (PATCH timezone) | `apps/api/src/domains/user/http/users.route.ts` |
| Backend get/set timezone (DB) | `apps/api/src/domains/user/service/user-details.service.ts`, `apps/api/src/infra/supabase/repositories/user-details.ts` |
| Backend video-chat socket timezone | `apps/api/src/domains/video-chat/socket/handlers.ts` |
| Backend call history recording | `apps/api/src/domains/video-chat/socket/call-history.socket.ts`, `apps/api/src/domains/video-chat/service/call-history.service.ts` |
