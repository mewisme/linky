# Linky Security Review — 2026-05-16

Full-repository security audit. Scope: `apps/api`, `apps/web`, `apps/worker`, `packages/*`, Docker, CI. `.env*` files excluded (handled separately). Generated files, lockfiles, `node_modules`, `dist`, and `.next` skipped.

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 6 |
| Medium   | 7 |
| Low      | 5 |

The most urgent issues are an unrestricted S3 router (any logged-in user can read/write/delete the entire bucket), an IDOR on `PATCH /users/me/country` that lets any user mutate any other user's row, and a Clerk webhook branch that silently reassigns `clerk_user_id` on email collision (full account takeover primitive).

---

## Critical

### C1. Authenticated S3 take-over via `/api/v1/s3/*`

**Files:** `apps/api/src/routes/media/s3.ts:28-391`, mounted at `apps/api/src/routes/index.ts:52` behind only `clerkMiddleware`.

```ts
router.get("/presigned/upload", async (req, res) => {
  const { key, expires } = req.query;
  ...
  const url = await getUploadUrl(bucket, key, expiresIn); // raw user-supplied key
});
```

The same pattern repeats for `presigned/download` (`:68`), `objects?prefix=` listing (`:108`), `DELETE /objects/:key` (`:141`), and the full multipart suite (`:182-391`). No per-user prefix, no admin check, no path validation.

**Risk:** Critical. Any authenticated user holds full read/write/list/delete over the entire S3 bucket — including admin-uploaded reward/feature media (keys like `admin/rewards/<uuid>.png` written by `apps/api/src/domains/admin/http/admin-media.route.ts:83`) and other users' avatars.

**Exploit:** Sign up → `DELETE /api/v1/s3/objects/admin%2Frewards%2F<uuid>.png` wipes admin assets, or `GET /api/v1/s3/presigned/upload?key=admin/rewards/<existing>.png` returns a PUT URL that overwrites them with arbitrary content. `GET /api/v1/s3/objects?prefix=` enumerates the bucket.

**Fix:** Either remove this generic router (the admin media route already builds its own keys) or gate it behind `adminMiddleware`. For any user-facing presign, derive the prefix server-side from `req.auth.sub` (e.g., `users/${userId}/...`) and reject any `key` outside that prefix. Decode and reject `..`, leading `/`, and percent-encoded variants.

---

### C2. IDOR in `PATCH /api/v1/users/me/country` — any user can rewrite any user's country

**File:** `apps/api/src/domains/user/http/users.route.ts:89-141`.

```ts
router.patch("/me/country", async (req, res) => {
  const { country, clerk_user_id } = req.body as UpdateUserCountryBody;
  if (!clerk_user_id) return sendJsonError(res, 401, ...);
  ...
  const { user, error } = await updateUserCountryByClerkUserId(clerk_user_id, country);
});
```

`req.auth?.sub` is never consulted. The target Clerk ID is taken straight from the request body.

**Risk:** Any authenticated user can rewrite the `country` column on any other user's row — feeds matchmaking, region-gated content, and analytics. `updateUserCountryByClerkUserId` (`apps/api/src/domains/user/service/user.service.ts:51-73`) writes unconditionally.

**Exploit:** `PATCH /api/v1/users/me/country` with body `{ "clerk_user_id": "<victim>", "country": "RU" }`.

**Fix:** Drop `clerk_user_id` from the body type; derive identity from `req.auth.sub` like every other `/me` handler in the same file.

---

### C3. Account takeover via Clerk `user.created` email collision

**File:** `apps/api/src/webhook/clerk-webhook-handler.ts:40-66`.

```ts
const existing = await getUserByEmail(email);
if (existing) {
  ...
  if ((existing.deleted === false || existing.deleted === null)
      && existing.clerk_user_id !== evt.data.id) {
    await patchUser(existing.id, {
      clerk_user_id: evt.data.id,   // overwrite to attacker's clerk id
      email, first_name, last_name, avatar_url,
    });
    return;
  }
}
```

If a Clerk `user.created` event is delivered for an email that already maps to a live, non-deleted user with a different `clerk_user_id`, the existing row's `clerk_user_id` is silently rewritten to the new (attacker's) Clerk ID.

