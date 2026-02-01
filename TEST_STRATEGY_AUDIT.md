# LINKY Test Strategy Audit

## 1. Project Overview (Testing Perspective)

### System Type

LINKY is a **realtime**, **stateful**, and **distributed** system:

- **Realtime**: Socket.IO for matchmaking and signaling; WebRTC for peer-to-peer media; MQTT for presence. Events are time-sensitive and order-dependent.
- **Stateful**: Redis holds matchmaking queues, presence, and short-lived caches. In-memory rooms track active calls. Session activation limits one active session per user.
- **Distributed**: Backend (Express), frontend (Next.js), Redis, Supabase, MQTT broker, S3, Clerk. Multiple components must stay consistent.

### Key Technical Risks Affecting Testing

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebRTC requires real or fake media devices | Automation cannot verify actual video/audio quality | Use fake devices in CI; manual test real devices |
| Browser permission prompts (camera/mic) | Cannot reliably automate across browsers | Pre-grant permissions or use fake devices; manual test denial flows |
| Socket.IO + Redis + matchmaking timing | Race conditions, flaky matches | Unit test logic; integration test with controlled timing |
| Cache invalidation on writes | Stale data if invalidation fails | Unit test invalidation calls; integration test cache + repo |
| MQTT presence updates Redis and admin sockets | Presence state can diverge | Integration test MQTT handler; manual verify admin dashboard |
| Multi-user synchronization | Two users must match and stay in sync | Automation with two browser contexts; avoid >2 users in automation |
| Clerk auth (third-party) | Cannot assert on Clerk UI internals | Test app state before/after auth; exclude Clerk UI from automation |
| Background intervals (matchmaking, heartbeat) | Side effects, non-deterministic | Integration test with test server; avoid unit testing intervals |

---

## 2. Test Level Definitions

### Unit Test

**Definition**: Tests a single module or function in isolation with mocked dependencies (Supabase, Redis, Clerk, Ollama).

**Appropriate when**:
- Logic is pure (matcher, scoring, cosine similarity, level-from-exp, add-days).
- Service logic depends only on injected repositories; repositories are mocked.
- No HTTP, Socket.IO, or browser involved.
- Deterministic, fast, no external I/O.

**Not appropriate when**: Multiple components interact, real I/O required, or side effects (intervals, sockets).

### Integration Test

**Definition**: Tests multiple components together (HTTP route + service + repository, Socket.IO handler + matchmaking + rooms, webhook + user sync) with real or test doubles.

**Appropriate when**:
- Verifying API route flows end-to-end within backend.
- Verifying socket handlers with a real Socket.IO client against a test server.
- Verifying cache + repository consistency.
- Verifying MQTT handler updates Redis and emits to admin sockets.

**Not appropriate when**: Pure logic (use unit) or full UI flow (use automation).

### Automation UI Test

**Definition**: End-to-end browser tests using Playwright. Drives real UI, requires running app and test users.

**Appropriate when**:
- Auth flows (sign-in, sign-up) excluding Clerk UI internals.
- Video chat flows: join queue, match, in-call, end, skip, mute, camera, chat, favorite.
- Navigation, form validation, toast feedback.
- Two-user scenarios via separate browser contexts.

**Not appropriate when**: WebRTC media quality, permission prompts, drag gestures, or Clerk modal internals.

### Manual Test

**Definition**: Human-driven verification without automation.

**Appropriate when**:
- WebRTC video/audio quality, latency, codec behavior.
- Camera/microphone permission denied, device switching, device-in-use.
- Floating video drag, corner snapping, PiP behavior.
- Connection quality indicator under varying network.
- Admin dashboard flows requiring admin user setup.
- Exploratory testing, UX verification, subjective match quality.
- Multi-device, multi-browser compatibility.

**Not appropriate when**: Automation is feasible and reliable (e.g., sign-in, matching, chat).

---

## 3. Feature-by-Feature Audit

### User Authentication Lifecycle (excluding Clerk UI internals)

| Attribute | Value |
|----------|-------|
| **Description** | Sign-in (email, password, errors), sign-up (validation, OTP), session persistence, logout. Clerk handles UI; app integrates via tokens and redirects. |
| **Suitable levels** | Automation UI, Manual (2FA/MFA, session across tabs) |
| **Justification** | Automation: email/password flows, error messages, redirects are deterministic. Manual: 2FA, MFA, cross-tab session are fragile to automate. Unit/Integration: auth logic is in Clerk; app only consumes tokens. |

### User Profile & Settings

| Attribute | Value |
|----------|-------|
| **Description** | Profile page (avatar, name, bio, personal info, interest tags). Settings page. Updates via API. |
| **Suitable levels** | Unit (services), Integration (API + service + repo), Automation UI (page load, form submit), Manual (UX, validation edge cases) |
| **Justification** | Unit: profile/settings services with mocked repos. Integration: full API flow. Automation: auth required; form flows automatable. Manual: visual verification, complex validation. |

