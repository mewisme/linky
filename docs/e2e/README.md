# E2E test coverage (Selenium WebDriver)

Documentation for browser automation against Linky using **Selenium WebDriver + Chrome**. Only features that are realistically automatable with Selenium are listed; see [Excluded from Selenium](#excluded-from-selenium) for known gaps.

## Scope

| Route | Description |
|-------|-------------|
| `/call` | Main video chat UI (idle, searching, in-call) |
| `/call/chat` | Full-page chat while a call is active (mobile / minimized flow) |
| `/call/history` | Call history table (no live match required) |

Locale variants (`/vi/call`, etc.) follow the same feature set.

## Prerequisites

Automated `/call` tests require a running stack:

- Next.js web app (`BASE_TEST_URL`)
- Go API (matchmaking, Socket.IO, SFU token routes)
- Redis (match queue)
- Clerk (test-mode accounts)
- Cloudflare Realtime (SFU) credentials for in-call media

### Chrome flags for fake camera/mic

Use when creating the WebDriver session:

```text
--use-fake-device-for-media-stream
--use-fake-ui-for-media-stream
```

Optional for deterministic video:

```text
--use-file-for-fake-video-capture=/path/to/test.y4m
```

Also pre-grant media in Chrome prefs:

```text
profile.default_content_setting_values.media_stream_camera = 1
profile.default_content_setting_values.media_stream_mic = 1
```

### Auth

- `/call` is behind Clerk auth; tests need a signed-in session (UI login with Clerk test OTP or injected cookies/localStorage).
- Clerk test pattern: `{name}+clerk_test@linky.now`, OTP `424242`.

### Execution notes

- **Single-profile** tests: one WebDriver session.
- **Multi-profile** tests: two (or more) isolated WebDriver sessions; run **serially** — parallel workers can steal queue matches.
- Prefer desktop viewport (1280×720) for overflow-menu controls; screen share is desktop-only in the app.

## Documents

| File | Contents |
|------|----------|
| [call-page.md](./call-page.md) | Feature matrix: single-profile vs multi-profile |

## Locator strategy

All automatable UI targets use **`data-testid`** attributes in `apps/web/src/features/video-chat/` (and related layout/data-table components). See the full list in [call-page.md](./call-page.md#locator-reference).

Connection lifecycle is also exposed on the video container via **`data-connection-status`** (`idle`, `searching`, `matched`, `in_call`, `reconnecting`, `ended`).

Selenium query examples:

```python
# By test id
driver.find_element(By.CSS_SELECTOR, '[data-testid="chat-start-button"]')

# By connection state
driver.find_element(By.CSS_SELECTOR, '[data-testid="chat-video-container"][data-connection-status="in_call"]')
```

## Excluded from Selenium

Not listed as test targets because WebDriver cannot drive them reliably:

| Feature | Reason |
|---------|--------|
| Screen share start/stop | OS `getDisplayMedia` picker; not covered by fake-device flags |
| Picture-in-picture | Browser PiP API; unreliable in headless CI |
| Connection quality indicator | No test ID; requires simulated network degradation |
| Reaction overlay animations | No test ID; gesture + animation assertions are brittle |
| Giphy picker / external GIF API | Third-party UI + network dependency |
| Swap camera (meaningful) | Needs multiple fake video inputs to verify device switch |
| Real A/V bitrate / frame content | WebRTC internals; assert DOM/state only |
| ICE / SFU failure injection | Needs network mocking outside normal WebDriver scope |

Some of these may become testable after adding `data-testid` hooks or CDP-based mocks; they are out of scope for standard Selenium WebDriver.
