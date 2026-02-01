# LINKY Test Strategy Audit

## 1. Project Overview

LINKY is a real-time video chat platform built as a monorepo with domain-driven architecture. It enables peer-to-peer video calls, real-time messaging, user matchmaking based on interests and embeddings, and comprehensive user management including streaks, levels, and gamification.

### High-Level Architecture

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Backend** | Node.js, TypeScript, Express | REST APIs (`/api/v1`), domain services, business logic |
| **Frontend** | Next.js 16 (App Router), React, Zustand, React Query | Pages, components, client state |
| **Realtime** | Socket.IO (`/ws`), WebRTC | Matchmaking, signaling, peer-to-peer video/audio |
| **Infrastructure** | Redis, Supabase (Postgres), MQTT, S3, Clerk | Cache, persistence, presence, storage, auth |

Domains: `user`, `video-chat`, `matchmaking`, `reports`, `admin`, `embeddings`.

---

## 2. Test Type Definitions

### Unit Test

Tests a single module or function in isolation with mocked dependencies. Uses Vitest, mocks Supabase/Redis/Clerk. Appropriate for: pure logic (matcher, scoring, cosine similarity), derivation functions (level-from-exp, add-days), service logic with mocked repositories, cache helpers.

### Integration Test

Tests multiple components together with real or test doubles (e.g., HTTP API + DB, Socket.IO + Redis). Not currently implemented. Appropriate for: API route + service + repository flows, socket handlers + matchmaking + rooms, webhook handlers with mocked Clerk.

### Automation Test (UI)

End-to-end browser tests using Playwright. Drives real UI, requires running app and test users. Appropriate for: auth flows, video chat flows (matching, controls, chat), navigation, form validation. Uses 2 browser contexts for multi-user scenarios.

### Manual Test

Human-driven verification. Appropriate when: automation is unreliable (WebRTC media quality, device permissions, network instability), exploratory testing, visual/UX verification, or when setup cost exceeds value.

---

## 3. Backend Audit

### User Domain

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| user-details.service | Yes – pure logic, mock repo | Yes – HTTP + service + repo | No |
| user-profile.service | Yes – mock repo | Yes – profile route flow | No |
| user-settings.service | Yes – mock repo | Yes – settings route flow | No |
| user-streak.service | Yes – mock repo, cache | Yes – streak + streak-freeze | No |
| user-streak-freeze.service | Yes – mock repo | Yes – freeze consumption flow | No |
| user-level.service | Yes – mock repo | Yes – level + exp flow | No |
| user-level-reward.service | Yes – mock repo | Yes – reward claim flow | No |
| user-progress.service | Yes – mock repo | Yes – progress route flow | No |
| user-feature-unlock.service | Yes – mock repo | Yes – unlock check flow | No |
| user.service | Yes – mock repo | Yes – user CRUD flow | No |
| embedding-input.builder | Yes – pure logic | No | No |
| embedding-job.service | Yes – mock infra | Yes – job orchestration | No |

### Video-Chat Domain

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| rooms.service | Yes – in-memory state, mock-free | Yes – socket + rooms | No |
| user-sessions.service | Yes – session queue logic | Yes – socket + sessions | No |
| call-history.service | Yes – mock repo, streak/level | Yes – record + progress flow | No |
| Socket handlers (handlers.ts) | Partial – complex, many deps | Yes – socket + matchmaking + rooms | No |
| matchmaking.socket (interval) | No – interval, side effects | Yes – full matchmaking loop | No |

### Matchmaking Domain

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| matcher.service | Yes – pure findBestMatch logic | No | No |
| scoring.service | Yes – pure calculation | No | No |
| redis-matchmaking.service | Yes – mock Redis | Yes – Redis + matchmaking | No |
| embedding-score.service | Yes – mock embedding fetch | Yes – embedding + scoring | No |

### Reports Domain

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| reports.service | Yes – mock repo, cache | Yes – create/list/update flow | No |
| report-context.service | Yes – mock video context | Yes – context collection flow | No |