### Interest Tags

| Attribute | Value |
|----------|-------|
| **Description** | User selects interest tags on profile. Admin CRUD for interest tags. Tags affect matchmaking scoring. |
| **Suitable levels** | Unit (scoring, tag logic), Integration (API, admin routes), Automation UI (user tag selection if exposed), Manual (admin CRUD, import) |
| **Justification** | Unit: scoring uses tags. Integration: admin interest-tags routes. Automation: user profile tag selection if stable selectors exist. Manual: admin flows, JSON import. |

### Favorites

| Attribute | Value |
|----------|-------|
| **Description** | Add/remove favorite during call (socket event). Favorites list page. Favorite affects matchmaking scoring. |
| **Suitable levels** | Unit (scoring with favorites), Integration (favorites API), Automation UI (add/remove during call, list page) |
| **Justification** | Unit: scoring service with favorite weighting. Integration: favorites CRUD API. Automation: add/remove in-call and list page are automatable. Manual: not needed if automation covers flows. |

### Matching Logic (Redis, Scoring, Fallback)

| Attribute | Value |
|----------|-------|
| **Description** | Redis-backed queue, enqueue/dequeue, tryMatch. Scoring: common interests, fairness bonus, skip cooldown. Deadlock fallback when only two users and both skipped. |
| **Suitable levels** | Unit, Integration |
| **Justification** | Unit: matcher, scoring are pure logic; redis-matchmaking with mocked Redis. Integration: real Redis + matchmaking loop. Automation: matching flow is UI-level; backend logic tested separately. |

### Video Call Lifecycle

| Attribute | Value |
|----------|-------|
| **Description** | Join queue, searching state, match, in-call (video container, timer), end call, skip, disconnect. Room creation, heartbeat, cleanup. |
| **Suitable levels** | Unit (rooms, sessions, call-history services), Integration (socket handlers + matchmaking + rooms), Automation UI (full flow with two users) |
| **Justification** | Unit: rooms, sessions, call-history with mocks. Integration: socket + matchmaking. Automation: two-context flow from idle to in-call to end/skip. Manual: media quality only. |

### Media Controls (Camera, Mic, Mute, Switch)

| Attribute | Value |
|----------|-------|
| **Description** | Mute/unmute audio, camera on/off. Socket events to peer. UI reflects state. |
| **Suitable levels** | Automation UI, Manual (actual media behavior) |
| **Justification** | Automation: toggle buttons, UI state (muted/camera-off indicators) are deterministic. Manual: actual audio/video propagation, device switching. |

### Floating / PiP Video Behavior

| Attribute | Value |
|----------|-------|
| **Description** | Draggable overlay for local video. Corner snapping. Mobile overlay size/position. |
| **Suitable levels** | Manual |
| **Justification** | Drag and corner-snap gestures are unreliable in Playwright. Manual verification required. |

### Chat Messaging

| Attribute | Value |
|----------|-------|
| **Description** | Open/close sidebar, send message, receive on peer. Message list, timestamps. |
| **Suitable levels** | Automation UI |
| **Justification** | Two-context automation: send from one, assert on both. Deterministic. Manual: not needed. |

### Streaks & Levels

| Attribute | Value |
|----------|-------|
| **Description** | Streak calculation, freeze consumption, level from EXP, rewards. Progress page displays level, exp, streak. |
| **Suitable levels** | Unit (services), Integration (API + call-history progress), Automation UI (progress page display) |
| **Justification** | Unit: streak, level, reward services with mocked repos. Integration: call-history applies progress. Automation: progress page has data-testids. Manual: edge cases, UX. |

### Admin Dashboards

| Attribute | Value |
|----------|-------|
| **Description** | Users list, reports, interest tags, level rewards, streak bonuses, changelogs, visitors, embeddings. Admin-only routes. |
| **Suitable levels** | Unit (admin services), Integration (admin routes), Automation UI (with admin user), Manual (exploratory, complex flows) |
| **Justification** | Unit: services with mocks. Integration: admin API flows. Automation: feasible with admin test user. Manual: embedding compare, find similar, bulk actions. |

### Background Jobs & Cache Refresh

| Attribute | Value |
|----------|-------|
| **Description** | Matchmaking interval (1s), cleanup expired entries (30s), room heartbeat (4s). Cache TTLs and invalidation on writes. |
| **Suitable levels** | Unit (cleanup logic if extractable), Integration (intervals with test server) |
| **Justification** | Unit: cleanup logic with mocked Redis. Integration: full interval loop. Automation/Manual: not applicable; backend-only. |

### Socket & MQTT Events

| Attribute | Value |
|----------|-------|
| **Description** | Socket: join, skip, signal, chat-message, mute-toggle, video-toggle, reaction, favorite:notify-peer, end-call, resync, disconnect. MQTT: presence updates Redis and admin sockets. |
| **Suitable levels** | Unit (handler logic if isolated), Integration (socket + MQTT handlers) |
| **Justification** | Unit: complex handlers have many deps; partial. Integration: real Socket.IO client + MQTT handler. Automation: exercises socket via UI. Manual: not needed for event correctness. |

