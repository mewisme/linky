# Video Call Feature — Playwright Test Plan

## Overview

This test plan covers the complete video call feature of Linky, a real-time video chat platform. The feature spans:

- **Backend** (`apps/api/src/domains/video-chat/`): Socket.IO handlers for matchmaking, WebRTC signaling relay, chat, mute/video toggles, screen sharing, reactions, favorites, end-call, disconnect/resync, room heartbeat, call history recording, and HTTP endpoints for unload cleanup and queue status.
- **Frontend** (`apps/web/src/features/call/`): React hooks for media acquisition, peer connection management, screen sharing, socket signaling, WebRTC monitoring, tab coordination, unload handling, and the central `useVideoChat` orchestrator; Zustand store for call state; WebRTC lib for ICE server caching, recovery, adaptive encoding, network monitoring, and quality control; floating call provider for PiP overlay.
- **Matchmaking** (`apps/api/src/domains/matchmaking/`): Redis-backed queue, 1s polling interval, embedding-based scoring, mutual skip recording.
- **Shared** (`packages/shared-types/`): Backend user message types for i18n-aware error/success payloads.
- **Worker** (`apps/worker/`): Background job processing for call-related tasks.

Connection lifecycle: `idle → searching → matched → in_call → (reconnecting) → ended`

## Test Infrastructure

### Configuration
- **Playwright config**: `playwright.config.ts`
- **testDir**: `./playwright/tests`
- **baseURL**: `process.env.BASE_TEST_URL`
- **Global setup**: `./playwright/global-setup.ts`
- **Browser**: Chromium only

### Auth
- Authentication via Clerk
- `playwright/fixtures/auth.fixtures.ts` — auth test fixtures
- `playwright/fixtures/context.fixtures.ts` — `createAuthenticatedContext(browser, user)`
- `playwright/fixtures/users.fixtures.ts` — `TestUser` type
- `playwright/helpers/clerk-helpers.ts` — `waitForClerkReady(page)`

### Call-Specific Fixtures & Helpers
- **`playwright/fixtures/call.fixtures.ts`**:
  - `setupTwoUserCall(browser, user1, user2)` → `TwoUserCallSetup { user1Context, user2Context, user1Page, user2Page, user1VideoPage, user2VideoPage }`
  - `teardownTwoUserCall(setup)` — closes both contexts
  - `establishCall(page1, page2)` — navigates both to /call, starts call, waits for in-call state
  - `endCall(page1, page2)` — ends call, waits for both idle
- **`playwright/helpers/video-chat/helpers.ts`**:
  - `createUserContext(browser, user)`, `openChatPage(page)`
  - `waitForIdle(page)`, `waitForInCall(page)`, `waitForSearching(page)`
  - `startCall(page)`, `endCall(page)`, `skipCall(page)`
  - `toggleMute(page)`, `toggleVideo(page)`, `toggleChat(page)`
  - `sendChatMessage(page, message)`, `waitForChatMessage(page, messageText)`
  - `addFavorite(page)`, `removeFavorite(page)`
  - `waitForToast(page, text)`
- **`playwright/page-objects/video-chat/pages/video-chat.page.ts`** — `VideoChatPage` class with element locators and action methods (see testid reference below)

### Test IDs (data-testid Convention)
All UI elements use `data-testid` with `chat-*` prefix:

| Test ID | Element |
|---------|---------|
| `chat-idle-container` | Idle state container |
| `chat-start-button` | Start call button |
| `chat-end-call-button` | End call button |
| `chat-skip-button` | Skip peer button |
| `chat-mute-button` | Mute toggle |
| `chat-video-toggle-button` | Video toggle |
| `chat-screen-share-button` | Screen share button |
| `chat-toggle-button` | Chat sidebar toggle |
| `chat-add-favorite-button` | Add to favorites |
| `chat-remove-favorite-button` | Remove from favorites |
| `chat-cancel-search-button` | Cancel search |
| `chat-pip-toggle-button` | PiP toggle |
| `chat-swap-camera-button` | Swap camera |
| `chat-block-user-button` | Block user |
| `chat-searching-indicator` | Searching state indicator |
| `chat-remote-video` | Remote video element |
| `chat-local-video` | Local video element |
| `chat-call-timer` | Call duration timer |
| `chat-video-container` | Main video container |
| `chat-video-container-passive` | Passive tab video container |
| `chat-camera-off-indicator` | Camera off state |
| `chat-sidebar` | Chat sidebar panel |
| `chat-messages-container` | Chat messages list |
| `chat-input` | Chat message input |
| `chat-send-button` | Chat send button |
| `chat-message-{id}` | Individual chat message |
| `.connection-quality-indicator` | Connection quality display |

