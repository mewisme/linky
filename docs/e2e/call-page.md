# `/call` — Selenium WebDriver test features

Features automatable with Selenium WebDriver, grouped by **profile count**.

Every row uses a **`data-testid`** (or documented `data-*` attribute) for querying. Selenium example:

```python
driver.find_element(By.CSS_SELECTOR, '[data-testid="chat-start-button"]')
```

**Legend**

| Column | Meaning |
|--------|---------|
| **Locator** | `data-testid` value, or `[data-testid="…"][data-connection-status="…"]` |
| **Assert** | What Selenium can verify |
| **Notes** | Setup or flake risks |

---

## Single profile (1 browser session)

One authenticated user. No peer match required unless noted.

### Access & routing

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Authenticated user reaches `/call` | `chat-idle-container` | Container visible | Unauthenticated users redirect to sign-in |
| Vietnamese locale `/vi/call` | `chat-idle-container` | Idle UI visible | Set locale via URL or stored preference |
| Navigate to call history | `sidebar-nav-callHistory` | URL `/call/history` | Sidebar link under Connections |
| Call history page | `call-history-page` | Wrapper visible | |
| Call history table | `call-history-table` | Table renders | |
| Call history refresh | `call-history-refresh-button` | Click reloads without error | |
| Navigate to video chat | `sidebar-nav-videoChat` | URL `/call` | Top-level sidebar item |

### Idle state (`data-connection-status="idle"`)

Query container: `[data-testid="chat-video-container"][data-connection-status="idle"]`

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Idle shell | `chat-idle-container` | Container displayed | |
| Start button | `chat-start-button` | Visible and enabled | |
| Video area | `chat-video-container` | Present on `/call` | |
| Call timer hidden | `chat-call-timer` | Not visible | |
| Chat sidebar closed | `chat-sidebar-sheet` | Sheet not open | Desktop |
| Idle progress card | `chat-idle-progress-card` | Avatar, level, streak/exp hints | |
| Progress card loading | `chat-idle-progress-card[aria-busy="true"]` | Skeleton then content | Optional timing test |

### Matchmaking — pre-match (`idle` → `searching`)

Requires fake media Chrome flags (`--use-fake-device-for-media-stream`).

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Start search | `chat-start-button` | `chat-searching-indicator` appears | Acquires local media |
| Searching shell | `chat-searching-indicator` | Visible | |
| Searching card | `chat-searching-card` | Card content visible | |
| Rotating hints | `chat-search-hint` | Text changes over time | Wait ≥ 4.5s |
| Cancel search (control bar) | `chat-cancel-search-button` | `chat-idle-container` returns | On idle bar while searching |
| Cancel search (search card) | `chat-cancel-search-button` | Idle restored | Second entry point |
| End search | `chat-end-call-button` | Idle restored | When status is `searching` |
| Double start while searching | `chat-start-button` | Still searching; no crash | |
| Local preview | `chat-local-video` | Visible after media acquire | |
| Local PiP overlay | `chat-local-video-overlay` | Draggable preview when in-call layout | |
| Stream quality menu item | `chat-overflow-menu-button` → `chat-stream-quality-button` | Item present | After local stream exists |
| Open stream quality dialog | `chat-stream-quality-dialog` | Dialog visible | |
| Select quality preset | `chat-stream-quality-option-{sd\|hd}` | Radio selected | |
| Save stream quality | `chat-stream-quality-save-button` | Dialog closes | |
| Cancel stream quality | `chat-stream-quality-cancel-button` | Dialog closes | |
| Queue status (long wait) | `chat-search-queue-status` | Queue/wait copy appears | After ~10s searching |

### Error & edge — single profile

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Media permission denied | `chat-idle-container` | Stays idle after start | Launch without media prefs |
| Start audio-only | `chat-start-button` → `chat-searching-indicator` | Searching reachable | No video device |
| Socket / API down | `chat-idle-container` | Idle or error toast | Env or route blocking |

### Navigation (single profile, no active call)

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Open `/call/chat` while idle | — | Redirects to `/call` | No active call |
| Leave `/call` while searching | navigate away | Search cancelled server-side | Unload handler |

---

## Multi profile (2+ browser sessions)

Two authenticated users in separate WebDriver sessions.

**Setup:** both open `/call` → both click `chat-start-button` → match → assert in-call on both sides.

In-call container: `[data-testid="chat-video-container"][data-connection-status="in_call"]`

