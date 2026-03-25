# TODO_RESTRUCTURED.md

> Generated from codebase audit on 2026-02-23. Based on source code inspection, not documentation alone.

---

## Section 1: Completed Features

### Core Platform
- 1-1 video chat via WebRTC (offer/answer signaling, ICE, adaptive encoding, quality controller)
- Matchmaking queue with Redis or in-memory store, configurable via `USE_REDIS_MATCHMAKING`
- Matchmaking scoring: interest tag overlap, favorites boost, embedding similarity (Ollama), skip cooldown, blocked-user filtering
- Screen sharing (socket relay + WebRTC track replacement, peer push notification on start)
- In-call chat with GIF support (Giphy integration)
- In-call reactions overlay
- Mute/video toggle with peer sync
- Skip and end-call with grace handling
- Call timer display
- Connection quality indicator (RTT, packet loss, frame rate via NetworkMonitor + VideoHealthTracker)

### Floating Video
- Draggable overlay with corner-snap and spring animation (Framer Motion)
- Responsive sizing (desktop 180x240px, mobile 120x160px)
- Audio activity ring (Web Audio API, 100ms poll)
- Hover controls on desktop; tap-to-navigate on mobile
- Resize handler re-snaps to nearest corner
- Scale animation while dragging (1.05x)
- Passive tab banner when user navigates away during call

### Progression System
- EXP from call duration (1 second = 1 EXP)
- Favorite EXP boost (one-way multiplier, mutual multiplier, admin-configurable)
- Streak EXP bonus tiers (admin-configurable by streak length)
- Level calculation from total EXP (configurable base + step)
- Level-up detection and reward grant on call end
- Streak tracking with timezone-aware daily logic
- Streak freeze (level-unlock-gated, grant on level-up)
- Daily EXP tracking via Redis + Postgres (`user-exp-daily`)
- Progress page: level card, streak card, streak mini-calendar, full calendar dialog, EXP earned today, call duration today, streak remaining seconds

### User Management
- User blocking (backend: block/unblock/list, cache-invalidation; frontend: blocked users data table, unblock action)
- Block enforced in matchmaking (`isInteractionAllowed` called during pair scoring)
- Favorites (create/delete with daily limit, cache, data table, stats display)
- User profile (bio, languages, interest tags, avatar upload via S3 presigned URL)
- User settings (default mute mic, default disable camera, notification sound)
- Level-based feature unlocks (admin-configurable, checked in user-level service)
- Level rewards (admin-configurable, granted on level-up)

### Notifications
- In-app notification center (bell, panel, mark-read, mark-all-read, load-more)
- Real-time delivery via Socket.IO when user is online
- Web Push fallback when user is offline (VAPID, service worker registered as `sw.js`)
- Push notification settings page (enable/disable, permission state handling)
- Notification types: `favorite_added`, `level_up`, `streak_milestone`, `streak_expiring`, `admin_broadcast`
- Broadcast system: admin sends to all active users (push-only or push-and-save), persisted to `broadcast_history`

### Admin Dashboard
- User management: list, search, filter by role/deleted, bulk delete, Clerk sync, embedding actions
- Interest tags: CRUD, hard delete, bulk import dialog
- Level rewards: CRUD
- Level feature unlocks: CRUD
- Streak EXP bonuses: CRUD
- Favorite EXP boost rules: CRUD
- Reports: list, view detail, update status
- Changelogs: list, create, update
- Broadcasts: send with delivery mode selection, broadcast history table
- Embeddings: compare two users, find similar users, sync embeddings
- Admin presence tracking via admin socket namespace

### Reports
- User report submission during/after call
- Report context collection (room state, participants)
- Admin report review with status workflow
- User report history page

### Infrastructure
- Redis cache-aside pattern with `getOrSet`, cache invalidation helpers, TTL policy, namespace versioning
- Supabase (Postgres) repositories for all entities, timeout wrapper
- S3 multipart upload, presigned URLs for media
- Clerk auth middleware (Clerk SDK), webhook handler for user sync
- MQTT client for presence/online state
- Pino-based structured logging (`@ws/logger`)
- Rate limiting middleware (Redis-backed, per-user/IP window)
- Graceful shutdown middleware
- Request ID middleware
- JSON body size limit middleware
- Client IP detection middleware
- Analytics event tracking (client + server, `lib/analytics/`)
- Google One-Tap auth
- Command menu (⌘K)
- Call tab coordination (prevents duplicate calls across browser tabs)
- Backend restart detection (socket reconnect)