## Test Data / Seed Requirements

Two test users with valid Clerk accounts are required for all two-user call tests:

- **User A**: Username `testuser_a`, has default profile settings (mic enabled, camera enabled)
- **User B**: Username `testuser_b`, has default profile settings (mic enabled, camera enabled)

The global setup or seed fixture should ensure these users exist and have completed onboarding. No additional seed data (interests, chat history, call history) is required for baseline tests.

**Note**: Test users should have `default_mute_mic` and `default_disable_camera` set to `false` in user settings for control tests to start from a known state.

---

## Test Groups

### Group 1: Call Page UI — Idle State
**Coverage:** Page load, layout, and element visibility before starting a call.

#### Test Case 1.1: Call page loads in idle state
- **Priority:** P0
- **Description:** Verify the /call page loads correctly with the idle container, start button, and all expected controls visible.
- **Preconditions:** Authenticated user on `/call`
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
- **Expected Results:**
  - `chat-idle-container` is visible
  - `chat-start-button` is visible
  - `chat-video-container` is visible
- **Test Data:** Any authenticated test user

#### Test Case 1.2: Start button is enabled and clickable
- **Priority:** P0
- **Description:** Verify the start button is enabled when the page loads and user is authenticated.
- **Preconditions:** Authenticated user on `/call`
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
  3. Check start button state
- **Expected Results:**
  - `chat-start-button` is visible and enabled
- **Test Data:** Any authenticated test user

#### Test Case 1.3: Call timer not visible in idle state
- **Priority:** P1
- **Description:** Verify the call timer is hidden when no call is active.
- **Preconditions:** Authenticated user on `/call`
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
- **Expected Results:**
  - `chat-call-timer` is not visible
- **Test Data:** Any authenticated test user

#### Test Case 1.4: Chat sidebar hidden in idle state
- **Priority:** P1
- **Description:** Verify the chat sidebar is not visible when no call is active.
- **Preconditions:** Authenticated user on `/call`
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
- **Expected Results:**
  - `chat-sidebar` is not visible
- **Test Data:** Any authenticated test user

---

### Group 2: Matchmaking — Start Search & Queue
**Coverage:** Entering the matchmaking queue, queue status display, canceling search.

#### Test Case 2.1: Start search transitions to searching state
- **Priority:** P0
- **Description:** Clicking the start button should show the searching indicator and transition connection status to "searching".
- **Preconditions:** Authenticated user on `/call`
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
  3. `videoPage.startButton().click()`
  4. `videoPage.waitForSearching()`
- **Expected Results:**
  - `chat-searching-indicator` is visible
- **Test Data:** Any authenticated test user

#### Test Case 2.2: Cancel search button visible during search
- **Priority:** P1
- **Description:** The cancel search button should be visible while the user is in the queue.
- **Preconditions:** Authenticated user on `/call`
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
  3. `videoPage.startButton().click()`
  4. `videoPage.waitForSearching()`
- **Expected Results:**
  - `chat-cancel-search-button` is visible
- **Test Data:** Any authenticated test user

#### Test Case 2.3: Cancel search returns to idle
- **Priority:** P1
- **Description:** Clicking cancel search should leave the queue and return to idle state.
- **Preconditions:** Authenticated user on `/call` in searching state
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
  3. `videoPage.startButton().click()`
  4. `videoPage.waitForSearching()`
  5. `videoPage.cancelSearchButton().click()`
  6. `videoPage.waitForIdle()`
- **Expected Results:**
  - `chat-idle-container` is visible
  - `chat-searching-indicator` is not visible
- **Test Data:** Any authenticated test user