### Match & connection

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Two-user match | `chat-remote-video`, `chat-call-timer` | Both sessions in-call | Serial execution |
| Connecting overlay | `chat-matched-connecting` | Visible during `matched` status | |
| Call timer | `chat-call-timer` | Visible both sides | |
| Local video | `chat-local-video` | Both sessions | Fake media required |
| Remote video | `chat-remote-video` | `<video>` present | DOM only, not pixels |
| Peer info dialog | `chat-peer-info-button` → `chat-peer-info-dialog` | Dialog open | |
| Peer name | `chat-peer-info-name` | Matches peer | |
| Peer avatar | `chat-peer-info-avatar` | Visible | |
| Skip | `chat-skip-button` | Both leave call | |
| End call | `chat-end-call-button` | Both idle | |
| Re-queue | `chat-start-button` | Can search again | |
| Reconnecting state | `[data-testid="chat-video-container"][data-connection-status="reconnecting"]` | Container attribute | Low-priority / flaky |

### In-call controls (local UI)

Control bar root: `chat-controls-bar`

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Mute | `chat-mute-button` | Destructive variant when muted | |
| Unmute | `chat-mute-button` | Outline variant restored | |
| Camera off | `chat-video-toggle-button` | `chat-camera-off-indicator` on self | |
| Camera on | `chat-video-toggle-button` | Indicator hidden | |
| Skip | `chat-skip-button` | Both leave call | |
| End call | `chat-end-call-button` | Both idle | |

### In-call controls (peer sync)

Action on userA, assert on userB.

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Peer camera off | `chat-camera-off-indicator` | Visible on remote side | |
| Peer muted | `chat-remote-muted-indicator` | Visible on remote video | |
| Add favorite | `chat-add-favorite-button` | Toast success | Overflow menu |
| Remove favorite | `chat-remove-favorite-button` | Toast success | |
| Block user | `chat-block-user-button` | Call ends both sides | |
| Open report | `chat-report-button` → `chat-report-dialog` | Dialog open | |
| Report reason | `chat-report-reason-input` | Accepts text | |
| Submit report | `chat-report-submit-button` | Dialog closes; toast | |
| Cancel report | `chat-report-cancel-button` | Dialog closes | |
| Report peer summary | `chat-report-peer-summary` | Shows peer | |

### Chat & messaging

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Toggle chat (desktop) | `chat-toggle-button` | `chat-sidebar` visible | |
| Chat sheet | `chat-sidebar-sheet` | Sheet open | |
| Send text | `chat-input` + `chat-send-button` | `chat-message-{id}` both sides | |
| Receive text | `chat-messages-container` | Peer message visible | |
| Typing indicator | `chat-typing-indicator` | Visible while peer types | Ephemeral |
| Unread badge | `chat-unread-indicator` | On `chat-overflow-menu-button` | Chat closed + new message |
| Open full chat | `chat-open-full-page-button` | Navigates to `/call/chat` | Desktop sidebar |
| Full chat page | `chat-full-page-client` | Page shell visible | |
| Full chat content | `chat-full-page` | Message list + input | |
| Back to call | `chat-back-to-call-button` | Returns to `/call` | |
| Minimized call UI | `chat-minimized-state` | On `/call/chat` floating mode | |
| Restore full view | `chat-restore-full-view-button` | Inline video on `/call` | |
| Send image | `chat-send-image-button`, `chat-file-input` | Image in `chat-messages-container` | PNG fixture |
| Input disabled (not in call) | `chat-input` | `disabled` attribute | |

GIF/sticker via `chat-giphy-button` is **out of scope** (external Giphy API).

### Overflow menu

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Open menu | `chat-overflow-menu-button` | Items visible | Desktop dropdown / mobile drawer |
| Swap camera | `chat-swap-camera-button` | Click only | Single fake device |
| Screen share | `chat-screen-share-button` | Visibility smoke only | OS picker — do not click |
| PiP | `chat-pip-toggle-button` | Visibility smoke only | Unreliable in headless |

### Floating / multi-tab

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Passive tab | `chat-video-container-passive` | Passive layout | Second tab, same user |
| Passive banner | `chat-passive-tab-banner` | Copy visible | |
| Floating overlay | `chat-floating-video-overlay` | Visible off `/call` | During in-call navigation |
| Expand floating call | `chat-floating-expand-button` | Returns to `/call` | |
| Connection quality warning | `chat-connection-quality-indicator` | `[data-quality-state="warning\|critical"]` | Hard to trigger |

### Post-call & progress (multi profile)

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Return to idle | `chat-idle-container` | Visible after end | |
| Updated progress card | `chat-idle-progress-card` | EXP/streak copy updated | Duration thresholds |

### Disconnect (multi profile, low priority)

| Feature | Locator | Assert | Notes |
|---------|---------|--------|-------|
| Peer disconnect | `[data-connection-status="reconnecting"]` or idle | userA state change | Close userB driver |
| Network blip | `[data-connection-status="reconnecting"]` | Attribute on container | Hard to trigger |