### Idle/Searching State UX
- Idle card: avatar, level, streak, "Today's EXP earned" pill, level proximity hint, streak reminder, prestige proximity hint
- Idle data refreshes after every call via React Query (`staleTime: 0`, `queryKey: ["user-progress"]`)
- Searching card: 10 rotating hints with Framer Motion slide-up transition
- "Still searching…" phase at 10s with live queue size (`GET /api/v1/matchmaking/queue-status`, 5s cache)
- Alternative action link ("Visit your progress page while you wait") at 30s
- Push notification to matched users when their tab is not focused

### Test Coverage
- Vitest unit tests: cache, user services (level, streak, freeze, progress, settings, profile, block), matchmaking (scorer, matcher, Redis store), reports, video-chat (rooms, call history), Ollama embedding, webhook handler
- Playwright E2E setup in place (runners configured)

---

## Section 2: In-Progress / Partial

### Floating Video Polish (ROADMAP.md §C)
**What exists:** Drag/snap, spring animation, audio activity ring, hover controls, mobile tap, resize handler.

**Missing:**
- Idle-time pulse reminder when floating for 60+ seconds
- Deceleration/acceleration easing distinction for enter vs exit transitions (currently uniform spring)
- When call ends in floating mode, explicit 300ms fade-out before returning to chat page

### Feature Flags System
**What exists:** `apps/web/src/lib/feature-flags/` directory is empty. Backend has `level-feature-unlocks` table and service that returns unlocked features per user level.

**Missing:**
- No frontend consumption of the feature unlock API to gate UI features
- No runtime feature flag evaluation (env-var or config-based flags for safe rollouts / A/B testing)
- No `lib/feature-flags/` implementation

### Call Quality Analytics
**What exists:** `NetworkMonitor` collects RTT, packet loss, jitter. `VideoHealthTracker` monitors frame rate. `QualityController` tracks quality tier changes. All live in client-side `lib/webrtc/`.

**Missing:**
- No persistence of WebRTC metrics to backend (no `/api/call-quality` endpoint, no DB table)
- No admin dashboard surface for call quality data
- Metrics are ephemeral — lost when call ends

### Admin Analytics
**What exists:** `analytics.types.ts` defines `AdminAnalyticsOverviewQuery` (empty shell). Admin dashboard is a card grid pointing to sub-pages. No metrics page.

**Missing:**
- No analytics/metrics admin page (total calls, active users, avg call duration, match success rate)
- No time-series charts for usage trends
- `AdminAnalyticsOverviewQuery` type defined but no service or route uses it

### Duplicate Cache Key Infrastructure
**What exists:** Two parallel cache key/TTL systems:
- New: `infra/redis/cache/keys.ts` + `infra/redis/cache/policy.ts` (`REDIS_CACHE_KEYS`, `REDIS_CACHE_TTL_SECONDS`)
- Old: `infra/redis/cache-config.ts` (`CACHE_KEYS`, `CACHE_TTL`)

`routes/resources/favorites.ts` still uses the old pattern. Several other routes in `routes/resources/` also use old pattern.

**Missing:** Full migration of old cache keys to new pattern; remove `cache-config.ts`.

### Distributed Match Lock
**What exists:** `MatchmakingService` uses `this.matchLock = true/false` (in-process boolean). The file defines `LOCK_KEY = "match:lock"` and `LOCK_TTL = 2` constants but they are never used — Redis-based locking was planned but not implemented.

**Missing:** Actual Redis distributed lock for `tryMatch()` to be safe in multi-instance deployments.

---

## Section 3: Not Implemented Yet

### Prestige System (ROADMAP.md §A — all phases)
- No prestige tier calculation (level → tier mapping)
- No prestige badge component
- No prestige section on progress page
- No prestige badge in chat idle/active UI
- No prestige badge in call history
- No prestige celebration screen (full-screen transition at Level 50)
- No `prestigeTier` field in user profile DB
- Backend: no prestige calculation service, no prestige events

### Realtime Progress Insights During/After Calls (ROADMAP.md §B)
- No post-call EXP summary overlay (auto-dismiss card with EXP earned, streak status, level bar)
- No EXP indicator next to call timer ("X EXP earned" updating every 5s)
- No favorite bonus active WebSocket event (`favorite-bonus-active`)
- No progress ring animation around remote peer avatar during call
- No matchmaking queue-status endpoint for estimated wait time

### Persistent Direct Messaging (TODO.md)
- Favorites can see each other but cannot message outside of calls
- No DM data model, no DM socket events, no DM UI
- No message persistence layer