### Admin Domain

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| admin-users.service | Yes – mock repo | Yes – admin users route | No |
| admin-visits.service | Yes – mock repo | Yes – visits analytics | No |
| admin-interest-tags.service | Yes – mock repo | Yes – CRUD flow | No |
| admin-analytics.service | Yes – mock repo | Yes – analytics route | No |
| admin-changelogs.service | Yes – mock repo | Yes – changelogs route | No |
| admin-reports (via reports) | Yes | Yes | No |
| admin-embeddings.service | Yes – mock repo | Yes – embedding sync/compare | No |
| Other admin services | Yes – mock repo | Yes – route flows | No |

### Embeddings Domain

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| cosine-similarity.service | Yes – pure math, no mocks | No | No |

### Infrastructure & Cross-Cutting

| Module | Unit Test | Integration Test | Manual Test |
|--------|-----------|------------------|-------------|
| Cache (exp-today, getOrSet, hash) | Yes – mock Redis | Yes – cache + repo | No |
| clerk-webhook-handler | Yes – mock Svix/verify | Yes – webhook + user sync | No |
| embedding.service (Ollama) | Yes – mock Ollama client | Yes – real Ollama (optional) | No |
| logic (add-days, level-from-exp) | Yes – pure functions | No | No |
| helpers (timezone) | Yes – pure logic | No | No |

---

## 4. Frontend Audit

### Authentication & Session

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Sign-in: email validation | Yes | No | No |
| Sign-in: password validation | Yes | No | No |
| Sign-in: error messages (not found, wrong password) | Yes | No | No |
| Sign-in: successful flow | Yes | No | No |
| Sign-up: client validation | Yes | No | No |
| Sign-up: server validation (email taken, weak password) | Yes | No | No |
| Sign-up: OTP flow | Yes | No | No |
| Sign-up: successful flow | Yes | No | No |
| Session persistence, logout | Partial | Yes – verify across tabs | Clerk internals |
| 2FA / MFA flows | No | Yes | Automation fragile |

### Video Chat Page

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Idle state, start button | Yes | No | No |
| Searching state | Yes | No | No |
| In-call: video container, timer | Yes | No | No |
| Start call (join queue) | Yes | No | No |
| Match two users, enter in-call | Yes | No | No |
| End call, return to idle | Yes | No | No |
| Skip call, return to idle | Yes | No | No |
| Skip then start new call | Yes | No | No |
| Mute/unmute toggle, UI state | Yes | No | No |
| Camera on/off toggle, UI state | Yes | No | No |
| Reconnect after reload (resync) | Yes | No | No |
| Mobile viewport layout | Yes | No | No |
| Actual video/audio quality | No | Yes | WebRTC, devices |
| Connection quality indicator | Partial | Yes | Network-dependent |

### Floating Video

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Overlay visibility, position | Partial | Yes | Drag/resize hard to automate |
| Corner snapping on drag | No | Yes | Gesture automation unreliable |
| Mobile overlay size/position | No | Yes | Viewport-specific |

### Chat Messaging

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Open/close chat sidebar | Yes | No | No |
| Send message, receive on peer | Yes | No | No |
| Message list, timestamps | Yes | No | No |
| Long messages, scroll | Partial | Yes | Edge cases |
| Emoji, special characters | Partial | Yes | Encoding edge cases |

### Admin Dashboard

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Admin layout, navigation | Partial | Yes | Requires admin user |
| Users list, pagination | Partial | Yes | Data-dependent |
| Interest tags CRUD | Partial | Yes | Admin-only |
| Reports list, filters | Partial | Yes | Admin-only |
| Changelogs, level rewards, etc. | Partial | Yes | Admin-only |
| Embedding compare, find similar | No | Yes | Complex, admin-only |

### User Profile & Progress

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Profile page load | Partial | Yes | Auth required |
| Progress page: level, exp, streak | Partial | Yes | data-testid present |
| Profile edit, save | Partial | Yes | Form flows |
| Favorites list | Partial | Yes | Auth required |

### Settings & Security