#### Test Case 2.4: Cannot join queue twice
- **Priority:** P1
- **Description:** Clicking start while already in queue should show an error (already in queue).
- **Preconditions:** Authenticated user on `/call` in searching state
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.waitForIdle()`
  3. `videoPage.startButton().click()`
  4. `videoPage.waitForSearching()`
  5. `videoPage.startButton().click()` (attempt double join)
- **Expected Results:**
  - Error toast appears (backend emits `video-chat:error` for already in queue)
- **Test Data:** Any authenticated test user

---

### Group 3: Matchmaking — Match Found
**Coverage:** Two users matching, peer info display, offerer/answerer assignment, WebRTC signaling setup.

#### Test Case 3.1: Two users match successfully
- **Priority:** P0
- **Description:** When two users enter the queue, they should be matched and transition to in-call state.
- **Preconditions:** Two authenticated users, both at idle state
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - Both users see `chat-remote-video` (or are in matched/in_call state)
  - Both users see `chat-call-timer`
  - `connectionStatus` transitions to `in_call` for both
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 3.2: Match delivers peer info
- **Priority:** P1
- **Description:** After matching, each user receives the peer's public profile info.
- **Preconditions:** Two authenticated users
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - Peer display name or avatar is rendered on both sides
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 3.3: One user is designated as offerer
- **Priority:** P1
- **Description:** The matchmaking system deterministically assigns one user as the WebRTC offerer (based on socketId comparison).
- **Preconditions:** Two authenticated users
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - WebRTC connection is established (remote video appears on at least one side within reasonable time)
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 4: In-Call Core — Video & Audio
**Coverage:** Video streams rendering, local video preview, camera off fallback, call timer progression.

#### Test Case 4.1: Remote video stream renders
- **Priority:** P0
- **Description:** After matching, the remote video element should become visible (or show a camera-off indicator if peer has no camera).
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - `chat-remote-video` is visible on both sides (or camera-off indicator if no camera)
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 4.2: Local video preview renders
- **Priority:** P0
- **Description:** The local video self-preview should be visible during a call.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - `chat-local-video` is visible on both sides
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 4.3: Call timer increments during call
- **Priority:** P0
- **Description:** The call timer should display elapsed time and progress during an active call.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Read timer text → `timer1`
  3. Wait 3 seconds
  4. Read timer text → `timer2`
- **Expected Results:**
  - `timer1` differs from `timer2` (timer is incrementing)
  - Timer format is HH:MM:SS or MM:SS
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 4.4: Camera off indicator shown when video disabled
- **Priority:** P1
- **Description:** When a user's camera is off (e.g., no camera device or disabled), the remote side should show a camera-off indicator.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.videoToggleButton().click()`
  3. Wait for state propagation
- **Expected Results:**
  - On User 2's side: `chat-camera-off-indicator` is visible (or remote video is replaced with avatar/placeholder)
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 5: Call Controls
**Coverage:** Mute/unmute toggle, video on/off toggle, swap camera, end call.

#### Test Case 5.1: Mute toggles audio and notifies peer
- **Priority:** P0
- **Description:** Clicking mute should toggle the local mute state and notify the peer via socket event.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.muteButton().click()`
- **Expected Results:**
  - User 1's mute button state changes (e.g., icon or aria-pressed updates)
  - User 2 receives indication that peer is muted (if UI exists for remote mute indicator)
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 5.2: Unmute restores audio
- **Priority:** P1
- **Description:** Clicking mute again should unmute and notify the peer.
- **Preconditions:** Two authenticated users in call, User 1 is muted
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.muteButton().click()`
  3. `user1VideoPage.muteButton().click()`
- **Expected Results:**
  - User 1's mute state returns to unmuted
  - User 2 no longer sees peer muted indicator
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 5.3: Video toggle notifies peer
- **Priority:** P0
- **Description:** Toggling video off should notify the peer that video is disabled.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.videoToggleButton().click()`
- **Expected Results:**
  - User 1's video toggle state changes
  - User 2 sees a camera-off indicator or transition
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 5.4: Swap camera cycles camera devices
- **Priority:** P2
- **Description:** If multiple cameras exist, swap camera should cycle through available video input devices.
- **Preconditions:** Two authenticated users in call (test environment with at least one camera)
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.swapCameraButton().click()`
- **Expected Results:**
  - No error thrown; local video still renders
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 5.5: End call via button returns to idle
- **Priority:** P0
- **Description:** Clicking end call should terminate the call, transition to idle state, and notify the peer.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.endCallButton().click()`
  3. `user1VideoPage.waitForIdle()`
  4. `user2VideoPage.waitForIdle()`
- **Expected Results:**
  - User 1: `chat-idle-container` visible
  - User 2: `chat-idle-container` visible (peer receives `end-call` event)
  - Call timer no longer visible on both sides
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 5.6: End call via keyboard shortcut (Mod+D)
- **Priority:** P2
- **Description:** Pressing Ctrl+D (or Cmd+D on Mac) during a call should trigger end call.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.page.keyboard.press('Control+d')`
  3. `user1VideoPage.waitForIdle()`