---

## Locator reference

### Call page

| Test ID | Component |
|---------|-----------|
| `chat-idle-container` | Idle state shell |
| `chat-idle-progress-card` | Idle progress card |
| `chat-start-button` | Start search |
| `chat-searching-indicator` | Searching state shell |
| `chat-searching-card` | Searching card content |
| `chat-search-hint` | Rotating hint text |
| `chat-search-queue-status` | Queue / wait status line |
| `chat-cancel-search-button` | Cancel search |
| `chat-video-container` | Main video layout (`data-connection-status`) |
| `chat-video-container-passive` | Passive tab layout |
| `chat-passive-tab-banner` | Passive tab message |
| `chat-local-video` | Local preview |
| `chat-local-video-overlay` | Draggable local preview |
| `chat-remote-video` | Remote preview |
| `chat-camera-off-indicator` | Camera off overlay |
| `chat-remote-muted-indicator` | Peer mute badge |
| `chat-matched-connecting` | Connecting overlay |
| `chat-call-timer` | In-call timer |
| `chat-controls-bar` | Control button row |
| `chat-mute-button` | Mute toggle |
| `chat-video-toggle-button` | Camera toggle |
| `chat-skip-button` | Skip |
| `chat-end-call-button` | End call |
| `chat-overflow-menu-button` | More options |
| `chat-unread-indicator` | Unread messages badge |
| `chat-toggle-button` | Chat panel toggle |
| `chat-peer-info-button` | Open peer info |
| `chat-peer-info-dialog` | Peer info modal |
| `chat-peer-info-name` | Peer display name |
| `chat-peer-info-avatar` | Peer avatar |
| `chat-report-button` | Open report |
| `chat-report-dialog` | Report modal |
| `chat-report-reason-input` | Report textarea |
| `chat-report-submit-button` | Submit report |
| `chat-report-cancel-button` | Cancel report |
| `chat-report-peer-summary` | Report peer row |
| `chat-add-favorite-button` | Add favorite |
| `chat-remove-favorite-button` | Remove favorite |
| `chat-block-user-button` | Block peer |
| `chat-stream-quality-button` | Stream quality menu item |
| `chat-stream-quality-dialog` | Quality dialog |
| `chat-stream-quality-options` | Quality radio group |
| `chat-stream-quality-option-{quality}` | Quality preset (`sd`, `hd`) |
| `chat-stream-quality-save-button` | Save quality |
| `chat-stream-quality-cancel-button` | Cancel quality |
| `chat-swap-camera-button` | Swap camera |
| `chat-screen-share-button` | Screen share (visibility only) |
| `chat-pip-toggle-button` | PiP (visibility only) |
| `chat-connection-quality-indicator` | Network warning (`data-quality-state`) |
| `chat-sidebar` | Chat panel content |
| `chat-sidebar-sheet` | Chat sheet |
| `chat-open-full-page-button` | Open `/call/chat` |
| `chat-messages-container` | Message list |
| `chat-message-{id}` | Individual message |
| `chat-typing-indicator` | Peer typing row |
| `chat-input` | Message textarea |
| `chat-send-button` | Send message |
| `chat-send-image-button` | Attach image |
| `chat-file-input` | Hidden file input |
| `chat-giphy-button` | Giphy picker trigger (out of scope) |
| `chat-full-page-client` | `/call/chat` shell |
| `chat-full-page` | Full-page chat content |
| `chat-back-to-call-button` | Back to `/call` |
| `chat-minimized-state` | Minimized call placeholder |
| `chat-restore-full-view-button` | Restore inline video |
| `chat-floating-video-overlay` | Floating call widget |
| `chat-floating-expand-button` | Expand floating call |

### Call history & navigation

| Test ID | Component |
|---------|-----------|
| `sidebar-nav-videoChat` | Sidebar link to `/call` |
| `sidebar-nav-callHistory` | Sidebar link to `/call/history` |
| `call-history-page` | History page wrapper |
| `call-history-table` | History data table |
| `call-history-refresh-button` | Refresh history |

### Connection status (attribute)

On `chat-video-container` and `chat-video-container-passive`:

`idle` | `searching` | `matched` | `in_call` | `reconnecting` | `ended`

---

## Suggested test tiers

| Tier | Profiles | Examples |
|------|----------|----------|
| Smoke | 1 | Idle UI, start/cancel search, call history load |
| Integration | 2 | Match, timer, mute/video, text chat, end call |
| Extended | 2 | Favorites, block, report, image chat, floating/tab flows |
| Manual / out of scope | — | Screen share click, PiP, Giphy, reaction animations |