| Area | Automation | Manual | Out of Scope |
|------|------------|--------|--------------|
| Settings page load | Partial | Yes | Auth required |
| Password change flow | Partial | Yes | Clerk modal |
| Active sessions list | No | Yes | Session management |
| Provider list (OAuth) | No | Yes | Clerk-managed |

---

## 5. Realtime & Media Constraints

### WebRTC Limitations

- **getUserMedia**: Requires real camera/mic or virtual devices. Playwright can run with `--use-fake-device-for-media-stream` but does not verify real device behavior.
- **RTCPeerConnection**: Offer/answer and ICE exchange are automatable; actual media flow and quality are not.
- **ICE/TURN**: NAT traversal depends on network; automation cannot reliably assert connection success across environments.

**Conclusion**: Unit test signaling logic; automation test that matched users reach in-call state and controls work. Do not automate media quality, latency, or codec behavior.

### Media Device Permissions

- Browser prompts for camera/microphone cannot be reliably automated across browsers.
- Denied permissions, no device, or device-in-use require manual verification.
- Test users must have permissions pre-granted or use fake devices in CI.

**Conclusion**: Manual test permission flows, device switching, and error states.

### Network Instability

- Socket disconnects, reconnects, and resync are partially automatable (e.g., page reload).
- Flaky networks, packet loss, and latency require manual or chaos-style testing.
- Automation should use retries and timeouts for normal conditions only.

**Conclusion**: Automation for happy-path reconnect; manual for failure modes.

### Multi-User Synchronization

- Two Playwright browser contexts can simulate two users; matching and chat work.
- More than two users, or specific match ordering, is harder and may need backend simulation.
- Session activation (single session per user) is testable with two contexts.

**Conclusion**: Two-context automation is sufficient for core flows; avoid over-complex multi-user scenarios in automation.

---

## 6. Matching & Multi-User Scenarios

### Matching Logic (Backend)

| What | Unit Test | Integration Test | Automation | Manual |
|------|-----------|------------------|------------|--------|
| findBestMatch: empty, single user | Yes | No | No | No |
| findBestMatch: common interests, skip cooldown | Yes | No | No | No |
| findBestMatch: deadlock fallback | Yes | No | No | No |
| Scoring: fairness bonus, common interests | Yes | No | No | No |
| Redis matchmaking: enqueue, tryMatch | Yes | Yes | No | No |
| Full matchmaking loop (interval) | No | Yes | No | No |

### Matching Behavior (Frontend)

| What | Unit Test | Integration Test | Automation | Manual |
|------|-----------|------------------|------------|--------|
| Join queue, see searching | No | No | Yes | No |
| Two users matched, in-call | No | No | Yes | No |
| Skip, both return to idle | No | No | Yes | No |
| Match quality (interest-based) | No | No | No | Yes |

### Multi-User Automation Strategy

- Use `createUserContext(browser, user)` to get separate contexts per test user.
- Use `createAuthenticatedContext` with different `TEST_USERS` (user1, user2).
- Run both users through: open chat page, wait for idle, start call, wait for in-call.
- Assert on both pages (video container, timer, controls).
- For chat: send from one, assert received on both.
- For skip/end: act on one, assert both return to idle.

**Conclusion**: Unit tests own matching algorithm; automation owns two-user matching flow; manual owns subjective match quality.

---

## 7. Test Coverage Matrix