- **Expected Results:**
  - Call ends, User 1 returns to idle state
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 6: Skip Flow
**Coverage:** Skipping peer during call, peer skip notification, automatic re-queuing, mutual skip recording.

#### Test Case 6.1: Skip during call re-queues skipper
- **Priority:** P1
- **Description:** Clicking skip should leave the current call, re-queue the user who skipped, and show searching state.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.skipButton().click()`
  3. `user1VideoPage.waitForSearching()`
- **Expected Results:**
  - User 1 transitions to searching state (re-queued)
  - Toast message confirms skip
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 6.2: Peer receives skip notification
- **Priority:** P1
- **Description:** When a user skips, the peer should receive a peer-skipped event and be re-queued automatically.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.skipButton().click()`
  3. Check User 2's state
- **Expected Results:**
  - User 2 receives toast notification about peer skipping
  - User 2 either shows searching state (re-queued) or receives peer-left event
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 6.3: Skip records mutual skips to prevent re-matching
- **Priority:** P2
- **Description:** After a skip, the two users should not immediately re-match (mutual skip is recorded).
- **Preconditions:** Two authenticated users, both skip each other
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.skipButton().click()`
  3. Wait for User 2 to auto re-queue
  4. Observe matchmaking behavior for ~5 seconds
- **Expected Results:**
  - Users do not immediately re-match within the polling interval
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 7: Chat During Call
**Coverage:** Sending/receiving text messages, typing indicator, chat sidebar, message delivery acknowledgment.

#### Test Case 7.1: Chat sidebar opens on toggle
- **Priority:** P1
- **Description:** Toggling the chat button should open the chat sidebar.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.chatToggleButton().click()`
- **Expected Results:**
  - `chat-sidebar` becomes visible
  - `chat-input` is visible
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 7.2: Send text message and peer receives it
- **Priority:** P1
- **Description:** A text message sent via socket should appear in the peer's chat.
- **Preconditions:** Two authenticated users in call, chat sidebar open on both
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.chatToggleButton().click()`
  3. `user2VideoPage.chatToggleButton().click()`
  4. `user1VideoPage.sendChatMessage('Hello from User 1')`
  5. Wait for message to appear on User 2
- **Expected Results:**
  - User 1 sees the message in their chat with "sent" status
  - User 2 sees the message appear in their chat (socket event `chat:message`)
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 7.3: Typing indicator relayed to peer
- **Priority:** P2
- **Description:** When a user is typing in the chat input, the peer should see a typing indicator.
- **Preconditions:** Two authenticated users in call, chat sidebar open
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.chatToggleButton().click()`
  3. `user2VideoPage.chatToggleButton().click()`
  4. `user1VideoPage.chatInput().click()`
  5. `user1VideoPage.chatInput().fill('T')`