**Risk:** Full account takeover. After rewrite, every Clerk-authenticated request from the attacker resolves via `getUserIdByClerkId` to the victim's DB row — profile, call history, blocks, favorites, **role** (including admin/superadmin).

**Exploit:** Attacker creates a Clerk account using a victim's email through any channel where Clerk admits a duplicate (OAuth identity linking to a pre-existing email, environments without enforced email verification before `user.created` fires, manual admin-creation, or a reused email across a multi-tenant Clerk setup). Clerk fires `user.created`, the webhook reassigns the row.

**Fix:** Never reassign `clerk_user_id` in the `user.created` handler. If `existing.clerk_user_id !== evt.data.id` and the row is live, reject the event and alert. Only the deleted-account recovery branch should patch.

---

## High

### H1. Internal worker routes mounted on the public API listener

**Files:** `apps/api/src/routes/index.ts:46`, `apps/api/src/middleware/internal-worker-auth.ts`, `docker-compose.yml:9-10`.

`app.use(INTERNAL_WORKER_V1_PREFIX, createInternalWorkerRouter())` lives on the same Express instance that serves `/api/v1/*`. The compose file publishes the API container's port to the host. There is no separate listener, IP allowlist, or network segmentation — only a single `INTERNAL_WORKER_SECRET` Bearer.

**Risk:** A single secret leak (Sentry breadcrumb, log line, container env dump, accidentally committed `.env`, compromised dev workstation) yields the entire internal-worker job surface from the internet.

**Exploit:** With the secret, `POST /internal/worker/v1/jobs` with body `{"v":1,"type":"apply_call_exp","payload":{"userId":"<victim-uuid>","durationSeconds":1,"expSecondsToAdd":2147483647}}` promotes the targeted user to max level (see H2 for the unbounded grant).

**Fix:** Bind the internal router to a separate `http.Server` on an unpublished port (or Unix socket inside the container). At minimum add an IP allowlist using `req.socket.remoteAddress` — *not* `req.ip`, because `app.enable("trust proxy")` (`apps/api/src/middleware/index.ts:26`) makes `X-Forwarded-For` spoofable. Consider HMAC-signing the body for defense in depth.

---

### H2. `apply_call_exp` grants unbounded EXP without server-side cap

**Files:** `packages/validation/src/index.ts:30-44`, `apps/api/src/worker/worker-jobs/apply-call-exp.ts`, `apps/api/src/domains/user/service/user-level.service.ts:98-119`.

The Zod schema only constrains `expSecondsToAdd` to a non-negative int; the executor calls `incrementUserExp(userId, expToAdd)` and triggers `grantRewardsForLevel` / `grantFreezesForLevel` on level-up. There is no relationship enforced between `durationSeconds` and `expSecondsToAdd`, and no upper bound.

**Risk:** Combined with H1 (or with Redis queue write access — see H3), one request promotes any user to max level, including admin-gated reward/streak bonuses.

**Exploit:** As in H1, send `expSecondsToAdd: 2147483647`.

**Fix:** Cap `expSecondsToAdd` server-side based on `durationSeconds` (the legitimate ratio) inside `executeApplyCallExpJob`. Reject mismatched envelopes.

---

### H3. Redis has no authentication; queue-write equals full job-execution authority

**Files:** `docker-compose.yml:84-97`, `apps/api/src/infra/redis/client.ts:9-22`, `apps/worker/src/internal/redis/client.go:43-73`, `packages/validation/src/index.ts`.

Redis runs `redis:8-alpine` with no `--requirepass`, no ACL file, no `REDIS_PASSWORD` enforced. Anything on `linky-network` (Ollama container, future sidecar, compromised dependency) can `LPUSH` to `linky:queue:jobs:v2`. Job envelopes are not signed; the Go worker forwards them and the API trusts the dispatched type.

**Risk:** An attacker on the internal network reaches the same job surface as H1 without needing the worker secret: arbitrary EXP grants, AI-summary overwrites for any report, embedding regenerations for any UUID.

**Exploit:** Any process with TCP reach to `redis:6379` runs `LPUSH linky:queue:jobs:v2 '<envelope JSON>'`.

**Fix:** Set `requirepass` (or ACLs) on Redis and pass `REDIS_PASSWORD` to api/worker in compose. Add an HMAC over the envelope in `@ws/sdk-internal` keyed by a separate signing secret; verify in `createInternalWorkerRouter` before dispatch — so even Redis access is insufficient to forge.