### Error Recovery & Reconnect Flows

| Attribute | Value |
|----------|-------|
| **Description** | Page reload during call triggers resync. Peer disconnect triggers end-call for peer. Session activation queue when multiple tabs. |
| **Suitable levels** | Integration (resync handler), Automation UI (page reload during call) |
| **Justification** | Integration: resync handler with rooms. Automation: reload during call, assert return to in-call. Manual: network failure, prolonged disconnect. |

---

## 4. Automation vs Manual Decision Matrix

### Flows That SHOULD NOT Have Manual Tests (Automation Sufficient)

| Flow | Reason |
|------|--------|
| Sign-in (email, password, errors, success) | Deterministic; Playwright handles form and redirects |
| Sign-up (validation, OTP, success) | Deterministic; test users available |
| Join queue, match two users, in-call | Two-context automation; no media quality assertion |
| End call, skip call | Deterministic; both users return to idle |
| Mute/unmute, camera on/off | UI state and socket events are deterministic |
| Chat: send, receive | Two-context; message delivery is deterministic |
| Favorite add/remove during call | Toast and button state are deterministic |
| Reconnect (page reload) | Reload and wait for in-call; deterministic |
| Mobile viewport layout | Playwright viewport; layout assertions |
| Favorites list page | API + UI; deterministic |
| Progress page (level, exp, streak) | data-testids present; deterministic |

### Flows That SHOULD NOT Have Automation Tests (Manual Required)

| Flow | Reason |
|------|--------|
| WebRTC video/audio quality | Requires real devices; automation uses fake devices |
| Camera/mic permission denied | Browser prompts cannot be reliably automated |
| Device switching (camera/mic) | Device selection UI is browser-specific |
| Floating video drag and corner snap | Gesture automation is unreliable |
| Connection quality indicator | Network-dependent; non-deterministic |
| 2FA / MFA flows | Clerk UI; fragile across environments |
| Admin embedding compare, find similar | Complex, admin-only; high setup cost |
| Match quality (interest-based relevance) | Subjective; no automated assertion |
| Multi-device, multi-browser compatibility | Exploratory; manual matrix |
| Session persistence across tabs | Clerk + app state; manual verification |

### Flows With Both (Justified)

| Flow | Automation | Manual | Justification |
|------|------------|--------|---------------|
| Admin dashboard navigation | Yes (with admin user) | Yes (exploratory) | Automation for smoke; manual for deep flows |
| Profile edit, save | Yes (form submit) | Yes (UX, validation) | Automation for happy path; manual for edge cases |
| Settings, security | Yes (page load) | Yes (Clerk modals) | Automation for navigation; manual for Clerk UI |

---

## 5. Risk-Based Coverage Summary

### High-Risk Areas

| Area | Risk | Test Depth |
|------|------|------------|
| Matching logic | Incorrect pairing, deadlock, skip cooldown bypass | Unit: matcher, scoring. Integration: Redis + matchmaking |
| Video call lifecycle | Room leak, orphaned sockets, inconsistent state | Unit: rooms, sessions. Integration: socket handlers. Automation: full flow |
| Call history + progress | Streak/level/exp incorrect after call | Unit: call-history, streak, level. Integration: record flow |
| Cache invalidation | Stale profile, progress, admin lists | Unit: invalidate calls. Integration: cache + repo |
| Socket disconnect / resync | Peer not notified, room not cleaned | Integration: disconnect handler. Automation: reload |

### Medium-Risk Areas

| Area | Risk | Test Depth |
|------|------|------------|
| Authentication integration | Token not passed, redirect wrong | Automation: sign-in, sign-up |
| Favorites CRUD | Add/remove fails, list stale | Unit: scoring. Integration: API. Automation: in-call + list |
| Reports | Create/update wrong status | Unit: reports service. Integration: API |
| Admin routes | Unauthorized access, wrong data | Unit: admin services. Integration: admin API. Manual: complex flows |
| MQTT presence | Redis/admin state wrong | Integration: MQTT handler |

### Low-Risk Areas

| Area | Risk | Test Depth |
|------|------|------------|
| Cosine similarity | Math error | Unit only |
| Level-from-exp, add-days | Derivation error | Unit only |
| Timezone helpers | Wrong date | Unit only |
| Interest tags (user selection) | UI only | Automation or Manual |
| Changelogs, level rewards (admin) | CRUD | Unit + Integration |

### Mapping Risk to Test Depth

| Risk Level | Unit | Integration | Automation | Manual |
|------------|------|-------------|------------|--------|
| High | Required | Required | Required where applicable | For media, permissions |
| Medium | Required | Recommended | Required for user flows | For admin complex flows |
| Low | Required | Optional | Optional | Optional |