- **Expected Results:**
  - User 2 sees typing indicator
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 7.4: Empty message not sent
- **Priority:** P1
- **Description:** Attempting to send an empty text message should be rejected client-side.
- **Preconditions:** Two authenticated users in call, chat sidebar open
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.chatToggleButton().click()`
  3. `user1VideoPage.chatInput().fill('   ')`
  4. `user1VideoPage.chatSendButton().click()`
- **Expected Results:**
  - No message appears in User 1's chat
  - No socket event sent
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 8: Screen Sharing
**Coverage:** Start/stop screen sharing, peer screen share indicator, track replacement.

#### Test Case 8.1: Screen share starts and peer receives notification
- **Priority:** P1
- **Description:** When a user starts screen sharing, the peer should see the shared screen and receive a toggle event.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.screenShareButton().click()`
- **Expected Results:**
  - User 1 enters screen sharing state
  - User 2 sees `screen-share:toggle` event with `sharing: true`
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 8.2: Stop screen share restores camera
- **Priority:** P1
- **Description:** Stopping screen sharing should replace the screen track with the camera track and notify the peer.
- **Preconditions:** Two authenticated users in call, User 1 sharing screen
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.screenShareButton().click()`
  3. Wait briefly
  4. `user1VideoPage.screenShareButton().click()`
- **Expected Results:**
  - User 1 returns to camera video (no screen share)
  - User 2 receives `screen-share:toggle` with `sharing: false`
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 9: Reactions
**Coverage:** Sending reaction, receiving reaction from peer.

#### Test Case 9.1: Reaction events relayed to peer
- **Priority:** P2
- **Description:** A reaction event sent by one user should reach the peer via the `reaction:triggered` socket event.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Trigger a reaction from User 1 (UI-dependent; may be a button or gesture)
- **Expected Results:**
  - User 2 sees the reaction (heart animation or visual indicator)
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 10: Favorites During Call
**Coverage:** Add/remove favorite during a call, peer notification.

#### Test Case 10.1: Add favorite notifies peer
- **Priority:** P1
- **Description:** Adding a peer to favorites during a call should emit `favorite:added` to the peer.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.addFavoriteButton().click()`
- **Expected Results:**
  - User 1 sees success toast
  - User 2 sees `favorite:added` notification with User 1's name
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 10.2: Remove favorite notifies peer
- **Priority:** P2
- **Description:** Removing a peer from favorites during a call should emit `favorite:removed` to the peer.
- **Preconditions:** Two authenticated users in call, User 1 has User 2 in favorites
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.removeFavoriteButton().click()`
- **Expected Results:**
  - User 2 receives `favorite:removed` notification
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 11: Call Termination
**Coverage:** User-initiated end call, peer-initiated end call, call history recorded, unload cleanup.

#### Test Case 11.1: Both users return to idle after one ends call
- **Priority:** P0
- **Description:** When one user ends the call, both users should return to idle state.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `await endCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - `chat-idle-container` visible on both
  - `chat-call-timer` not visible on both
  - No error toasts
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 11.2: Peer receives end-call notification with correct message
- **Priority:** P1
- **Description:** When a peer ends the call, the other user should see a descriptive end-call message.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `user1VideoPage.endCallButton().click()`
  3. Check User 2's UI
- **Expected Results:**
  - User 2 sees toast with end-call message (from `end-call` event payload)
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 11.3: Call history recorded after call ends
- **Priority:** P1
- **Description:** After a call ends, call history should be persisted in the database (via Redis idempotency lock).
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. `await endCall(user1VideoPage, user2VideoPage)`
  3. Query call history API or database
- **Expected Results:**
  - A call history record exists with caller, callee, duration, and timestamps
  - No duplicate records (idempotency key prevents this)
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 12: Disconnect & Reconnection
**Coverage:** Socket disconnect during call, session resync, reconnection flow.

#### Test Case 12.1: Peer disconnect triggers end-call for remaining user
- **Priority:** P1
- **Description:** When one user's socket disconnects, the remaining user should receive an end-call event.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Simulate User 1 disconnect (close socket or context)
  3. Observe User 2's state
- **Expected Results:**
  - User 2 transitions to ended/idle state
  - Toast appears with "peer lost connection" message
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 12.2: Session resync after reconnection
- **Priority:** P2
- **Description:** After a transient socket disconnect during a call, the user should be able to resync their session and rejoin the existing room.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Simulate User 1 socket disconnect and reconnect
  3. Client triggers `resync-session`
  4. Observe if User 1 rejoins the room
- **Expected Results:**
  - User 1 receives `matched` event with room info
  - WebRTC connection re-established (ICE restart)
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 13: Tab Coordination
**Coverage:** BroadcastChannel-based ownership to prevent duplicate calls across tabs, passive mode.