---

### H4. SSRF via user-controlled Web Push `endpoint`

**Files:** `apps/api/src/domains/notification/http/push.route.ts:14-50`, `apps/api/src/infra/push/web-push.client.ts:31-49`, `apps/api/src/domains/notification/service/push.service.ts:70-86`.

```ts
const { subscription } = req.body as SubscribeBody;
if (!subscription || !subscription.endpoint || ...) { ... }
const record = await subscribe(userId, subscription);
```

No allowlist of push-service hosts. The endpoint URL is host- and protocol-controllable.

**Risk:** Any notification path (`favorite_added`, `level_up`, admin broadcast) makes an outbound HTTPS POST to the attacker-chosen URL. Targets: `http://169.254.169.254/...` (cloud metadata), internal admin hosts, internal Redis/Memcached HTTP-smuggling gadgets.

**Exploit:**
1. Subscribe with `subscription.endpoint = "http://169.254.169.254/latest/meta-data/iam/security-credentials/"`.
2. Trigger any notification (favorite a profile, etc.). Observe response timing/error to confirm reachability or pivot.

**Fix:** Validate `subscription.endpoint` host against a hard-coded allowlist of legitimate push services (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `*.push.apple.com`) at subscribe time. Reject anything else with 400.

---

### H5. Open redirect on `/sign-in` via protocol-relative `redirect_url`

**File:** `apps/web/src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx:35-45`.

```ts
try {
  const url = new URL(redirect);              // throws for "//evil.com/x"
  return url.pathname + url.search;
} catch {
  return redirect.startsWith("/") ? redirect : "/";   // "//evil.com/x" passes
}
...
useEffect(() => { router.replace(href); }, [router, href]);
```

`new URL("//evil.com/path")` throws (no scheme); the catch branch returns `"//evil.com/path"` because it begins with `/`. `router.replace` resolves protocol-relative paths against the current scheme, navigating to `https://evil.com/path`.

**Exploit:** `https://linky.example/sign-in?redirect_url=//attacker.tld/login` — already-authenticated victims are silently sent to the attacker site by `<SignedInRedirect>`.

**Fix:** In the catch branch, require `redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.startsWith("/\\")`, else return `"/"`.

---

### H6. PostgREST `or()` filter injection via unsanitized `search`

**Files:** `apps/api/src/infra/supabase/repositories/admin-users.repository.ts:40-44`, `apps/api/src/infra/supabase/repositories/users.ts:42-46`, `apps/api/src/infra/supabase/repositories/interest-tags.ts:34-36`.