### User Search & Discovery (TODO.md)
- No search-by-username endpoint
- No profile browsing / discovery page
- Users can only find each other through random matchmaking

### Automated Content Moderation (TODO.md)
- Ollama integration exists for embeddings only
- No profanity filter for chat messages
- No inappropriate content classifier
- No automated report flagging

### Internationalization (TODO.md)
- `language_preference` field exists in user profiles
- No `next-intl` or `react-i18next` setup
- All UI strings are hardcoded English

### Group Calls (TODO.md)
- Architecture supports only 1-1 rooms
- No SFU integration (would require significant signaling changes)
- No group room management

### Call Recording (TODO.md)
- S3 infrastructure exists
- No `MediaRecorder` integration
- No consent flow
- No recording storage or playback

### Input Validation Layer
- API routes perform ad-hoc validation (manual checks per handler)
- No Zod schema validation middleware
- No centralized error response schema (each route constructs its own error shape)

### Environment Variable Validation
- `config/index.ts` casts env vars as `string` with no startup validation
- Missing required vars cause silent failures or runtime errors, not startup crash

### API Request Timeout Middleware
- Supabase and Redis have timeout wrappers
- No HTTP request timeout at Express route level
- Long-running routes (embeddings sync, broadcast) can hold connections indefinitely

### Admin Reports — Admin-Specific Endpoints
- `admin/http/admin-reports.route.ts` is a passthrough to the user reports router
- No admin-only actions (bulk status update, admin notes, escalation)

---

## Section 4: Phased Plan

---

### Phase 1 — Stability & Critical Fixes

**Goal:** Make the existing system production-safe and remove hidden risks.

#### 1.1 Startup Validation
- Add startup env var validation in `config/index.ts` (throw on missing required vars)
- List all required keys explicitly; optional keys have documented defaults

#### 1.2 Distributed Match Lock
- Replace `this.matchLock` boolean in `MatchmakingService.tryMatch()` with actual Redis SET NX EX lock using the already-defined `LOCK_KEY` and `LOCK_TTL`
- Safe for horizontal scaling without lock collisions