#### Test Case 13.1: Second tab shows passive state when call is active in first tab
- **Priority:** P1
- **Description:** Opening /call in a second tab while a call is active in the first should show a passive/blocked state.
- **Preconditions:** Two authenticated users in call (User 1 in tab A)
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)` (User 1 in tab 1)
  2. Open a new tab for User 1 at `/call`
  3. Check tab 2 state
- **Expected Results:**
  - User 1's second tab shows `chat-video-container-passive` or a "call active in another tab" message
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 13.2: Ownership transfers when active tab is closed
- **Priority:** P2
- **Description:** When the tab owning the active call is closed, ownership should transfer to another open call tab.
- **Preconditions:** Two authenticated users in call (User 1 tab A = active, tab B = passive)
- **Steps:**
  1. Set up call in tab A
  2. Open passive tab B
  3. Close tab A
  4. Observe tab B
- **Expected Results:**
  - Tab B receives ownership and transitions to active call mode
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 14: Floating Call (PiP)
**Coverage:** Floating video overlay when navigating away from /call, expand back to full page.

#### Test Case 14.1: Floating overlay appears when navigating away from call page
- **Priority:** P2
- **Description:** When a user navigates away from /call while in an active call, a floating PiP overlay should appear.
- **Preconditions:** Two authenticated users in call on /call page
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Navigate User 1 to `/dashboard` (or any non-/call page)
- **Expected Results:**
  - Floating video overlay appears on User 1's screen
  - Remote video is visible in the overlay
  - Call continues (timer keeps incrementing)
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 14.2: Expand floating overlay returns to full call page
- **Priority:** P2
- **Description:** Clicking the expand button on the floating overlay should navigate back to /call.
- **Preconditions:** Two authenticated users in call, User 1 on non-/call page with floating overlay visible
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Navigate User 1 to `/dashboard`
  3. Click expand/return-to-call button on floating overlay
- **Expected Results:**
  - User 1 navigates to `/call`
  - Full call page renders (not floating overlay)
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 14.3: Floating overlay hidden after call ends
- **Priority:** P2
- **Description:** When the call ends, the floating overlay should disappear.
- **Preconditions:** Two authenticated users in call, User 1 on non-/call page with floating overlay
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Navigate User 1 to `/dashboard`
  3. End call (from User 2's side)
  4. Observe User 1's screen
- **Expected Results:**
  - Floating overlay disappears
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 15: Error States & Edge Cases
**Coverage:** Media permission denied, no camera available, ICE server failures, error toasts, queue timeout.

#### Test Case 15.1: Media permission denial shows error
- **Priority:** P1
- **Description:** When the user denies camera/microphone permission, an appropriate error message should be shown.
- **Preconditions:** Browser context with camera/mic permission denied
- **Steps:**
  1. `videoPage.goto()` with denied permissions
  2. `videoPage.startButton().click()`
- **Expected Results:**
  - Error toast or inline error message about camera/microphone access
  - State remains idle (not searching)
- **Test Data:** Any authenticated test user (with permission denied)

#### Test Case 15.2: No camera device falls back to audio-only
- **Priority:** P2
- **Description:** When no camera is available, the call should proceed as audio-only without crashing.
- **Preconditions:** Browser context with no video input devices
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.startButton().click()`
  3. `videoPage.waitForSearching()`
- **Expected Results:**
  - User enters queue (audio-only fallback succeeds)
  - `chat-camera-off-indicator` visible on local preview
  - No crash or uncaught error
- **Test Data:** Any authenticated test user

#### Test Case 15.3: ICE server fetch failure shows error
- **Priority:** P2
- **Description:** If ICE servers cannot be fetched, the call should fail gracefully with an error message.
- **Preconditions:** Simulated ICE server endpoint failure
- **Steps:**
  1. Mock or intercept ICE server request to fail
  2. `videoPage.goto()`
  3. `videoPage.startButton().click()`
- **Expected Results:**
  - Error message displayed (connection config not ready)
  - User does not enter queue
- **Test Data:** Any authenticated test user

#### Test Case 15.4: Queue timeout shows error
- **Priority:** P2
- **Description:** If matchmaking queue times out (no match found within timeout period), the user should be notified.
- **Preconditions:** Single authenticated user (no other users in queue)
- **Steps:**
  1. `videoPage.goto()`
  2. `videoPage.startButton().click()`
  3. `videoPage.waitForSearching()`
  4. Wait for queue timeout (timeout duration depends on backend config)
- **Expected Results:**
  - Toast appears with queue timeout message
  - State returns to idle
- **Test Data:** Any authenticated test user

#### Test Case 15.5: Socket connection error shows toast
- **Priority:** P1
- **Description:** If the socket connection fails, the user should see an error toast with a reload option.
- **Preconditions:** Simulated socket connection failure
- **Steps:**
  1. Navigate to `/call` with socket server unreachable