```ts
query = query.or(
  `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
);
```

`search` is interpolated raw into the PostgREST DSL. `,`, `(`, `)`, `.`, `:` are syntax characters and are not escaped. The `interest-tags` repository is reachable via an unauthenticated route (`apps/api/src/routes/resources/interest-tags.ts:13`).

**Risk:** Filter / row-disclosure injection. A search value like `x),deleted.is.null,or(email.ilike.%` injects extra clauses into the disjunction, bypassing `deleted = false` and similar scoping filters.

**Fix:** Reject or escape `,()."` in `search` before composing the `or` string, or replace the concatenation with chained `.ilike()` filters or `textSearch`.

---

## Medium

### M1. Admin can soft-delete or modify other admins

**Files:** `apps/api/src/domains/admin/http/users.route.ts:82-127` (batch PATCH), `:280-340` (`PATCH /:id`), `apps/api/src/lib/auth/superadmin-invariants.ts:15-19`.

Hard delete is gated by `requireSuperAdmin`, but soft-delete and field PATCH only check `adminMiddleware`. The invariant only blocks deleting a `superadmin`, so any `admin` can `PATCH { deleted: true }` against a peer `admin`, change their email/profile, or demote them to `member`.

**Risk:** Lateral admin compromise — a single compromised admin account can disable peers and lock changes in. The 5-minute admin-cache TTL (`apps/api/src/infra/admin-cache/`) means a demoted admin retains powers briefly, but soft-delete blocks normal app access immediately.

**Fix:** Extend `assertTargetCanBeSoftDeleted` (and add `assertCanModifyTarget`) to block `targetRole === "admin"` modifications unless the actor is `superadmin`. Apply to both `/batch` and `/:id` PATCH.

---

### M2. Fabricated call history via attacker-controlled `caller_id`/`callee_id`/duration

**File:** `apps/api/src/routes/resources/call-history.ts:207-276`.

```ts
const { caller_id, callee_id, started_at, ended_at, duration_seconds } = req.body;
if (caller_id !== userId && callee_id !== userId) return 403;
const callHistory = await createCallHistory({ callerId: caller_id, calleeId: callee_id, ... });
```

The only check is "the authenticated user is one of the two parties." The peer ID, timestamps, and duration are all body-supplied; no real room/match record is required.

**Risk:** Any user can mint call-history rows pairing themselves with arbitrary victims, with arbitrary durations — directly gameable for any flow that derives EXP/streaks/leaderboards from call-history (the `apply_call_exp` job exists for exactly this purpose, see H2). Also pollutes admin moderation views against a chosen victim.

**Fix:** Build call-history server-side from real room/match state (the socket flow in `apps/api/src/domains/video-chat/socket/call-history.socket.ts` already does this for legitimate calls). Remove or restrict the public POST.

---

### M3. Spoofable country source on first `/users/me` call

**File:** `apps/api/src/domains/user/http/users.route.ts:63-75`.

```ts
const countryHeader = req.headers["cf-ipcountry"] || req.headers["x-cf-ipcountry"];
if (countryHeader && typeof countryHeader === "string") {
  await tryUpdateUserCountryFromHeader(clerkUserId, countryHeader);
```

Both header names are client-supplied. `cf-ipcountry` is only trustworthy when the only ingress is Cloudflare; `x-cf-ipcountry` has no plausible trusted source.

**Fix:** Drop the `x-cf-ipcountry` fallback. Only honor `cf-ipcountry` when the connection came from a verified Cloudflare IP, or replace with a server-side IP→country lookup.

---

### M4. CORS reflects any origin with credentials when `CORS_ORIGIN` is unset

**Files:** `apps/api/src/utils/cors.ts:13-14`, `apps/api/src/middleware/index.ts:33-36`, `apps/api/src/socket/index.ts:18-23`.

`parseCorsOrigin` returns `"*"` when `CORS_ORIGIN` is absent. The `cors` middleware and Socket.IO config both pass `credentials: true`. With `Access-Control-Allow-Credentials: true`, the `cors` package does not actually emit `*` — it reflects the request `Origin`, producing an "allow any origin with credentials" effect.

**Fix:** Refuse to start when `NODE_ENV=production` and `CORS_ORIGIN` is `*` or unset; or set `credentials: false` whenever the origin is the wildcard.

---

### M5. API and Node-worker containers run as root

**Files:** `Dockerfile`, `apps/api/Dockerfile`.

Neither contains a `USER` directive; final stage runs as UID 0. The Go worker (`apps/worker/Dockerfile.go`) correctly uses `gcr.io/distroless/static-debian12:nonroot`.

**Risk:** Defense-in-depth — any future RCE/path-traversal in the API container has root-level write across `/app` and entrypoints.

**Fix:**
```dockerfile
RUN groupadd -r app && useradd -r -g app -u 10001 app && chown -R app:app /app
USER app
```

---

### M6. Idempotency-Key header has no length/charset validation

**Files:** `apps/api/src/routes/internal-worker.route.ts:27-37`, `apps/api/src/infra/redis/worker-idempotency.ts:13`.

The header value is appended to a fixed Redis key prefix without validation. With a leaked Bearer (H1), a caller can submit unbounded values, control characters, or differing keys to bypass dedup entirely.

**Fix:** Validate against `^[A-Za-z0-9_-]{8,128}$` before use.

---

### M7. Authorization header may end up in error pipelines

**File:** `apps/api/src/middleware/clerk.ts:18-22` plus the morgan format at `apps/api/src/middleware/index.ts:21-22`.

Bearer tokens are not logged directly, but query strings are, and error reports through Sentry's `setupExpressErrorHandler` can capture full request data. Webhook headers (`svix-*`) are logged verbatim in `webhook.ts:24-27`.

**Fix:** Add a Pino + Sentry serializer that redacts `req.headers.authorization`, `req.headers["svix-signature"]`, and strips query strings from the access log format.

---

## Low

### L1. `INTERNAL_WORKER_SECRET` falls back to empty string at startup

**File:** `apps/api/src/config/index.ts:30`. The middleware refuses requests when the secret is empty (returns 503), but a misconfigured short secret is silently accepted.

**Fix:** Require minimum length (≥ 32 chars) at config load; fail fast.

---

### L2. `app.enable("trust proxy")` makes `req.ip` spoofable

**File:** `apps/api/src/middleware/index.ts:26`.

Not a finding on its own, but defeats any future IP allowlist on `/internal/worker/v1`. Pair with H1's fix: use `req.socket.remoteAddress` for internal allowlists, or set `app.set("trust proxy", "loopback,linkLocal,uniqueLocal")`.

---

### L3. Inactive Node `apps/worker/` still in tree

**Files:** `apps/worker/src/index.ts`, `docker-compose.yml:35-58` (commented out).

Two worker implementations must stay in sync against `@ws/validation`. A future hardening of envelope validation could ship to one and not the other; if the comment is ever removed this becomes load-bearing.

**Fix:** Delete `apps/worker/` if Go is canonical, or guard with `WORKER_BACKEND=node|go` so only one runs.

---

### L4. Go worker uses `http.DefaultClient`

**File:** `apps/worker/src/internal/api/client.go:79`.

Functional today, but any imported library mutating `http.DefaultTransport` would silently weaken this call. Use a dedicated `*http.Client` with explicit `Timeout` and `Transport`.

---

### L5. `SECURITY.md` is the unedited GitHub template

**File:** `SECURITY.md`.

Contents are placeholder ("Use this section to tell people..."). Replace with real reporting instructions or remove.

---

## Areas reviewed and ruled out

- Clerk JWT verification (`apps/api/src/middleware/clerk.ts`, `infra/clerk/client.ts`) — uses `@clerk/backend.verifyToken`, no custom logic.
- Internal worker bearer comparison (`apps/api/src/middleware/internal-worker-auth.ts:18`) — `crypto.timingSafeEqual` with length pre-check. Correct.
- Clerk webhook signature (`apps/api/src/routes/webhook.ts`, `webhook/clerk-webhook-handler.ts`) — raw body preserved, svix-verified before any side effect, idempotency layered.
- Socket.IO auth — both `/chat` and `/admin` namespaces require Clerk JWT; `/admin` additionally checks role.
- Internal worker SSRF — URL is built from env only (`apps/worker/src/internal/api/client.go:32`, `packages/worker-api/src/paths.ts`).
- Job envelope deserialization — Zod-revalidated server-side at the API trust boundary; the Go worker is only defense-in-depth.
- CSRF — auth is `Authorization: Bearer <Clerk JWT>`; no session cookies issued by this app.
- Command injection — only `execSync("node scripts/clean.js")` at build-time (`apps/api/tsup.config.ts:14`); no runtime `exec`/`spawn`.
- Path traversal in `fs` — only fixed-path reads.
- Eval / SSTI / unsafe deserialization — none found.
- Random/UUID — `crypto.randomUUID` and `crypto.randomBytes` only; no `Math.random` for security-sensitive values in backend code.
- React XSS — no `dangerouslySetInnerHTML` with user data; the one usage in `apps/web/src/app/global-error.tsx:44-83` is a static CSS template.
- Hardcoded secrets in committed source — none. The local `apps/api-go/.env.backend.local` does contain real-looking secrets but is gitignored and not in git history (out of scope per ground rules; rotate/handle separately).
- CI workflows in `.github/workflows/` — no `pull_request_target` with untrusted checkouts; `permissions:` is scoped.
- Docker compose — only the API port is host-published; no host bind mounts; no `privileged: true`.

---

## Suggested fix order

1. **C2** (minutes) — drop `clerk_user_id` from the country PATCH body.
2. **C1** (hours) — disable or scope `/api/v1/s3`.
3. **C3** (minutes) — remove the `clerk_user_id` reassignment branch in the webhook.
4. **H4** (hours) — allowlist Web Push endpoint hosts.
5. **H5** (minutes) — fix the protocol-relative redirect on sign-in.
6. **H2 + H3** (hours) — cap `expSecondsToAdd` server-side; enable Redis AUTH.
7. **H1** (hours) — move `/internal/worker/v1` off the public listener.
8. **H6** (hours) — escape PostgREST `or()` filter inputs in the three repositories.
9. **M1** through **M7**, then **L1**–**L5**.