#### 1.3 Cache Infrastructure Consolidation
- Migrate `routes/resources/favorites.ts` and all other `CACHE_KEYS`/`CACHE_TTL` usages to `REDIS_CACHE_KEYS`/`REDIS_CACHE_TTL_SECONDS`
- Delete `infra/redis/cache-config.ts`
- Remove `apps/api/src/services/report-context.ts` shim (it's a passthrough; import directly from context)

#### 1.4 API Input Validation
- Add Zod validation middleware or per-route schema validation for mutation endpoints
- Standardize error response shape across all routes (`{ error: string, message: string, details?: unknown }`)
- Start with highest-traffic routes: favorites, blocks, user settings, matchmaking join

#### 1.5 Health Check Enhancement
- Extend `GET /healthz` to check Redis connectivity, Supabase connectivity, and MQTT connectivity
- Return `degraded` vs `healthy` vs `unhealthy` with individual service statuses

#### 1.6 Express Request Timeout
- Add request timeout middleware (30s default, configurable per route group)
- Prevents slow DB queries or external calls from holding server resources

---

### Phase 2 — Performance & Scalability

**Goal:** Prepare the system for real user load.

#### 2.1 Call Quality Metrics Persistence
- Add `call_quality_metrics` table in Postgres (room_id, user_id, avg_rtt, avg_packet_loss, avg_jitter, quality_tier, duration_seconds, timestamp)
- Emit metrics at call end from frontend via new `/api/video-chat/metrics` endpoint
- Surface in admin dashboard as an aggregated quality overview table

#### 2.2 Matchmaking Queue Status Endpoint
- Add `GET /api/matchmaking/queue-status` returning current queue size and estimated wait percentiles
- Used for the ROADMAP "still searching" wait time display (Phase B)
- Caches for 5s to avoid thundering herd

#### 2.3 Admin Analytics Dashboard
- Implement `GET /api/admin/analytics` endpoint with:
  - Total calls today / this week / this month
  - Average call duration
  - Active users (last 24h, 7d, 30d)
  - Match success rate (matched / (matched + timeout))
  - Top interest tags by match frequency
- Build admin analytics page with charts (Chart.js or Recharts)

#### 2.4 Embedding Score Caching
- Cache cosine similarity calculations during matchmaking (currently recalculated each `tryMatch` cycle)
- Short TTL (60s) to balance freshness vs CPU cost
- Reduces matchmaking cycle time under load

#### 2.5 Rate Limiting Per-Route Groups
- Apply tighter rate limits to sensitive routes: `/api/users/blocks`, `/api/favorites`, report submission
- Apply looser limits to read-heavy routes: call history, progress, notifications
- Use `createRateLimitMiddleware(options)` already available

---

### Phase 3 — UX & Retention

**Goal:** Implement roadmap engagement features and address key missing UX gaps.

#### 3.1 Idle/Searching State Enhancements (ROADMAP.md §D Phase A)
- Expand searching hints from 3 to 8-10 (add progression hints, platform hints)
- Add slide-up transition on hint rotation
- Show "Today: X min EXP earned" in idle state (fetch from `/api/users/progress`)
- Add level proximity indicator ("Almost Level X!" at 85%+)
- Add streak incomplete reminder in idle (once per session, not on every render)

#### 3.2 Post-Call EXP Summary Overlay (ROADMAP.md §B Phase A)
- New component: `PostCallSummary` (auto-dismisses after 3-4s, click-to-dismiss)
- Display: call duration, EXP earned (calculated from duration × any active boost), streak status
- Animate level progress bar from old % to new %
- Trigger after call end, before returning to idle state
- Frontend-calculated only (no backend round-trip needed for display)

#### 3.3 "Still Searching" Wait Time (ROADMAP.md §D Phase B)
- After 10s in search: show "Still searching..." with estimated wait (from queue-status endpoint — Phase 2.2)
- After 30s: show alternative action link ("Visit your progress page while you wait")
- After 5min: emit `queue-timeout` event (already implemented in backend)

#### 3.4 Prestige System — Phase A (Frontend-only)
- Calculate prestige tier client-side from `currentLevel` (Tier I at 50, II at 75, III at 100)
- Build `PrestigeBadge` component (small icon, bronze/silver/gold tones, no animation)
- Add prestige tier display on progress page ("Prestige Path" section, visible at Level 40+)
- Add badge to chat idle state next to level indicator
- Add badge to call history partner name display

#### 3.5 Prestige System — Phase B (Backend persistence)
- Add `prestige_tier` field to user profile in DB
- Persist tier on level-up calculation in `user-level.service.ts`
- Add `prestige_tier` to progress insights API response
- Drive frontend badge from API data instead of client-side calculation

#### 3.6 Prestige Celebration Screen — Phase C
- Full-screen momentary overlay triggered when user crosses Level 50, 75, 100
- 3-4s auto-dismiss, no repeat for same tier
- Persisted "seen" state: localStorage flag or backend field

#### 3.7 Favorite Bonus Signal During Call (ROADMAP.md §B Phase B)
- Emit `favorite-bonus-active` socket event when call is established with a favorited user
- Frontend displays static indicator next to peer name ("Favorite +20% EXP")
- Mutual: "+50% EXP" tooltip

#### 3.8 Feature Flags System
- Implement `lib/feature-flags/index.ts` with env-variable-based flag evaluation
- JSON config file support (for non-redeployment flag toggles)
- Add React hook `useFeatureFlag(key)` consuming the lib
- Wire existing `level-feature-unlocks` API response as user-level flags
- Document how to gate new UI features

---

### Phase 4 — Infrastructure & Observability

**Goal:** Operational maturity for production systems.

#### 4.1 Structured Error Boundary & Logging
- Add React Error Boundary with Pino/analytics error reporting in frontend
- Ensure all unhandled Promise rejections in API handlers are logged with request ID

#### 4.2 Circuit Breaker for External Dependencies
- Wrap Ollama calls with circuit breaker (fail-open: matchmaking degrades to no-embedding scoring)
- Wrap S3 calls with circuit breaker for upload endpoints
- Existing Redis and Supabase timeout wrappers are sufficient but add error metrics

#### 4.3 Admin Reports — Admin-Specific Actions
- Replace passthrough `admin-reports.route.ts` with actual admin-only endpoints:
  - `PATCH /api/admin/reports/:id/status` (accept, reject, escalate)
  - `POST /api/admin/reports/:id/notes` (admin internal notes)
  - `GET /api/admin/reports` with extended filters (status, date range, reporter)
- Update admin report detail page to use new endpoints

#### 4.4 Playwright E2E Coverage
- Add E2E tests for critical user paths:
  - Sign-in → start chat → match → end call
  - Block user flow
  - Notification center mark-as-read
  - Progress page data display
  - Admin: create interest tag, delete, verify in matchmaking

#### 4.5 Database Index Audit
- Review Supabase tables for missing indexes on high-frequency query columns
- At minimum: `call_history(user_id, started_at)`, `user_streaks(user_id, date)`, `notifications(user_id, read, created_at)`, `favorites(user_id, favorite_user_id)`
- Document index decisions

#### 4.6 Cache Preload on Startup
- Verify and extend `infra/redis/cache-preload.ts` to cover admin-config data (level rewards, feature unlocks, interest tags, EXP boost rules) loaded once at startup
- Reduces first-request latency for all matchmaking candidates

---

### Phase 5 — Advanced Features

**Goal:** Differentiation features and long-term engagement.

#### 5.1 Persistent Direct Messaging
- DB schema: `direct_messages(id, sender_id, receiver_id, content, created_at, read_at)` with RLS
- API: `GET /api/dm/:userId`, `POST /api/dm/:userId`, WebSocket event `dm:message`
- Frontend: DM inbox page, conversation view, unread badge in sidebar
- Restrict to mutual favorites only (privacy gate)

#### 5.2 User Search & Discovery
- API: `GET /api/users/search?q=` (search by username/display name, public profiles only)
- Frontend: search results page with profile cards, add-favorite action
- Rate-limited to prevent scraping

#### 5.3 Call Quality Display for Users
- Show post-call connection quality summary ("Excellent / Good / Poor")
- Use client-side NetworkMonitor data (already available, just not surfaced to user)
- Add quality icon to call history table

#### 5.4 Automated Content Moderation
- Integrate Ollama (already running) for chat message classification
- Add socket middleware to flag or filter messages above toxicity threshold
- Admin dashboard: moderation log, override decisions
- User-facing: warning toast when message is filtered

#### 5.5 Internationalization
- Add `next-intl` to web app
- Extract all hardcoded UI strings to locale files
- Start with `en` and `vi` (Vietnamese) locales
- Wire to existing `language_preference` user setting

#### 5.6 Weekly EXP Challenges (Appendix)
- Admin creates weekly challenge with target EXP or call minutes
- Progress tracked against challenge in user dashboard
- Notification on completion

#### 5.7 Group Calls (Optional, High Complexity)
- Evaluate SFU option (mediasoup or Livekit) before committing
- If mesh-only (2-4 users): extend room management, signaling, and frontend layout
- Gate behind feature flag during rollout
---

## Section 5: Ollama Cloud Feature TODOs

### 5.8 Admin Report Summarization (done)
- Use after a user submits a report following a call
- AI reads report reason, report context, and available chat snapshot
- Generate:
  - short summary
  - severity
  - suggested action
- Best fit for the `reports` domain and admin dashboard
- High value because it reduces manual moderation workload

### 5.9 Report Classification / Moderation Assist
- Auto-label reports as:
  - `harassment`
  - `spam`
  - `sexual`
  - `self-harm`
  - `underage-risk`
  - `other`
- Do not auto-ban users
- Only provide recommendation/support data for admins
- Strong fit because the current docs explicitly note missing automated content scanning

### 5.10 AI Broadcast / Admin Announcement Writer
- Admin provides target audience and a few key points
- Model generates:
  - title
  - body
  - CTA
  - tone variants
- Best fit for the `broadcasts` domain
- Easy to ship and relatively low risk

### 5.11 AI Bio Rewrite Assistant
- Suggest rewrites for user profile bios to make them clearer, friendlier, and safer
- Support transformations such as:
  - "make it shorter"
  - "friendly tone"
  - "remove risky wording"
- Best fit for `user details` / profile flows
- Does not require embedding models

### 5.12 Opener / Icebreaker Suggestions
- Generate 3-5 opening lines before or during a match
- Use interest tags, short profile context, and user language
- Strong fit for the random video chat product
- Candidate surfaces:
  - `/chat`
  - pre-queue / pre-match UI

### 5.13 Call History / Connection Recap
- After a call, generate a lightweight recap such as:
  - "You talked about..."
  - "You could follow up with..."
- Could also be surfaced in favorites/history views
- Only makes sense if enough chat/text context is available

### 5.14 Smart Reply for Chat Text
- Suggest quick replies inside the chat panel
- Use short context from the most recent messages
- Good UX upside, but requires careful latency and privacy controls

### 5.15 Admin Notes / Resolution Notes Drafting
- When an admin reviews a report, AI drafts `admin_notes`
- Small feature, but practical and time-saving

### 5.16 Changelog / CMS Text Normalization
- Standardize or correct changelog/admin-managed CMS content
- Candidate actions:
  - rewrite
  - shorten
  - clarify
  - clean up wording