- **Expected Results:**
  - Error toast with message and reload action button
- **Test Data:** Any authenticated test user

---

### Group 16: Internationalization (i18n)
**Coverage:** UI text rendering in supported locales (en, vi).

#### Test Case 16.1: Call page renders in English (default)
- **Priority:** P1
- **Description:** The call page should display UI text in English by default.
- **Preconditions:** Authenticated user on `/call` (no locale prefix)
- **Steps:**
  1. `videoPage.goto()` (URL `/call` — English, no prefix)
  2. `videoPage.waitForIdle()`
- **Expected Results:**
  - Start button text is in English
  - Any labels/tooltips are in English
- **Test Data:** Any authenticated test user

#### Test Case 16.2: Call page renders in Vietnamese
- **Priority:** P1
- **Description:** The call page should display UI text in Vietnamese when locale is `vi`.
- **Preconditions:** Authenticated user on `/vi/call`
- **Steps:**
  1. `videoPage.page.goto('/vi/call')`
  2. Wait for page load
  3. `videoPage.waitForIdle()`
- **Expected Results:**
  - Start button text is in Vietnamese
  - Any labels/tooltips are in Vietnamese
- **Test Data:** Any authenticated test user

#### Test Case 16.3: Backend error messages localized
- **Priority:** P2
- **Description:** Backend socket error payloads include `userMessage` with i18n keys; frontend should resolve them correctly in the active locale.
- **Preconditions:** Two authenticated users, Vietnamese locale
- **Steps:**
  1. Navigate both users to `/vi/call`
  2. `await establishCall(user1VideoPage, user2VideoPage)`
  3. Trigger an error (e.g., double join) from User 1
- **Expected Results:**
  - Error toast text is in Vietnamese
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 17: Progress & Streak Events
**Coverage:** Streak completion and level-up events emitted during calls, progress updates.

#### Test Case 17.1: Streak completed event emitted during long call
- **Priority:** P2
- **Description:** When a call duration exceeds the daily streak requirement, the `streak:completed` event should fire.
- **Preconditions:** Two authenticated users in call; call runs longer than streak threshold
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Maintain call for extended duration (dependent on streak config)
  3. Listen for `streak:completed` socket event
- **Expected Results:**
  - `streak:completed` event emitted to both users
  - Toast or UI notification shown
- **Test Data:** `testuser_a`, `testuser_b`

#### Test Case 17.2: Level up event emitted on exp threshold
- **Priority:** P2
- **Description:** When call exp crosses a level threshold, the `level:up` event should fire.
- **Preconditions:** User near level-up threshold, in a call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Maintain call until level-up threshold is crossed
  3. Listen for `level:up` socket event
- **Expected Results:**
  - `level:up` event emitted
  - UI notification shown (new level, previous level)
- **Test Data:** `testuser_a` (close to level-up), `testuser_b`

#### Test Case 17.3: User progress updates emitted via heartbeat
- **Priority:** P2
- **Description:** The 5-second room heartbeat should emit `user:progress:update` events during calls.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Wait at least 5 seconds
- **Expected Results:**
  - `user:progress:update` event received by both clients
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 18: Connection Quality Indicator
**Coverage:** Network quality monitoring, quality tier changes displayed in UI.

#### Test Case 18.1: Connection quality indicator visible during call
- **Priority:** P2
- **Description:** The connection quality indicator (`.connection-quality-indicator`) should be visible during an active call.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
- **Expected Results:**
  - `.connection-quality-indicator` is present in the DOM
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 19: Unload Behavior
**Coverage:** Browser tab close/navigation triggers end-call cleanup via beforeunload/beacon.

#### Test Case 19.1: beforeunload sends end-call via fetch/beacon
- **Priority:** P1
- **Description:** Closing the browser tab during an active call should trigger the `end-call-unload` HTTP endpoint.
- **Preconditions:** Two authenticated users in call
- **Steps:**
  1. `await establishCall(user1VideoPage, user2VideoPage)`
  2. Close User 1's tab/page (simulate unload)
  3. Check User 2's state
- **Expected Results:**
  - User 2 receives `end-call` event
  - User 2 transitions to idle state
  - Call history recorded (via unload endpoint)
- **Test Data:** `testuser_a`, `testuser_b`