| Feature / Flow | Unit | Integration | Automation | Manual | Notes |
|----------------|------|-------------|------------|--------|------|
| Matcher: findBestMatch | X | | | | Pure logic |
| Scoring: fairness, interests | X | | | | Pure logic |
| Redis matchmaking | X | X | | | Mock Redis in unit |
| User streak service | X | X | | | Mock repo |
| User level service | X | X | | | Mock repo |
| Call history + progress | X | X | | | Mock repo |
| Reports CRUD | X | X | | | Mock repo |
| Clerk webhook | X | X | | | Mock Svix |
| Cache helpers | X | X | | | Mock Redis |
| Cosine similarity | X | | | | Pure math |
| Sign-in flow | | | X | | Playwright |
| Sign-up flow | | | X | | Playwright |
| Video chat: match, in-call | | | X | | 2 contexts |
| Video chat: end call | | | X | | 2 contexts |
| Video chat: skip | | | X | | 2 contexts |
| Video chat: mute, camera | | | X | | UI state |
| Video chat: chat messages | | | X | | 2 contexts |
| Video chat: favorite add/remove | | | X | | Toast, UI |
| Video chat: reconnect | | | X | | Page reload |
| Mobile viewport | | | X | | iPhone 13 |
| WebRTC media quality | | | | X | Devices |
| Permission denied | | | | X | Browser prompts |
| Floating video drag/snap | | | | X | Gestures |
| Admin dashboard flows | | | X | X | Admin auth |
| Profile, progress pages | | | X | X | Auth required |
| Settings, security | | | X | X | Clerk modals |
| Connection quality indicator | | | | X | Network-dependent |

---

## 8. Recommended Test Count (For Academic Submission)

| Test Type | Minimum Features | Suggested Scope |
|-----------|------------------|------------------|
| **Unit Test** | 5 | Matcher, scoring, user-streak, user-level, call-history, reports, cache, cosine-similarity, level-from-exp, add-days (10+ covered) |
| **Automation Test** | 5 | Sign-in, sign-up, matching flow, end-call, skip, mute/camera, chat, favorite, reconnect, mobile (10+ covered) |
| **Manual Test** | 10 | WebRTC quality, permissions, floating video drag, connection indicator, admin flows, profile/progress, settings, multi-device, network failure, match quality |

**Satisfaction of Requirements**

- Unit Test >= 5: Satisfied (existing 30+ unit tests across 5+ domains).
- Automation Test >= 5: Satisfied (auth + video-chat specs cover 10+ flows).
- Manual Test >= 10: Satisfied (10+ manual-only areas identified above).

---

## 9. Academic Suitability Statement

LINKY is well-suited for a Software Testing course and group project. The system combines REST APIs, real-time Socket.IO, WebRTC, and multiple domains (user, matchmaking, video-chat, reports, admin), providing a realistic context for unit, integration, and end-to-end testing. Unit tests use mocks for Supabase and Redis, demonstrating isolation and determinism. Playwright automation covers authentication and multi-user video chat flows using two browser contexts, illustrating end-to-end and cross-user scenarios. Manual testing is explicitly required for WebRTC media quality, device permissions, and UX verification, reflecting real-world constraints. The project satisfies typical academic requirements (unit >= 5, automation >= 5, manual >= 10) and offers sufficient complexity to discuss test strategy, coverage trade-offs, and the limits of automation in media-heavy applications.

---

## 10. Final Recommendations

### What to Improve in Testing

1. **Integration tests**: Add HTTP API tests (e.g., supertest) for key routes (user profile, reports, call history) with a test database or in-memory store.
2. **Socket integration**: Add tests for socket handlers with a real Socket.IO client against a test server.
3. **Admin automation**: Add Playwright tests for admin flows using an admin test user.
4. **data-testid coverage**: Ensure all critical UI elements (profile, progress, settings) have stable selectors for automation.

### What NOT to Over-Test

1. **WebRTC internals**: Do not automate media quality, codec selection, or ICE candidate behavior.
2. **Clerk flows**: Rely on Clerk for auth; test integration points, not OAuth internals.
3. **Third-party UI**: Do not assert on Clerk modal internals; assert on app state before/after.
4. **Duplicate coverage**: Avoid testing the same behavior in unit, integration, and automation; assign ownership per layer.

### How to Present This Project Professionally

1. **Test Strategy Document**: Use this audit as the main strategy document; reference it in the report.
2. **Coverage Matrix**: Include the matrix (Section 7) to show systematic coverage decisions.
3. **Manual Test Artifacts**: Maintain a separate manual test checklist (Excel/Sheets) for the 10+ manual items.
4. **Traceability**: Map requirements/features to test types and test files for traceability.
5. **Limitations**: Clearly state WebRTC and permission limitations and why manual testing is required.
