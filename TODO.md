# TODO - Feature Recommendations

## High Priority (Production-Critical)

- [ ] **User Blocking/Muting** - Add `blocked_users` table, filter in matchmaking queue, block action in UI (profile, call, favorites). Report system exists but users can't proactively prevent re-matching.
- [ ] **Notification Center** - In-app notification bell with persistence layer. Cover: favorite alerts, streak reminders, level-ups, report resolutions, admin announcements. Zustand store + API endpoint.
- [ ] **Push Notifications (Web Push)** - Service worker + Web Push API for offline reach. Streak expiry warnings, favorite activity, re-engagement nudges. No native app needed.
- [ ] **Screen Sharing** - Add screen share track to existing WebRTC streams. Well-understood extension of current signaling and room management.

## Medium Priority (Engagement & Retention)

- [ ] **Persistent Direct Messaging** - Allow favorites to message between calls. Extend existing Socket.IO chat + UI with database persistence.
- [ ] **User Search & Discovery** - Search by username, browse profiles, find users without relying on random matchmaking.
- [ ] **Feature Flags System** - Implement `lib/feature-flags/` (currently empty). Environment-variable or JSON-config based. Enable safe rollouts and A/B testing.
- [ ] **Call Quality Analytics** - Persist WebRTC metrics (RTT, packet loss, jitter, frame rate, resolution) already tracked by quality controller. Surface in admin dashboard.

## Lower Priority (Polish & Growth)

- [ ] **Automated Content Moderation** - Profanity filtering for chat, inappropriate content detection. Ollama integration exists for embeddings and could extend to classification.
- [ ] **Internationalization (i18n)** - Localize UI with `next-intl` or `react-i18next`. Start with Vietnamese + English. Language preference field already exists in user profiles.
- [ ] **Group Calls (2-4 people)** - Mesh topology for small groups without SFU. Extend video-chat domain room management.
- [ ] **Call Recording** - Opt-in recording with both-party consent via `MediaRecorder` API. Save to S3 (infrastructure already exists).

## Already Planned (see ROADMAP.md)

- [ ] Soft Prestige UX (Phase A-C)
- [ ] Realtime Progress Insights (Phase A-C)
- [ ] Floating Video Polish (Phase A-C)
- [ ] Idle/Searching UX Enhancements (Phase A-B)