---

### Group 20: API Endpoints
**Coverage:** HTTP endpoints for queue status and end-call-unload.

#### Test Case 20.1: Queue status returns correct format
- **Priority:** P2
- **Description:** The `/api/v1/video-chat/queue-status` endpoint should return `{ queueSize, estimatedWaitSeconds }`.
- **Preconditions:** API server running
- **Steps:**
  1. Send GET request to queue-status endpoint
- **Expected Results:**
  - Response contains `queueSize` (number) and `estimatedWaitSeconds` (number or null)
  - Response status 200
- **Test Data:** None

#### Test Case 20.2: End-call-unload with invalid socketId returns 400
- **Priority:** P2
- **Description:** POST to end-call-unload without socketId should return 400.
- **Preconditions:** API server running, authenticated
- **Steps:**
  1. Send POST to end-call-unload with empty body
- **Expected Results:**
  - 400 status with error message "socketId is required"
- **Test Data:** Authenticated user

---

## Test Execution Order

Recommended order for running test groups (dependencies considered):

1. **Group 1 (Call Page UI)** — No dependencies; validates page renders
2. **Group 2 (Matchmaking — Start Search)** — No dependencies; validates queue entry
3. **Group 3 (Matchmaking — Match Found)** — Depends on two users; core P0 flow
4. **Group 4 (In-Call Core)** — Depends on Group 3 (established call)
5. **Group 5 (Call Controls)** — Depends on Group 3
6. **Group 6 (Skip Flow)** — Depends on Group 3
7. **Group 10 (Favorites)** — Depends on Group 3
8. **Group 11 (Call Termination)** — Depends on Group 3
9. **Group 19 (Unload Behavior)** — Depends on Group 3
10. **Group 7 (Chat)** — Depends on Group 3
11. **Group 8 (Screen Sharing)** — Depends on Group 3
12. **Group 9 (Reactions)** — Depends on Group 3
13. **Group 12 (Disconnect/Reconnect)** — Depends on Group 3
14. **Group 13 (Tab Coordination)** — Depends on Group 3
15. **Group 14 (Floating Call)** — Depends on Group 3
16. **Group 15 (Error States)** — Independent; can run anytime
17. **Group 16 (i18n)** — Independent
18. **Group 17 (Progress & Streak)** — Depends on Group 3; requires long-running calls
19. **Group 18 (Connection Quality)** — Depends on Group 3
20. **Group 20 (API Endpoints)** — Independent

## Notes / Known Limitations

1. **Headless browser limitations**: Chromium in headless mode may not support real WebRTC media streams (getUserMedia, getDisplayMedia). Tests that depend on actual video/audio tracks (Groups 4, 5, 8) may require:
   - A headed browser (set `headless: false` in test project config)
   - Fake media devices via `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream` Chromium arguments
   - Mocking `navigator.mediaDevices.getUserMedia` if only testing UI state transitions

2. **Two-user call tests require real-time coordination**: Tests in Groups 3-14, 17, 18, 19 require two authenticated users. Use `setupTwoUserCall` fixture to create isolated browser contexts. Socket.IO connections and WebRTC signaling happen between these two contexts through the actual backend.

3. **Call duration for progress tests**: Group 17 (Progress & Streak) tests require calls lasting longer than the daily streak threshold. These may be impractical for CI and should be tagged as `@slow` or run in a separate test suite.

4. **ICE servers**: Tests require a running backend with TURN/STUN server configuration (Cloudflare TURN). If the backend is not configured, WebRTC connections may fail in certain network topologies (NAT traversal).

5. **Redis dependency**: Matchmaking and idempotency locks require a running Redis instance. Call history tests (Group 11.3) verify database persistence via Redis lock.

6. **Push notifications**: The backend sends push notifications on match and chat events. These are fire-and-forget (`void`) and not verified in tests.

7. **Rate limiting**: Chat message rate limiting and end-call-unload rate limiting are verified by the backend. Tests for rate limit states (chat message burst, rapid unload calls) are P2 and not included in the current plan but should be added if rate limiting behavior changes.

8. **Test isolation**: Each test that uses `setupTwoUserCall` creates fresh browser contexts. Ensure shared resources (Redis queues, rooms) are clean between tests. The global setup should flush any stale matchmaking queue entries.
